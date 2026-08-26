"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  usePwaStore,
  type InstallPromptEvent,
} from "@/store/pwa.store";
import { APP_VERSION } from "@/lib/pwa/version";

/**
 * مسجّل Service Worker + شريحة «يتوفر تحديث لتطبيق توفير»
 * ══════════════════════════════════════════════════════════
 *  • يسجل /sw.js بعد اكتمال تحميل الصفحة (مرة واحدة لكل أصل).
 *  • عند توفر نسخة جديدة منتظرة يعرض شريحة بأسفل الشاشة وزر
 *    «تحديث الآن» (SKIP_WAITING + إعادة تحميل مرة واحدة).
 *  • فحص تحديث دوري كل ساعة + عند عودة الاتصال.
 *  • عند عودة الاتصال: يبطل استعلامات React Query على مرحلتين
 *    (فوراً ثم بعد 1.5 ثانية) لأن استراتيجية SWR تخدم النسخة
 *    المخزنة فوراً وتُحدّثها في الخلفية — فتلتقط المرحلة الثانية
 *    البيانات المحدثة فعلياً.
 */
export function ServiceWorkerRegistrar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const prefersReduced = usePrefersReducedMotion();
  const [updateReady, setUpdateReady] = useState(false);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);
  const onlineTimerRef = useRef<number | null>(null);

  const setPromptEvent = usePwaStore((s) => s.setPromptEvent);

  /* رسالة SKIP_WAITING → الاستلام → إعادة تحكم واحدة */
  const handleControllerChange = useCallback(() => {
    if (reloadingRef.current) {
      window.location.reload();
    }
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) return;
    reloadingRef.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      /* نسخة منتظرة التقطناها متأخرين */
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setUpdateReady(true);
          }
        });
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (!cancelled) watchRegistration(registration);

        /* فحص تحديث دوري (كل ساعة) */
        intervalId = window.setInterval(() => {
          registration.update().catch(() => undefined);
        }, 60 * 60 * 1000);
      } catch {
        /* بيئة لا تدعم التسجيل — يعمل الموقع كالمعتاد */
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    /* التقاط حدث التثبيت الفوري (زر التثبيت) */
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setPromptEvent(null);
      setUpdateReady(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    /* فحص وضع standalone وجهاز iOS مرة واحدة */
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    usePwaStore.getState().setStandalone(isStandalone);
    usePwaStore.getState().setIos(isIos);

    /* عودة الاتصال: فحص تحديث + إبطال الاستعلامات على مرحلتين */
    const onOnline = () => {
      registrationRef.current?.update().catch(() => undefined);
      void queryClient.invalidateQueries();
      if (onlineTimerRef.current) {
        window.clearTimeout(onlineTimerRef.current);
      }
      onlineTimerRef.current = window.setTimeout(() => {
        void queryClient.invalidateQueries();
      }, 1500);
    };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      if (onlineTimerRef.current) {
        window.clearTimeout(onlineTimerRef.current);
      }
      window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  const slideVariants = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { y: 72, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 72, opacity: 0 },
      };

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          key={`sw-update-${pathname}`}
          role="alert"
          {...slideVariants}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-4 shadow-soft-lg"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <RefreshCw className="h-5 w-5 text-secondary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                يتوفر تحديث لتطبيق توفير
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                الإصدار {APP_VERSION} — حدّث الآن للحصول على أحدث الميزات
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={applyUpdate}
                  className="h-10 gap-2 rounded-full px-5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  تحديث الآن
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setUpdateReady(false)}
                  className="h-10 rounded-full px-4 text-xs"
                >
                  لاحقاً
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUpdateReady(false)}
              aria-label="إغلاق تنبيه التحديث"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
