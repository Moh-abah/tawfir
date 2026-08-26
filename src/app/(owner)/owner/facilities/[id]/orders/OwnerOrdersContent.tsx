"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShoppingBag,
  Search,
  X,
  Package,
  CheckCircle2,
  Hourglass,
  Truck,
  ChefHat,
  Ban,
  User,
  Hash,
  CreditCard,
  Store,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ownerService } from "@/services/owner.service";
import { useOwnerOrders } from "@/hooks/useOwnerOrders";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Facility,
  OrderListOut,
  OrderStatus,
  PaymentMethod,
} from "@/types/api.generated";

// ─── Helpers ──────────────────────────────────────────────
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "نقدي",
  wallet: "محفظة",
};

/** التحوّلات المسموحة من كل حالة — Forward only. */
const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing"],
  preparing: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** كل الحالات لعرضها في قائمة Select. */
const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

interface StatusFilter {
  key: OrderStatus | "all";
  label: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "بانتظار" },
  { key: "confirmed", label: "مؤكَّد" },
  { key: "preparing", label: "قيد التحضير" },
  { key: "out_for_delivery", label: "في الطريق" },
  { key: "delivered", label: "تم التوصيل" },
  { key: "cancelled", label: "ملغى" },
];

// ─── Order Row / Card ─────────────────────────────────────
interface OrderRowProps {
  order: OrderListOut;
  facilityId: number;
  prefersReduced: boolean;
}

