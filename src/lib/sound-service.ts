/**
 * SoundService — نظام الإشعارات الصوتية (الجولة 8).
 * ================================================
 * القاعدة المعمارية الحاكمة: ملف صوتي واحد لكل نوع إشعار — قابل للاستبدال
 * بلا كود. كل ملف في public/sounds/ باسم النوع حرفياً:
 *
 *   /sounds/notifications/{notification_type}.mp3   (15 صوتاً)
 *   /sounds/system/{system_type}.mp3                (3 أصوات)
 *
 * استبدال أي ملف بنفس الاسم = تغيير الصوت فوراً بعد تحديث الصفحة —
 * لا أسماء بديلة ولا تضمين للصوت في الكود إطلاقاً.
 *
 * السلوك:
 *  - كاش مسبق (preload) للأصوات الـ18 بعد أول تفاعل — لا تأخير أول إشعار
 *  - إعدادات المستخدم: localStorage (tawfir_sound_enabled + tawfir_sound_volume)
 *  - التشغيل فقط والتطبيق في المقدمة (document.visibilityState === "visible")
 *  - صوت واحد في كل مرة: الإشعار المتتالي يعرض توستاً فقط بلا صوت
 *    (الأولوية الأعلى تقطع الأدنى — انظر BASE_PRIORITY)
 *  - منطق الأدوار: «طلب جديد» للمالك أولوية قصوى لا تُسكت + اهتزاز الجهاز
 *  - منع تكرار نفس الإشعار بين WebSocket والاستطلاع الاحتياطي (بمعرّفه)
 *  - يبثّ حدث DOM «tawfir:sound-played» قابل الرصد للتشخيص/التحقق
 */
import type { NotificationOut } from "@/types/api.generated";

/* ─── الأنواع ─── */

/** أصوات الإشعارات (15) — الأسماء حرفياً = أسماء الملفات. */
export type NotificationSoundType =
  | "order_new"
  | "order_confirmed"
  | "order_preparing"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "membership_approved"
  | "membership_rejected"
  | "membership_expiring"
  | "membership_new_request"
  | "special_offer_new"
  | "special_offer_soldout"
  | "facility_approved"
  | "facility_rejected"
  | "owner_registered";

/** أصوات النظام العامة للتفاعلات (3). */
export type SystemSoundType =
  | "success_action"
  | "error_occurred"
  | "notification_open";

export type SoundType = NotificationSoundType | SystemSoundType;

/** الدور المستمع — لمنطق أولوية «طلب جديد» للمالك. */
export type SoundRole = "customer" | "owner" | "admin";

/* ─── الثوابت ─── */

const NOTIFICATIONS_DIR = "/sounds/notifications";
const SYSTEM_DIR = "/sounds/system";

const SYSTEM_TYPES: ReadonlySet<SoundType> = new Set<SoundType>([
  "success_action",
  "error_occurred",
  "notification_open",
]);

/** مفاتيح إعدادات المستخدم في localStorage. */
const ENABLED_KEY = "tawfir_sound_enabled";
const VOLUME_KEY = "tawfir_sound_volume";
/** المستوى الافتراضي عند أول تشغيل. */
export const DEFAULT_SOUND_VOLUME = 0.7;

/** كل الأصوات المدعومة (18) بترتيب عرض ثابت للإعدادات والتقارير. */
export const NOTIFICATION_SOUND_TYPES: readonly NotificationSoundType[] = [
  "order_new",
  "order_confirmed",
  "order_preparing",
  "order_out_for_delivery",
  "order_delivered",
  "order_cancelled",
  "membership_new_request",
  "membership_approved",
  "membership_rejected",
  "membership_expiring",
  "special_offer_new",
  "special_offer_soldout",
  "facility_approved",
  "facility_rejected",
  "owner_registered",
];

export const SYSTEM_SOUND_TYPES: readonly SystemSoundType[] = [
  "success_action",
  "error_occurred",
  "notification_open",
];

export const ALL_SOUND_TYPES: readonly SoundType[] = [
  ...NOTIFICATION_SOUND_TYPES,
  ...SYSTEM_SOUND_TYPES,
];

