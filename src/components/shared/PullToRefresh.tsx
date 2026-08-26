"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const MAX_PULL = 64; // أقصى امتداد للمؤشر (px)
const THRESHOLD = 56; // عتبة تفعيل التحديث (px)
const RESISTANCE = 0.45; // مقاومة مطاطية — المؤشر يتحرك أبطأ من الإصبع
const MIN_SPIN_MS = 600; // أقل مدة عرض المؤشر الدوّار

interface PullToRefreshProps {
  /** يُستدعى عند تجاوز العتبة وإفلات الإصبع — يُنتظر انتهاؤه */
  onRefresh: () => Promise<unknown> | void;
  children: React.ReactNode;
}

/**
 * السحب للتحديث — Pull-to-Refresh (الجولة 4):
 *  - يعمل فقط على أجهزة اللمس (pointer: coarse) وبلا prefers-reduced-motion
 *  - عند أعلى الصفحة: السحب للأسفل يسحب مؤشراً دائرياً بمقاومة مطاطية
 *  - تجاوز 56px + الإفلات → دوران (pull-refresh-spin) + onRefresh
 *  - لا يعترض التمرير العادي إطلاقاً (بلا preventDefault)
 *  - المستخدم يستمر في رؤية المحتوى خلف المؤشر (نمط YouTube)
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPull(MAX_PULL);
    const startedAt = Date.now();
    try {
      await onRefreshRef.current();
    } finally {
      /* نضمن مدة عرض دنيا للمؤشر كي لا يلمع ويختفي فوراً */
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed));
      }
      refreshingRef.current = false;
      setRefreshing(false);
      setPull(0);
    }
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    /* أجهزة اللمس فقط — على الديسكتوب لا شيء يُركّب إطلاقاً */
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const getScrollTop = () =>
      (document.scrollingElement ?? document.documentElement).scrollTop;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) {
        startYRef.current = null;
        return;
      }
      startYRef.current = getScrollTop() <= 0 ? e.touches[0].clientY : null;
      pullRef.current = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (startYRef.current == null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && getScrollTop() <= 0) {
        pullRef.current = Math.min(dy * RESISTANCE, MAX_PULL);
        setPull(pullRef.current);
      } else if (pullRef.current !== 0) {
        pullRef.current = 0;
        setPull(0);
      }
    };

    const onEnd = () => {
      if (startYRef.current == null) return;
      startYRef.current = null;
      if (pullRef.current >= THRESHOLD) {
        void doRefresh();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [prefersReduced, doRefresh]);

  const progress = Math.min(pull / THRESHOLD, 1);
  const visible = pull > 0 || refreshing;

  return (
    <div className="relative">
      {/* المؤشر — دائرة تدور أعلى الصفحة أثناء السحب */}
      <div
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: `translateY(${Math.max(pull - 32, -32)}px)` }}
      >
        <span
          role="status"
          aria-label={refreshing ? "جاري التحديث" : "اسحب للتحديث"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card text-primary shadow-md",
            refreshing && "pull-refresh-spin"
          )}
          style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : undefined}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {children}
    </div>
  );
}
