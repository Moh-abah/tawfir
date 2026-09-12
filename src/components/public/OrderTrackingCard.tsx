"use client";

/**
 * OrderTrackingCard — بطاقة الحالة المنقحة للعميل (§6-1 عدسة الخصوصية).
 * ═══════════════════════════════════════════════════════════════════
 * تُستهلك في صفحة تفاصيل الطلب — عرض حرفي حصراً من
 * GET /orders/{id}/tracking (المصدر نفسه بلا أي حقول مندوب):
 *
 *   1. composite_status_ar — الوسم المركب من المهمة الحية إن وُجدت
 *      (مثل «المندوب في الطريق إليك») — سطر بارز نابض.
 *   2. delivery_code — كود التسليم الضخم (يظهر عند وصول المندوب لبابك)
 *      — أرقام ضخمة نقرها = نسخ + اهتزاز.
 *   3. delivery_duration_minutes — مدة التوصيل عند إغلاق الطلب.
 *   4. breakdown + distance_display — سطر التسعير الحرفي الصغير.
 *
 * وضع الانتظار الرشيق: فشل التتبع أو بياناته الفارغة = البطاقة تسكت
 * (شريط حالة الطلب الأساسي يبقى شغالاً — لا شاشة بيضاء).
 */

import { motion, AnimatePresence } from "framer-motion";
import { Copy, KeyRound, Timer, Truck } from "lucide-react";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export interface OrderTrackingCardProps {
  /** معرف الطلب */
  orderId: number;
  /** الحالة الأساسية للطلب (تحكم استطلاع 12ث للنشطة) */
  status: string;
}

export function OrderTrackingCard({ orderId, status }: OrderTrackingCardProps) {
  const { data, isLoading, isError } = useOrderTracking(orderId, status);

  /* وضع الانتظار الرشيق: لا بيانات = لا بطاقة (الشريط الأساسي كافٍ) */
  if (isLoading && !data) return null;
  if (isError || !data) return null;

  const hasComposite = Boolean(data.composite_status_ar);
  const hasCode = Boolean(data.delivery_code);
  const hasDuration = data.delivery_duration_minutes != null;

  /* لا شيء ذو قيمة بعد — لا نُضخّم DOM بلا داعٍ */
  if (!hasComposite && !hasCode && !hasDuration) return null;

  const copyCode = async () => {
    if (!data.delivery_code) return;
    haptic("success");
    try {
      await navigator.clipboard.writeText(data.delivery_code);
      toast({ title: "تم نسخ كود التسليم" });
    } catch {
      toast({
        title: "انسخ الكود يدوياً",
        description: data.delivery_code,
      });
    }
  };

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={`${data.status}-${data.composite_status_ar ?? ""}-${data.delivery_code ?? ""}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="space-y-3"
        aria-live="polite"
      >
        {/* الوسم المركب — سطر بارز نابض (حرفي من الخادم) */}
        {hasComposite && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-3"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Truck className="h-5 w-5" aria-hidden="true" />
              <span
                className="absolute inset-0 rounded-xl bg-primary/15 animate-ping"
                aria-hidden="true"
              />
            </span>
            <p className="min-w-0 flex-1 text-sm font-black leading-relaxed text-foreground">
              {data.composite_status_ar}
            </p>
          </div>
        )}

        {/* كود التسليم الضخم — عند وصول المندوب لبابك */}
        {hasCode && (
          <div
            role="status"
            className="overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/[0.08] to-transparent"
          >
            <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/[0.06] px-4 py-2.5">
              <KeyRound className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              <p className="text-xs font-black text-foreground">
                كود التسليم — اقرأه للمندوب عند وصوله لبابك
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="group flex w-full flex-col items-center gap-2 px-4 py-6 native-tap"
              aria-label={`كود التسليم ${data.delivery_code} — انقر لنسخه`}
            >
              <span
                dir="ltr"
                className="select-all text-5xl font-black tabular-nums tracking-[0.35em] text-primary sm:text-6xl"
              >
                {data.delivery_code}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground transition-colors group-hover:text-foreground">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                انقر لنسخ الكود
              </span>
            </button>
          </div>
        )}

        {/* المدة عند الإغلاق + سطر التسعير الحرفي */}
        {(hasDuration || data.breakdown) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hasDuration && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5",
                  "text-xs font-bold text-foreground",
                )}
              >
                <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                مدة التوصيل: {data.delivery_duration_minutes} دقيقة
              </span>
            )}
            {data.breakdown && (
              <span
                dir="rtl"
                className="rounded-full bg-muted/60 px-3.5 py-1.5 text-[11px] font-bold text-muted-foreground"
              >
                {data.breakdown}
                {data.distance_display ? ` · ${data.distance_display}` : ""}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
