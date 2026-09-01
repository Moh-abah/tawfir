"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Map,
  CreditCard,
  Eye,
  Store,
  Users,
  UserCog,
  Package,
  PackageCheck,
  Lightbulb,
  ArrowLeft,
  ShieldCheck,
  UserIcon,
  ImageOff,
  Filter,
  X,
  PieChart,
  Hourglass,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/api-client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getAuditLabel } from "@/lib/audit-labels";
import { formatDate, resolveImageUrl } from "@/lib/format";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminFacilities } from "@/hooks/useAdminFacilities";
import { useAdminCards } from "@/hooks/useAdminCards";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import type { DashboardStats, FacilityType, UserRole } from "@/types/api.generated";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/* ─── Time-based greeting ──────────────────────────── */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  return "مساء الخير";
}

/* ─── Format today's date in Arabic ──────────────────── */
function getFormattedToday(): string {
  return new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ─── Action stat cards (3 بطاقات إجرائية) ─────────── */
interface ActionStatConfig {
  key: "pending_membership_requests" | "pending_facilities" | "orders_today";
  label: string;
  href: string;
  icon: LucideIcon;
  /** صيغة لونية مستمدة من توكنات Tailwind المخصّصة */
  colorClass: string;
  bgClass: string;
  borderClass: string;
  /** نص زر الإجراء */
  actionLabel: string;
}

const ACTION_STAT_CONFIGS: ActionStatConfig[] = [
  {
    key: "pending_membership_requests",
    label: "طلبات عضوية معلّقة",
    href: "/admin/membership-requests",
    icon: CreditCard,
    /* ✦ 2-b: ذهبي الهوية — «انتظار» = ذهب */
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/30",
    actionLabel: "مراجعة",
  },
  {
    key: "pending_facilities",
    label: "متاجر معلّقة",
    href: "/admin/facilities/pending",
    icon: Hourglass,
    colorClass: "text-accent-ink",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/30",
    actionLabel: "مراجعة",
  },
  {
    key: "orders_today",
    label: "طلبات اليوم",
    href: "/admin/orders",
    icon: ShoppingBag,
    colorClass: "text-secondary",
    bgClass: "bg-secondary/10",
    borderClass: "border-secondary/30",
    actionLabel: "عرض",
  },
];

interface ActionStatCardProps {
  config: ActionStatConfig;
  isLoading: boolean;
  value: number;
}

function ActionStatCard({ config, isLoading, value }: ActionStatCardProps) {
  const Icon = config.icon;
  return (
    <Link
      href={config.href}
      className="group block h-full"
      aria-label={`${config.label}: ${value}`}
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden border-l-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
          config.borderClass,
        )}
      >
        <div
          className={cn(
            "absolute inset-0 -z-10 opacity-60",
            config.bgClass,
          )}
          aria-hidden="true"
        />
        {/* ✦ 4-a: موبايل — بطاقة Netflix عمودية برقم كبير (صف snap أفقي) */}
        <CardContent className="flex h-full flex-col gap-2.5 p-4 md:hidden">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                config.bgClass,
                config.colorClass,
              )}
            >
              <Icon className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <ArrowLeft
              className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {config.label}
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <p
              className={cn(
                "text-4xl font-bold leading-none tabular-nums",
                config.colorClass,
              )}
            >
              {value}
            </p>
          )}
          <span
            className={cn("mt-auto pt-1 text-xs font-semibold", config.colorClass)}
          >
            {config.actionLabel}
          </span>
        </CardContent>
        {/* ديسكتوب — التخطيط الأفقي كما كان */}
        <CardContent className="hidden items-center gap-4 p-4 sm:p-5 md:flex">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              config.bgClass,
              config.colorClass,
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {config.label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className={cn("text-3xl font-bold tabular-nums", config.colorClass)}>
                {value}
              </p>
            )}
          </div>
          <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border bg-background px-4 text-sm font-medium shadow-xs">
            {config.actionLabel}
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─── Stat config with color themes ────────────────── */
/* الجولة 6: حُذفت اتجاهات النسبة الوهمية (+8%...) — لا endpoint
   للاتجاهات؛ الأرقام فقط حقيقية من GET /admin/dashboard. */
