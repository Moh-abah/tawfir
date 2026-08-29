"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  ChevronLeft,
  Package,
  Sparkles,
  UtensilsCrossed,
  Search,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { ScreenHeader, ScreenHeaderSkeleton } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useMyOrders } from "@/hooks/useMyOrders";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderListOut, OrderStatus } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── الفلاتر ──────────────────────────────────────── */
type FilterKey = "all" | OrderStatus;

/* الجولة 10 — الحالات النشطة تُظهر نقطة نابضة بجانب الشارة («مباشر» الآن) */
const LIVE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: ORDER_STATUS_LABEL.pending },
  { key: "confirmed", label: ORDER_STATUS_LABEL.confirmed },
  { key: "preparing", label: ORDER_STATUS_LABEL.preparing },
  { key: "out_for_delivery", label: ORDER_STATUS_LABEL.out_for_delivery },
  { key: "delivered", label: ORDER_STATUS_LABEL.delivered },
  { key: "cancelled", label: ORDER_STATUS_LABEL.cancelled },
];

/* ─── بطاقة طلب واحد ──────────────────────────────── */
function OrderCard({ order }: { order: OrderListOut }) {
  const prefersReduced = usePrefersReducedMotion();
  const cardAnim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  const isPending = order.status === "pending";

  return (
    <motion.div {...cardAnim} transition={{ duration: 0.25, ease: "easeOut" }}>
      <Link
        href={`/orders/${order.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        aria-label={`تفاصيل الطلب رقم ${order.id}`}
      >
        <motion.div
          whileHover={prefersReduced ? undefined : { y: -3 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-shadow hover:shadow-soft-lg sm:p-5"
        >
          {/* شارة «طلب جديد!» */}
          {isPending && (
            <span
              className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-soft"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              طلب جديد!
            </span>
          )}

          <div className="flex items-start justify-between gap-3">
            {/* يسار: رقم الطلب + المتجر + التاريخ */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">طلب رقم</p>
                  <p className="font-bold tabular-nums text-foreground">
                    #{order.id}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="line-clamp-1 font-medium">
                    {order.facility_name ?? "متجر"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            {/* يمين: الإجمالي + شارة الحالة */}
            <div className="flex flex-col items-end gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                  ORDER_STATUS_TONE[order.status]
                )}
              >
                {/* الجولة 10 — نقطة نابضة للحالات النشطة (تُخفى لمن يفضّل تقليل الحركة) */}
                {LIVE_STATUSES.has(order.status) && !prefersReduced && (
                  <span
                    className="relative flex h-2 w-2"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                  </span>
                )}
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              <div className="text-left" dir="ltr">
                <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                <p className="text-sm font-extrabold text-foreground tabular-nums">
                  {formatCurrency(order.total)}
                </p>
              </div>
            </div>
          </div>

          {/* شريط سفلي: زر التفاصيل */}
          <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-3">
            <span className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-secondary">
              عرض التفاصيل
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─── هيكل التحميل ──────────────────────────────────── */
function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── شبكة الطلبات ──────────────────────────────────── */
function OrdersGrid({ status, search }: { status: FilterKey; search: string }) {
  const prefersReduced = usePrefersReducedMotion();

  const queryStatus = status === "all" ? undefined : status;
  const { data, isLoading, isError, error, refetch } = useMyOrders(
    queryStatus,
    true,
    search
  );

  const orders = useMemo<OrderListOut[]>(() => data?.items ?? [], [data]);
  const searching = search.trim().length > 0;

  if (isLoading) return <OrdersSkeleton />;

  if (isError) {
    const msg =
      error instanceof Error
        ? error.message
        : "تعذّر تحميل طلباتك. تحقق من اتصالك بالإنترنت.";
    return (
      <ErrorState
        title="تعذّر تحميل الطلبات"
        message={msg}
        onRetry={() => refetch()}
      />
    );
  }

  if (orders.length === 0) {
    /* نتيجة بحث فارغة — رسالة مختلفة عن «لا طلبات بعد» */
    if (searching) {
      return (
        <EmptyState
          icon={Search}
          title="لا نتائج مطابقة"
          description={`لا يوجد طلب برقم يحتوي "${search.trim()}" ضمن هذه القائمة.`}
        />
      );
    }
    return (
      <EmptyState
        icon={ShoppingBag}
        title="لا توجد طلبات بعد"
        description="ابدأ أول طلب الآن وستجده هنا عند الحاجة."
        action={
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            تصفّح الوجبات
          </Link>
        }
      />
    );
  }

  const containerAnim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 } };

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <motion.div
        {...containerAnim}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </AnimatePresence>
      </motion.div>
    </PullToRefresh>
  );
}

/* ─── الجولة 14 — شريط الطلب الجاري ──────────────────── */
const ACTIVE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

function ActiveOrderBanner() {
  const prefersReduced = usePrefersReducedMotion();
  /* طلبات «all» (الأحدث أولاً) — نلتقط أول طلب جارٍ */
  const { data } = useMyOrders(undefined, true, undefined);
  const activeOrder = useMemo(
    () => (data?.items ?? []).find((o) => ACTIVE_ORDER_STATUSES.has(o.status)) ?? null,
    [data]
  );

  if (!activeOrder) return null;

  const isLive = activeOrder.status !== "pending";

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-6"
    >
      <Link
        href={`/orders/${activeOrder.id}`}
        className="native-tap-card group relative block overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-4 shadow-soft transition-shadow hover:shadow-soft-lg"
        aria-label={`تتبّع طلبك الجاري رقم ${activeOrder.id}`}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
            {isLive && (
              <motion.span
                className="absolute inset-0 rounded-full bg-primary/15"
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            )}
            <ShoppingBag
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-primary">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              طلبك الجاري الآن
            </p>
            <p className="mt-0.5 truncate text-sm font-extrabold text-foreground">
              طلب #{activeOrder.id} — {activeOrder.facility_name ?? "المتجر"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {ORDER_STATUS_LABEL[activeOrder.status]}
              {" · "}
              <span dir="ltr" className="font-bold tabular-nums text-foreground">
                {formatCurrency(activeOrder.total)}
              </span>
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            تتبّع
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── المحتوى الكامل للصفحة ────────────────────────── */
export default function OrdersContent() {
  const { accessToken, hydrated } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  /* بحث برقم الطلب — debounce 350ms ثم يُرسل ?search= للخادم (لا فلترة محلية) */
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
  }, [queryClient]);

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <>
        <ScreenHeaderSkeleton />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Skeleton className="mb-4 h-8 w-32" />
          <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          <OrdersSkeleton />
        </div>
      </>
    );
  }

  /* غير مسجّل → دعوة لتسجيل الدخول */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="طلباتي" fallbackHref="/" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={ShoppingBag}
            title="سجّل الدخول لعرض طلباتك"
            description="عند تسجيل الدخول ستظهر هنا كل طلباتك السابقة وحالتها."
            action={
              <div className="flex flex-col gap-2">
                <Link
                  href="/login?next=/orders"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  إنشاء حساب
                </Link>
              </div>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="طلباتي" fallbackHref="/">
        <NotificationBell />
      </ScreenHeader>
      <PullToRefresh onRefresh={onRefresh}>
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6" dir="rtl">
        <p className="mb-6 text-sm text-muted-foreground">
          تابع حالة طلباتك الحالية والسابقة
        </p>

      {/* الجولة 14 — شريط الطلب الجاري (أحدث طلب نشط بزاوية تتبّع) */}
      {hydrated && accessToken && <ActiveOrderBanner />}

      {/* البحث برقم الطلب — من الخادم */}
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          inputMode="numeric"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث برقم الطلب..."
          aria-label="البحث برقم الطلب"
          className="min-h-[44px] rounded-full pr-9 pl-10"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* فلترة الحالة */}
      <div
        className="scroll-area-thin mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="فلترة الطلبات حسب الحالة"
      >
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "shrink-0 snap-start rounded-full px-4 py-2 text-xs font-bold transition-colors min-h-[44px]",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* قائمة الطلبات — يُعاد رسمها عند تغيّر الفلتر */}
      <OrdersGrid
        key={`${filter}-${debouncedSearch}`}
        status={filter}
        search={debouncedSearch}
      />
    </div>
    </PullToRefresh>
    </>
  );
}
