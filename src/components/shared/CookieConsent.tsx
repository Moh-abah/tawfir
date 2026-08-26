"use client";

import { useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const STORAGE_KEY = "tawfir_cookie_consent";

function useCookieConsent() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }, []);

  const getSnapshot = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  const getServerSnapshot = useCallback(() => {
    return false;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function CookieConsent() {
  const hasConsented = useCookieConsent();
const prefersReduced = usePrefersReducedMotion();

  const handleAccept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  const handleReject = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "rejected");
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  if (hasConsented) return null;

  const slideUp = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { y: 40, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 20, opacity: 0 } };

  return (
    <AnimatePresence>
      {!hasConsented && (
        <motion.div
          {...slideUp}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 px-4 md:bottom-0"
        >
          <div className="glass-card mx-auto max-w-2xl rounded-xl border p-4">
            <p className="text-sm text-foreground leading-relaxed">
              نستخدم ملفات تعريف الارتباط لتحسين تجربتك. بالاستمرار في التصفح فإنك توافق على سياسة الخصوصية.
            </p>
            <div className="mt-3 flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                className="rounded-full min-h-[44px] px-5"
              >
                رفض
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] px-5"
              >
                موافق
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
