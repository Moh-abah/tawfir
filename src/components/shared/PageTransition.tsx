"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * انتقال صفحات Native (الجولة 4) — 200ms ease-out:
 * دخول خفيف (opacity 0→1 + y 8→0) عند كل تنقّل بين الصفحات.
 * يعاد التشغيل تلقائياً عبر المفتاح pathname.
 * يحترم prefers-reduced-motion (بلا حركة إطلاقاً).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = usePrefersReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
