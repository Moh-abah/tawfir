"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  Hourglass,
  Banknote,
  Flame,
  Target,
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  Trophy,
  Store,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useOwnerStats } from "@/hooks/useOwnerStats";
import { formatCurrency, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import type {
  Facility,
  OrderStatus,
} from "@/types/api.generated";

// ─── ثوابت الألوان لشارات حالة الطلب (مطابقة لمواصفات المهمة) ───
const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  preparing: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  out_for_delivery:
    "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  delivered:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

const WEEKDAY_LABELS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/** اختصار التاريخ لنقطة الرسم: اسم اليوم + رقم/شهر. */
function chartDateLabel(iso: string): { weekday: string; short: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { weekday: "", short: "" };
  }
  const weekday = WEEKDAY_LABELS[d.getDay()] ?? "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { weekday, short: `${dd}/${mm}` };
}

// ─── بطاقة إحصائية واحدة ───────────────────────────────────
type StatCardDef = {
  id: string;
  icon: typeof Package;
  value: string | number;
  label: string;
  subtitle?: string;
  iconClass: string; // text-... bg-.../10
  pulse?: boolean;
};

function StatCard({ def }: { def: StatCardDef }) {
  const Icon = def.icon;
  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardContent className="p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            def.iconClass
          )}
        >
          <Icon
            className={cn("h-5 w-5", def.pulse && "animate-pulse")}
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums">
          {def.value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{def.label}</p>
        {def.subtitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            {def.subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── رسم أعمدة آخر 7 أيام (CSS خالص — بدون مكتبة) ──────────
function OrdersBarChart({
  points,
}: {
  points: { date: string; count: number; revenue: number }[];
}) {
  const maxCount = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.count), 0),
    [points]
  );
  const chartHeightPx = 120;

  return (
    <div className="flex items-end gap-1.5">
      {points.map((p, i) => {
        const { weekday, short } = chartDateLabel(p.date);
        const heightPct =
          maxCount > 0 ? (p.count / maxCount) * 100 : 0;
        const heightPx = Math.max(
          (heightPct / 100) * chartHeightPx,
          p.count > 0 ? 4 : 0
        );
        const tooltipText = `${p.count} طلبات • ${formatCurrency(
          p.revenue
        )}`;
        return (
          <div
            key={`${p.date}-${i}`}
            className="group flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              className="relative flex w-full items-end justify-center"
              style={{ height: `${chartHeightPx}px` }}
            >
              {/* Tooltip — يظهر عند المرور */}
              <span
                className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
                role="tooltip"
              >
                {tooltipText}
              </span>
              <div
                className={cn(
                  "w-7 rounded-t-md transition-all",
                  p.count > 0
                    ? "bg-primary/70 group-hover:bg-primary"
                    : "bg-muted-foreground/15"
                )}
                style={{ height: `${heightPx}px` }}
                title={tooltipText}
                aria-label={tooltipText}
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-[10px] font-medium text-muted-foreground">
                {weekday}
              </span>
              <span className="text-[9px] text-muted-foreground/70">
                {short}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── بطاقة "آخر الطلبات" ─────────────────────────────────────
function RecentOrdersList({
  orders,
  facilityId,
}: {
  orders: {
    id: number;
    customer_name: string | null;
    status: OrderStatus;
    total: number;
    created_at: string;
  }[];
  facilityId: number;
}) {
  if (orders.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        لا توجد طلبات بعد
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div
          key={o.id}
          className="flex items-center gap-3 rounded-xl border bg-card/50 p-2.5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-[11px] font-bold tabular-nums">
              #{o.id}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {o.customer_name ?? "عميل غير مسجّل"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(o.total)}
            </p>
          </div>
          <Badge
            className={cn(
              "shrink-0 border-transparent text-[10px]",
              STATUS_TONE[o.status]
            )}
          >
            {ORDER_STATUS_LABEL[o.status]}
          </Badge>
          <Link
            href={`/owner/facilities/${facilityId}/orders/${o.id}`}
            className="shrink-0"
          >
            <Button
              size="sm"
              variant="ghost"
              className="h-9 min-h-[44px] gap-1 rounded-full px-2 text-xs"
              aria-label={`تفاصيل الطلب رقم ${o.id}`}
            >
              <span>تفاصيل</span>
              <ChevronLeft
                className="h-3.5 w-3.5 rtl:rotate-180"
                aria-hidden="true"
              />
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── قائمة الأكثر طلباً ─────────────────────────────────────
function TopProductsList({
  products,
}: {
  products: {
    product_id: number;
    name: string;
    count: number;
    revenue: number;
  }[];
}) {
  const maxCount = useMemo(
    () => products.reduce((m, p) => Math.max(m, p.count), 0),
    [products]
  );

  if (products.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        لا توجد بيانات بعد
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {products.map((p, idx) => {
        const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0;
        const rankClass =
          idx === 0
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            : idx === 1
              ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-300"
              : idx === 2
                ? "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
                : "bg-muted text-muted-foreground";
        return (
          <li key={p.product_id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                  rankClass
                )}
              >
                {idx + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.name}
              </p>
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {p.count} طلبات
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {formatCurrency(p.revenue)}
              </span>
            </div>
            {/* شريط نسبي */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── هيكل التحميل (Skeleton) ─────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي: لوحة إحصائيات المالك ─────────────────
export function OwnerStatsDashboard({
  facilities,
  initialFacilityId,
}: {
  facilities: Facility[];
  initialFacilityId: number;
}) {
  const [selectedId, setSelectedId] = useState<number>(initialFacilityId);
  const { data, isLoading, isError } = useOwnerStats(selectedId);

  const showSelector = facilities.length > 1;
  const selectedFacility =
    facilities.find((f) => f.id === selectedId) ?? facilities[0];

  if (isError) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
        role="alert"
      >
        <AlertTriangle
          className="h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <span>تعذّر تحميل الإحصائيات. حاول مرة أخرى لاحقاً.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* الترويسة + منتقي المنشأة */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold leading-tight">
            لوحة الإحصائيات
          </h2>
          <p className="text-xs text-muted-foreground">
            نظرة عامة على أداء منشأتك خلال آخر 7 أيام
          </p>
        </div>
        {showSelector && (
          <Select
            value={String(selectedId)}
            onValueChange={(v) => setSelectedId(Number(v))}
          >
            <SelectTrigger
              className="h-11 min-h-[44px] w-full sm:w-[220px]"
              aria-label="اختر منشأة لعرض إحصائياتها"
            >
              <SelectValue placeholder="اختر منشأة" />
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* بطاقات الإحصاءات الست */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard
              def={{
                id: "total_products",
                icon: Package,
                value: data.total_products,
                label: "إجمالي المنتجات",
                subtitle: `متاحة: ${data.available_products}`,
                iconClass: "text-primary bg-primary/10",
              }}
            />
            <StatCard
              def={{
                id: "today_orders",
                icon: ShoppingBag,
                value: data.today_orders,
                label: "طلبات اليوم",
                subtitle: `إيراد اليوم: ${formatCurrency(
                  data.today_revenue
                )}`,
                iconClass:
                  "text-emerald-500 bg-emerald-500/10",
              }}
            />
            <StatCard
              def={{
                id: "pending_orders",
                icon: Hourglass,
                value: data.pending_orders,
                label: "طلبات معلّقة",
                iconClass: "text-amber-500 bg-amber-500/10",
                pulse: data.pending_orders > 0,
              }}
            />
            <StatCard
              def={{
                id: "total_revenue",
                icon: Banknote,
                value: formatCurrency(data.total_revenue),
                label: "إجمالي الإيراد",
                iconClass: "text-sky-500 bg-sky-500/10",
              }}
            />
            <StatCard
              def={{
                id: "active_special_offers",
                icon: Flame,
                value: data.active_special_offers,
                label: "العروض النشطة",
                iconClass: "text-destructive bg-destructive/10",
              }}
            />
            <StatCard
              def={{
                id: "facility_discount_rate",
                icon: Target,
                value: `${data.facility_discount_rate}%`,
                label: "نسبة خصم منشأتك",
                iconClass: "text-primary bg-primary/10",
              }}
            />
          </div>

          {/* رسم آخر 7 أيام — يُخفى عند الفراغ */}
          {data.orders_chart.length > 0 && (
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-bold">
                    طلبات آخر 7 أيام
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {data.orders_chart.reduce(
                      (s, p) => s + p.count,
                      0
                    )}{" "}
                    طلبات
                  </Badge>
                </div>
                <OrdersBarChart points={data.orders_chart} />
              </CardContent>
            </Card>
          )}

          {/* آخر الطلبات + الأكثر طلباً */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-bold">آخر الطلبات</h3>
                  </div>
                  <Link
                    href={`/owner/facilities/${selectedId}/orders`}
                    className="inline-flex h-9 min-h-[44px] items-center gap-1 rounded-full px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <span>الكل</span>
                    <ChevronLeft
                      className="h-3.5 w-3.5 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <RecentOrdersList
                  orders={data.recent_orders.slice(0, 5)}
                  facilityId={selectedId}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy
                    className="h-4 w-4 text-amber-500"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-bold">الأكثر طلباً</h3>
                </div>
                <TopProductsList
                  products={data.top_products.slice(0, 5)}
                />
              </CardContent>
            </Card>
          </div>

          {/* تذييل صغير: آخر تحديث */}
          {data.recent_orders[0]?.created_at && (
            <p className="text-center text-[10px] text-muted-foreground/70">
              آخر طلب:{" "}
              {formatDate(data.recent_orders[0].created_at)}
              {selectedFacility
                ? ` • ${selectedFacility.name}`
                : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// مُصدّر إضافي للأيقونات (يستخدم في مواضع أخرى إن لزم)
export const OwnerStatsDashboardIcons = {
  Package,
  ShoppingBag,
  Hourglass,
  Banknote,
  Flame,
  Target,
  Store,
  ArrowRight,
};
