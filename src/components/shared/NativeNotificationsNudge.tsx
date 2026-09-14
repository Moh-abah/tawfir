"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Loader2, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { isNativePlatform } from "@/lib/capacitor";
import {
  checkNativeNotificationsPermission,
  openNativeAppSettings,
  requestNativeNotificationsPermission,
} from "@/lib/native-permissions";
import { haptic } from "@/lib/haptic";

/**
 * NativeNotificationsNudge — شريط تفعيل إشعارات التطبيق داخل الـAPK.
 * ═══════════════════════════════════════════════════════════════════
 * إصلاح «أذونات APK» (الوجه الذي يراه العميل):
 *  • يظهر داخل تطبيق أندرويد فقط (isNativePlatform) عندما يكون إذن
 *    الإشعارات (POST_NOTIFICATIONS) غير مُمنح — مثلاً بعد رفض نافذة
 *    السماح عند أول فتح، أو بعد ترقية النظام.
 *  • «تفعيل الإشعارات» → نافذة السماح الأصلية عبر TawfirNative (داخل
 *    WebView لا تعمل Notification.requestPermission إطلاقاً). إن استمر
 *    الرفض (أندرويد يحجب النافذة بعد رفضين) → زر «افتح الإعدادات».
 *  • لا يظهر على الويب/PWA إطلاقاً، ولا للمستخدم المسجّل خروجه، ولا
 *    بعد الإغلاق اليدوي (يُحفظ محلياً)، ولا بعد التفعيل الناجح.
 */

const DISMISS_KEY = "tawfir_native_notif_nudge_dismissed";

export function NativeNotificationsNudge() {
  const { accessToken, hydrated } = useCustomerAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  /* بعد طلبٍ رُفض (أندرويد يحجب النافذة بعد الرفض المتكرر) — نُظهر
     زر فتح الإعدادات كمسار تعافٍ */
  const [showSettings, setShowSettings] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isNativePlatform() || !hydrated || !accessToken) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    void (async () => {
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return;
        /* تأخير بسيط — لا نزاحم طلبات الإقلاع (FCM/الجلسة/البيانات) */
        await new Promise((r) => setTimeout(r, 2500));
        const state = await checkNativeNotificationsPermission();
        if (state === "denied") {
          setVisible(true);
          setShowSettings(false);
        }
      } catch {
        /* صامت — الشريط ليس حرجاً */
      }
    })();
  }, [hydrated, accessToken]);

  /* عند العودة من الإعدادات: أعد الفحص — إن مُنح الإذن أخفِ الشريط */
  useEffect(() => {
    if (!visible || !isNativePlatform()) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        const state = await checkNativeNotificationsPermission();
        if (state === "granted") setVisible(false);
      })();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [visible]);

  const dismiss = () => {
    haptic("tick");
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* تجاهل */
    }
  };

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    haptic("light");
    try {
      const state = await requestNativeNotificationsPermission();
      if (state === "granted") {
        setVisible(false);
        haptic("success");
        return;
      }
      /* رُفض مجدداً — أندرويد غالباً حجب النافذة: بقي مسار الإعدادات */
      setShowSettings(true);
    } finally {
      setBusy(false);
    }
  };

  const openSettings = async () => {
    haptic("light");
    await openNativeAppSettings();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
          role="alert"
          aria-label="تفعيل إشعارات التطبيق"
        >
          <div className="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-6">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 shadow-soft-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-foreground">
                  فعّل إشعارات توفير
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {showSettings
                    ? "اسمح بالإشعارات من إعدادات التطبيق لتصلك تحديثات طلباتك"
                    : "تصلك تحديثات طلباتك وعروضك الحصرية لحظة وصولها"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {showSettings ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={openSettings}
                    className="h-9 gap-1.5 rounded-full font-bold native-tap"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    الإعدادات
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={enable}
                    disabled={busy}
                    className="h-9 gap-1.5 rounded-full font-bold native-tap"
                  >
                    {busy ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <BellRing className="h-4 w-4" aria-hidden="true" />
                    )}
                    تفعيل
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={dismiss}
                  className="h-9 w-9 rounded-full p-0 text-muted-foreground native-tap"
                  aria-label="إخفاء التنبيه"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
