/**
 * طبقة Capacitor الرقيقة — توفير (Tawfir)
 * ═══════════════════════════════════════════════════════════════
 * غرض واحد: كشف بيئة Native (أندرويد عبر Capacitor) وتشغيل المكوّنات
 * الأصلية (Status Bar / Splash / Back Button / Haptics / Network)
 * دون أي تأثير على بنية الويب.
 *
 * مبادئ التصميم (احترام قاعدة «بلا تعقيد — مشروع Next.js واحد»):
 *  • isNativePlatform() متزامن وآمن على الويب وSSR (يُرجع false دائماً).
 *  • كل المكوّنات الأصلية تُستورد ديناميكياً (dynamic import) داخل
 *    دوال async — فلا تدخل أي كود Capacitor إضافي حزمة الويب الإنتاجية.
 *  • عند الفشل أو البيئة غير الأصلية: عمليات no-op صامتة.
 *
 * لماذا لا نلمس API_BASE (المسارات النسبية /api)؟
 *  لأن المسار المختار (Path 2 — Live WebView) يجعل أصل الـ WebView هو
 *  نفسه موقع توفير الحي (https://tawfir.giize.com) — فتعمل إعادة كتابة
 *  Next.js /api/* ← الباك إند الحي تماماً كما في المتصفح. بلا تبديل.
 */

import type { HapticPattern } from "@/lib/haptic";

let cachedNative: boolean | null = null;

/**
 * هل نحن داخل تطبيق Native (Capacitor أندرويد)؟
 * متزامن — يُستدعى في أي سياق (SSR/العميل) بلا أعراض جانبية.
 *
 * على الخادم (SSR/Node) ليس هناك globalThis.Capacitor ← false.
 * على الويب: Capacitor core يُرجع النظام الأساسي «web» ← false.
 * على Native: Capacitor core يُرجع «android» ← true.
 */
export function isNativePlatform(): boolean {
  if (cachedNative !== null) return cachedNative;
  if (typeof globalThis === "undefined") {
    cachedNative = false;
    return false;
  }
  try {
    /* استيراد ثابت آمن: @capacitor/core صغير (~10KB) ويعمل على كل بيئة.
       isNativePlatform() يقرأ globalThis.Capacitor الذي يُحقنه الجسر الأصلي. */
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core") as typeof import("@capacitor/core");
    cachedNative = Capacitor.isNativePlatform();
  } catch {
    cachedNative = false;
  }
  return cachedNative;
}

/**
 * إعداد شريط الحالة + شريط التنقل (Status Bar + Navigation Bar) —
 * أندرويد فقط — متزامن مع الثيم (إصلاح ملاحظات المستخدم الثلاث).
 *  • الوضع الفاتح: أيقونات داكنة (Style.Light = أيقونات داكنة — تسمية
 *    المكتبة معكوسة!) + ألوان فاتحة #F7F7F7.
 *  • الوضع الداكن: أيقونات فاتحة (Style.Dark) + كحلي الهوية #0A1A2F.
 *  • الشريط السفلي (Navigation Bar): عبر إضافة TawfirNative الأصلية
 *    (setSystemBars) لأن @capacitor/status-bar لا يغطيه إطلاقاً —
 *    أيقونات أزرار (رجوع/رئيسية/تطبيقات) تتبع الثيم، ولون الشريط
 *    يتبع الثيم (قبل Android 15) أو شفاف يتلوّن بالمحتوى (15+).
 *  • overlaysWebView: true — يرسم الـ WebView فوق شريط الحالة،
 *    فتعمل قواعد safe-area (pt-safe/max(env,var(--cap-safe-top)))
 *    — انظر globals.css.
 *  يُستدعى من NativeBridge عند الإقلاع + عند كل تبديل ثيم.
 */
export async function setupNativeStatusBar(
  theme?: "light" | "dark",
): Promise<void> {
  if (!isNativePlatform()) return;
  const dark = theme !== "light";
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    /* تسمية @capacitor/status-bar معكوسة: Style.Dark = أيقونات فاتحة
       للخلفيات الداكنة، Style.Light = أيقونات داكنة للفاتحة. */
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: dark ? "#0A1A2F" : "#F7F7F7",
    });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* بيئة لا تدعم المكوّن — صامت */
  }
  /* شريط التنقل السفلي — عبر TawfirNative (نفس الثيم) */
  await setNativeSystemBars(dark);
}

/** ألوان أشرطة النظام حسب الثيم — نفس لوحة الهوية */
const BAR_LIGHT = "#F7F7F7";
const BAR_DARK = "#0A1A2F";

/** شكل إضافة TawfirNative كما يراها الـWebView (طرق اختيارية) */
type TawfirNativePlugin = {
  setSystemBars?: (opts: {
    dark: boolean;
    statusBarColor: string;
    navigationBarColor: string;
  }) => Promise<void>;
  getSafeAreaInsets?: () => Promise<{
    top?: number;
    bottom?: number;
  }>;
};

