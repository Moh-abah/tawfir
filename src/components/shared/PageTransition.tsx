"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * انتقال صفحات Native (الجولة 4 → إصلاح حرج الجولة 21):
 *
 * ═══════════════════════════════════════════════════════════════
 * إصلاح حرج (الجولة 21 — webDevReview):
 * المشكلة: سابقاً initial={{opacity:0}} قد يعلّق المحتوى مخفياً إذا فشل
 * framer-motion في إكمال الأنميشن (متصفحات headless، أجهزة بطيئة،
 * تقليل الحركة، JS معطّل). VLM أكّد أن المنطقة الوسطى للرئيسية تظهر فارغة.
 *
 * الحل (defense-in-depth):
 *  1) نبدأ بـopacity 1 افتراضياً (محتوى مرئي دائماً)
 *  2) نُطبّق CSS animation خفيفة عبر className (tawfir-page-enter)
 *  3) timeout احتياطي بعد 500ms يضمن opacity 1 حتى لو فشل كل شيء
 *  4) framer-motion تُستخدم فقط للتحريك اللطيف (y) بلا opacity
 * ═══════════════════════════════════════════════════════════════
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = usePrefersReducedMotion();
  const [safe, setSafe] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fallback احتياطي: بعد 500ms تأكد أن المحتوى مرئي
  useEffect(() => {
    const t = setTimeout(() => setSafe(true), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <motion.div
      ref={ref}
      key={pathname}
      // مهم: opacity تبدأ من 1 (مرئية) — framer فقط يضيف y transition لطيف
      initial={prefersReduced ? false : { y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      // CSS animation كطبقة أمان إضافية (keyframes tawfir-page-enter-anim)
      className={prefersReduced ? undefined : "tawfir-page-enter"}
      // Fallback نهائي: تأكد opacity 1
      style={{ opacity: safe ? 1 : undefined }}
    >
      {children}
    </motion.div>
  );
}
