"use client";

import Link from "next/link";
import { Package, Hourglass, ShoppingBag, Banknote, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useOwnerStats } from "@/hooks/useOwnerStats";
import { formatCurrency } from "@/lib/format";

/**
 * شبكة الإحصائيات 2×2 للموبايل — الجولة 9 (المهمة 8)
 *
 * بطاقات لمسية كبيرة (≥72px ارتفاعاً):
 * - 📦 منتجاتي (العدد الإجمالي + المتاح)
 * - ⏳ طلبات معلقة (نابضة لو > 0)
 * - 📋 طلبات اليوم
 * - 💰 إيراد اليوم
 *
 * يستهلك useOwnerStats(facilityId) — بيانات حقيقية فقط.
 * كل البطاقات قابلة للنقر لروابط حقيقية (لا روابط معطّلة).
 */
export interface OwnerStatsGridProps {
  facilityId: number;
  className?: string;
}

interface StatCardDef {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Package;
  iconClass: string;
  pulse?: boolean;
  href: string;
}

export function OwnerStatsGrid({ facilityId, className }: OwnerStatsGridProps) {
  const prefersReduced = useReducedMotion();
  const { data, isLoading, isError } = useOwnerStats(facilityId);

  const base = `/owner/facilities/${facilityId}`;
  const stats: StatCardDef[] = [
    {
      id: "products",
      label: "منتجاتي",
      value: isLoading ? "—" : (data?.total_products ?? 0),
      subtitle: isLoading ? undefined : `متاح: ${data?.available_products ?? 0}`,
      icon: Package,
      iconClass: "bg-primary/10 text-primary",
      href: `${base}/products`,
    },
    {
      id: "pending",
      label: "طلبات معلقة",
      value: isLoading ? "—" : (data?.pending_orders ?? 0),
      icon: Hourglass,
      iconClass: "bg-amber-500/10 text-amber-500",
      pulse: !isLoading && (data?.pending_orders ?? 0) > 0,
      href: `${base}/orders`,
    },
    {
      id: "today-orders",
      label: "طلبات اليوم",
      value: isLoading ? "—" : (data?.today_orders ?? 0),
      icon: ShoppingBag,
      iconClass: "bg-accent/15 text-accent",
      href: `${base}/orders`,
    },
    {
      id: "today-revenue",
      label: "إيراد اليوم",
      value: isLoading ? "—" : formatCurrency(data?.today_revenue ?? 0),
      icon: Banknote,
      iconClass: "bg-emerald-500/10 text-emerald-500",
      href: `${base}/orders`,
    },
  ];

  const container = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  if (isError) {
    return (
      <div
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
        role="alert"
      >
        تعذّر تحميل الإحصائيات الآن. اسحب للتحديث أو حاول لاحقاً.
      </div>
    );
  }

  return (
    <div
      className={cn("grid grid-cols-2 gap-3", className)}
      role="region"
      aria-label="إحصائيات سريعة"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            variants={container}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, delay: idx * 0.05 }}
          >
            <Link
              href={stat.href}
              className="native-tap-card group flex h-[72px] flex-col justify-between rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    stat.iconClass,
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4", stat.pulse && "animate-pulse")}
                    aria-hidden="true"
                  />
                </span>
                <ChevronLeft
                  className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold leading-none tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {stat.subtitle ?? stat.label}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Skeleton مطابق للشكل النهائي للشبكة (2×2 بطاقات 72px). */
export function OwnerStatsGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[72px] rounded-2xl" />
      ))}
    </div>
  );
}