interface StatConfig {
  key: keyof DashboardStats;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

const STAT_CONFIGS: StatConfig[] = [
  { key: "regions", label: "المناطق", icon: Map, color: "text-primary", bg: "bg-primary/15", border: "border-l-primary" },
  { key: "cards", label: "البطاقات", icon: CreditCard, color: "text-secondary", bg: "bg-secondary/15", border: "border-l-secondary" },
  { key: "published_cards", label: "البطاقات المنشورة", icon: Eye, color: "text-success", bg: "bg-success/15", border: "border-l-success" },
  { key: "facilities", label: "المتاجر", icon: Store, color: "text-accent-ink", bg: "bg-accent/15", border: "border-l-accent" },
  { key: "customers", label: "العملاء", icon: Users, color: "text-cat-facility", bg: "bg-cat-facility/15", border: "border-l-cat-facility" },
  { key: "owners", label: "المالكون", icon: UserCog, color: "text-chart-4", bg: "bg-chart-4/15", border: "border-l-chart-4" },
  { key: "products", label: "المنتجات", icon: Package, color: "text-cat-restaurant", bg: "bg-cat-restaurant/15", border: "border-l-cat-restaurant" },
  { key: "available_products", label: "المنتجات المتاحة", icon: PackageCheck, color: "text-cat-cafe", bg: "bg-cat-cafe/15", border: "border-l-cat-cafe" },
];

const STAT_GRADIENTS = [
  "bg-gradient-to-br from-primary/5 to-transparent",
  "bg-gradient-to-br from-secondary/5 to-transparent",
  "bg-gradient-to-br from-accent/5 to-transparent",
  "bg-gradient-to-br from-muted/50 to-transparent",
];

interface StatCardProps {
  config: StatConfig;
  isLoading: boolean;
  value: number | undefined;
  index: number;
}

function StatCard({ config, isLoading, value, index }: StatCardProps) {
  const Icon = config.icon;
  return (
    <Card className={cn(
      "border-l-4 py-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:py-6",
      config.border,
      STAT_GRADIENTS[index % STAT_GRADIENTS.length],
    )}>
      <CardHeader className="px-4 pb-2 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
            {config.label}
          </CardTitle>
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9", config.bg, config.color)}>
            <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                {value === undefined ? "—" : value}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Mini Bar Chart ───────────────────────────────── */
interface MiniBarChartProps {
  label: string;
  value: number;
  max: number;
  color: string;
  delay?: number;
  reduced: boolean;
}

function MiniBarChart({ label, value, max, color, delay = 0, reduced }: MiniBarChartProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-7 flex-1 overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={reduced ? { width: `${pct}%` } : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: reduced ? 0 : delay, ease: "easeOut" as const }}
        />
      </div>
      <span className="w-10 text-left text-sm font-semibold">{value}</span>
    </div>
  );
}

/* ─── Quick action config ──────────────────────────── */
interface QuickAction {
  label: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "إضافة متجر",
    subtitle: "إضافة مطعم أو مقهى جديد",
    href: "/admin/facilities",
    icon: Store,
    color: "text-accent-ink",
    bg: "bg-accent/15",
  },
  {
    label: "إدارة البطاقات",
    subtitle: "إنشاء وتعديل بطاقات الخصم",
    href: "/admin/cards",
    icon: CreditCard,
    color: "text-cat-facility",
    bg: "bg-cat-facility/15",
  },
  {
    label: "عرض العملاء",
    subtitle: "عرض وإدارة حسابات المستخدمين",
    href: "/admin/users",
    icon: Users,
    color: "text-secondary",
    bg: "bg-secondary/15",
  },
];

