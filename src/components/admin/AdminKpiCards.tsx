"use client";

import {
  Users,
  Crown,
  Store,
  Percent,
  TrendingUp,
  DollarSign,
  Repeat,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAdminKpis } from "@/hooks/useAdminKpis";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * بطاقات مؤشرات الأداء (KPIs) للأدمن — الجولة 21 (webDevReview #10).
 *
 * لا تقيس النجاح بعدد التسجيلات، بل بـ:
 *  - MAU (Monthly Active Users)
 *  - Paid Members (أعضاء مدفوعون)
 *  - Active Merchants (تجار نشطون)
 *  - Offer Usage Rate (معدل استخدام العروض)
 *  - Avg Savings (متوسط التوفير)
 *  - Sales Value (قيمة المبيعات)
 *  - Renewal Rate (نسبة التجديد)
 */
export function AdminKpiCards() {
  const { data, isLoading } = useAdminKpis();
  const prefersReduced = usePrefersReducedMotion();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-branded h-28 rounded-2xl"
          />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "المستخدمون النشطون (MAU)",
      value: data.mau,
      sub: "آخر 30 يوم",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Crown className="h-5 w-5" />,
      label: "أعضاء مدفوعون",
      value: data.paid_members,
      sub: `${data.free_members} مجاني`,
      color: "text-accent-ink",
      bg: "bg-accent/15",
    },
    {
      icon: <Store className="h-5 w-5" />,
      label: "تجار نشطون",
      value: data.active_merchants,
      sub: `من ${data.total_facilities} متجر`,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      icon: <Percent className="h-5 w-5" />,
      label: "معدل استخدام العروض",
      value: `${data.offer_usage_rate}%`,
      sub: `${data.used_offers}/${data.total_offers} عروض`,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "متوسط التوفير",
      value: `${data.avg_savings} ${data.currency}`,
      sub: "لكل عضو",
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      label: "قيمة المبيعات",
      value: `${new Intl.NumberFormat("ar-YE").format(data.sales_value)} ${data.currency}`,
      sub: "إجمالي",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Repeat className="h-5 w-5" />,
      label: "نسبة التجديد",
      value: `${data.renewal_rate}%`,
      sub: "الأعضاء المُجدّدون",
      color: "text-accent-ink",
      bg: "bg-accent/15",
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: "إجمالي المستخدمين",
      value: data.total_users,
      sub: `${data.approved_facilities} متجر معتمد`,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {kpis.map((k, i) => (
        <motion.div
          key={i}
          initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="tawfir-card-enter rounded-2xl border border-border/40 bg-card p-4 shadow-soft"
          data-stagger={Math.min(i, 8)}
        >
          <div className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                k.bg,
                k.color,
              )}
            >
              {k.icon}
            </span>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground">
            {k.label}
          </p>
          <p className="mt-1 text-xl font-black text-foreground">{k.value}</p>
          {k.sub && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{k.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
