"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * عارض صور ملء الشاشة — الجولة 16 (ميزة جديدة):
 *  - فتح من صفحة الوجبة (نقر على الصورة) أو أي صورة قابلة للتكبير
 *  - قرص الإصبعين (pinch) للتكبير/التصغير حتى 4x
 *  - نقر مزدوج: تبديل بين 1x و 2.5x
 *  - سحب للتحريك عند التكبير (pan) — مطاطية زنبركية عند الحواف
 *  - سحب لأسفل سريع عند 1x → إغلاق (swipe-to-dismiss)
 *  - ESC للإغلاق + قفل تمرير الخلفية + aria-modal كامل
 *  - دعم تقليل الحركة: بلا زنبركات — ظهور/اختفاء بتلاشي فقط
 *
 * البنية: المكوّن الخارجي يدير AnimatePresence فقط، والمحتوى الداخلي
 * (LightboxContent) يُركَّب من جديد عند كل فتح/تغيير صورة — فتكون كل
 * الحالة الداخلية (loaded/zoom/scale) طازجة بلا تأثيرات تصفير.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!src) return null;

  return (
    <AnimatePresence>
      {open && (
        <LightboxContent key={src} src={src} alt={alt} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

function LightboxContent({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const pinchBase = useRef(1);
  const pinchStartDist = useRef(0);
  const lastTap = useRef(0);

  /* ── إغلاق ── */
  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  /* ── ESC للإغلاق + +/- للتكبير + قفل تمرير الخلفية ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") {
        const next = Math.min(4, scale + 0.5);
        setScale(next);
        setZoomed(next > 1);
      }
      if (e.key === "-") {
        const next = Math.max(1, scale - 0.5);
        setScale(next);
        setZoomed(next > 1);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /* ── نقر مفرد/مزدوج على الصورة ── */
  const handleTap = useCallback(() => {
    const now = Date.now();
    const isDouble = now - lastTap.current < 300;
    lastTap.current = now;
    if (isDouble) {
      lastTap.current = 0;
      const nextZoomed = !zoomed;
      setZoomed(nextZoomed);
      setScale(nextZoomed ? 2.5 : 1);
    }
  }, [zoomed]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`عرض ${alt}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* زر الإغلاق — أعلى اليمين (RTL) */}
      <button
        type="button"
        onClick={close}
        aria-label="إغلاق العارض"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/25 active:scale-95"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* مؤشر مستوى التكبير — z-10 فوق الصورة المكبّرة */}
      <div
        className="pointer-events-none absolute left-4 top-6 z-10 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tabular-nums text-white backdrop-blur"
        aria-hidden="true"
      >
        {scale.toFixed(1)}x
      </div>

      {/* الصورة — سحب للتحريك عند التكبير، سحب لأسفل للإغلاق عند 1x */}
      <motion.div
        className={cn(
          "relative h-full w-full touch-none select-none",
          !zoomed && "cursor-zoom-in",
          zoomed && "cursor-grab active:cursor-grabbing"
        )}
        drag={!isPinching}
        dragElastic={zoomed ? 0.08 : 0.6}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          /* سحب لأسفل سريع عند 1x → إغلاق */
          if (!zoomed && info.velocity.y > 500 && info.offset.y > 80) {
            close();
          }
        }}
        animate={{ scale: prefersReduced ? (zoomed ? 2.5 : 1) : scale }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 28 }
        }
        onTap={handleTap}
        onTouchStart={(e) => {
          /* بدء القرص — إصبعان: سجّل المسافة الأساس وعطّل السحب */
          if (e.touches.length === 2) {
            setIsPinching(true);
            pinchBase.current = scale;
            pinchStartDist.current = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
          }
        }}
        onTouchMove={(e) => {
          /* أثناء القرص — نسبة المسافة الحالية للأصل تحدّد التكبير */
          if (
            e.touches.length === 2 &&
            pinchStartDist.current > 0
          ) {
            const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = dist / pinchStartDist.current;
            const next = Math.min(
              4,
              Math.max(1, pinchBase.current * ratio)
            );
            setScale(next);
            setZoomed(next > 1.05);
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2 && pinchStartDist.current > 0) {
            pinchStartDist.current = 0;
            /* أطلق قفل السحب بعد لحظة حتى لا يقفز بعد نهاية القرص */
            setTimeout(() => setIsPinching(false), 60);
            if (scale < 1.15) {
              setScale(1);
              setZoomed(false);
            }
          }
        }}
        style={{ maxWidth: "100vw", maxHeight: "100dvh" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
              aria-hidden="true"
            />
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className={cn(
            "object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          priority
        />
      </motion.div>

      {/* تلميح الإيماءة — يظهر عند 1x فقط */}
      {!zoomed && (
        <motion.div
          className="pointer-events-none absolute bottom-8 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
          aria-hidden="true"
        >
          <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          اضغط مرتين للتكبير · اسحب لأسفل للإغلاق
        </motion.div>
      )}
    </motion.div>
  );
}