/** تسميات عربية للأصوات — تُستخدم في قسم «الأصوات» بالإعدادات. */
export const SOUND_LABELS: Record<SoundType, string> = {
  order_new: "طلب جديد",
  order_confirmed: "تأكيد طلب",
  order_preparing: "قيد التحضير",
  order_out_for_delivery: "في الطريق للتوصيل",
  order_delivered: "تم التوصيل",
  order_cancelled: "إلغاء طلب",
  membership_new_request: "طلب عضوية جديد",
  membership_approved: "الموافقة على عضوية",
  membership_rejected: "رفض عضوية",
  membership_expiring: "قرب انتهاء عضوية",
  special_offer_new: "عرض خاص جديد",
  special_offer_soldout: "نفاد عرض خاص",
  facility_approved: "الموافقة على منشأة",
  facility_rejected: "رفض منشأة",
  owner_registered: "تسجيل مالك جديد",
  success_action: "نجاح إجراء",
  error_occurred: "خطأ في إجراء",
  notification_open: "فتح الإشعارات",
};

/**
 * أولوية الصوت عند التزاحم: إن كان صوت يعمل ووصل صوت جديد بأولوية أدنى
 * يُتجاهل (توست فقط)، والأولوية الأعلى تقطع الحالي.
 * منطق الأدوار (تحسين ترتيب فقط — الكل يستقبل الكل عبر WS):
 *  - المالك: order_new أولوية قصوى لا تُسكت إن كانت الأصوات مفعلة
 *  - المشرف: الطلبات والعضويات في القمة
 */
const BASE_PRIORITY: Record<SoundType, number> = {
  order_new: 10,
  membership_new_request: 8,
  membership_approved: 8,
  membership_rejected: 8,
  order_confirmed: 7,
  order_delivered: 7,
  order_cancelled: 7,
  owner_registered: 7,
  order_preparing: 6,
  order_out_for_delivery: 6,
  membership_expiring: 6,
  facility_approved: 6,
  facility_rejected: 6,
  error_occurred: 6,
  special_offer_new: 5,
  special_offer_soldout: 5,
  success_action: 4,
  notification_open: 3,
};

/** أولوية «طلب جديد» للمالك — قصوى: لا يقطعها شيء ولا تُسكت بالتزاحم. */
const OWNER_ORDER_NEW_PRIORITY = 100;

/* ─── الخدمة ─── */

export interface PlayOptions {
  /**
   * تجاوز كل الحراسات (الإعداد/المقدمة/التزاحم) — لزر «تجربة» في الإعدادات.
   * يحترم مستوى الصوت دائماً.
   */
  force?: boolean;
  /** دور المستخدم المستمع — لأولوية «طلب جديد» للمالك والاهتزاز. */
  role?: SoundRole;
  /** معرّف الإشعار — لمنع تكرار الصوت لنفس الإشعار بين WS والاستطلاع. */
  notificationId?: number;
}

class SoundServiceClass {
  private cache = new Map<SoundType, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;
  private currentPriority = 0;
  private lastNotificationId: number | null = null;
  private inited = false;

  /* ── إعدادات المستخدم (localStorage) ── */