/* ─── Role badge styles (matching UsersTable) ──────── */
const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مشرف",
  owner: "مالك",
  customer: "عميل",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-primary/15 text-primary border-primary/25 hover:bg-primary/15",
  owner: "bg-accent/15 text-accent-ink border-accent/25 hover:bg-accent/15",
  customer: "bg-secondary/15 text-secondary border-secondary/25 hover:bg-secondary/15",
};

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  owner: <Store className="h-3.5 w-3.5" />,
  customer: <UserIcon className="h-3.5 w-3.5" />,
};

/* ─── Recent activity skeleton ─────────────────────── */
function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ─── Donut / Ring Chart for card status ────────── */
const RING_RADIUS = 60;
const RING_STROKE = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RingSegment {
  label: string;
  count: number;
  color: string;
  bgColor: string;
}

function CardStatusRingChart({ segments, total, reduced }: { segments: RingSegment[]; total: number; reduced: boolean }) {
  const segmentData = useMemo(() => {
    const result: (RingSegment & { pct: number; dashLength: number; offset: number })[] = [];
    let runningOffset = 0;
    for (const s of segments) {
      if (s.count <= 0) continue;
      const pct = total > 0 ? s.count / total : 0;
      const dashLength = pct * RING_CIRCUMFERENCE;
      result.push({ ...s, pct, dashLength, offset: runningOffset });
      runningOffset += dashLength;
    }
    return result;
  }, [segments, total]);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      {/* SVG Ring */}
      <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
        <svg
          width={RING_RADIUS * 2 + RING_STROKE * 2}
          height={RING_RADIUS * 2 + RING_STROKE * 2}
          viewBox={`0 0 ${RING_RADIUS * 2 + RING_STROKE * 2} ${RING_RADIUS * 2 + RING_STROKE * 2}`}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={RING_RADIUS + RING_STROKE}
            cy={RING_RADIUS + RING_STROKE}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={RING_STROKE}
            className="text-muted/30"
          />
          {/* Segments */}
          {segmentData.map((seg) => (
            <motion.circle
              key={seg.label}
              cx={RING_RADIUS + RING_STROKE}
              cy={RING_RADIUS + RING_STROKE}
              r={RING_RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${seg.dashLength} ${RING_CIRCUMFERENCE - seg.dashLength}`}
              initial={reduced ? { strokeDashoffset: -seg.offset } : { strokeDashoffset: RING_CIRCUMFERENCE }}
              animate={{ strokeDashoffset: -seg.offset }}
              transition={{ duration: reduced ? 0 : 0.8, ease: "easeOut" as const }}
            />
          ))}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">إجمالي البطاقات</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3 min-h-[44px]">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm text-muted-foreground">{seg.label}</span>
            <span className="mr-auto text-sm font-semibold">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardStatusSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <Skeleton className="h-40 w-40 shrink-0 rounded-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
const prefersReduced = usePrefersReducedMotion();
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiClient.get<DashboardStats>("/admin/dashboard"),
    staleTime: 0,
  });

  const { data: auditData, isLoading: auditLoading } = useAdminAuditLogs(1, 5);
  const recentLogs = auditData?.items ?? [];

  const { data: usersData, isLoading: usersLoading } = useAdminUsers(undefined, 1, 5);
  const recentUsers = usersData?.items ?? [];

  const { data: facilitiesData, isLoading: facilitiesLoading } = useAdminFacilities(1, 5);
  const recentFacilities = facilitiesData?.items ?? [];

  const { data: cardsData, isLoading: cardsLoading } = useAdminCards();
  const allCards = cardsData?.items ?? [];

  /* ─── الجولة الختامية: الحقول التجميعية من dashboard نفسه ─────────
     GET /admin/dashboard يرجع الآن pending_membership_requests +
     pending_facilities + orders_today في نفس الاستجابة — صفر طلبات إضافية
     (كانت الجولة 6 تجلبها من 3 نقاط منفصلة لأن الباك إند لم يكن يدعمها). */
  const actionValues: Record<ActionStatConfig["key"], number> = {
    pending_membership_requests: dashData?.pending_membership_requests ?? 0,
    pending_facilities: dashData?.pending_facilities ?? 0,
    orders_today: dashData?.orders_today ?? 0,
  };
  const actionLoading: Record<ActionStatConfig["key"], boolean> = {
    pending_membership_requests: dashLoading,
    pending_facilities: dashLoading,
    orders_today: dashLoading,
  };

  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(() => getFormattedToday(), []);

  /* ─── Card status distribution for ring chart ──── */
  const cardStatusSegments = useMemo((): RingSegment[] => {
    const published = allCards.filter((c) => c.is_published).length;
    const draft = allCards.filter((c) => !c.is_published).length;
    return [
      { label: "منشورة", count: published, color: "var(--success)", bgColor: "bg-success/15" },
      { label: "مسودة", count: draft, color: "var(--muted-foreground)", bgColor: "bg-muted" },
      { label: "منتهية", count: 0, color: "var(--destructive)", bgColor: "bg-destructive/15" },
    ];
  }, [allCards]);
  const cardTotal = allCards.length;

  /* ─── Date range filter state ───────────────────────── */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const stats = dashData ?? {
    regions: 0,
    cards: 0,
    published_cards: 0,
    facilities: 0,
    customers: 0,
    owners: 0,
    products: 0,
    available_products: 0,
  };

  const staggerVariants = prefersReduced
    ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
    : { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

  const itemVariants = prefersReduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } } };

  return (
    <div className="space-y-6">
      {/* ترحيب الديسكتوب — يبقى كما هو */}
      <div className="hidden lg:block">
        <h1 className="bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent font-black text-2xl sm:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todayStr}
        </p>
      </div>

      {/* ✦ 4-a: هيرو Billboard للموبايل — نمط Netflix فوق الكحلي الرسمي + هالات الهوية */}
      <section
        className="login-navy-bg relative overflow-hidden rounded-2xl lg:hidden"
        aria-label="ملخص اليوم"
      >
        <div
          className="login-blob-emerald pointer-events-none absolute -start-20 -top-24 h-56 w-56 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="login-blob-gold pointer-events-none absolute -end-16 -bottom-24 h-52 w-52 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div className="relative p-5">
          <p className="text-xs font-medium text-white/70">{todayStr}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{greeting}</h1>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70">طلبات اليوم</p>
              {dashLoading ? (
                <Skeleton className="mt-1 h-11 w-24 bg-white/10" />
              ) : (
                <p className="text-5xl font-black leading-tight tabular-nums text-white">
                  {actionValues.orders_today}
                </p>
              )}
            </div>
            <Link href="/admin/orders" className="shrink-0">
              <Button className="min-h-[44px] gap-1.5 rounded-full font-semibold">
                طلبات اليوم
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Date range filter — ✦ 4-a: سطران مرتبان على الموبايل بلا كسر */}
      <div className="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
        <div className="space-y-1.5">
          <label htmlFor="date-from" className="text-sm text-muted-foreground">
            من تاريخ
          </label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-h-[44px] w-full lg:w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="date-to" className="text-sm text-muted-foreground">
            إلى تاريخ
          </label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-h-[44px] w-full lg:w-44"
          />
        </div>
        <div className="col-span-2 flex items-center gap-3 lg:col-span-1">
          <Button
            variant="outline"
            className="min-h-[44px] gap-2"
            onClick={() => {
              /* visual-only: no API call */
            }}
          >
            <Filter className="h-4 w-4" />
            تطبيق
          </Button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="min-h-[44px] inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              مسح الفلتر
            </button>
          )}
        </div>
      </div>

      {/* Action stat cards — ✦ 4-a: صف snap أفقي نمط Netflix على الموبايل / شبكة على الديسكتوب */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerVariants}
        className="no-mobile-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0"
      >
        {ACTION_STAT_CONFIGS.map((config) => (
          <motion.div
            key={config.key}
            variants={itemVariants}
            className="min-w-[220px] shrink-0 snap-start md:min-w-0"
          >
            <ActionStatCard
              config={config}
              isLoading={actionLoading[config.key]}
              value={actionValues[config.key]}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerVariants}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        {STAT_CONFIGS.map((config, index) => (
          <motion.div key={config.key} variants={itemVariants}>
            <StatCard
              config={config}
              isLoading={dashLoading}
              value={stats[config.key]}
              index={index}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Glance Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">نظرة سريعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MiniBarChart label="المتاجر" value={stats.facilities} max={50} color="bg-accent" delay={0.1} reduced={prefersReduced ?? false} />
          <MiniBarChart label="البطاقات المنشورة" value={stats.published_cards} max={20} color="bg-success" delay={0.2} reduced={prefersReduced ?? false} />
          <MiniBarChart label="العملاء" value={stats.customers} max={200} color="bg-secondary" delay={0.3} reduced={prefersReduced ?? false} />
          <MiniBarChart label="المنتجات المتاحة" value={stats.available_products} max={100} color="bg-cat-cafe" delay={0.4} reduced={prefersReduced ?? false} />
        </CardContent>
      </Card>

      {/* Card Status Ring Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <PieChart className="h-5 w-5 text-primary" />
            توزيع حالة البطاقات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cardsLoading ? (
            <CardStatusSkeleton />
          ) : cardTotal === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              لا توجد بطاقات بعد.
            </p>
          ) : (
            <CardStatusRingChart
              segments={cardStatusSegments}
              total={cardTotal}
              reduced={prefersReduced ?? false}
            />
          )}
        </CardContent>
      </Card>

      {/* Quick Actions — ✦ 4-a: صف snap أفقي ثانٍ على الموبايل / شبكة على sm+ */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">إجراءات سريعة</h2>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerVariants}
          className="no-mobile-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0"
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.href}
                variants={itemVariants}
                className="min-w-[200px] shrink-0 snap-start sm:min-w-0"
              >
                <Link href={action.href} className="block h-full">
                  <Card className="group h-full cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                    <CardContent className="flex items-center gap-3 p-4 sm:gap-4">
                      <span className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110",
                        action.bg,
                        action.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{action.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {action.subtitle}
                        </p>
                      </div>
                      <ArrowLeft className="mr-auto hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:block" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Tips Card with gradient border */}
      <div className="relative rounded-xl p-[1.5px] bg-gradient-to-l from-primary via-secondary to-accent">
        <Card className="rounded-[10px] bg-card border-0">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-ink">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">نصيحة</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                استخدم القائمة الجانبية للتنقل بين أقسام الإدارة. يمكنك إدارة المناطق والبطاقات والمتاجر والعملاء ومراجعة سجل العمليات.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">آخر الأنشطة</h2>
        <Card>
          <CardContent className="p-4 sm:p-5">
            {auditLoading ? (
              <ActivitySkeleton />
            ) : recentLogs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أنشطة مؤخرة.
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-xs font-bold">{getAuditLabel(log.action_type).charAt(0)}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{getAuditLabel(log.action_type)}</p>
                      {log.user_id ? (
                        <p className="text-xs text-muted-foreground">
                          مستخدم رقم {log.user_id}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">نظام</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Facilities */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">أحدث المتاجر المضافة</h2>
        <Card>
          <CardContent className="p-4 sm:p-5">
            {facilitiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : recentFacilities.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                لا توجد متاجر بعد.
              </p>
            ) : (
              <div className="space-y-3">
                {recentFacilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    {facility.image_url ? (
                      <ImageWithSkeleton
                        src={resolveImageUrl(facility.image_url)}
                        alt={facility.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-lg"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{facility.name}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {FACILITY_TYPE_LABELS[facility.type]}
                      </Badge>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(facility.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Registered Customers */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">آخر العملاء المسجلين</h2>
        <Card>
          <CardContent className="p-4 sm:p-5">
            {usersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                لا يوجد عملاء مسجلين بعد.
              </p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", ROLE_COLORS[user.role])}
                    >
                      <span className="flex items-center gap-1">
                        {ROLE_ICONS[user.role]}
                        {ROLE_LABELS[user.role]}
                      </span>
                    </Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}