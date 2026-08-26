"use client";

import { useEffect, useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const CIRCLE_SIZE = 48;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
const prefersReduced = usePrefersReducedMotion();
  const tooltipId = useId();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > 400);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
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

  const bounceKey = visible ? "visible" : "hidden";

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Trail line from bottom to button */}
          <motion.div
            key="trail"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block"
            style={{ originY: 1 }}
          >
            <div
              className="h-[60px] w-px"
              style={{
                background: "linear-gradient(to top, transparent, var(--primary))",
              }}
            />
          </motion.div>

          <motion.button
            type="button"
            key={bounceKey}
            onClick={scrollToTop}
            title="العودة للأعلى"
            aria-label="العودة للأعلى"
            aria-describedby={tooltipId}
            initial={prefersReduced
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.5, y: 8 }
            }
            animate={prefersReduced
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: 1,
                  scale: 1,
                  y: [0, -6, 0],
                  transition: {
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    y: { duration: 0.5, ease: "easeOut" },
                  },
                }
            }
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className={
              "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-40 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-shadow duration-200 hover:shadow-2xl hover:shadow-primary/50 md:bottom-8 md:left-auto md:right-8"
            }
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
                  transition: prefersReduced ? "none" : "stroke-dashoffset 0.15s linear",
                }}
              />
            </svg>
            <ArrowUp className="relative z-10 h-5 w-5" />
            <span id={tooltipId} className="sr-only">العودة للأعلى</span>
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}