  /** مفعّلة افتراضياً (true) — تُقرأ لحظة التشغيل فتسري التغييرات فوراً. */
  isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ENABLED_KEY) !== "false";
  }

  setEnabled(value: boolean): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ENABLED_KEY, String(value));
  }

  /** مستوى الصوت 0-1 (افتراضي 0.7) — القيم غير الصالحة تُهمل. */
  getVolume(): number {
    if (typeof window === "undefined") return DEFAULT_SOUND_VOLUME;
    const raw = Number.parseFloat(window.localStorage.getItem(VOLUME_KEY) ?? "");
    if (Number.isNaN(raw) || raw < 0 || raw > 1) return DEFAULT_SOUND_VOLUME;
    return raw;
  }

  setVolume(value: number): void {
    if (typeof window === "undefined") return;
    const clamped = Math.min(1, Math.max(0, value));
    window.localStorage.setItem(VOLUME_KEY, String(clamped));
    // يُطبَّق فوراً على الصوت الجاري إن وُجد
    if (this.current) this.current.volume = clamped;
  }

  /* ── التهيئة والكاش المسبق ── */

  /**
   * يُستدعى مرة من مزوّد العملاء: يسجّل تحميلاً مسبقاً للأصوات الـ18 بعد
   * أول تفاعل (سياسة التشغيل التلقائي في المتصفحات تتطلب إيماءة أصلاً).
   * إشعار قبل أي تفاعل يُشغَّل بتحميل لحظي (متأخر قليلاً لكنه يعمل).
   */
  init(): void {
    if (this.inited || typeof window === "undefined") return;
    this.inited = true;
    const warm = () => this.preloadAll();
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    window.addEventListener("keydown", warm, { once: true, passive: true });
  }

  /** ينشئ/يُرجع عنصر الصوت المخزّن للنوع — التحميل يبدأ فور الإنشاء. */
  private elementFor(type: SoundType): HTMLAudioElement | null {
    if (typeof window === "undefined" || typeof Audio === "undefined") return null;
    let el = this.cache.get(type);
    if (!el) {
      const dir = SYSTEM_TYPES.has(type) ? SYSTEM_DIR : NOTIFICATIONS_DIR;
      el = new Audio(`${dir}/${type}.mp3`);
      el.preload = "auto";
      el.addEventListener("ended", () => {
        if (this.current === el) {
          this.current = null;
          this.currentPriority = 0;
        }
      });
      this.cache.set(type, el);
    }
    return el;
  }

  /** تحميل مسبق لكل الأصوات في الكاش — بلا تشغيل. */
  preloadAll(): void {
    for (const type of ALL_SOUND_TYPES) {
      this.elementFor(type);
    }
  }

  /* ── التشغيل ── */

  /** آخر صوت قُرَّر تشغيله — للتشخيص والتحقق. */
  lastPlayed: { type: SoundType; at: number; volume: number } | null = null;

  /**
   * يشغّل صوت النوع المطلوب مع كل الحراسات:
   *  1) SSR → لا شيء            2) إشعار مكرر (بالمعرّف) → لا شيء
   *  3) الأصوات معطلة → لا شيء   4) التطبيق بالخلفية → لا شيء
   *  5) صوت يعمل وأولوية أدنى/مساوية → لا شيء (توست فقط)
   * ثم: يقطع الحالي إن لزم، يشغّل بالمستوى المحفوظ، ويبثّ حدث الرصد.
   */
  play(type: SoundType, options?: PlayOptions): void {
    if (typeof window === "undefined") return;
    const { force = false, role, notificationId } = options ?? {};

    // 1) منع تكرار نفس الإشعار بين WebSocket والاستطلاع الاحتياطي
    if (notificationId !== undefined) {
      if (this.lastNotificationId !== null && notificationId <= this.lastNotificationId) {
        return;
      }
      this.lastNotificationId = notificationId;
    }

    // 2) إعداد المستخدم (زر «تجربة» يتجاوزه — نية صريحة للتسمّع)
    if (!force && !this.isEnabled()) return;

    // 3) المقدمة فقط — بالخلفية لا أصوات
    if (!force && document.visibilityState !== "visible") return;

    // 4) صوت واحد في كل مرة — بالأولويات (طلب جديد للمالك لا يُسكت)
    let priority = BASE_PRIORITY[type] ?? 5;
    if (role === "owner" && type === "order_new") {
      priority = OWNER_ORDER_NEW_PRIORITY;
    }
    const busy = this.current !== null && !this.current.paused && !this.current.ended;
    if (busy && !force && priority <= this.currentPriority) return;
    if (this.current) {
      this.current.pause();
      try {
        this.current.currentTime = 0;
      } catch {
        /* لم يُحمَّل بعد — يُتجاهل */
      }
    }

    // 5) اهتزاز الجهاز للمالك عند طلب جديد (إن كان مدعوماً)
    if (
      role === "owner" &&
      type === "order_new" &&
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate([120, 60, 120]);
    }

    const el = this.elementFor(type);
    if (!el) return;
    const volume = this.getVolume();
    el.volume = volume;
    try {
      el.currentTime = 0;
    } catch {
      /* لم يُحمَّل بعد — يُتجاهل */
    }
    this.current = el;
    this.currentPriority = priority;
    this.lastPlayed = { type, at: Date.now(), volume };

    // حدث قابل للرصد (أدوات تطوير/تحقق) — يُبثّ عند قرار التشغيل
    window.dispatchEvent(
      new CustomEvent("tawfir:sound-played", {
        detail: { type, volume, priority, role: role ?? null },
      })
    );

    el.play().catch(() => {
      /* منع التشغيل التلقائي قبل أول تفاعل أو قطع — بلا صوت وبلا خطأ */
    });
  }

  /**
   * يشغّل صوت نوع إشعار وارد (من WebSocket أو الاستطلاع الاحتياطي).
   * الأنواع غير المدرجة في خريطة الأصوات الـ15 تمر بلا صوت (توست فقط).
   */
  playNotification(n: Pick<NotificationOut, "id" | "notification_type">, role?: SoundRole): void {
    const type = n.notification_type as SoundType;
    if (!(ALL_SOUND_TYPES as readonly string[]).includes(type)) return;
    this.play(type, { role, notificationId: n.id });
  }

  /** آخر إشعار صوَّته — يُستخدم من الاستطلاع الاحتياطي لمنع التكرار. */
  hasSoundedNotification(id: number): boolean {
    return this.lastNotificationId !== null && id <= this.lastNotificationId;
  }
}

export const SoundService = new SoundServiceClass();
