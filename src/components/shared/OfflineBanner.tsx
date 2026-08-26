"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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

  const isOwnerPortal =
    pathname === null
      ? false
      : pathname.startsWith("/owner") || pathname.startsWith("/admin");

  const goOnline = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBannerState("restored");
    timerRef.current = setTimeout(() => {
      setBannerState("online");
    }, 3000);
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
          "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-auto md:top-0",
          "bg-neutral-900 py-2.5 text-center text-sm font-medium text-white",
          "md:pt-[max(0.625rem,env(safe-area-inset-top))] md:pb-2.5"
        )}
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {isOwnerPortal
            ? "تتطلب بوابة المنشآت اتصالاً بالإنترنت"
            : "لا يتوفر اتصال بالإنترنت"}
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
              "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-auto md:top-0",
              "bg-success px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            )}
          >
            <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>تم استعادة الاتصال</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
