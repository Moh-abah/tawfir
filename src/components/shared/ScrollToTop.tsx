"use client";

import { useEffect, useState, useId } from "react";
import { ArrowUp } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const CIRCLE_SIZE = 48;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * زر العودة للأعلى (الجولة 21 — إعادة كتابة بدون AnimatePresence):
 *
 * ═══════════════════════════════════════════════════════════════
 * إصلاح حرج: سابقاً AnimatePresence + motion.button قد لا يُنشئ الزر
 * في المتصفحات headless أو عند فشل الأنميشن. الآن نستخدم CSS transitions
 * فقط (opacity/scale) — أسرع وأكثر موثوقية.
 * ═══════════════════════════════════════════════════════════════
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const prefersReduced = usePrefersReducedMotion();
  const tooltipId = useId();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > 400);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min(scrollY / docHeight, 1));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <>
      {/* Trail line from bottom to button (desktop only) */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="h-[60px] w-px"
          style={{
            background:
              "linear-gradient(to top, transparent, var(--primary))",
          }}
        />
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        title="العودة للأعلى"
        aria-label="العودة للأعلى"
        aria-describedby={tooltipId}
        data-visible={visible ? "1" : "0"}
        className={cn(
          "fixed bottom-[calc(5rem+max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px)))] left-4 z-40 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-2xl hover:shadow-primary/50 hover:scale-110 active:scale-95 md:bottom-8 md:left-auto md:right-8",
          visible
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-50 pointer-events-none",
        )}
        style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
      >
        {/* SVG progress ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          aria-hidden="true"
        >
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            className="text-primary-foreground/20"
          />
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            className="text-white"
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset,
              transition: prefersReduced
                ? "none"
                : "stroke-dashoffset 0.15s linear",
            }}
          />
        </svg>
        <ArrowUp className="relative z-10 h-5 w-5" />
        <span id={tooltipId} className="sr-only">
          العودة للأعلى
        </span>
      </button>
    </>
  );
}
