"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Heart,
  ShoppingBag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useMyOrders } from "@/hooks/useMyOrders";
import { useSavingsSummary } from "@/hooks/useSavings";
import { useFavoritesStore } from "@/store/favorites.store";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MeOut } from "@/types/api.generated";

/**
 * AccountProfileHero — الجولة 26 (ميزة جديدة + تلميع بصري)
 * ═══════════════════════════════════════════════════════════
 * بطاقة ترحيب ذكية تتصدر صفحة الحساب بدل سطر «مرحباً، فلان» المسطح:
 *
 *  1. ترويسة: أفاتار monogram حرف الاسم بتدرّج زمرددي + تحية
 *     حسب وقت اليوم (صباح الخير/مساء الخير) + شارة حالة العضوية
 *     (ذهبية للعضو النشط) + مكان لأزرار (تسجيل الخروج).
 *  2. صف إحصائيات حيّ (روابط قابلة للنقر):
 *     • طلباتي — من GET /orders (عدد حقيقي)
 *     • وفّرت — من GET /savings/summary (للأعضاء فقط)
 *     • المفضلة — من مخزن المفضلة المحلي
 *  3. أرقام عربية (ar-EG) متسقة مع بقية التطبيق + hover/tap
 *     لمسات حركية + التزام focus-visible وتقليل الحركة.
 */

/* ─── تحية الوقت ─────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  return "مساء الخير";
}

/* ─── بلاطة إحصائية واحدة (رابط) ────────────────── */
function StatTile({
  href,
  icon: Icon,
  label,
  value,
  tone,
  delay,
  prefersReduced,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "primary" | "gold" | "rose";
  delay: number;
  prefersReduced: boolean;
}) {
  const toneClasses = {
    primary: {
      icon: "bg-primary/12 text-primary",
      value: "text-foreground",
    },
    gold: {
      icon: "text-accent-foreground",
      value: "text-foreground",
    },
    rose: {
      icon: "bg-destructive/10 text-destructive",
      value: "text-foreground",
    },
  }[tone];

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: prefersReduced ? 0 : delay, ease: "easeOut" }}
    >
      <Link
        href={href}
        className={cn(
          "group native-tap flex flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-card/80 px-3 py-3.5 text-center",
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`${label}: ${value}`}
      >
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            tone === "gold" ? "bg-accent/15" : toneClasses.icon,
          )}
        >
          {tone === "gold" ? (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : (
            <Icon className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span
          className={cn(
            "text-lg font-extrabold leading-none tabular-nums",
            toneClasses.value,
          )}
          suppressHydrationWarning
        >
          {value}
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">
          {label}
        </span>
      </Link>
    </motion.div>
  );
}

/* ─── البطاقة الكاملة ─────────────────────────────── */
export function AccountProfileHero({
  me,
  isMember,
  actions,
}: {
  me: MeOut;
  /** عضوية نشطة؟ (يتحكم في شارة العضوية + بلاطة «وفّرت») */
  isMember: boolean;
  /** أزرار اختيارية أعلى البطاقة (تسجيل الخروج…) */
  actions?: ReactNode;
}) {
  const prefersReduced = usePrefersReducedMotion();

  /* إحصائيات حيّة — كلها من مصادر موجودة (بلا API جديد) */
  const ordersQuery = useMyOrders(undefined, true, undefined);
  const savingsQuery = useSavingsSummary();
  const favoritesCount = useFavoritesStore((s) => s.favoriteIds.length);

  const ordersCount = ordersQuery.data?.items?.length;
  const totalSavings = savingsQuery.data?.total_savings;

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  /* الحرف الأول من الاسم (بدون مسافات) */
  const initial = useMemo(() => {
    const clean = me.full_name.trim();
    return clean ? clean.charAt(0).toUpperCase() : "؟";
  }, [me.full_name]);

  const numFmt = useMemo(
    () => new Intl.NumberFormat("ar-EG"),
    [],
  );

  return (
    <motion.section
      {...anim}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-border/60 p-5 shadow-soft sm:p-6"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--logo-gold) 5%, transparent) 55%, transparent)",
      }}
      aria-label="ملفك الشخصي"
    >
      {/* زخرفة زاوية خافتة */}
      <div
        className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full opacity-[0.07]"
        style={{ background: "var(--primary)" }}
        aria-hidden="true"
      />

      {/* الترويسة: أفاتار + تحية + حالة العضوية + أزرار */}
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-[20px] text-2xl font-black text-white shadow-soft"
            style={{
              background:
                "linear-gradient(140deg, var(--primary), color-mix(in srgb, var(--primary) 72%, var(--logo-gold)))",
            }}
            aria-hidden="true"
          >
            {initial}
          </span>
          <span
            className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background"
            style={
              isMember
                ? { background: "var(--logo-gold)", color: "var(--logo-white)" }
                : { background: "var(--muted)", color: "var(--muted-foreground)" }
            }
            aria-hidden="true"
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground" suppressHydrationWarning>
            {getGreeting()} 👋
          </p>
          <h2 className="truncate text-xl font-extrabold text-foreground sm:text-2xl">
            {me.full_name}
          </h2>
          <div className="mt-1.5">
            {isMember ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: "var(--logo-gold)",
                  color: "var(--logo-white)",
                }}
              >
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                عضوية توفير النشطة
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                بدون عضوية — الخصم غير مفعّل
              </span>
            )}
          </div>
        </div>

        {actions && (
          <div className="absolute -top-1 left-0 hidden sm:block">{actions}</div>
        )}
      </div>

      {/* أزرار صغيرة للموبايل (تظهر تحت الترويسة) */}
      {actions && (
        <div className="relative mt-4 flex justify-end sm:hidden">{actions}</div>
      )}

      {/* صف الإحصائيات */}
      <div
        className={cn(
          "relative mt-5 grid gap-2.5",
          isMember ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        <StatTile
          href="/orders"
          icon={ShoppingBag}
          label="طلباتي"
          value={ordersCount != null ? numFmt.format(ordersCount) : "—"}
          tone="primary"
          delay={0.05}
          prefersReduced={prefersReduced}
        />
        {isMember && (
          <StatTile
            href="/savings"
            icon={TrendingUp}
            label="وفّرت"
            value={
              totalSavings != null ? formatCurrency(totalSavings) : "—"
            }
            tone="gold"
            delay={0.12}
            prefersReduced={prefersReduced}
          />
        )}
        <StatTile
          href="/favorites"
          icon={Heart}
          label="المفضلة"
          value={numFmt.format(favoritesCount)}
          tone="rose"
          delay={0.19}
          prefersReduced={prefersReduced}
        />
      </div>
    </motion.section>
  );
}
