"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  isNativePlatform,
  setupNativeStatusBar,
  hideNativeSplash,
  setupNativeBackButton,
  setNativeBackHandler,
  watchNativeNetwork,
} from "@/lib/capacitor";

/**
 * جسر Capacitor الأصلي — يُركّب مرة واحدة في Providers.
 * ═══════════════════════════════════════════════════════════════
 * يعمل فقط داخل تطبيق Native (أندرويد). على الويب: كل الدوال no-op
 * صامتة، فلا تكلّف إطلاقاً (0 تأثير على الويب الإنتاجي).
 *
 * المسؤوليات:
 *  1) Status Bar: لون #0A1A2F (كحلي الهوية) + نمط Dark + overlaysWebView (safe-area CSS)
 *  2) Splash Screen: إخفاء تلقائي بعد أول paint أو 800ms (أيهما أخير)
 *  3) Back Button (Hardware): Sheet مفتوح → أغلق / history>1 → back / وإلا exit
 *  4) Network: عند عودة الاتصال → إطلاق حدث online لإبطال الكاش
 *
 * لا يلمس: API_BASE، الـ Service Worker، الـ manifest، أو أي منطق ويب.
 * كل ذلك يعمل كما هو لأن أصل الـ WebView = الموقع الحي.
 */
export function NativeBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const sheetOpenRef = React.useRef(false);

  /* تتبّع أي Sheet/Dialog مفتوح عبر data-state على الـ body */
  React.useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    /* المراقب: أي عنصر [data-state="open"] من نوع Sheet/Dialog/Drawer */
    const observer = new MutationObserver(() => {
      const open = !!document.querySelector(
        "[data-state='open'][role='dialog'], [data-state='open'][role='presentation'], [data-state='open'].vaul-drawer"
      );
      setSheetOpen(open);
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => observer.disconnect();
  }, []);

  /* إعداد الجسر — مرة واحدة */
  React.useEffect(() => {
    if (!isNativePlatform()) return;

    /* ─── وضع التطبيق الأصيل: وسم <html> بـ data-native ───
       يُفعّل قواعد CSS الخاصة بالـAPK فقط (تعطيل التقريب بإصبعين،
       منع سحب الصور، تحسين الإحساس). لا يؤثر على الويب/PWA إطلاقاً. */
    document.documentElement.setAttribute("data-native", "1");

    /* ─── تعطيل التقريب بإصبعين (pinch-zoom) داخل الـAPK فقط ───
       نعدّل <meta name="viewport"> ديناميكياً لإضافة maximum-scale=1
       وuser-scalable=no. هذا الحل يعمل فوراً داخل WebView الحي
       (https://tawfir.giize.com) دون إعادة بناء الـAPK — لأن React
       يُحمّل حياً وNativeBridge يعمل بعد الترطيب.
       على الويب/PWA: لا يُنفّذ (مُحاط بـ isNativePlatform). */
    const lockViewportZoom = () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return;
      const cur = meta.getAttribute("content") ?? "";
      if (!/maximum-scale/i.test(cur)) {
        meta.setAttribute(
          "content",
          cur.replace(/,\s*$/, "") +
            ", maximum-scale=1, user-scalable=no, minimum-scale=1",
        );
      }
    };
    lockViewportZoom();
    /* إعادة التطبيق عند تغيّر المسار (قد يُعاد بناء الـmeta) */
    const observer = new MutationObserver(lockViewportZoom);
    observer.observe(document.head, {
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });

    let removeBack: (() => void) | null = null;
    let removeNetwork: (() => void) | null = null;

    (async () => {
      /* 1) Status Bar */
      await setupNativeStatusBar();

      /* 2) Splash hide — بعد أول paint أو 800ms احتياطي */
      const splashTimer = window.setTimeout(() => {
        void hideNativeSplash();
      }, 800);
      requestAnimationFrame(() => {
        /* إن كان أول paint جاهزاً قبل المؤقّت */
        window.clearTimeout(splashTimer);
        void hideNativeSplash();
      });

      /* 3) Back Button — تسجيل المعالج الديناميكي */
      setNativeBackHandler(() => {
        if (sheetOpenRef.current) return "close-sheet";
        if (window.history.length > 1) return "navigate-back";
        return "exit";
      });
      removeBack = await setupNativeBackButton();

      /* 4) Network — إطلاق حدث online/offline عند تغيّر الاتصال
            (ServiceWorkerRegistrar يستمع لـ online لإبطال الكاش) */
      removeNetwork = await watchNativeNetwork((status) => {
        if (status.connected) {
          window.dispatchEvent(new Event("online"));
        } else {
          window.dispatchEvent(new Event("offline"));
        }
      });
    })();

    return () => {
      setNativeBackHandler(null);
      removeBack?.();
      removeNetwork?.();
      observer.disconnect();
    };
  }, []);

  /* استخدام pathname و router في سياق (تفادي تحذير lint للقيم غير المستخدمة) */
  React.useEffect(() => {
    void pathname;
  }, [pathname]);
  void router;

  return null;
}
