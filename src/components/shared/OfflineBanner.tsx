"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BannerState = "online" | "offline" | "restored";

/**
 * شريحة انقطاع الإنترنت — أنيميشن YouTube (الجولة 4):
 *  - الموضع (موبايل): فوق شريط التنقل السفلي — bottom-14 + safe-area
 *  - الموضع (ديسكتوب): أعلى الشاشة
 *  - الظهور: ينزلق من الأسفل للأعلى (translateY من +40 إلى 0) — 280ms ease-out
 *  - الاختفاء: ينزلق للأسفل + Opacity → 0
 *  - خلفية داكنة في الوضعين (bg-neutral-900) + نص أبيض — مثل YouTube
 *  - غير تفاعلية (pointer-events-none) — إشعار صِرف
 *
 * إضافة خاصة (قرار ذاتي): شريحة خضراء «تم استعادة الاتصال» تظهر 3 ثوانٍ
 * عند عودة الشبكة ثم تختفي — رسالة طمأنة نمط Native.
 */
export function OfflineBanner() {
  const pathname = usePathname();
  const [bannerState, setBannerState] = useState<BannerState>("online");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const { t } = useLang();

  const isOwnerPortal =
    pathname === null
      ? false
      : pathname.startsWith("/owner") || pathname.startsWith("/admin");

  const goOnline = useCallback(() => {
    /* إصلاح التوست المتكرر (شكوى المالك): كان أي حدث online — حتى الزائف
       أو المتكرر أثناء اتصال عامل — يعرض شريحة «تم استعادة الاتصال».
       الآن لا تُعرض إلا بعد انقطاع فعلي سابق (الحالة كانت offline). */
    if (timerRef.current) clearTimeout(timerRef.current);
    setBannerState((cur) => {
      if (cur !== "offline") return cur;
      timerRef.current = setTimeout(() => {
        setBannerState("online");
      }, 3000);
      return "restored";
    });
  }, []);

  const goOffline = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBannerState("offline");
  }, []);

  useEffect(() => {
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (!navigator.onLine) {
      const id = requestAnimationFrame(() => goOffline());
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [goOnline, goOffline]);

  /* تحصين (جولة 47): بعض البيئات — ويب-فيو ضعيف الشبكة أو انقطاع لحظي أثناء
     إقلاع الصفحة — تُطلق حدث offline ثم يعود الاتصال دون حدث online مقابل،
     فتعلق الشريحة مزيفة والمتصفح متصل فعلاً (مُثبت حياً على النشر).
     نبض تحقق خفيف كل 4ث: إن كان المتصفح متصلاً والحالة عالقة → استعادة.
     goOnline صامتة إن لم تكن الحالة offline — تكلفة صفرية بلا سلوك جديد. */
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) goOnline();
    }, 4000);
    return () => clearInterval(id);
  }, [goOnline]);

  const isOffline = bannerState === "offline";
  const isRestored = bannerState === "restored";

  /* اتجاه الدخول: من الأسفل على الموبايل (فوق الشريط) ومن الأعلى على الديسكتوب */
  const hiddenY = 40;

  return (
    <>
      {/* شريحة الانقطاع — YouTube style */}
      <motion.div
        role="alert"
        aria-hidden={!isOffline}
        initial={false}
        animate={
          prefersReduced
            ? { opacity: isOffline ? 1 : 0 }
            : {
                y: isOffline ? 0 : hiddenY,
                opacity: isOffline ? 1 : 0,
              }
        }
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 flex items-center justify-center gap-2",
          "bottom-[calc(3.5rem+max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px)))] md:bottom-auto md:top-0",
          "bg-neutral-900 py-2.5 text-center text-sm font-medium text-white",
          "md:pt-[max(0.625rem,env(safe-area-inset-top,0px),var(--cap-safe-top,0px))] md:pb-2.5"
        )}
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {isOwnerPortal
            ? t("profile.offline.ownerPortal")
            : t("profile.offline.noConnection")}
        </span>
      </motion.div>

      {/* شريحة استعادة الاتصال — تظهر 3 ثوانٍ ثم تختفي */}
      <AnimatePresence>
        {isRestored && (
          <motion.div
            role="status"
            initial={
              prefersReduced ? { opacity: 0 } : { y: hiddenY, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { y: hiddenY, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "pointer-events-none fixed inset-x-0 z-40 flex items-center justify-center gap-2",
              "bottom-[calc(3.5rem+max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px)))] md:bottom-auto md:top-0",
              "bg-success px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            )}
          >
            <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("profile.offline.restored")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
