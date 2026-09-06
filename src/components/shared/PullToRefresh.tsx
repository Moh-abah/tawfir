"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const MAX_PULL = 72; // أقصى امتداد للمؤشر (px)
const THRESHOLD = 60; // عتبة تفعيل التحديث (px)
const RESISTANCE = 0.42; // مقاومة مطاطية — المؤشر يتحرك أبطأ من الإصبع
const MIN_SPIN_MS = 720; // أقل مدة عرض المؤشر الدوّار
const HIDE_DELAY = 220; // مدة انسحاب المؤشر بعد التحديث (ms)

interface PullToRefreshProps {
  /** يُستدعى عند تجاوز العتبة وإفلات الإصبع — يُنتظر انتهاؤه */
  onRefresh: () => Promise<unknown> | void;
  children: React.ReactNode;
}

/**
 * شعار توفير «ت» — رسم SVG خفيف بهوية التطبيق (ذهبي على كحلي).
 * يُستخدم داخل مؤشر السحب للتحديث لإعطاء إحساس Native بهوية توفير
 * (بديل أيقونة المتصفح الافتراضية RefreshCw).
 */
function TawfirMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* خلفية كحلية دائرية */}
      <circle cx="24" cy="24" r="22" fill="#0A1A2F" />
      {/* الحرف «ت» بأسلوب توفير — ذهبي */}
      <path
        d="M24 9.5c-5.2 0-9.4 1.7-9.4 3.8 0 1.6 2.6 2.8 6.3 3.4v3.1h-4.2c-.7 0-1.3.6-1.3 1.3 0 .7.6 1.3 1.3 1.3h4.2v11.6c0 1.2 1 2.2 2.2 2.2h1.8c1 0 1.8-.8 1.8-1.8V14.6c3.4-.7 5.7-2 5.7-3.5 0-1.9-3.6-3.6-8.4-3.6z"
        fill="#D4AF37"
      />
    </svg>
  );
}

/**
 * السحب للتحديث — Pull-to-Refresh (إعادة تصميم الجولة 20 — نمط نيتفليكس بهوية توفير):
 *  - يعمل فقط على أجهزة اللمس (pointer: coarse) وبلا prefers-reduced-motion
 *  - عند أعلى الصفحة: السحب للأسفل يسحب «كبسولة توفير» بمقاومة مطاطية
 *  - حلقة تقدّم ذهبية (conic-gradient) تملأ بتقدّم السحب من 0→270deg
 *  - تجاوز 60px + الإفلات → دوران الكبسولة (tawfir-ptr-spin) + onRefresh
 *  - لا يعترض التمرير العادي إطلاقاً (بلا preventDefault)
 *  - يُقصد به استبدال مؤشر المتصفح الافتراضي تماماً (مع overscroll-behavior
 *    في globals.css) لإعطاء إحساس Native بهوية توفير وليس ويب.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hiding, setHiding] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  /* تحديث مرجع أحدث onRefresh داخل effect — لا يجوز تحديث refs أثناء الرسم */
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

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
      setHiding(true);
      /* انسحاب ناعم قبل الإخفاء الكامل */
      await new Promise((resolve) => setTimeout(resolve, HIDE_DELAY));
      setRefreshing(false);
      setHiding(false);
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
  const visible = pull > 0 || refreshing || hiding;
  /* درجة حلقة التقدّم: 0 → 270deg (نفس نطاق التصميم السابق للحركة الملساء) */
  const ringDeg = progress * 270;
  /* معامل تكبر الكبسولة مع السحب: 0.7 → 1 */
  const scale = refreshing ? 1 : 0.7 + progress * 0.3;
  /* تترجم المؤشر لأسفل من أعلى الصفحة — يظهر تدريجياً */
  const translateY = Math.max(pull - 44, refreshing ? 8 : -44);

  return (
    <div className="relative">
      {/* شريط التقدّم العلوي — نمط نيتفليكس/يوتيوب أثناء التحديث (الجولة 21) */}
      <div
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] origin-left transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `scaleX(${refreshing ? 1 : progress})`,
          background:
            "linear-gradient(90deg, #0E7D62 0%, #D4AF37 50%, #0E7D62 100%)",
          boxShadow: refreshing
            ? "0 0 8px 0 rgba(212,175,55,0.6), 0 0 4px 0 rgba(14,125,98,0.5)"
            : "none",
          transition: refreshing
            ? "transform 0.2s ease-out"
            : "transform 0.1s ease-out, opacity 0.15s",
          willChange: "transform, opacity",
        }}
      />
      {/* مؤشر توفير — كبسولة بهوية التطبيق أعلى الصفحة أثناء السحب */}
      <div
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center",
          "transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
          hiding && "transition-transform duration-200 ease-out",
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          willChange: "transform, opacity",
        }}
      >
        <span
          role="status"
          aria-label={refreshing ? "جاري تحديث توفير" : "اسحب لتحديث توفير"}
          className={cn(
            "relative flex items-center justify-center rounded-full",
            "h-12 w-12 shadow-lg",
            refreshing && "tawfir-ptr-spin",
          )}
          style={{
            transform: `scale(${scale})`,
            /* خلفية كبسولة: كحلي + توهج ذهبي — هوية توفير */
            background:
              "radial-gradient(circle at 50% 40%, #0F2238 0%, #0A1A2F 70%)",
            boxShadow: refreshing
              ? "0 0 0 1px rgba(212,175,55,0.55), 0 6px 18px -4px rgba(10,26,47,0.55), 0 0 22px -6px rgba(212,175,55,0.45)"
              : "0 0 0 1px rgba(212,175,55,0.30), 0 6px 16px -6px rgba(10,26,47,0.45)",
            willChange: "transform",
          }}
        >
          {/* حلقة التقدّم الذهبية — conic-gradient تملأ بتقدّم السحب */}
          {!refreshing && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from -135deg, #D4AF37 ${ringDeg}deg, rgba(212,175,55,0.12) ${ringDeg}deg 270deg, transparent 270deg 360deg)`,
                /* قناع لجعلها حلقة فقط (لا مركز) */
                WebkitMask:
                  "radial-gradient(circle, transparent 58%, #000 60% 100%)",
                mask: "radial-gradient(circle, transparent 58%, #000 60% 100%)",
              }}
            />
          )}
          {/* حلقة دوّارة كاملة أثناء التحديث — زمردي/ذهبي */}
          {refreshing && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full tawfir-ptr-ring"
              style={{
                background:
                  "conic-gradient(from 0deg, #0E7D62, #D4AF37, #0E7D62)",
                WebkitMask:
                  "radial-gradient(circle, transparent 58%, #000 60% 100%)",
                mask: "radial-gradient(circle, transparent 58%, #000 60% 100%)",
              }}
            />
          )}
          {/* شعار توفير «ت» في المركز */}
          <TawfirMark
            className={cn(
              "relative h-6 w-6 transition-transform duration-150",
              refreshing && "tawfir-ptr-pulse",
            )}
          />
        </span>
      </div>
      {children}
    </div>
  );
}
