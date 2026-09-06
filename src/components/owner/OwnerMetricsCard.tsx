"use client";

import { TrendingUp, Users, Eye, Target, Sparkles, Lightbulb, DollarSign, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useOwnerStats } from "@/hooks/useOwnerStats";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * لوحة التاجر المحسّنة — الجولة 21 (webDevReview #10).
 *
 * تعرض المؤشرات التجارية المتقدمة + نصائح SEO:
 *  - إيراد آخر 30 يوم + متوسط الفاتورة
 *  - عملاء جدد هذا الشهر + إجمالي العملاء
 *  - زيارات المتجر (تقدير) + ROI
 *  - مؤشر SEO (0-100) + نصائح لتحسين الظهور
 *
 * الهدف: إقناع التاجر بتجديد الاشتراك عبر إظهار قيمة المنصة.
 */
interface OwnerMetricsCardProps {
  facilityId: number;
  className?: string;
}

function formatYER(amount: number): string {
  return new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function OwnerMetricsCard({
  facilityId,
  className,
}: OwnerMetricsCardProps) {
  const { data, isLoading } = useOwnerStats(facilityId);
  const prefersReduced = usePrefersReducedMotion();

  if (isLoading || !data) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/40 bg-card p-5 shadow-soft",
          className,
        )}
        aria-busy="true"
      >
        <div className="skeleton-branded mb-4 h-6 w-32 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-branded h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "إيراد 30 يوم",
      value: `${formatYER(data.monthly_revenue)} ر.ي`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <ShoppingBag className="h-4 w-4" />,
      label: "متوسط الفاتورة",
      value: `${formatYER(data.avg_order_value)} ر.ي`,
      color: "text-accent-ink",
      bg: "bg-accent/15",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "عملاء جدد",
      value: `${data.new_customers}`,
      sub: `من ${data.total_customers} إجمالي`,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: "زيارات المتجر",
      value: `${formatYER(data.monthly_visits)}`,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
  ];

  const containerAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...containerAnim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "tawfir-card-enter space-y-5 rounded-2xl border border-border/40 bg-card p-5 shadow-soft",
        className,
      )}
    >
      {/* الرأس */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          لوحة الأداء التجاري
        </h3>
        {data.roi_percent > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-ink">
            <Target className="h-3 w-3" aria-hidden="true" />
            ROI {data.roi_percent}%
          </span>
        )}
      </div>

      {/* شبكة المؤشرات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="tawfir-card-enter rounded-xl border border-border/40 p-3"
            data-stagger={i}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  m.bg,
                  m.color,
                )}
              >
                {m.icon}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {m.label}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">{m.value}</p>
            {m.sub && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {m.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* قسم SEO */}
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            مؤشر SEO
          </h4>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(data.seo_score, 100)}%`,
                  background:
                    "linear-gradient(90deg, #0E7D62 0%, #D4AF37 100%)",
                }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">
              {data.seo_score}/100
            </span>
          </div>
        </div>
        <ul className="space-y-1.5">
          {data.seo_tips.slice(0, 5).map((tip, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <Lightbulb
                className="mt-0.5 h-3 w-3 shrink-0 text-accent-ink"
                aria-hidden="true"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
