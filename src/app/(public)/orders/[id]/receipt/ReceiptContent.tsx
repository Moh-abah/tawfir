"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Printer,
  Receipt as ReceiptIcon,
  Share2,
  Package,
  Loader2,
  BadgeCheck,
  Clock,
  CreditCard,
  MapPin,
  Store,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrderDetail } from "@/hooks/useOrderDetail";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── سطر معلومات داخل الورقة ─────────────────────────── */
function ReceiptMetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </span>
      <span className="text-end font-bold leading-relaxed text-foreground">
        {value}
      </span>
    </div>
  );
}

/* ─── سطر صنف — اسم + كمية×سعر + إجمالي السطر ────────── */
function ReceiptItemRow({
  name,
  quantity,
  unitPrice,
  subtotal,
  discountApplied,
}: {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountApplied: boolean;
}) {
  return (
    <li className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-bold text-foreground">
          {name}
        </span>
        <span
          className="shrink-0 text-sm font-extrabold tabular-nums text-foreground"
          dir="ltr"
        >
          {formatCurrency(subtotal)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] tabular-nums text-muted-foreground"
          dir="ltr"
        >
          {quantity} × {formatCurrency(unitPrice)}
        </span>
        {discountApplied && (
          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
            خصم العضوية مُطبَّق
          </span>
        )}
      </div>
    </li>
  );
}

/* ─── هيكل تحميل على شكل ورقة إيصال ──────────────────── */
function ReceiptSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-sm space-y-3 py-8"
      aria-busy="true"
      aria-label="جارٍ تحميل الإيصال"
    >
      <div className="receipt-edge-up" aria-hidden="true" />
      <div className="receipt-paper space-y-4 bg-card px-5 py-6 shadow-soft-lg">
        <Skeleton className="mx-auto h-10 w-24" />
        <Skeleton className="mx-auto h-4 w-28" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="ml-auto h-6 w-24" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="mx-auto h-12 w-40" />
        <Skeleton className="mx-auto h-3 w-32" />
      </div>
      <div className="receipt-edge-down" aria-hidden="true" />
    </div>
  );
}

/* ─── الورقة نفسها ────────────────────────────────────── */
function ReceiptPaper({ order }: { order: OrderOut }) {
  const durationMin = useMemo(() => {
    const start = new Date(order.created_at).getTime();
    const end = new Date(order.updated_at ?? order.created_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    return Math.max(1, Math.round((end - start) / 60000));
  }, [order.created_at, order.updated_at]);

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* الحافة العلوية الممزقة */}
      <div className="receipt-edge-up" aria-hidden="true" />

      <div className="receipt-paper bg-card px-5 py-6 shadow-soft-lg sm:px-7">
        {/* الترويسة — الشعار + العنوان */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TawfirLogo size="md" variant="mark" href="" />
          <h2 className="text-lg font-black tracking-wide text-foreground">
            إيصال طلب
          </h2>
          <p className="text-[10px] font-medium text-muted-foreground">
            وفّر أكثر.. عِش أجمل
          </p>
        </div>

        <hr className="receipt-dashed my-4" />

        {/* رقم الطلب + الحالة + الختم */}
        <div className="relative flex flex-col items-center gap-2">
          <p className="text-2xl font-black tabular-nums text-foreground">
            <span className="text-sm font-bold text-muted-foreground">
              طلب رقم{" "}
            </span>
            #{order.id}
          </p>
          <span
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-bold",
              ORDER_STATUS_TONE[order.status],
            )}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          {order.status === "delivered" && durationMin != null && (
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Timer className="h-3 w-3" aria-hidden="true" />
              استغرق التوصيل {durationMin} دقيقة
            </p>
          )}

          {/* ختم مطاطي مائل — «مدفوع» للطلبات المسلَّمة / «ملغى» للملغاة */}
          {(order.status === "delivered" || order.status === "cancelled") && (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0 left-0 select-none rounded-md border-[3px] px-2.5 py-0.5 text-sm font-black tracking-wider",
                order.status === "delivered"
                  ? "-rotate-12 border-success/70 text-success/75"
                  : "-rotate-12 border-destructive/60 text-destructive/70",
              )}
            >
              {order.status === "delivered" ? "مدفوع ✓" : "ملغى"}
            </span>
          )}
        </div>

        <hr className="receipt-dashed my-4" />

        {/* بيانات الطلب */}
        <div className="space-y-2.5">
          <ReceiptMetaRow
            icon={Store}
            label="المتجر"
            value={order.facility_name ?? "متجر"}
          />
          <ReceiptMetaRow
            icon={Clock}
            label="تاريخ الطلب"
            value={formatDate(order.created_at)}
          />
          <ReceiptMetaRow
            icon={CreditCard}
            label="طريقة الدفع"
            value={order.payment_method === "cash" ? "نقداً عند الاستلام" : "محفظة جيب"}
          />
          {order.delivery_address && (
            <ReceiptMetaRow
              icon={MapPin}
              label="عنوان التوصيل"
              value={order.delivery_address}
            />
          )}
          {order.notes && (
            <ReceiptMetaRow label="ملاحظات" value={order.notes} />
          )}
        </div>

        <hr className="receipt-dashed my-4" />

        {/* الأصناف */}
        <ul className="space-y-3">
          {order.items.map((item) => (
            <ReceiptItemRow
              key={item.id}
              name={item.product_name ?? "صنف"}
              quantity={item.quantity}
              unitPrice={item.unit_price}
              subtotal={item.subtotal}
              discountApplied={item.discount_applied}
            />
          ))}
        </ul>

        <hr className="receipt-dashed my-4" />

        {/* المجاميع */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-bold tabular-nums text-foreground" dir="ltr">
              {formatCurrency(order.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="font-bold tabular-nums text-foreground" dir="ltr">
              {formatCurrency(order.delivery_fee)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-foreground/20 pt-2.5">
            <span className="text-sm font-black text-foreground">الإجمالي</span>
            <span
              className="text-lg font-black tabular-nums text-primary"
              dir="ltr"
            >
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        <hr className="receipt-dashed my-4" />

        {/* الباركود الزخرفي + الرقم تحته */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="receipt-barcode w-40" aria-hidden="true" />
          <p
            className="text-[11px] font-bold tracking-[0.35em] tabular-nums text-foreground"
            dir="ltr"
          >
            {String(order.id).padStart(8, "0")}
          </p>
          <p className="text-[10px] text-muted-foreground" dir="ltr">
            {new Date(order.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>

        {/* ذيل الورقة */}
        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <p className="flex items-center gap-1 text-xs font-bold text-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            شكراً لطلبك من توفير
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            هذا الإيصال صادر إلكترونياً من منصة توفير — لا يُطلب توقيع
          </p>
        </div>
      </div>

      {/* الحافة السفلية الممزقة */}
      <div className="receipt-edge-down" aria-hidden="true" />
    </div>
  );
}

/* ─── شريط الإجراءات السفلي ───────────────────────────── */
function ReceiptActions({ order }: { order: OrderOut }) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    haptic("tick");
    setSharing(true);
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/orders/${order.id}/receipt`
        : `/orders/${order.id}/receipt`;
    const shareText = `إيصال طلب #${order.id} من ${
      order.facility_name ?? "متجر"
    } — الإجمالي ${formatCurrency(order.total)} | تطبيق توفير`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `إيصال الطلب #${order.id} — توفير`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({
          title: "تم نسخ رابط الإيصال",
          description: "شاركه مع أصدقائك عبر واتساب أو أي تطبيق",
        });
      }
    } catch {
      /* أُلغيت المشاركة — لا شيء يحدث */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="print-hidden sticky bottom-0 z-30 border-t border-border/50 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg">
      <div className="mx-auto flex max-w-sm items-center gap-2">
        <Button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="min-h-[48px] flex-1 gap-2 rounded-full text-sm font-extrabold"
        >
          {sharing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden="true" />
          )}
          مشاركة الإيصال
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          aria-label="طباعة الإيصال"
          className="min-h-[48px] gap-2 rounded-full px-4"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">طباعة</span>
        </Button>
      </div>
    </div>
  );
}

