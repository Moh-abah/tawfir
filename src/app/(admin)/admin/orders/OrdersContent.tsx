"use client";

import { useState } from "react";
import {
  ShoppingBag,
  RefreshCcw,
  Eye,
  Inbox,
  MapPin,
  User,
  Store,
  Wallet,
  Banknote,
  Receipt,
  Calendar,
  Package,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAdminOrders, useAdminOrderDetail } from "@/hooks/useAdminOrders";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDebounce } from "@/hooks/useDebounce";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { OrderListOut, OrderStatus, PaymentMethod } from "@/types/api.generated";

/* ─── فلترة الحالة ──────────────────────────────────── */
type StatusFilter = OrderStatus | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "pending", label: ORDER_STATUS_LABEL.pending },
  { value: "confirmed", label: ORDER_STATUS_LABEL.confirmed },
  { value: "preparing", label: ORDER_STATUS_LABEL.preparing },
  { value: "out_for_delivery", label: ORDER_STATUS_LABEL.out_for_delivery },
  { value: "delivered", label: ORDER_STATUS_LABEL.delivered },
  { value: "cancelled", label: ORDER_STATUS_LABEL.cancelled },
];

/* ─── خريطة طريقة الدفع ─────────────────────────────── */
function paymentMethodLabel(method: PaymentMethod): string {
  if (method === "cash") return "نقدًا";
  if (method === "wallet") return "محفظة";
  return method;
}

const PAYMENT_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  wallet: Wallet,
};

/* ─── حجم الصفحة ─────────────────────────────────────── */
const PAGE_SIZE = 10;

