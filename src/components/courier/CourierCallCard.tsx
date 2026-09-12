"use client";

/**
 * CourierCallCard — بطاقة النداء المنبثقة (مكوّن مشترك إلزامي §8-2).
 * ═══════════════════════════════════════════════════════════════
 * - صوت النداء: Web Audio (نغمتان متناوبتان — مكافئ الويب الحاكم)
 * - اهتزاز: Vibration API بنمط متكرر
 * - عد تنازلي لنافذة النداء (call_window_seconds — 60ث افتراضياً)
 *   يُحسب من call_expires_at الفعلي من الخادم (لا من العميل).
 * - زر قبول واحد كبير: «أول مؤكد يفوز» — الخسارة بالسباق تُعرض
 *   برسالة الخادم الحرفية (قاعدة النصوص العربية عقد §7-7).
 * - خصوصية ما قبل الحجز (§6-2): الحي/الاتجاه + المسافة + الأجرة فقط —
 *   صفر بيانات عميل في هذه البطاقة (area_hint من عنوان العميل فقط).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bike, MapPin, Package, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  startCourierCallRing,
  unlockCourierAudio,
} from "@/lib/courier-call-sound";
import { haptic } from "@/lib/haptic";
import { useCourierAcceptCall } from "@/hooks/useCourier";
import type { CourierCallCard } from "@/services/courier-api-client";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";

export function CourierCallCardOverlay({ call }: { call: CourierCallCard }) {
  /* العد التنازلي من تاريخ انتهاء الخادم (موثوق) — إعادة الضبط عند
     تغيّر النداء بنمط «اشتقاق أثناء الرسم» المعتمد من React (بلا effect) */
  const computeSeconds = (c: CourierCallCard) =>
    c.call_expires_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(c.call_expires_at).getTime() - Date.now()) / 1000,
          ),
        )
      : c.call_window_seconds;

  const [secondsLeft, setSecondsLeft] = useState(() => computeSeconds(call));
  const [prevCallId, setPrevCallId] = useState(call.call_id);
  if (prevCallId !== call.call_id) {
    setPrevCallId(call.call_id);
    const next = computeSeconds(call);
    setSecondsLeft(next);
  }

  useEffect(() => {
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  /* الصوت والاهتزاز — يتوقفان عند الفك أو الإخفاء */
  useEffect(() => {
    unlockCourierAudio();
    const ring = startCourierCallRing();
    return () => ring.stop();
  }, [call.call_id]);

  /* نبضة تذكير عند اقتراب النهاية */
  const warnedRef = useRef(false);
  useEffect(() => {
    if (secondsLeft === 15 && !warnedRef.current) {
      warnedRef.current = true;
      haptic("success");
    }
  }, [secondsLeft]);

  const accept = useCourierAcceptCall();

  const windowPct = useMemo(
    () => (secondsLeft / Math.max(1, call.call_window_seconds)) * 100,
    [secondsLeft, call.call_window_seconds],
  );
  const expired = secondsLeft <= 0;

  const handleAccept = () => {
    unlockCourierAudio();
    haptic("success");
    accept.mutate(call.call_id, {
      onSuccess: (res) => {
        haptic("success");
        toast({
          title: "حجزت المهمة ✅",
          description:
            (res as { message?: string })?.message ??
            "تفضل إلى شاشة مهمتي لبدء التسلسل",
        });
      },
      onError: (err: unknown) => {
        /* سباق «أول مؤكد يفوز» — رسالة الخادم كما وردت حرفياً */
        const message =
          err instanceof Error ? err.message : "تعذّر قبول النداء";
        toast({
          title: "لم تتم إجابة النداء",
          description: message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-label="نداء توصيل جديد"
    >
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-soft-lg sm:rounded-3xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        {/* شريط العد التنازلي */}
        <div className="bg-primary px-4 pb-3 pt-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/15"
              >
                <Bike className="h-5 w-5" aria-hidden="true" />
              </motion.span>
              <div>
                <p className="text-base font-extrabold leading-tight">
                  نداء توصيل جديد
                </p>
                <p className="text-xs opacity-90">
                  الموجة {call.wave_number} · طلب #{call.order_id}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`font-mono text-3xl font-black tabular-nums ${
                  secondsLeft <= 15 ? "animate-pulse text-red-200" : ""
                }`}
                aria-live="polite"
              >
                {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </span>
              <span className="text-[10px] opacity-80">نافذة النداء</span>
            </div>
          </div>
          <Progress
            value={windowPct}
            className="mt-3 h-1.5 bg-primary-foreground/20"
            aria-hidden="true"
          />
        </div>

        {/* جسم البطاقة — خصوصية ما قبل الحجز: اتجاه + مسافة + أجرة */}
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold text-foreground">
                {call.facility_name ?? "متجر قريب منك"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {call.area_hint ?? "اتجاه تقريبي للعميل"}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center rounded-2xl bg-muted px-4 py-2">
              <span className="text-[11px] text-muted-foreground">المسافة</span>
              <span className="text-base font-extrabold text-foreground">
                {call.distance_display}
              </span>
            </div>
          </div>

          {/* الأجرة بخط ضخم + سطر التسعير الحرفي من الخادم */}
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              أجرة التوصيل
            </p>
            <p className="text-4xl font-black text-primary">
              {formatCurrency(call.fee)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground" dir="rtl">
              {call.breakdown}
            </p>
          </div>

          {call.items_count > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
              <Package className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {call.items_count} صنف
                {call.items_summary ? ` — ${call.items_summary}` : ""}
              </span>
            </div>
          )}

          {expired ? (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl bg-muted p-4 text-sm font-bold text-muted-foreground"
              role="status"
            >
              <Timer className="h-5 w-5" aria-hidden="true" />
              انتهت نافذة النداء — بانتظار موجة قادمة…
            </div>
          ) : (
            <Button
              size="lg"
              onClick={handleAccept}
              disabled={accept.isPending}
              aria-label="قبول نداء التوصيل"
              className="h-16 w-full gap-3 rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-soft-lg native-tap"
            >
              <Zap className="h-6 w-6" aria-hidden="true" />
              {accept.isPending ? "جارٍ الحجز…" : "قبول المهمة الآن"}
            </Button>
          )}

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            أول مندوب يؤكد يفوز بالمهمة · رقم العميل يظهر بعد الحجز حصراً
          </p>
        </div>
      </motion.div>
    </div>
  );
}