/**
 * الوصول لإضافة TawfirNative الأصلية عبر جسر Capacitor (بلا حزم npm
 * إضافية — الإضافة يولّدها patch-android-identity.mjs في الـAPK).
 */
function getTawfirNative(): TawfirNativePlugin | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const cap = (globalThis as Record<string, unknown>).Capacitor as
    | { Plugins?: Record<string, unknown> }
    | undefined;
  const plugin = cap?.Plugins?.["TawfirNative"];
  return plugin as unknown as TawfirNativePlugin | undefined;
}

/**
 * تطبيق ثيم شريط التنقل السفلي (+شريط الحالة احتياطاً) عبر TawfirNative:
 *  • أيقونات الأزرار (رجوع/رئيسية/تطبيقات) — داكنة في الفاتح وفاتحة
 *    في الداكن (WindowInsetsController.isAppearanceLightNavigationBars)
 *    ← يعمل على كل الإصدارات بما فيها Android 15 Edge-to-Edge.
 *  • الألوان الصلبة — قبل Android 15 فقط (في 15+ الشريط شفاف يتلوّن
 *    بخلفية المحتوى ذاته).
 * يُستدعى من setupNativeStatusBar مع كل تبديل ثيم.
 */
async function setNativeSystemBars(dark: boolean): Promise<void> {
  const plugin = getTawfirNative();
  if (!plugin || typeof plugin.setSystemBars !== "function") return;
  try {
    await plugin.setSystemBars({
      dark,
      statusBarColor: dark ? BAR_DARK : BAR_LIGHT,
      navigationBarColor: dark ? BAR_DARK : BAR_LIGHT,
    });
  } catch {
    /* إصدار APK قديم بلا الإضافة — صامت */
  }
}

/**
 * مزامنة متغيرات Safe-Area (--cap-safe-top/--cap-safe-bottom) من
 * WindowInsets الأصلية للـWebView عبر TawfirNative.getSafeAreaInsets.
 * • WebView أندرويد (قبل 15 / بلا Notch) يُرجع env(safe-area-inset-*)
 *   = 0 لأشرطة النظام — هذه الدالة تضخ القيم الفعلية كمتغيرات CSS
 *   تستهلكها قواعد max(env(...), var(--cap-safe-*)) في globals.css.
 * • يعاد النداء عند resize (تدوير/تغيّر أشرطة النظام) من NativeBridge.
 */
export async function syncNativeSafeArea(): Promise<void> {
  if (!isNativePlatform() || typeof document === "undefined") return;
  const plugin = getTawfirNative();
  if (!plugin || typeof plugin.getSafeAreaInsets !== "function") return;
  try {
    const insets = await plugin.getSafeAreaInsets();
    if (!insets) return;
    const root = document.documentElement;
    if (typeof insets.top === "number" && Number.isFinite(insets.top)) {
      root.style.setProperty("--cap-safe-top", `${Math.max(0, insets.top)}px`);
    }
    if (typeof insets.bottom === "number" && Number.isFinite(insets.bottom)) {
      root.style.setProperty(
        "--cap-safe-bottom",
        `${Math.max(0, insets.bottom)}px`,
      );
    }
  } catch {
    /* إصدار APK قديم بلا الإضافة — صامت */
  }
}

/**
 * إخفاء شاشة الإقلاع (Splash) — أندرويد فقط.
 *  • Capacitor يُظهر الأيقونة 512 + خلفية #0A1A2F تلقائياً عند الإطلاع.
 *  • نُخفيها بعد أن يُحمّل التطبيق (يستدعيها NativeBridge بعد أول
 *    paint أو بعد 800ms كحد أقصى احتياطي).
 */
export async function hideNativeSplash(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* صامت */
  }
}

/* ═══════════════════════════════════════════════════════════════════
   زر الرجوع الأصلي (Android Hardware Back) — مُعاد البناء بالكامل
   ═══════════════════════════════════════════════════════════════════
   الخلل القديم (شكوى المستخدم: «زر الرجوع لا يستجيب داخل شاشة تفاصيل
   منتج / الملف الشخصي»): المعالج القديم كان يُعيد نصّاً وصفياً فقط
   ("navigate-back") دون تنفيذ أي إجراء فعلي — فلا الرجوع يحدث ولا
   الطبقة المفتوحة تُغلق ولا التطبيق يخرج. ضغطة زر الرجوع تتبخر.

   القرار الجديد (بترتيب الأولوية — مثل تطبيقات أندرويد الأصلية):
    1) طبقة مفتوحة (Sheet/Drawer/Dialog/Popover/Menu/Select/عارض
       الصور) → تُغلق وحدها دون مغادرة الشاشة خلفها.
    2) يوجد تاريخ تنقّل داخل التطبيق (canGoBack من WebView) →
       رجوع خطوة واحدة (history.back) — يعمل مع Next App Router لأن
       pushState يُنشئ مدخلات تاريخ WebView حقيقية.
    3) شاشة وصلت من رابط عميق بارد (إشعار FCM فتح /orders/123
       مباشرة) بلا أي تاريخ → العودة للرئيسية بدل الخروج المفاجئ.
    4) الرئيسية نفسها بلا تاريخ → «اضغط رجوع مرة أخرى للخروج» —
       ضغطة ثانية خلال النافذة تُخرج فعلياً (نمط التطبيقات العربية).
*/