/* ─── هيكل صف الجدول ────────────────────────────────── */
function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="overflow-x-auto no-mobile-scrollbar">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 9 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, r) => (
              <TableRow key={r}>
                {Array.from({ length: 9 }).map((_, c) => (
                  <TableCell key={c}>
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─── صفا معلومة داخل تفاصيل الطلب ──────────────────── */
function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p
          dir={dir}
          className={cn(
            "truncate text-sm font-medium text-foreground",
            dir === "ltr" && "text-left"
          )}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── مودال تفاصيل الطلب ─────────────────────────────── */
function OrderDetailsDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: order, isLoading, isError, error } = useAdminOrderDetail(orderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto no-mobile-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
            تفاصيل الطلب {orderId != null ? `#${orderId}` : ""}
          </DialogTitle>
          <DialogDescription>
            بيانات الطلب الكاملة مع الأصناف ومعلومات التوصيل.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "تعذّر تحميل تفاصيل الطلب"}
            </p>
          </div>
        ) : order ? (
          <div className="space-y-4">
            {/* بطاقة معلومات أساسية */}
            <div className="grid gap-2.5 rounded-xl bg-muted/40 p-3.5 sm:grid-cols-2">
              <DetailRow
                icon={User}
                label="العميل"
                value={order.customer_id != null ? `#${order.customer_id}` : "—"}
              />
              <DetailRow
                icon={Store}
                label="المنشأة"
                value={order.facility_name ?? `#${order.facility_id}`}
              />
              <DetailRow
                icon={Receipt}
                label="المبلغ الإجمالي"
                value={formatCurrency(order.total)}
              />
              <DetailRow
                icon={Calendar}
                label="تاريخ الإنشاء"
                value={formatDate(order.created_at)}
              />
              <DetailRow
                icon={PAYMENT_ICON[order.payment_method]}
                label="طريقة الدفع"
                value={paymentMethodLabel(order.payment_method)}
              />
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] leading-tight text-muted-foreground">الحالة</p>
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
            </div>

            {/* معلومات التوصيل */}
            {order.delivery_address && (
              <div className="rounded-xl border p-3.5">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  معلومات التوصيل
                </p>
                <DetailRow
                  icon={MapPin}
                  label="العنوان"
                  value={order.delivery_address}
                />
              </div>
            )}

            {/* الملاحظات */}
            {order.notes && (
              <div className="rounded-xl border p-3.5">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  ملاحظات
                </p>
                <p className="text-sm text-foreground">{order.notes}</p>
              </div>
            )}

            {/* ملخص الأسعار */}
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">رسوم التوصيل</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2">
                <span className="font-semibold">الإجمالي</span>
                <span className="font-bold tabular-nums text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* قائمة الأصناف */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                الأصناف ({order.items.length})
              </p>
              <div className="max-h-64 overflow-y-auto no-mobile-scrollbar rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">الصنف</TableHead>
                      <TableHead className="text-xs text-center">الكمية</TableHead>
                      <TableHead className="text-xs text-left">سعر الوحدة</TableHead>
                      <TableHead className="text-xs text-left">المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">
                          {item.product_name ?? `منتج #${item.product_id}`}
                          {item.discount_applied && (
                            <Badge className="mr-2 bg-success/15 text-success border-transparent text-[10px]">
                              خصم
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-left tabular-nums text-muted-foreground">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-left tabular-nums font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] w-full rounded-full sm:w-auto"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── صف طلب ─────────────────────────────────────────── */
function OrderRow({
  order,
  onViewDetails,
}: {
  order: OrderListOut;
  onViewDetails: (id: number) => void;
}) {
  const PayIcon = PAYMENT_ICON[order.payment_method];
  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell className="font-mono text-xs text-muted-foreground">
        #{order.id}
      </TableCell>
      <TableCell className="font-medium">
        {order.customer_name ?? `مستخدم #${order.customer_id}`}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {order.facility_name ?? `منشأة #${order.facility_id}`}
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            "border-transparent text-xs",
            ORDER_STATUS_TONE[order.status]
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <PayIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {paymentMethodLabel(order.payment_method)}
        </span>
      </TableCell>
      <TableCell className="tabular-nums text-sm text-muted-foreground">
        {formatCurrency(order.subtotal)}
      </TableCell>
      <TableCell className="tabular-nums text-sm text-muted-foreground">
        {formatCurrency(order.delivery_fee)}
      </TableCell>
      <TableCell className="tabular-nums font-semibold text-primary">
        {formatCurrency(order.total)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(order.created_at)}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(order.id)}
          className="min-h-[36px] gap-1.5 rounded-full"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          تفاصيل
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* ─── المكوّن الرئيسي ────────────────────────────────── */
export default function OrdersContent() {
  const prefersReduced = usePrefersReducedMotion();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customerIdInput, setCustomerIdInput] = useState("");
  const [facilityIdInput, setFacilityIdInput] = useState("");
  const [appliedCustomerId, setAppliedCustomerId] = useState<number | null>(null);
  const [appliedFacilityId, setAppliedFacilityId] = useState<number | null>(null);
  /* الجولة الختامية: بحث من الخادم (search — رقم طلب أو اسم عميل) */
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const queryStatus =
    statusFilter === "all" ? null : (statusFilter as OrderStatus);

  const { data, isLoading, isError, error, refetch } = useAdminOrders({
    status: queryStatus,
    customer_id: appliedCustomerId,
    facility_id: appliedFacilityId,
    search: debouncedSearch,
    page,
    page_size: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function applyFilters() {
    const cId = customerIdInput.trim();
    const fId = facilityIdInput.trim();
    setAppliedCustomerId(cId ? Number(cId) : null);
    setAppliedFacilityId(fId ? Number(fId) : null);
    setPage(1);
  }

  function clearFilters() {
    setCustomerIdInput("");
    setFacilityIdInput("");
    setAppliedCustomerId(null);
    setAppliedFacilityId(null);
    setSearchInput("");
    setPage(1);
  }

  function goToPage(p: number) {
    if (p < 1 || p > pages) return;
    setPage(p);
  }

  const hasActiveFilters =
    appliedCustomerId !== null ||
    appliedFacilityId !== null ||
    searchInput.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            الطلبات
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            كل الطلبات على المنصة — فلترة بالحالة أو العميل أو المنشأة.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="min-h-[44px] gap-2 rounded-full"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          تحديث
        </Button>
      </div>

      {/* رقائق الفلترة بالحالة */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusChange(f.value)}
            className={cn(
              "min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors",
              statusFilter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-pressed={statusFilter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* البحث — رقم طلب أو اسم عميل (من الخادم) */}
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          placeholder="ابحث برقم الطلب أو اسم العميل..."
          aria-label="البحث في الطلبات"
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

      {/* حقول فلترة رقمية اختيارية */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-customer" className="text-sm text-muted-foreground">
            رقم العميل
          </Label>
          <Input
            id="filter-customer"
            type="number"
            inputMode="numeric"
            min={1}
            value={customerIdInput}
            onChange={(e) => setCustomerIdInput(e.target.value)}
            placeholder="مثال: 5"
            className="min-h-[44px] w-40"
            dir="ltr"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-facility" className="text-sm text-muted-foreground">
            رقم المنشأة
          </Label>
          <Input
            id="filter-facility"
            type="number"
            inputMode="numeric"
            min={1}
            value={facilityIdInput}
            onChange={(e) => setFacilityIdInput(e.target.value)}
            placeholder="مثال: 2"
            className="min-h-[44px] w-40"
            dir="ltr"
          />
        </div>
        <Button
          onClick={applyFilters}
          className="min-h-[44px] gap-2 rounded-full"
        >
          تطبيق
        </Button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-[44px] inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            مسح الفلتر
          </button>
        )}
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState
          title="تعذّر تحميل الطلبات"
          message={
            error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع أثناء جلب الطلبات."
          }
          onRetry={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="لا توجد طلبات"
          description={
            statusFilter !== "all"
              ? `لا توجد طلبات بحالة «${ORDER_STATUS_LABEL[statusFilter as OrderStatus]}».`
              : hasActiveFilters
              ? "لا توجد طلبات مطابقة لمعايير الفلترة الحالية."
              : "ستظهر هنا الطلبات فور إنشائها من العملاء."
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            عرض {items.length} من {total} طلب
          </p>
          <div
            className={cn(
              "rounded-2xl border border-border/60 bg-card overflow-hidden shadow-soft",
              !prefersReduced && "transition-shadow"
            )}
          >
            <div className="overflow-x-auto no-mobile-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs">الطلب</TableHead>
                    <TableHead className="text-xs">العميل</TableHead>
                    <TableHead className="text-xs">المنشأة</TableHead>
                    <TableHead className="text-xs">الحالة</TableHead>
                    <TableHead className="text-xs">الدفع</TableHead>
                    <TableHead className="text-xs">الفرعي</TableHead>
                    <TableHead className="text-xs">التوصيل</TableHead>
                    <TableHead className="text-xs">الإجمالي</TableHead>
                    <TableHead className="text-xs">التاريخ</TableHead>
                    <TableHead className="text-xs">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((o) => (
                    <OrderRow
                      key={o.id}
                      order={o}
                      onViewDetails={(id) => setDetailsId(id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {pages > 1 && (
            <Pagination className="justify-center" dir="rtl">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page - 1);
                    }}
                    aria-disabled={page <= 1}
                    className={cn(
                      "min-h-[44px]",
                      page <= 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                {Array.from({ length: pages }).map((_, i) => {
                  const p = i + 1;
                  if (p !== 1 && p !== pages && (p < page - 1 || p > page + 1)) {
                    if (p === 2 || p === pages - 1) {
                      return (
                        <PaginationItem key={p}>
                          <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                            …
                          </span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  }
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(p);
                        }}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page + 1);
                    }}
                    aria-disabled={page >= pages}
                    className={cn(
                      "min-h-[44px]",
                      page >= pages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* مودال تفاصيل الطلب */}
      <OrderDetailsDialog
        orderId={detailsId}
        open={detailsId !== null}
        onOpenChange={(v) => {
          if (!v) setDetailsId(null);
        }}
      />
    </div>
  );
}
