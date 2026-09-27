"use client";

/**
 * شاشة إتمام الدفع بالمحفظة — /orders/{id}/payment
 * ═══════════════════════════════════════════════════════════════
 * «نفس الشاشة التي غادرها العميل»: يخرج العميل للتطبيق يحوّل من
 * محفظته ويعود هنا — الشاشة تعرض الحالة الحية دائماً (polling كل 8
 * ثوانٍ ويتوقف عند التأكيد النهائي approved).
 *
 * السيناريو الكامل:
 *  1. بيانات حساب التحويل (قابلة للنسخ) + المبلغ المطلوب — من الخادم
 *     دائماً (amount_due) ولا نحسبه محلياً أبداً (قاعدة §6-3).
 *  2. «إرفاق الإشعار» يفتح الكاميرا/المعرض → معاينة محلية فقط (لا
 *     رفع) — الصور الكبيرة حتى 10 ميجابايت تُقبل كما هي (الخادم
 *     يضغطها تلقائياً — لا نعالج الصورة في التطبيق).
 *  3. زر «دفع» يتعلّم وجود الصورة → multipart واحد POST /orders/{id}/pay.
 *  4. الدفعة الناقصة: payment_status = partial_requested → بانر أصفر
 *     بالمتبقي (amount_due = المتبقي) + ملاحظة التاجر — وزر الدفع
 *     نفسه يرفع إشعار التكملة (الخادم يتعرّف تلقائياً).
 *  5. approved → «تم تأكيد الدفع ✅» ومتابعة التتبع العادي.
 *  6. rejected → سبب الرفض + زر إعادة رفع الإشعار (نفس الرفع، ما دام
 *     الطلب pending).
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Hourglass,
  ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { WalletAccountCard } from "@/components/wallets/WalletAccountCard";
import {
  useCustomerAuth,
} from "@/hooks/useCustomerAuth";
import {
  useFacilityWallets,
  useOrderPayment,
  usePayOrder,
} from "@/hooks/useWallets";
import { useOrderDetail } from "@/hooks/useOrderDetail";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "@/services/wallet.service";
import type { FacilityWalletOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/** أقصى حجم معروض للمعاينة — الخادم يقبل حتى 10 ميجابايت كما هي. */
const MAX_FILE_SIZE_MB = 10;