/** محدِّد الطبقات المفتوحة — Radix (Dialog/Sheet/Drawer(vaul)/Popover/
 *  DropdownMenu/Select) عبر data-state + عارض الصور المخصص (Lightbox)
 *  عبر aria-modal. لا يشمل Tooltip (عابر) ولا AlertDialog (مقصود
 *  عدم إغلاقه بـEscape — والكثير غير مستخدم في التطبيق أصلاً). */
const OPEN_OVERLAY_SELECTOR = [
  "[data-state='open'][role='dialog']",
  "[data-state='open'][role='presentation']",
  "[data-state='open'][role='menu']",
  "[data-state='open'][role='listbox']",
  "[role='dialog'][aria-modal='true']",
].join(", ");

/**
 * إغلاق الطبقة العليا المفتوحة (إن وُجدت) — بثّ حدث Escape اصطناعي
 * على document: طبقات Radix (DismissableLayer) تستمع له على document
 * وتُغلق العليا فقط، وعارض الصور ImageLightbox يستمع له على window
 * (الحدث الفقاعي يصلهما معاً). يُرجع true إن وُجدت طبقة مفتوحة
 * (استُهلكت ضغطة الرجوع في إغلاقها).
 */
function closeTopOverlay(): boolean {
  if (typeof document === "undefined") return false;
  if (!document.querySelector(OPEN_OVERLAY_SELECTOR)) return false;
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
}

type BackHandlerResult = "close-sheet" | "navigate-back" | "exit";

/**
 * قرار ضغطة زر الرجوع — ينفّذ الإجراء فوراً ويعيد وصفه.
 * canGoBack يأتي من حمولة حدث Capacitor (WebView.canGoBack) — أدقّ
 * من window.history.length الذي يبقى >1 حتى بعد الرجوع للمدخل الأول
 * (فيبدو الزر «ميتاً» عند الضغط من الرئيسية بعد تصفح سابق).
 */
export function nativeBackDecision(canGoBack: boolean): BackHandlerResult {
  /* 1) طبقة مفتوحة → أغلقها فقط (بلا تنقّل) */
  if (closeTopOverlay()) return "close-sheet";
  /* 2) تاريخ تنقّل داخلي → رجوع خطوة واحدة */
  if (canGoBack) {
    window.history.back();
    return "navigate-back";
  }
  /* 3) رابط عميق بارد بلا تاريخ → الرئيسية أولاً */
  if (window.location.pathname !== "/") {
    window.location.assign("/");
    return "navigate-back";
  }
  /* 4) الرئيسية بلا تاريخ → خروج بنقرة مزدوجة */
  return "exit";
}

/** نافذة النقرة المزدوجة للخروج — تطابق مدة بقاء التوست (4 ثوانٍ) */
const EXIT_DOUBLE_PRESS_MS = 4000;
let lastExitPressAt = 0;

/**
 * الخروج بالنقرة المزدوجة + توست عربي عبر نظام التوست الموحّد
 * (use-toast مبني على module-store — يُستدعى من خارج React بأمان).
 * الضغطة الأولى: توست إرشادي. الثانية خلال النافذة: خروج فعلي.
 */
async function exitWithDoublePress(): Promise<void> {
  const { App } = await import("@capacitor/app");
  const now = Date.now();
  if (now - lastExitPressAt < EXIT_DOUBLE_PRESS_MS) {
    lastExitPressAt = 0;
    void App.exitApp();
    return;
  }
  lastExitPressAt = now;
  try {
    const { toast } = await import("@/hooks/use-toast");
    toast({ title: "اضغط رجوع مرة أخرى للخروج" });
  } catch {
    /* نظام التوست غير متاح — الخروج يبقى متاحاً بالضغطة الثانية */
  }
}

/**
 * ربط مستمع زر الرجوع الأصلي — أندرويد فقط، يُستدعى مرة واحدة من
 * NativeBridge عند الإقلاع. على الويب/SSR: no-op صامت.
 */
