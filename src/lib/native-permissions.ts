/**
 * native-permissions — طبقة الأذونات الأصلية الموحّدة (APK / Capacitor)
 * ═══════════════════════════════════════════════════════════════════
 * إصلاح «أذونات APK»: داخل WebView الكاباسيتور لا تعمل واجهات الويب
 * للمطالبة بالأذونات (Notification.requestPermission تُرفض بلا نافذة،
 * و navigator.geolocation يعتمد كلياً على أذونات الـManifest) — لذا
 * نمرّ كل طلبات الأذونات عبر الإضافات الأصلية:
 *
 *  • الموقع: @capacitor/geolocation — نافذة السماح الأصلية تظهر فعلياً
 *    عند أول ضغط على «تحميل موقعي» ثم GPS دقيق.
 *  • إشعارات التطبيق: TawfirNative (يولّدها patch-android-identity.mjs)
 *    — POST_NOTIFICATIONS على Android 13+ مع نافذة السماح الأصلية.
 *  • فتح إعدادات التطبيق: TawfirNative.openAppSettings — مسار التعافي
 *    عندما يرفض المستخدم نهائياً (الأندرويد لا يعرض النافذة مجدداً).
 *
 * كل الدوال no-op آمنة على الويب/SSR (تُرجع null / false فوراً).
 */

import { isNativePlatform } from "@/lib/capacitor";

/* ─── شكل إضافة TawfirNative كما يراها الـWebView ─── */

interface TawfirNativePermissionsPlugin {
  requestNotificationsPermission?: () => Promise<{ state: string }>;
  checkNotificationsPermission?: () => Promise<{ state: string }>;
  openAppSettings?: () => Promise<void>;
  getFcmToken?: () => Promise<{ token?: string; available?: boolean }>;
}

function getTawfirNative(): TawfirNativePermissionsPlugin | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const cap = (globalThis as Record<string, unknown>).Capacitor as
    | { Plugins?: Record<string, unknown> }
    | undefined;
  const plugin = cap?.Plugins?.["TawfirNative"];
  return plugin as unknown as TawfirNativePermissionsPlugin | undefined;
}

/* ─── الموقع ─────────────────────────────────────────────────────── */

export interface NativePosition {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type NativeLocationErrorCode =
  | "permission-denied"
  | "location-disabled"
  | "timeout"
  | "unavailable";

export class NativeLocationError extends Error {
  code: NativeLocationErrorCode;
  constructor(code: NativeLocationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "NativeLocationError";
  }
}

/** خيارات جلب الموقع الأصلي — مطابقة لخيارات PositionOptions للويب. */
export interface NativeLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * جلب الموقع الحالي عبر الإضافة الأصلية (@capacitor/geolocation):
 *  - تطلب إذن الموقع الأصلي تلقائياً عند الحاجة (نافذة السماح الحقيقية).
 *  - تدعم تفعيل GPS (موفّر الموقع) إن كان معطلاً على بعض الأجهزة.
 * يُرجع null على غير الأصلي (الويب يستخدم navigator.geolocation كما هو).
 */
export async function getNativeLocationPosition(
  opts: NativeLocationOptions = {},
): Promise<NativePosition | null> {
  if (!isNativePlatform()) return null;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: opts.enableHighAccuracy ?? true,
      timeout: opts.timeout ?? 15000,
      maximumAge: opts.maximumAge ?? 30000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy:
        pos.coords.accuracy != null && pos.coords.accuracy > 0
          ? pos.coords.accuracy
          : null,
    };
  } catch (err) {
    /* خرائط أخطاء الإضافة (OS-PLUG-GLOC-*) إلى رموزنا العربية المفهومة */
    const code = (err as { code?: string })?.code ?? "";
    if (code === "OS-PLUG-GLOC-0003") {
      throw new NativeLocationError(
        "permission-denied",
        "صلاحية الموقع مرفوضة — اسمح بها من إعدادات التطبيق ثم أعد المحاولة",
      );
    }
    if (code === "OS-PLUG-GLOC-0007" || code === "OS-PLUG-GLOC-0008") {
      throw new NativeLocationError(
        "location-disabled",
        "خدمة الموقع (GPS) معطّلة في جهازك — فعّلها ثم أعد المحاولة",
      );
    }
    if (code === "OS-PLUG-GLOC-0009") {
      throw new NativeLocationError(
        "location-disabled",
        "تم رفض طلب تشغيل خدمة الموقع — فعّل GPS من إعدادات جهازك",
      );
    }
    if (code === "OS-PLUG-GLOC-0010") {
      throw new NativeLocationError(
        "timeout",
        "استغرق تحديد موقعك وقتاً أطول — تأكد أنك بمنطقة مكشوفة ثم أعد المحاولة",
      );
    }
    throw new NativeLocationError(
      "unavailable",
      "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع (GPS) ثم أعد المحاولة",
    );
  }
}

/**
 * فحص حالة إذن الموقع الأصلي بلا طلب أي نافذة.
 * يُرجع null على غير الأصلي أو عند فشل الفحص.
 */
export async function checkNativeLocationPermission(): Promise<
  "granted" | "denied" | "prompt" | "prompt-with-rationale" | null
> {
  if (!isNativePlatform()) return null;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    return status.location ?? null;
  } catch {
    return null;
  }
}

/* ─── إشعارات التطبيق (POST_NOTIFICATIONS — Android 13+) ─────────── */

/**
 * طلب إذن إشعارات التطبيق أصلياً عبر TawfirNative — يعرض نافذة السماح
 * الحقيقية للإشعارات (داخل WebView لا تعمل Notification.requestPermission).
 * يُرجع null على غير الأصلي (الويب يستخدم مساره المعتاد).
 */
export async function requestNativeNotificationsPermission(): Promise<
  "granted" | "denied" | "unavailable" | null
> {
  if (!isNativePlatform()) return null;
  const plugin = getTawfirNative();
  if (!plugin || typeof plugin.requestNotificationsPermission !== "function") {
    return "unavailable";
  }
  try {
    const res = await plugin.requestNotificationsPermission();
    return res?.state === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * فحص حالة إذن الإشعارات الأصلي بلا طلب نافذة.
 * يُرجع null على غير الأصلي.
 */
export async function checkNativeNotificationsPermission(): Promise<
  "granted" | "denied" | "unavailable" | null
> {
  if (!isNativePlatform()) return null;
  const plugin = getTawfirNative();
  if (!plugin || typeof plugin.checkNotificationsPermission !== "function") {
    return "unavailable";
  }
  try {
    const res = await plugin.checkNotificationsPermission();
    return res?.state === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/* ─── فتح إعدادات التطبيق (مسار التعافي بعد الرفض النهائي) ───────── */

/**
 * فتح صفحة إعدادات التطبيق في أندرويد (تفعيل الموقع/الإشعارات يدوياً)
 * عبر TawfirNative.openAppSettings. يُرجع false على غير الأصلي أو الفشل.
 */
export async function openNativeAppSettings(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const plugin = getTawfirNative();
  if (!plugin || typeof plugin.openAppSettings !== "function") return false;
  try {
    await plugin.openAppSettings();
    return true;
  } catch {
    return false;
  }
}