/* ─── حالات العرض ───────────────────────────────────────── */

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const tone =
    status === "approved"
      ? "bg-success/15 text-success border-success/30"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : "bg-accent/15 text-accent-ink border-accent/30";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold",
        tone
      )}
    >
      {status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {status === "rejected" && <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      {status === "pending" && <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />}
      {status === "partial_requested" && <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ─── الهيكل الرئيسي ────────────────────────────────────── */

export default function PaymentScreenContent({ orderId }: { orderId: string }) {
  return <PaymentRoute orderId={orderId} />;
}

function PaymentRoute({ orderId }: { orderId: string }) {
  const { accessToken, hydrated } = useCustomerAuth();
  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);

  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Wallet}
            title="سجّل الدخول لإتمام الدفع"
            description="شاشة الدفع مرتبطة بجلستك — دخولك سيعيدك لنفس المكان."
            action={
              <Link
                href={`/login?next=/orders/${orderId}/payment`}
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

  if (numericId === null) {
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title="معرّف الطلب غير صالح"
            message="تعذّر تحديد الطلب المطلوب."
          />
        </div>
      </>
    );
  }

  return <PaymentScreenInner orderId={numericId} />;
}

function PaymentScreenInner({ orderId }: { orderId: number }) {
  /* حالة الدفع الحية — نفس الشاشة التي غادرها العميل */
  const paymentQuery = useOrderPayment(orderId);
  /* تفاصيل الطلب — للأصناف والإجمالي الاحتياطي */
  const orderQuery = useOrderDetail(orderId);

  const payment = paymentQuery.data;
  const isWalletOrder = payment
    ? payment.payment_method === "wallet"
    : (orderQuery.data?.payment_method ?? "cash") === "wallet";

  if (paymentQuery.isLoading || (payment == null && orderQuery.isLoading)) {
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (paymentQuery.isError) {
    const msg =
      paymentQuery.error instanceof Error
        ? paymentQuery.error.message
        : "تعذّر تحميل حالة الدفع.";
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title="تعذّر تحميل حالة الدفع"
            message={msg}
            onRetry={() => void paymentQuery.refetch()}
          />
        </div>
      </>
    );
  }

  if (!payment) {
    return (
      <>
        <ScreenHeader title="إتمام الدفع" fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title="معلومات الدفع غير متاحة"
            description="ربما تم حذف الطلب أو لا تملك صلاحية الوصول إليه."
            action={
              <Link
                href="/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground"
              >
                العودة لطلباتي
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <PaymentView
      orderId={orderId}
      payment={payment}
      isWalletOrder={isWalletOrder}
      refetch={() => void paymentQuery.refetch()}
    />
  );
}

/* ─── شاشة الدفع الفعلية ────────────────────────────────── */

function PaymentView({
  orderId,
  payment,
  isWalletOrder,
  refetch,
}: {
  orderId: number;
  payment: import("@/types/api-extra").OrderPaymentStatusOut;
  isWalletOrder: boolean;
  refetch: () => void;
}) {
  /* محافظ المنشأة — لعرض بطاقة الحساب الكاملة (الرقم + الاسم) */
  const orderQuery = useOrderDetail(orderId);
  const facilityId = orderQuery.data?.facility_id ?? null;
  const walletsQuery = useFacilityWallets(facilityId, isWalletOrder);

  const selectedWallet: FacilityWalletOut | null = useMemo(() => {
    if (!walletsQuery.data) return null;
    if (payment.payment_wallet_id != null) {
      const byId = walletsQuery.data.find((w) => w.id === payment.payment_wallet_id);
      if (byId) return byId;
    }
    return walletsQuery.data[0] ?? null;
  }, [walletsQuery.data, payment.payment_wallet_id]);

  /* رفع الإشعار */
  const payMutation = usePayOrder(orderId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const status = payment.payment_status;
  const amountDue = payment.amount_due;
  const orderTotal = payment.order_total;
  const isPartial = status === "partial_requested";
  const canUpload =
    status === null || status === "rejected" || status === "pending" || isPartial;

  const pickFile = (file: File | null) => {
    setFileError(null);
    if (!file) return;
    /* الحد 10 ميجابايت — رسالة الخادم نفسها عند التجاوز */
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`حجم الصورة كبير جداً. الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت`);
      return;
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      setFileError("الصورة يجب أن تكون PNG أو JPG أو WEBP");
      return;
    }
    setReceiptFile(file);
    /* معاينة محلية فقط — لا رفع الآن؛ الإرسال يحدث عند ضغط «دفع» */
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitPayment = () => {
    if (!receiptFile) return;
    haptic("light");
    payMutation.mutate(
      { file: receiptFile, senderName: senderName.trim() || null },
      {
        onSuccess: () => {
          clearFile();
          setSenderName("");
          refetch();
        },
        onError: (err) => {
          haptic("light");
          const message =
            err instanceof Error && err.message?.trim()
              ? err.message
              : "تعذّر رفع إشعار التحويل. حاول مجدداً.";
          toast({ title: "تعذّر رفع الإشعار", description: message, variant: "destructive" });
        },
      }
    );
  };

  const receipt = payment.payment_receipt;
  const hasFirstReceipt = !!receipt?.receipt_image_url;
  const hasCompletion = !!receipt?.completion_image_url;

  return (
    <>
      <ScreenHeader title="إتمام الدفع" fallbackHref={`/orders/${orderId}`} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-24 sm:px-6"
        dir="rtl"
      >
        {/* رأس الحالة */}
        <section
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
          aria-label="حالة الدفع"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-base font-extrabold text-foreground">
                  الدفع عبر محفظة المتجر
                </h1>
                <p className="text-xs text-muted-foreground">
                  طلب رقم{" "}
                  <span dir="ltr" className="font-bold tabular-nums">
                    #{orderId}
                  </span>
                </p>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* المبلغ */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
            <span className="text-sm font-bold text-foreground">
              {isPartial ? "المتبقي المطلوب تحويله" : "المبلغ المطلوب"}
            </span>
            <span dir="ltr" className="text-xl font-black tabular-nums text-primary">
              {formatCurrency(amountDue)}
            </span>
          </div>
          {isPartial && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              إجمالي الطلب {formatCurrency(orderTotal)} — استلم التاجر{" "}
              {formatCurrency(payment.paid_amount ?? 0)} فعلاً.
            </p>
          )}
        </section>

        {/* بانر الدفعة الناقصة — أصفر/برتقالي واضح */}
        {isPartial && (
          <section
            className="rounded-2xl border-2 border-accent/50 bg-accent/10 p-4"
            role="alert"
            aria-label="مطلوب تكملة الدفعة"
          >
            <p className="flex items-start gap-2 text-sm font-extrabold text-accent-ink">
              💰 مطلوب تكملة الدفعة — استلم التاجر{" "}
              <span dir="ltr" className="tabular-nums">
                {formatCurrency(payment.paid_amount ?? 0)}
              </span>{" "}
              من{" "}
              <span dir="ltr" className="tabular-nums">
                {formatCurrency(orderTotal)}
              </span>
              . المتبقي المطلوب تحويله:{" "}
              <span dir="ltr" className="tabular-nums underline">
                {formatCurrency(payment.remaining_amount ?? amountDue)}
              </span>
            </p>
            {payment.remaining_note && (
              <p className="mt-2 rounded-lg bg-background/60 px-3 py-2 text-xs leading-relaxed text-foreground">
                رسالة المتجر: {payment.remaining_note}
              </p>
            )}
          </section>
        )}

        {/* حالات نهائية */}
        {status === "approved" && (
          <section className="rounded-2xl border-2 border-success/30 bg-success/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
            <h2 className="mt-2 text-lg font-extrabold text-success">
              تم تأكيد الدفع ✅
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              المتجر استلم تحويلك — تابع طلبك من شاشة التتبع العادية.
            </p>
            <Button asChild className="mt-3 min-h-[44px] rounded-full">
              <Link href={`/orders/${orderId}`}>تتبّع الطلب</Link>
            </Button>
          </section>
        )}

        {status === "rejected" && (
          <section
            className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4"
            role="alert"
          >
            <p className="flex items-start gap-2 text-sm font-bold text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              تم رفض إشعار التحويل
              {receipt?.rejection_reason ? ` — ${receipt.rejection_reason}` : ""}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              تأكد من صحة الصورة والمبلغ ثم أعد رفع الإشعار من الأسفل.
            </p>
          </section>
        )}

        {status === "pending" && (
          <section className="flex items-start gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-4">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
            <div className="text-xs leading-relaxed text-accent-ink">
              {payment.is_completion || receipt?.is_completion ? (
                <p className="font-bold">
                  تم استلام إشعار المتبقي — بانتظار مراجعة التاجر
                </p>
              ) : (
                <>
                  <p className="font-bold">إشعارك في مراجعة المتجر الآن</p>
                  <p>سيؤكد المتجر الطلب بعد التحقق من التحويل — تُحدَّث هذه الشاشة تلقائياً.</p>
                </>
              )}
            </div>
          </section>
        )}

        {/* بيانات حساب التحويل — تظهر للطلبات النشطة (وليس approved) */}
        {isWalletOrder && selectedWallet && status !== "approved" && (
          <WalletAccountCard
            wallet={selectedWallet}
            amountDue={status !== null ? amountDue : amountDue}
          />
        )}

        {/* إشعارات مرفوعة سابقاً */}
        {hasFirstReceipt && (
          <section
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
            aria-label="إشعارات التحويل المرفوعة"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground">
                إشعار التحويل المرفوع
              </h2>
              <StatusBadge status={receipt?.status ?? status} />
            </div>
            <div
              className={cn(
                "grid gap-3",
                hasCompletion ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              <ReceiptImage
                url={receipt!.receipt_image_url}
                label={hasCompletion ? "الإشعار الأول" : "صورة الإشعار"}
              />
              {hasCompletion && (
                <ReceiptImage
                  url={receipt!.completion_image_url!}
                  label="إشعار التكملة"
                />
              )}
            </div>
            {receipt?.sender_name && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                اسم المُحوِّل: <span className="font-bold text-foreground">{receipt.sender_name}</span>
              </p>
            )}
            {receipt?.completion_amount != null && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                مبلغ التكملة:{" "}
                <span dir="ltr" className="font-bold tabular-nums text-foreground">
                  {formatCurrency(receipt.completion_amount)}
                </span>
              </p>
            )}
          </section>
        )}

        {/* نموذج الرفع — يظهر للطلبات القابلة للرفع */}
        {isWalletOrder && canUpload && (
          <section
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
            aria-label="رفع إشعار التحويل"
          >
            <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
              {isPartial ? "ارفع إشعار تحويل المتبقي" : "ارفع صورة إشعار التحويل"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isPartial
                ? `بعد تحويل المتبقي (${formatCurrency(amountDue)}) من تطبيق المحفظة، عُد هنا وارفع صورة إشعار التحويل الجديد.`
                : "التقط صورة واضحة لإشعار التحويل من تطبيق المحفظة — ضرورية حتى يتعرف المتجر على تحويلك."}
            </p>

            {/* المعاينة أو زر الالتقاط */}
            {receiptPreview ? (
              <div className="mt-4 space-y-3">
                <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-border/60 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview}
                    alt="معاينة إشعار التحويل"
                    className="max-h-72 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-destructive shadow-md"
                    aria-label="إزالة الصورة"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  {receiptFile?.name} —{" "}
                  {receiptFile ? (receiptFile.size / 1024 / 1024).toFixed(2) : "0"} م.ب
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={payMutation.isPending}
                className="mt-4 flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.03] p-4 text-center transition-colors hover:bg-primary/[0.07] disabled:opacity-60"
                aria-label="إرفاق صورة إشعار التحويل"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold text-primary">
                  إرفاق الإشعار — كاميرا أو معرض الصور
                </span>
                <span className="text-[10px] text-muted-foreground">
                  PNG / JPG / WEBP — حتى {MAX_FILE_SIZE_MB} ميجابايت (تُضغط تلقائياً على الخادم)
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              aria-hidden="true"
              tabIndex={-1}
            />

            {fileError && (
              <p
                className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"
                role="alert"
              >
                {fileError}
              </p>
            )}

            {/* اسم المُحوِّل — اختياري */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="sender-name" className="text-xs text-muted-foreground">
                اسم المُحوِّل في التحويل (اختياري)
              </Label>
              <Input
                id="sender-name"
                maxLength={120}
                placeholder="كما يظهر اسمك في إشعار التحويل"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            {/* زر الدفع — يتعلّم وجود الصورة */}
            <Button
              type="button"
              size="lg"
              onClick={submitPayment}
              disabled={!receiptFile || payMutation.isPending}
              className="mt-4 min-h-[52px] w-full gap-2 rounded-full text-base font-extrabold"
              aria-disabled={!receiptFile || payMutation.isPending}
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  جارٍ إرسال الإشعار...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  {isPartial ? "دفع المتبقي" : "دفع"}
                </>
              )}
            </Button>
            {!receiptFile && (
              <p className="mt-2 text-center text-[11px] font-bold text-muted-foreground">
                أرفق صورة الإشعار أولاً ليتعلّم زر الدفع
              </p>
            )}
          </section>
        )}

        {/* تعليمات السلوك المحفوظ */}
        {isWalletOrder && status !== "approved" && (
          <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
            <h3 className="text-xs font-extrabold text-foreground">
              كيف تُتم الدفع؟
            </h3>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li>انسخ رقم الحساب من البطاقة أعلاه (زر «نسخ»).</li>
              <li>افتح تطبيق المحفظة وحوّل المبلغ المطلوب بالضبط.</li>
              <li>التقط صورة لإشعار التحويل.</li>
              <li>عُد إلى التطبيق — ستجد هذه الشاشة كما تركتها — وأرفق الصورة.</li>
              <li>اضغط «دفع» وسيصل إشعارك للمتجر فوراً.</li>
            </ol>
          </section>
        )}

        {/* طلب كاش وصل لهذه الشاشة خطأً */}
        {!isWalletOrder && (
          <section className="rounded-2xl border border-border/60 bg-card p-5 text-center shadow-soft">
            <Ban className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-foreground">
              هذا الطلب مخصص للدفع عند الاستلام (كاش) — لا حاجة لأي تحويل.
            </p>
            <Button asChild variant="outline" className="mt-3 min-h-[44px] rounded-full">
              <Link href={`/orders/${orderId}`}>عرض تفاصيل الطلب</Link>
            </Button>
          </section>
        )}

        {/* تنقل سفلي */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            تفاصيل الطلب
          </Link>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary"
            aria-label="تحديث حالة الدفع"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            تحديث الحالة
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ─── صورة إشعار (مع Lightbox بسيط) ─────────────────────── */

function ReceiptImage({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  const resolved = resolveImageUrl(url);
  return (
    <figure className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block h-40 w-full overflow-hidden rounded-xl border border-border/60 bg-muted"
        aria-label={`تكبير ${label}`}
      >
        <ImageWithSkeleton
          src={resolved}
          alt={label}
          fill
          className="object-contain"
          skeletonClassName="rounded-none"
        />
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold text-foreground">
          <ImageIcon className="h-3 w-3" aria-hidden="true" />
          تكبير
        </span>
      </button>
      <figcaption className="text-center text-[11px] font-medium text-muted-foreground">
        {label}
      </figcaption>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-full max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolved}
              alt={label}
              className="max-h-[85dvh] max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground shadow-lg"
              aria-label="إغلاق"
            >
              <XCircle className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