function OrderRow({ order, facilityId, prefersReduced }: OrderRowProps) {
  const statusMutation = useUpdateOrderStatus(facilityId);
  const isPending = order.status === "pending";
  const allowedNext = ALLOWED_NEXT[order.status];

  const itemAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  function onStatusChange(next: string) {
    if (next === order.status) return;
    statusMutation.mutate({ orderId: order.id, status: next });
  }

  return (
    <motion.div
      variants={itemAnimation}
      initial="initial"
      animate="animate"
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      layout={!prefersReduced}
    >
      <Card
        className={cn(
          "rounded-2xl border-border/60 transition-shadow hover:shadow-md",
          isPending && "border-amber-300/60 dark:border-amber-500/40"
        )}
      >
        <CardContent className="p-4 sm:p-5">
          {/* رأس البطاقة: رقم الطلب + الحالة + شارة «جديد» */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="font-mono text-sm font-bold">
                    {order.id}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {isPending && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                    prefersReduced
                      ? "bg-accent/15"
                      : "animate-pulse bg-accent text-accent-foreground"
                  )}
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  طلب جديد!
                </span>
              )}
              <Badge
                className={cn(
                  "border-transparent text-xs",
                  ORDER_STATUS_TONE[order.status]
                )}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </div>
          </div>

          {/* تفاصيل العميل والإجمالي */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">العميل:</span>
                <span className="truncate font-medium">
                  {order.customer_name ?? "عميل غير مُحدَّد"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">طريقة الدفع:</span>
                <span className="font-medium">
                  {PAYMENT_LABEL[order.payment_method]}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 sm:text-left">
              <div className="flex items-center gap-2 text-sm sm:justify-end">
                <span className="text-muted-foreground">المجموع الفرعي:</span>
                <span className="font-mono">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:justify-end">
                <span className="text-muted-foreground">رسوم التوصيل:</span>
                <span className="font-mono">
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:justify-end">
                <span className="text-muted-foreground">الإجمالي:</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* اختيار الحالة */}
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
              <span>طلب من منشأة:</span>
              <span className="font-medium text-foreground">
                {order.facility_name ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor={`status-${order.id}`}
                className="text-xs text-muted-foreground"
              >
                تغيير الحالة:
              </label>
              <Select
                value={order.status}
                onValueChange={onStatusChange}
                disabled={
                  statusMutation.isPending ||
                  allowedNext.length === 0
                }
              >
                <SelectTrigger
                  id={`status-${order.id}`}
                  className="h-9 min-w-[170px] gap-2 rounded-full"
                  aria-label={`تغيير حالة الطلب رقم ${order.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((status) => {
                    const isCurrent = status === order.status;
                    const isAllowed = isCurrent || allowedNext.includes(status);
                    return (
                      <SelectItem
                        key={status}
                        value={status}
                        disabled={!isAllowed}
                      >
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5",
                            !isAllowed && "text-muted-foreground/50"
                          )}
                        >
                          {ORDER_STATUS_LABEL[status]}
                          {isCurrent && (
                            <span className="text-xs text-muted-foreground">
                              (الحالي)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Quick Stats ──────────────────────────────────────────
interface StatsBarProps {
  orders: OrderListOut[];
  isLoading: boolean;
}

function StatsBar({ orders, isLoading }: StatsBarProps) {
  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter(
    (o) => o.status === "confirmed" || o.status === "preparing"
  ).length;
  const completed = orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled"
  ).length;

  const stats = [
    {
      id: "total",
      icon: ShoppingBag,
      label: "إجمالي الطلبات",
      value: orders.length,
      tone: "bg-primary/10 text-primary",
    },
    {
      id: "pending",
      icon: Hourglass,
      label: "بانتظار",
      value: pending,
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    {
      id: "preparing",
      icon: ChefHat,
      label: "قيد التحضير",
      value: preparing,
      tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    },
    {
      id: "completed",
      icon: CheckCircle2,
      label: "مكتمل",
      value: completed,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                stat.tone
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <p className="text-xl font-bold leading-none">{stat.value}</p>
              )}
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function OwnerOrdersContent() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const router = useRouter();
  const prefersReduced = usePrefersReducedMotion();

  // التحقق من ملكية المنشأة (يحمل القائمة من useMyFacilities الكاش الموجود)
  const { data: facilities, isLoading: facilitiesLoading } = useMyFacilities();
  const facility: Facility | undefined = useMemo(
    () => facilities?.find((f) => f.id === facilityId),
    [facilities, facilityId]
  );

  // استعلام تفصيلي للمنشأة (للاستعلام عن الحالة قبل وصول القائمة)
  const { data: facilityDetail, isLoading: facilityDetailLoading } =
    useQuery<Facility>({
      queryKey: ["my-facility", facilityId],
      queryFn: () => ownerService.getMyFacility(facilityId),
      enabled: !!facilityId && facilityId > 0,
    });

  const currentFacility = facility ?? facilityDetail;

  const {
    data: orders,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch,
  } = useOwnerOrders(facilityId);

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  // فلترة محلية على الطلبات
  const filteredOrders = useMemo(() => {
    const all = orders?.items ?? [];
    let list = all;
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          (o.customer_name ?? "").toLowerCase().includes(q)
      );
    }
    // الأحدث أولاً
    return [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, statusFilter, search]);

  const pageAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Loading (initial fetch) ───
  if (facilitiesLoading && !currentFacility) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Facility not found / not owned ───
  if (currentFacility === undefined && !facilityDetailLoading) {
    return (
      <ErrorState
        title="المنشأة غير موجودة"
        message="لا تملك صلاحية الوصول لهذه المنشأة أو أنها غير موجودة."
        onRetry={() => router.push("/owner")}
      />
    );
  }

  // ─── Loading facility ───
  if (!currentFacility) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  const isPending =
    currentFacility.is_approved === false && !currentFacility.rejection_reason;
  const isRejected =
    currentFacility.is_approved === false && !!currentFacility.rejection_reason;

  return (
    <motion.div
      className="space-y-6"
      variants={pageAnimation}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            onClick={() => router.back()}
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <h1 className="truncate text-xl font-bold sm:text-2xl">
                طلبات {currentFacility.name}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              إدارة وتتبّع طلبات المنشأة وتحديث حالتها
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/owner/facilities/${facilityId}/products`}>
            <Button
              variant="outline"
              className="gap-2 rounded-full min-h-[44px]"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">المنتجات</span>
            </Button>
          </Link>
          <Link href={`/owner/facilities/${facilityId}`}>
            <Button
              variant="outline"
              className="gap-2 rounded-full min-h-[44px]"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">تعديل المنشأة</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* تنبيه حالة المنشأة (معلّقة/مرفوضة) */}
      {(isPending || isRejected) && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl p-4",
            isPending ? "bg-accent/10" : "bg-destructive/10"
          )}
          role="alert"
        >
          {isPending ? (
            <Hourglass
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            />
          ) : (
            <Ban
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold",
                isPending ? "text-foreground" : "text-destructive"
              )}
            >
              {isPending
                ? "منشأتك بانتظار موافقة المشرف"
                : "تم رفض منشأتك"}
            </p>
            <p
              className={cn(
                "mt-1 text-xs leading-relaxed",
                isPending ? "text-muted-foreground" : "text-destructive"
              )}
            >
              {isPending
                ? "ستظهر طلباتك هنا فور موافقة المشرف على المنشأة وستُراجع خلال 24-48 ساعة."
                : `السبب: ${currentFacility.rejection_reason ?? "غير محدد"}. عدّل بيانات المنشأة ثم تواصل مع الإدارة.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar orders={orders?.items ?? []} isLoading={ordersLoading} />

      {/* Filters + Search */}
      <div className="flex flex-col gap-3">
        {/* Filter chips — horizontally scrollable on mobile */}
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="تصفية الطلبات حسب الحالة"
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.key;
            const count =
              filter.key === "all"
                ? orders?.items?.length ?? 0
                : orders?.items?.filter((o) => o.status === filter.key).length ?? 0;
            return (
              <button
                key={filter.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  "flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:bg-muted/40"
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-primary-foreground/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="ابحث برقم الطلب أو اسم العميل..."
            className="min-h-[44px] rounded-full pe-10 ps-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="بحث في الطلبات"
          />
          {search && (
            <button
              type="button"
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {ordersLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : ordersError ? (
        <ErrorState
          title="تعذّر تحميل الطلبات"
          message="حدث خطأ أثناء جلب طلبات هذه المنشأة. يرجى المحاولة مرة أخرى."
          onRetry={() => refetch()}
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={
            search || statusFilter !== "all"
              ? "لا توجد طلبات مطابقة"
              : "لا توجد طلبات بعد"
          }
          description={
            search || statusFilter !== "all"
              ? "جرّب تغيير الفلاتر أو كلمات البحث لمشاهدة المزيد."
              : "ستظهر الطلبات الجديدة من العملاء هنا فور استلامها."
          }
        />
      ) : (
        <div className="scroll-area-thin max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto pb-1 pe-1">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                facilityId={facilityId}
                prefersReduced={prefersReduced}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
