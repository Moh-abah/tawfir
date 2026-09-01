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
 * إعداد شريط الحالة (Status Bar) — أندرويد فقط.
 *  • اللون: #0A1A2F (الكحلي العميق — هوية توفير)
 *  • النمط: Dark (أيقونات بيضاء على الخلفية الملونة)
 *  • overlaysWebView: true — يرسم الـ WebView فوق شريط الحالة،
 *    فتعمل قواعد safe-area-inset-top الموجودة في globals.css بلا تغيير.
 */
export async function setupNativeStatusBar(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0A1A2F" });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* بيئة لا تدعم المكوّن — صامت */
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

type BackHandlerResult = "close-sheet" | "navigate-back" | "exit";

/**
 * معالج زر الرجوع الأصلي (Android Hardware Back).
 *  • إن كان Sheet/Dialog مفتوحاً: يُغلق (نُرجّعه النتيجة).
 *  • وإلا إن كان history.length > 1: يرجع للخلف.
 *  • وإلا: يخرج من التطبيق.
 *
 * الالتزام: لا نلمس router.next/history مباشرة هنا — نُرجّع النتيجة
 * للمستدعي (NativeBridge) ليقررها وفق سياق React Router.
 */
export type NativeBackHandler = () => BackHandlerResult;

let registeredBackHandler: NativeBackHandler | null = null;

export function setNativeBackHandler(handler: NativeBackHandler | null): void {
  registeredBackHandler = handler;
}

/**
 * ربط مستمع زر الرجوع الأصلي. يُستدعى مرة واحدة من NativeBridge.
 * يستدعي المعالج المُسجَّل (setNativeBackHandler) — الافتراضي: exit.
 */
export async function setupNativeBackButton(): Promise<() => void> {
  if (!isNativePlatform()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const listener = await App.addListener("backButton", () => {
      const result = registeredBackHandler?.() ?? "exit";
      if (result === "exit") {
        void App.exitApp();
      }
      /* close-sheet و navigate-back يتولاهما NativeBridge عبر
         setNativeBackHandler — لا نفعل شيئاً هنا */
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
 * معرّف تطبيق Android — يطابق assetlinks.json (com.tawfir.app).
 * مرجع مركزي لتجنّب التضارب.
 */
export const NATIVE_APP_ID = "com.tawfir.app" as const;
export const NATIVE_APP_NAME = "توفير" as const;