export async function setupNativeBackButton(): Promise<() => void> {
  if (!isNativePlatform()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const listener = await App.addListener(
      "backButton",
      ({ canGoBack }) => {
        const result = nativeBackDecision(canGoBack);
        if (result === "exit") {
          void exitWithDoublePress();
        }
      },
    );
    return () => {
      void listener.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * ربط مستمع فتح الروابط الأصلية (Universal Links على iOS / Deep Links)
 * — يُستدعى مرة واحدة من NativeBridge عند الإقلاع.
 * • iOS: عند فتح رابط https://tawfir.giize.com/... من Safari/الرسائل
 *   يفتح iOS التطبيق (عبر apple-app-site-association + entitlement
 *   applinks) لكن Capacitor لا يوجّه الـWKWebView تلقائياً — يبثّ
 *   حدث appUrlOpen للـJS فقط. هذا المستمع يكمل الحلقة: يأخذ الرابط
 *   ويوجّه الـWebView إليه (الموقع نفسه أصلاً — location.assign كامل).
 * • أندرويد: نفس الحدث يعمل مع فلتر autoVerify في الـManifest.
 * • على الويب/SSR: no-op صامت.
 */
export async function setupNativeUrlOpen(): Promise<() => void> {
  if (!isNativePlatform()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const listener = await App.addListener("appUrlOpen", ({ url }) => {
      if (!url || typeof url !== "string") return;
      /* نقبل فقط روابط موقع توفير نفسه (أصل الـWebView) — أي رابط
         خارجي يُتجاهل صامتاً حفاظاً على الأمن. */
      try {
        const parsed = new URL(url);
        if (parsed.hostname !== "tawfir.giize.com") return;
        const target = parsed.pathname + parsed.search + parsed.hash;
        if (target === "/" && window.location.pathname === "/") return;
        window.location.assign(target);
      } catch {
        /* رابط غير صالح — تجاهل */
      }
    });
    return () => {
      void listener.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * اهتزاز لمسي عبر الجسر الأصلي (أندرويد فقط).
 *  • «tick/light/success» تُترجم إلى أنماط HapticsStyle المقابلة.
 *  • على الويب: no-op (نستدعي navigator.vibrate من haptic.ts بدلاً منها).
 */
export async function nativeHaptic(pattern: HapticPattern): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (pattern === "tick") {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (pattern === "light") {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (pattern === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    }
  } catch {
    /* صامت */
  }
}

type NetworkStatus = { connected: boolean; connectionType: string };

type NetworkListener = (status: NetworkStatus) => void;

/**
 * مراقبة حالة الشبكة الأصلية (أندرويد فقط).
 *  • يُستدعى عند كل تغيّر (اتصال/انقطاع) بقيمة {connected, connectionType}.
 *  • يُرجّع دالة الإزالة.
 */
export async function watchNativeNetwork(
  callback: NetworkListener
): Promise<() => void> {
  if (!isNativePlatform()) return () => {};
  try {
    const { Network } = await import("@capacitor/network");
    const listener = await Network.addListener("networkStatusChange", (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });
    /* الحالة الراهنة فوراً */
    const current = await Network.getStatus();
    callback({ connected: current.connected, connectionType: current.connectionType });
    return () => {
      void listener.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * إصلاح الإشعارات داخل APK (Capacitor Live WebView): الـWebView لا يدعم
 * PushManager فلا يعمل web push فيه إطلاقاً. إضافة TawfirNative الأصلية
 * (يولّدها patch-android-identity.mjs) توفّر توكن FCM الأصلي عبر جسر
 * Capacitor — يقرأه الـWebView ويسجّله في الباك إند بمصادقة المستخدم
 * الحالي (المسار الطبيعي POST /fcm/token) فتصل الإشعارات المستهدفة
 * للتطبيق المثبّت. يعيد null على الويب أو إن لم تتوفر الإضافة.
 */
export async function getNativeFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cap = (globalThis as Record<string, unknown>).Capacitor as
    | {
        isNativePlatform?: () => boolean;
        Plugins?: Record<string, { getFcmToken?: () => Promise<{ token?: string; available?: boolean }> }>;
      }
    | undefined;
  if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) {
    return null;
  }
  const plugin = cap.Plugins?.["TawfirNative"];
  if (!plugin || typeof plugin.getFcmToken !== "function") return null;
  try {
    const res = await plugin.getFcmToken();
    if (res?.available && res.token) return String(res.token);
    return null;
  } catch {
    return null;
  }
}

/**
 * معرّف تطبيق Android — يطابق assetlinks.json (com.tawfir.ye.app).
 * (كان قديماً com.tawfir.app — خلاف الـassetlinks والحزمة الفعلية).
 * مرجع مركزي لتجنّب التضارب.
 */
export const NATIVE_APP_ID = "com.tawfir.ye.app" as const;
export const NATIVE_APP_NAME = "توفير" as const;
