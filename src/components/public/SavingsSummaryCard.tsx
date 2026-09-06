"use client";

import { TrendingUp, Gift, Calendar, Wallet, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useSavingsSummary } from "@/hooks/useSavings";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * بطاقة سجل التوفير — الجولة 21 (webDevReview #5).
 *
 * تُظهر للمستخدم:
 *  - إجمالي ما وفّره بفضل العضوية (كبير وبارز)
 *  - توفير هذا الشهر + هذه السنة
 *  - قيمة العضوية + صافي التوفير + ROI %
 *  - رسالة تحفيزية (تجعله يشعر أن العضوية تستحق التجديد)
 *
 * الهوية: كحلي + ذهبي + زمردي (توفير).
 * متجاوبة: grid 2×2 على الموبايل، 4×1 على الديسكتوب.
 */
interface SavingsSummaryCardProps {
  /** مفصّل = عرض كل المؤشرات؛ مختصر = عرض الإجمالي فقط */
  variant?: "full" | "compact";
  className?: string;
}

function formatYER(amount: number): string {
  // تنسيق ريال يمني: 12,345 ر.ي
  return new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SavingsSummaryCard({
  variant = "full",
  className,
}: SavingsSummaryCardProps) {
  const { data, isLoading } = useSavingsSummary();
  const prefersReduced = usePrefersReducedMotion();

  if (isLoading) {
    return (
      <div
        className={cn(
          "tawfir-card-enter rounded-2xl border border-border/40 bg-card p-6 shadow-soft",
          className,
        )}
        aria-busy="true"
      >
        <div className="skeleton-branded mb-4 h-6 w-40 rounded-lg" />
        <div className="skeleton-branded h-16 w-32 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const {
    total_savings,
    month_savings,
    year_savings,
    membership_amount,
    is_free_membership,
    net_savings,
    roi_percent,
    orders_with_discount,
    currency,
  } = data;

  // رسالة تحفيزية حسب التوفير
  const motivational =
    total_savings === 0
      ? "ابدأ الطلب من المتاجر المشتركة لتوفّر بفضل العضوية"
      : total_savings > membership_amount && !is_free_membership
        ? `وفّرت أكثر من قيمة اشتراكك بـ ${roi_percent}%! العضوية تستحق التجديد 🎉`
        : is_free_membership && total_savings > 0
          ? "عضويتك المجانية توفّر لك — استمتع بالخصم 30%!"
          : "استمر في الطلب لزيادة توفيرك";

  const containerAnim = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...containerAnim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "tawfir-card-enter relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft",
        className,
      )}
    >
      {/* خلفية متدرّجة كحلية + ذهبية خفيفة (هوية توفير) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, #D4AF37 0%, transparent 50%), radial-gradient(circle at 20% 80%, #0E7D62 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div className="relative p-6">
        {/* رأس البطاقة: عنوان + أيقونة */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
              <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            سجل التوفير
          </h3>
          {orders_with_discount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-ink">
              <Star className="h-3 w-3" aria-hidden="true" />
              {orders_with_discount} طلب بخصم
            </span>
          )}
        </div>

        {/* المؤشر الرئيسي: إجمالي التوفير */}
        <div className="mb-5">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            إجمالي ما وفّرته بفضل العضوية
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary sm:text-4xl">
              {formatYER(total_savings)}
            </span>
            <span className="text-sm font-bold text-muted-foreground">
              {currency}
            </span>
          </div>
        </div>

        {variant === "full" && (
          <>
            {/* شبكة المؤشرات الفرعية */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="هذا الشهر"
                value={`${formatYER(month_savings)} ${currency}`}
                accent="emerald"
              />
              <StatCard
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="هذه السنة"
                value={`${formatYER(year_savings)} ${currency}`}
                accent="emerald"
              />
              <StatCard
                icon={<Gift className="h-3.5 w-3.5" />}
                label="قيمة العضوية"
                value={
                  is_free_membership
                    ? "مجانية"
                    : `${formatYER(membership_amount)} ${currency}`
                }
                accent={is_free_membership ? "gold" : "neutral"}
              />
              <StatCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="صافي التوفير"
                value={`${formatYER(net_savings)} ${currency}`}
                accent="gold"
                highlight={net_savings > 0}
              />
            </div>

            {/* شريط ROI */}
            {!is_free_membership && membership_amount > 0 && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    عائد الاستثمار (ROI)
                  </span>
                  <span className="font-bold text-primary">
                    {roi_percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(roi_percent, 100)}%`,
                      background:
                        "linear-gradient(90deg, #0E7D62 0%, #D4AF37 100%)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* رسالة تحفيزية */}
            <p className="mt-4 text-center text-xs font-medium leading-relaxed text-muted-foreground">
              {motivational}
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "gold" | "neutral";
  highlight?: boolean;
}) {
  const accentClasses = {
    emerald: "bg-primary/10 text-primary",
    gold: "bg-accent/15 text-accent-ink",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        highlight
          ? "border-accent/40 bg-accent/5"
          : "border-border/40 bg-card",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full",
            accentClasses[accent],
          )}
        >
          {icon}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
