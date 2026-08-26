"use client";

/**
 * عميل WebSocket للإشعارات الفورية — الجولة 3.
 *
 * يتصل بـ wss://api.tawfir.giize.com/api/v1/ws/notifications?token=XXX
 * عند استدعاء connect(token). يقطع الاتصال عند disconnect().
 *
 * الميزات:
 *  - إعادة اتصال تلقائية: exponential backoff (1s → 2s → 4s → max 30s)
 *  - رسائل تشخيص في console: «WS connected» / «WS disconnected» / «WS reconnected»
 *  - لا يستخدم socket.io — WebSocket أصلي (الخادم يدعمه مباشرة).
 *  - يدعم role token (customer/owner/admin) — أي توكن Bearer صالح.
 */

type WsMessageHandler = (msg: unknown) => void;
type WsStatusHandler = (status: "connected" | "disconnected" | "reconnecting" | "error") => void;

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  "wss://api.tawfir.giize.com/api/v1/ws/notifications";

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_BACKOFF_RETRIES = 8; // عدد المحاولات قبل التوقف (ثم يُعاد عند نشاط المستخدم)

class NotificationWebSocketClient {
  private socket: WebSocket | null = null;
  private currentToken: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  private messageHandlers = new Set<WsMessageHandler>();
  private statusHandlers = new Set<WsStatusHandler>();

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

  /** يفتح الاتصال بالتوكن الحالي. إن كان مفتوحاً يقطعه أولاً. */
  connect(token: string): void {
    if (typeof window === "undefined") return;
    if (this.currentToken === token && this.socket?.readyState === WebSocket.OPEN) {
      return; // مفتوح بالفعل بنفس التوكن
    }
    this.disconnect();
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
      console.log("[Tawfir WS] WS connected");
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
      console.log("[Tawfir WS] WS disconnected");
      this.emitStatus("disconnected");
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      console.warn("[Tawfir WS] WS error");
      this.emitStatus("error");
      // سيُعاد الاتصال عبر onclose تلقائياً.
    };
  }

  /** يقطع الاتصال نهائياً (عند تسجيل الخروج). */
  disconnect(): void {
    this.intentionallyClosed = true;
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
    this.currentToken = null;
    this.reconnectAttempts = 0;
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
    console.log(
      `[Tawfir WS] WS reconnecting in ${delay}ms (attempt ${attempt + 1})`
    );
    this.emitStatus("reconnecting");
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.intentionallyClosed || !this.currentToken) return;
      console.log("[Tawfir WS] WS reconnected (retry attempt)");
      this.connect(this.currentToken);
    }, delay);
  }

  private emitStatus(status: Parameters<WsStatusHandler>[0]): void {
    this.statusHandlers.forEach((h) => h(status));
  }
}

/** Singleton — مثيل واحد لكل التطبيق. */
export const notificationWs = new NotificationWebSocketClient();
