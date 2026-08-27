"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Package,
  Store,
  MapPin,
  Truck,
  Receipt,
  CreditCard,
  StickyNote,
  CheckCircle2,
  XCircle,
  Clock,
  Soup,
  Loader2,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrderDetail } from "@/hooks/useOrderDetail";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ORDER_STATUS_LABEL,
  ORDER_TRACKING_FLOW,
  ORDER_STATUS_TONE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  OrderOut,
  OrderItemOut,
  OrderStatus,
  PaymentMethod,
} from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── أيقونات خطوات التتبّع ──────────────────────────── */
const STEP_ICON: Record<OrderStatus, LucideIcon> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: Soup,
  out_for_delivery: Truck,
  delivered: Package,
  cancelled: XCircle,
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "نقداً عند الاستلام",
  wallet: "محفظة جيب",
};

/* ─── شريط التتبّع (الحالة العادية) ──────────────────── */
function TrackingFlow({ currentStatus }: { currentStatus: OrderStatus }) {
  const prefersReduced = usePrefersReducedMotion();
  const currentIndex = ORDER_TRACKING_FLOW.indexOf(currentStatus);
  /* الحالة بعد المكتملة (delivered) — كل الخطوات ممتلئة */
  const reachedDelivered = currentStatus === "delivered";

  return (
    <ol
      className="relative flex items-start justify-between"
      aria-label="تتبّع حالة الطلب"
    >
      {/* الخط الأفقي خلف النقاط */}
      <div
        className="absolute top-5 right-5 left-5 h-0.5 bg-muted"
        aria-hidden="true"
      />
      <motion.div
        className="absolute top-5 right-5 h-0.5 bg-secondary"
        aria-hidden="true"
        initial={prefersReduced ? { width: "0%" } : { width: 0 }}
        animate={{
          width:
            currentIndex > 0 && currentIndex < ORDER_TRACKING_FLOW.length
              ? `${(currentIndex / (ORDER_TRACKING_FLOW.length - 1)) * 100}%`
              : reachedDelivered
                ? "100%"
                : "0%",
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ maxWidth: "calc(100% - 2.5rem)" }}
      />

      {ORDER_TRACKING_FLOW.map((step, idx) => {
        const Icon = STEP_ICON[step];
        const isCompleted =
          reachedDelivered ||
          (currentIndex > -1 && idx < currentIndex) ||
          (idx === currentIndex && idx === ORDER_TRACKING_FLOW.length - 1);
        const isCurrent = !reachedDelivered && idx === currentIndex;
        const isFuture = !reachedDelivered && idx > currentIndex;

        return (
          <li
            key={step}
            className="relative z-10 flex flex-1 flex-col items-center gap-1.5"
          >
            <motion.div
              initial={prefersReduced ? { scale: 1 } : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, delay: prefersReduced ? 0 : idx * 0.08 }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors",
                isCompleted &&
                  "border-secondary bg-secondary text-secondary-foreground",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground shadow-soft-lg",
                isFuture && "border-border bg-card text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </motion.div>
            <span
              className={cn(
                "text-center text-[10px] font-medium leading-tight sm:text-xs",
                isCompleted || isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── حالة الإلغاء (مسار منفصل) ─────────────────────── */
function CancelledNotice() {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center"
      role="status"
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
          ORDER_STATUS_TONE.cancelled
        )}
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        {ORDER_STATUS_LABEL.cancelled}
      </span>
      <p className="text-xs text-muted-foreground">
        تم إلغاء هذا الطلب ولن يُنفَّذ. لأي استفسار تواصل مع المنشأة.
      </p>
    </div>
  );
}

/* ─── صفّ صنف ──────────────────────────────────────── */
function OrderItemRow({ item }: { item: OrderItemOut }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-foreground line-clamp-2">
            {item.product_name ?? "صنف"}
          </p>
          {item.discount_applied && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              خصم مطبّق
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            الكمية: <span className="font-bold text-foreground">{item.quantity}</span>
          </span>
          <span className="tabular-nums">
            سعر الوحدة: {formatCurrency(item.unit_price)}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-left" dir="ltr">
        <p className="text-[10px] text-muted-foreground">المجموع</p>
        <p className="text-sm font-extrabold text-foreground tabular-nums">
          {formatCurrency(item.subtotal)}
        </p>
      </div>
    </li>
  );
}

/* ─── بطاقة معلومات ──────────────────────────────────── */
function InfoRow({
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
    <div className="flex items-start gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          dir={dir}
          className={cn(
            "text-sm font-bold text-foreground",
            dir === "ltr" && "text-left"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── هيكل التحميل ──────────────────────────────────── */
function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

/* ─── العرض الكامل لطلب ──────────────────────────────── */
function OrderView({ order }: { order: OrderOut }) {
  const prefersReduced = usePrefersReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelMutation = useCancelOrder(order.id);
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  const isCancelled = order.status === "cancelled";

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* رأس الصفحة */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">طلب رقم</p>
          <h1 className="text-2xl font-extrabold text-foreground tabular-nums sm:text-3xl">
            #{order.id}
          </h1>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-bold",
            ORDER_STATUS_TONE[order.status]
          )}
        >
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* شريط التتبّع */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="تتبّع حالة الطلب"
      >
        {isCancelled ? (
          <CancelledNotice />
        ) : (
          <TrackingFlow currentStatus={order.status} />
        )}

        {/* زر الإلغاء — يظهر فقط أثناء انتظار تأكيد المنشأة (pending) */}
        {order.status === "pending" && (
          <div className="mt-5 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-4 w-4" aria-hidden="true" />
              )}
              {cancelMutation.isPending ? "جارٍ الإلغاء..." : "إلغاء الطلب"}
            </Button>
          </div>
        )}
      </section>

      {/* حوار تأكيد الإلغاء */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من إلغاء طلبك؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُلغى الطلب #{order.id} من {order.facility_name ?? "المنشأة"} وتُسترجع
              الكميات للمخزون. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="min-h-[44px] flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                cancelMutation.mutate(undefined, {
                  onSettled: () => setConfirmOpen(false),
                })
              }
            >
              نعم، إلغاء الطلب
            </AlertDialogAction>
            <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
              إبقاء الطلب
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الأصناف */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="أصناف الطلب"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
          <Soup className="h-5 w-5 text-secondary" aria-hidden="true" />
          أصناف الطلب ({order.items.length})
        </h2>
        <ul className="space-y-2.5">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </ul>
        <Separator className="my-4" />
        {/* ملخص الفاتورة */}
        <div className="space-y-2 text-sm" dir="rtl">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(order.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(order.delivery_fee)}
            </span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">الإجمالي</span>
            <span
              className="text-base font-extrabold text-foreground tabular-nums"
              dir="ltr"
            >
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </section>

      {/* معلومات الطلب */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="معلومات التوصيل والدفع"
      >
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
          <Receipt className="h-5 w-5 text-secondary" aria-hidden="true" />
          معلومات الطلب
        </h2>
        <div className="divide-y divide-border/40">
          <InfoRow
            icon={Store}
            label="المنشأة"
            value={order.facility_name ?? "منشأة"}
          />
          {order.delivery_address && (
            <InfoRow
              icon={MapPin}
              label="عنوان التوصيل"
              value={order.delivery_address}
            />
          )}
          <InfoRow
            icon={Truck}
            label="رسوم التوصيل"
            value={formatCurrency(order.delivery_fee)}
          />
          <InfoRow
            icon={CreditCard}
            label="طريقة الدفع"
            value={PAYMENT_LABEL[order.payment_method]}
          />
          <InfoRow
            icon={Clock}
            label="تاريخ الطلب"
            value={formatDate(order.created_at)}
          />
          {order.notes && (
            <InfoRow
              icon={StickyNote}
              label="ملاحظات"
              value={order.notes}
            />
          )}
        </div>
      </section>
    </motion.div>
  );
}

/* ─── المكون الرئيسي ────────────────────────────────── */
export default function OrderDetailContent({
  orderId,
}: {
  orderId: string;
}) {
  const { accessToken, hydrated } = useCustomerAuth();
  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <OrderDetailSkeleton />
      </div>
    );
  }

  /* غير مسجّل → إعادة توجيه لطيفة لشاشة الدخول */
  if (!accessToken) {
    return (
      <EmptyState
        icon={Package}
        title="سجّل الدخول لعرض تفاصيل الطلب"
        description="لا يمكن عرض تفاصيل الطلب دون تسجيل الدخول."
        action={
          <Link
            href={`/login?next=/orders/${orderId}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            تسجيل الدخول
          </Link>
        }
      />
    );
  }

  /* معرّف غير صالح */
  if (numericId === null) {
    return (
      <ErrorState
        title="معرّف الطلب غير صالح"
        message="تعذّر تحديد الطلب المطلوب."
      />
    );
  }

  return <OrderDetailInner id={numericId} />;
}

function OrderDetailInner({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useOrderDetail(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <OrderDetailSkeleton />
      </div>
    );
  }

  if (isError) {
    const msg =
      error instanceof Error
        ? error.message
        : "تعذّر تحميل تفاصيل الطلب. تحقق من اتصالك بالإنترنت.";
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorState
          title="تعذّر تحميل الطلب"
          message={msg}
          onRetry={() => refetch()}
        />
        <div className="mt-4 text-center">
          <Link
            href="/orders"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-secondary hover:underline"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            العودة لطلباتي
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={Package}
          title="الطلب غير موجود"
          description="ربما حُذف هذا الطلب أو لا تملك صلاحية الوصول إليه."
          action={
            <Link
              href="/orders"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              العودة لطلباتي
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6" dir="rtl">
      {/* زر العودة */}
      <div className="mb-4">
        <Link
          href="/orders"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-secondary hover:underline"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          طلباتي
        </Link>
      </div>

      <OrderView order={data} />

      {/* ذيل سفلي — زر تصفّح الوجبات */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          تصفّح الوجبات
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
