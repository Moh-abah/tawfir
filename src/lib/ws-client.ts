"use client";

/**
 * عميل WebSocket للإشعارات الفورية — الجولة 3 + إصلاح الإحياء.
 *
 * يتصل بـ wss://api.tawfir.giize.com/api/v1/ws/notifications?token=XXX
 * عند استدعاء connect(token). يقطع الاتصال عند disconnect().
 *
 * الميزات:
 *  - إعادة اتصال تلقائية: exponential backoff (1s → 2s → 4s → max 30s)
 *  - لا يستخدم socket.io — WebSocket أصلي (الخادم يدعمه مباشرة).
 *  - يدعم role token (customer/owner/admin) — أي توكن Bearer صالح.
 *  - إصلاح الإحياء: بعد نفاد المحاولات (شبكة مقطوعة طويلاً) كان
 *    الاتصال يتوقف نهائياً حتى تحديث الصفحة. الآن عند عودة النشاط
 *    (الصفحة تصبح مرئية) أو عودة الاتصال (online) نُصفّر العدّاد
 *    ونعيد الاتصال فوراً إن كان هناك توكن نشط — فلا تفقد الإشعارات
 *    الفورية بعد انقطاع طويل.
 */

type WsMessageHandler = (msg: unknown) => void;
type WsStatusHandler = (status: "connected" | "disconnected" | "reconnecting" | "error") => void;
/**
 * معالج استشفاء المصادقة: فشل الاتصال المتكرر (توكن منتهٍ غالباً) →
 * يجري تجديد الجلسة ويُرجع توكن وصول جديدًا (أو null عند الفشل).
 */
type WsAuthRecoveryHandler = () => Promise<string | null>;

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  "wss://api.tawfir.giize.com/api/v1/ws/notifications";

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_BACKOFF_RETRIES = 8; // عدد المحاولات قبل التوقف (ثم يُعاد عند نشاط المستخدم)
/* بعد هذا العدد من الإخفاقات المتتالية نفترض أن التوكن مات (وليس الشبكة)
   ونجرّب استشفاء المصادقة (تجديد الجلسة) قبل الاستمرار بالـbackoff. */
const AUTH_RECOVERY_THRESHOLD = 2;
/* حد أدنى بين محاولات الاستشفاء — منع عاصفة تجديد عند انقطاع الشبكة */
const AUTH_RECOVERY_COOLDOWN_MS = 30_000;

class NotificationWebSocketClient {
  private socket: WebSocket | null = null;
  private currentToken: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  private messageHandlers = new Set<WsMessageHandler>();
  private statusHandlers = new Set<WsStatusHandler>();
  /* استشفاء المصادقة (الجولة 25): عدّاد إخفاقات متتالية + معالج + مهلة تبريد */
  private consecutiveFailures = 0;
  private authRecoveryHandler: WsAuthRecoveryHandler | null = null;
  private lastAuthRecoveryAt = 0;