/* ─── المحتوى الرئيسي ─────────────────────────────────── */
export default function ReceiptContent({ orderId }: { orderId: string }) {
  const { accessToken, hydrated } = useCustomerAuth();
  const prefersReduced = usePrefersReducedMotion();
  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);

  const { data, isLoading, isError, error, refetch } = useOrderDetail(
    numericId ?? -1,
  );

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="min-h-[calc(100vh-3.5rem)] bg-muted/50 px-4">
          <ReceiptSkeleton />
        </div>
      </>
    );
  }

  /* غير مسجّل → شاشة الدخول */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={ReceiptIcon}
            title="سجّل الدخول لعرض الإيصال"
            description="الإيصالات متاحة لأصحابها بعد تسجيل الدخول."
            action={
              <Link
                href={`/login?next=/orders/${orderId}/receipt`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                تسجيل الدخول
              </Link>
            }
          />
        </div>
      </>
    );
  }

  /* معرّف غير صالح */
  if (numericId === null) {
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title="معرّف الطلب غير صالح"
            message="تعذّر تحديد الإيصال المطلوب."
          />
        </div>
      </>
    );
  }

  /* تحميل */
  if (isLoading) {
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="min-h-[calc(100vh-3.5rem)] bg-muted/50 px-4">
          <ReceiptSkeleton />
        </div>
      </>
    );
  }

  /* خطأ */
  if (isError) {
    const msg =
      error instanceof Error
        ? error.message
        : "تعذّر تحميل الإيصال. تحقق من اتصالك بالإنترنت.";
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title="تعذّر تحميل الإيصال"
            message={msg}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  /* لا بيانات */
  if (!data) {
    return (
      <>
        <ScreenHeader title="إيصال الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title="الإيصال غير موجود"
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
      </>
    );
  }

  /* الورقة + الإجراءات — خلفية خفيفة التباين تُبرز أسنان الورقة الممزقة */
  return (
    <>
      <ScreenHeader title="إيصال الطلب" fallbackHref={`/orders/${numericId}`}>
        <span className="sr-only">
          إيصال الطلب رقم {numericId} من {data.facility_name ?? "متجر"}
        </span>
      </ScreenHeader>
      <motion.div
        {...anim}
        transition={{ duration: 0.3, ease: "easeOut" }}
        dir="rtl"
        className="min-h-[calc(100vh-3.5rem)] bg-muted/50 px-4 pb-6 pt-6"
      >
        <ReceiptPaper order={data} />
      </motion.div>
      <ReceiptActions order={data} />
    </>
  );
}