  constructor() {
    if (typeof window === "undefined") return;
    /* إصلاح الإحياء — مستمعان دائمان (مرة واحدة مع المُنشئ):
       1) عند عودة الصفحة للمرئية (المستخدم عاد للتطبيق)
       2) عند عودة الاتصال بالشبكة (حدث online)
       كلاهما: تصفير عدّاد المحاولات + إعادة اتصال فورية إن وُجد توكن
       ولم يكن الاتصال مقصود قطعه (تسجيل خروج). */
    const revive = () => {
      if (this.intentionallyClosed || !this.currentToken) return;
      if (
        this.socket &&
        (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING)
      ) {
        return; /* حي بالفعل */
      }
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.emitStatus("reconnecting");
      this.connect(this.currentToken);
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") revive();
    });
    window.addEventListener("online", revive);
  }

  /** يسجّل مستمعاً للرسائل القادمة. يُرجع دالة إلغاء التسجيل. */
  onMessage(handler: WsMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** يسجّل مستمعاً لتغيّر حالة الاتصال. يُرجع دالة إلغاء التسجيل. */
  onStatus(handler: WsStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * يسجّل معالج استشفاء المصادقة — يستدعيه العميل بعد إخفاقات متتالية
   * (التوكن غالباً منتهٍ) ليجدد الجلسة ويرجّع توكن وصول جديدًا.
   * تمرير null يلغي التسجيل.
   */
  setAuthRecoveryHandler(handler: WsAuthRecoveryHandler | null): void {
    this.authRecoveryHandler = handler;
  }

  /**
   * يفتح الاتصال بالتوكن الحالي. إن كان مفتوحاً (أو قيد الفتح) بنفس
   * التوكن لا يفعل شيئاً.
   *
   * الجولة 6 — إصلاح جذري: كان الاتصال "قيد الفتح" يُقطع ويُعاد إنشاؤه
   * عند أي استدعاء ثانٍ (يحدث مع StrictMode في dev ودورات إعادة التركيب)،
   * وبعض الخوادم تلغي تسجيل المستخدم كلياً عند قطع أي مقبس له — فتتوقف
   * الإشعارات الفورية حتى اتصال جديد. جعلنا CONNECTING مطابقاً لـ OPEN:
   * نفس التوكن + قيد الفتح → لا قطع ولا اتصال جديد.
   *
   * إصلاح عاصفة إعادة الاتصال (422/403 storm): كان هذا المسار يستدعي
   * disconnect() الكامل كتنظيف داخلي — وdisconnect() يصفّر
   * reconnectAttempts وconsecutiveFailures مع كل إعادة اتصال، فيتلف
   * الـbackoff التدريجي وعتبة استشفاء المصادفة معاً: عند رفض الخادم
   * للمصافحة (403 لتوكن منتهٍ مثلاً) يدور العميل في حلقة ~1 ثانية
   * لا نهائية بنفس التوكن الميت — لا يصل أبداً لحد التوقف (8) ولا
   * لعتبة الاستشفاء (2) — فلا يُرسل POST /auth/refresh قط (ظهر في
   * سجلات الخادم: 145 محاولة WS مرفوضة خلال دقائق بلا أي تجديد).
   * التنظيف الداخلي الآن teardownSocket() الذي لا يمس العدادات.
   */
  connect(token: string): void {
    if (typeof window === "undefined") return;
    if (
      this.currentToken === token &&
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return; // مفتوح (أو قيد الفتح) بالفعل بنفس التوكن
    }
    this.teardownSocket();
    this.intentionallyClosed = false;
    this.currentToken = token;

    try {
      const url = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
      this.socket = new WebSocket(url);
    } catch (err) {
      // WebSocket غير متاح — لا داعي لرمي؛ نكتفي بالتشخيص.
      console.warn("[Tawfir WS] تعذّر فتح WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.consecutiveFailures = 0;
      this.emitStatus("connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach((h) => h(data));
      } catch {
        // الرسالة ليست JSON صالحة — تجاهلها بهدوء.
      }
    };

    this.socket.onclose = () => {
      this.emitStatus("disconnected");
      if (!this.intentionallyClosed) {
        this.consecutiveFailures++;
        /* استشفاء المصادقة: إخفاقات متتالية ≥ الحد → التوكن غالباً ميت.
           نجرّب التجديد أولاً (مع تبريد 30 ث)؛ إن نجح نعيد بالتوكن الجديد
           فوراً، وإلا نكمل مسار الـbackoff المعتاد. */
        if (
          this.consecutiveFailures >= AUTH_RECOVERY_THRESHOLD &&
          this.canAttemptAuthRecovery()
        ) {
          void this.tryAuthRecovery().then((recovered) => {
            if (!recovered) this.scheduleReconnect();
          });
          return;
        }
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      console.warn("[Tawfir WS] WS error");
      this.emitStatus("error");
      // سيُعاد الاتصال عبر onclose تلقائياً.
    };
  }

  /** هل يجوز الآن محاولة استشفاء المصادقة؟ (معالج مسجّل + خارج مهلة التبريد) */
  private canAttemptAuthRecovery(): boolean {
    return (
      this.authRecoveryHandler !== null &&
      this.currentToken !== null &&
      Date.now() - this.lastAuthRecoveryAt >= AUTH_RECOVERY_COOLDOWN_MS
    );
  }

  /**
   * محاولة استشفاء المصادقة: يستدعي المعالج المسجّل لتجديد الجلسة.
   * يُرجع true إن أعاد الاتصال بتوكن جديد، false للاستمرار بالـbackoff.
   */
  private async tryAuthRecovery(): Promise<boolean> {
    if (!this.authRecoveryHandler || !this.currentToken) return false;
    this.lastAuthRecoveryAt = Date.now();
    /* تصفير عدّاد الإخفاقات — إن فشل التجديد واستمر الـbackoff بلا فتح
       فسيُعطّل العتبة مجدداً بعد إخفاقين إضافيين (وليس كل إغلاق). */
    this.consecutiveFailures = 0;
    try {
      const freshToken = await this.authRecoveryHandler();
      if (freshToken && freshToken !== this.currentToken) {
        console.info("[Tawfir WS] استُعيفت المصادقة — إعادة الاتصال بتوكن جديد");
        /* توكن جديد = ميزانية إعادة محاولات جديدة (الاعتماديات تغيّرت)،
           مع بقاء حد التوقف لولم يُفتح الاتصال به أيضاً. */
        this.reconnectAttempts = 0;
        this.connect(freshToken);
        return true;
      }
    } catch {
      // المعالج فشل (شبكة مقطوعة أو refresh مرفوض) — الـbackoff يكمل.
    }
    return false;
  }

  /**
   * يقطع الاتصال نهائياً (عند تسجيل الخروج) — تصفير كل العدادات والحالة.
   * للتنظيف الداخلي أثناء إعادة الاتصال استخدم teardownSocket() حتى
   * لا تُمس عدادات backoff/الاستشفاء (انظر تعليق connect).
   */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.consecutiveFailures = 0;
    this.teardownSocket();
    this.currentToken = null;
    this.reconnectAttempts = 0;
  }

  /**
   * تفكيك المقبس الحالي فقط (معالجات + مؤقّت إعادة الاتصال) — تنظيف
   * داخلي قبل فتح مقبس جديد. لا يصفّر العدادات ولا يغيّر التوكن ولا
   * عَلَم الإغلاق المتعمّد — هذه مسؤولية disconnect() الكامل.
   */
  private teardownSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close();
        }
      } catch {
        // تجاهل أخطاء الإغلاق.
      }
      this.socket = null;
    }
  }

  /** هل الاتصال مفتوح الآن؟ */
  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed) return;
    if (this.reconnectAttempts >= MAX_BACKOFF_RETRIES) {
      console.warn(
        `[Tawfir WS] تجاوز الحد الأقصى لمحاولات إعادة الاتصال (${MAX_BACKOFF_RETRIES}).`
      );
      return;
    }
    const attempt = this.reconnectAttempts++;
    // exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s → 30s → 30s
    const delay = Math.min(
      MIN_BACKOFF_MS * Math.pow(2, attempt),
      MAX_BACKOFF_MS
    );
    this.emitStatus("reconnecting");
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.intentionallyClosed || !this.currentToken) return;
      this.connect(this.currentToken);
    }, delay);
  }

  private emitStatus(status: Parameters<WsStatusHandler>[0]): void {
    this.statusHandlers.forEach((h) => h(status));
  }
}

/** Singleton — مثيل واحد لكل التطبيق. */
export const notificationWs = new NotificationWebSocketClient();
