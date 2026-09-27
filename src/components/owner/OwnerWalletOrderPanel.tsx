"use client";

/**
 * OwnerWalletOrderPanel — لوحة طلب المحفظة في بطاقة الطلب عند التاجر.
 * ═══════════════════════════════════════════════════════════════
 * - شارة المحفظة + سطر المحفظة (payment_wallet_label) + حالة الإيصالة.
 * - «عرض الإشعار»: يجلب تفاصيل الطلب (GET /orders/{id}) ويعرض صورة
 *   الإشعار (الأول + التكملة) في نافذة — القوائم أخف فالصورة كاملة
 *   تُجلب عند الطلب فقط (توجيه الوكيل §3).
 * - «طلب الدفعة الناقصة»: يظهر على طلبات المحافظ pending بعد رفع
 *   الإشعار — بحقل «المبلغ المستلم فعلياً» + ملاحظة اختيارية.
 * - شارة «اكتمال الدفعة الناقصة» عند is_completion + بانتظار المراجعة.
 * - التأكيد ممنوع قبل رفع الإشعار (payment_status === null) — 422 من
 *   الخادم: «لا يمكن تأكيد طلب الدفع بالمحفظة قبل رفع العميل إشعار
 *   التحويل» — نُعطّل الزر ونعرض تلميح «بانتظار إشعار العميل».
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Eye,
  Hourglass,
  Loader2,
  Wallet,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ownerApiClient } from "@/services/owner-api-client";
import { useRequestRemaining } from "@/hooks/useWallets";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "@/services/wallet.service";
import type { OrderOut, OrderListOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/** تفاصيل الطلب بعين المالك — للصورة الكاملة للإيصالة. */
function useOwnerOrderDetail(orderId: number | null) {
  return useQuery({
    queryKey: ["owner-order-detail", orderId],
    queryFn: () => ownerApiClient.get<OrderOut>(`/orders/${orderId!}`),
    enabled: orderId != null && orderId > 0,
    staleTime: 15 * 1000,
  });
}

/* ─── شارة حالة الإيصالة ────────────────────────────────── */
export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  if (!status) return null;
  const tone =
    status === "approved"
      ? "bg-success/15 text-success"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : status === "partial_requested"
          ? "bg-accent/20 text-accent-ink"
          : "bg-accent/15 text-accent-ink";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone,
        className
      )}
    >
      {status === "approved" && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
      {status === "rejected" && <XCircle className="h-3 w-3" aria-hidden="true" />}
      {status === "pending" && <Hourglass className="h-3 w-3" aria-hidden="true" />}
      {status === "partial_requested" && <Clock className="h-3 w-3" aria-hidden="true" />}
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ─── نافذة عرض صور الإشعار ─────────────────────────────── */
export function OwnerReceiptDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError, error } = useOwnerOrderDetail(open ? orderId : null);
  const receipt = data?.payment_receipt ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
            إشعار التحويل — طلب #{orderId}
          </DialogTitle>
          <DialogDescription>
            راجع صورة التحويل قبل تأكيد الطلب — تأكيدك يعني قبول عملية الدفع.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center rounded-xl bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : isError ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error instanceof Error ? error.message : "تعذّر تحميل الإشعار"}
          </p>
        ) : !receipt ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            لم يرفع العميل إشعار تحويل بعد.
          </p>
        ) : (
          <div className="space-y-3">
            <div className={cn("grid gap-3", receipt.completion_image_url && "grid-cols-2")}>
              <figure className="space-y-1">
                <div className="relative h-52 overflow-hidden rounded-xl border bg-muted">
                  <ImageWithSkeleton
                    src={resolveImageUrl(receipt.receipt_image_url)}
                    alt="إشعار التحويل"
                    fill
                    className="object-contain"
                    skeletonClassName="rounded-none"
                  />
                </div>
                <figcaption className="text-center text-[11px] text-muted-foreground">
                  {receipt.completion_image_url ? "الإشعار الأول" : "صورة الإشعار"}
                </figcaption>
              </figure>
              {receipt.completion_image_url && (
                <figure className="space-y-1">
                  <div className="relative h-52 overflow-hidden rounded-xl border bg-muted">
                    <ImageWithSkeleton
                      src={resolveImageUrl(receipt.completion_image_url)}
                      alt="إشعار تكملة الدفعة"
                      fill
                      className="object-contain"
                      skeletonClassName="rounded-none"
                    />
                  </div>
                  <figcaption className="text-center text-[11px] text-muted-foreground">
                    إشعار التكملة
                  </figcaption>
                </figure>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">المبلغ المطلوب</p>
                <p dir="ltr" className="font-extrabold tabular-nums text-foreground">
                  {formatCurrency(data?.total ?? receipt.amount)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">حالة الإيصالة</p>
                <p className="font-extrabold text-foreground">
                  {PAYMENT_STATUS_LABEL[receipt.status] ?? receipt.status}
                </p>
              </div>
              {receipt.paid_amount != null && (
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">المستلم (تراكمي)</p>
                  <p dir="ltr" className="font-extrabold tabular-nums text-foreground">
                    {formatCurrency(receipt.paid_amount)}
                  </p>
                </div>
              )}
              {receipt.remaining_amount != null && (
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">المتبقي</p>
                  <p dir="ltr" className="font-extrabold tabular-nums text-accent-ink">
                    {formatCurrency(receipt.remaining_amount)}
                  </p>
                </div>
              )}
            </div>

            {receipt.sender_name && (
              <p className="text-xs text-muted-foreground">
                اسم المُحوِّل:{" "}
                <span className="font-bold text-foreground">{receipt.sender_name}</span>
              </p>
            )}
            {receipt.wallet_snapshot && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {receipt.wallet_snapshot}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── حوار طلب الدفعة الناقصة ───────────────────────────── */
function RequestRemainingDialog({
  order,
  open,
  onOpenChange,
}: {
  order: OrderListOut;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const requestRemaining = useRequestRemaining(order.id);
  const [paidAmount, setPaidAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const submit = () => {
    const amount = Number(paidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("أدخل المبلغ المستلم فعلياً (أكبر من صفر)");
      return;
    }
    if (amount >= order.total) {
      setError("المبلغ المستلم يساوي أو يزيد المطلوب — أكّد الطلب مباشرة بدل طلب التكملة");
      return;
    }
    setError(null);
    requestRemaining.mutate(
      { paid_amount: Math.round(amount), note: note.trim() || null },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          toast({
            title: "تعذّر إرسال الطلب للعميل",
            description:
              err instanceof Error && err.message ? err.message : "حاول مجدداً",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>طلب الدفعة الناقصة — طلب #{order.id}</DialogTitle>
          <DialogDescription>
            أدخل المبلغ الذي استلمته فعلياً — سيُشعَر العميل بالمتبقي فوراً
            (إشعار داخلي + FCM حتى والتطبيق مغلق).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">إجمالي الطلب</span>
            <span dir="ltr" className="font-extrabold tabular-nums text-foreground">
              {formatCurrency(order.total)}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`paid-${order.id}`} className="text-sm font-bold">
              المبلغ المستلم فعلياً *
            </Label>
            <Input
              id={`paid-${order.id}`}
              type="number"
              min={1}
              max={order.total - 1}
              inputMode="numeric"
              dir="ltr"
              value={paidAmount}
              onChange={(e) => {
                setPaidAmount(e.target.value);
                setError(null);
              }}
              placeholder={`مثال: ${Math.round(order.total * 0.7)}`}
              className="min-h-[44px]"
            />
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`note-${order.id}`} className="text-xs text-muted-foreground">
              ملاحظة للعميل (اختياري)
            </Label>
            <Textarea
              id={`note-${order.id}`}
              maxLength={500}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: استلمنا 1800 فقط من 2300"
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            type="button"
            onClick={submit}
            disabled={requestRemaining.isPending}
            className="min-h-[44px] flex-1 rounded-full"
          >
            {requestRemaining.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            إشعار العميل بالمتبقي
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] flex-1 rounded-full"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── اللوحة الرئيسية داخل بطاقة الطلب ──────────────────── */
export function OwnerWalletOrderPanel({
  order,
}: {
  order: OrderListOut;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [remainingOpen, setRemainingOpen] = useState(false);
  const status = order.payment_status ?? null;

  const receiptUploaded = status != null;
  const canRequestRemaining = status === "pending" && order.status === "pending";
  const isPartialRequested = status === "partial_requested";
  const isCompletionPending =
    status === "pending" && order.payment_is_completion === true;

  return (
    <div className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
      {/* السطر الأول: شارة محفظة + الحالة + سطر المحفظة */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-extrabold text-primary">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          محفظة
        </span>
        <PaymentStatusBadge status={status} />
        {order.payment_wallet_label && (
          <span dir="ltr" className="truncate text-[11px] font-medium text-muted-foreground">
            {order.payment_wallet_label}
          </span>
        )}
      </div>

      {/* شارة اكتمال الدفعة الناقصة */}
      {isCompletionPending && (
        <p className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[11px] font-extrabold text-accent-ink">
          🧾 اكتمال الدفعة الناقصة — بانتظار مراجعتك
        </p>
      )}

      {/* بانتظار تحويل العميل للمتبقي */}
      {isPartialRequested && order.payment_remaining_amount != null && (
        <p className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[11px] font-extrabold text-accent-ink">
          ⏳ بانتظار تحويل العميل للمتبقي ({formatCurrency(order.payment_remaining_amount)} ر.ي)
        </p>
      )}

      {/* بانتظار إشعار العميل — التأكيد ممنوع */}
      {status === null && order.status === "pending" && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-accent-ink">
          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
          بانتظار إشعار العميل — لا يمكن تأكيد الطلب قبل رفعه إشعار التحويل
        </p>
      )}

      {/* الأزرار */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {receiptUploaded && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReceiptOpen(true)}
            className="min-h-[40px] gap-1.5 rounded-full px-4 text-xs font-bold"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            عرض الإشعار
          </Button>
        )}
        {canRequestRemaining && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRemainingOpen(true)}
            className="min-h-[40px] gap-1.5 rounded-full border-accent/50 px-4 text-xs font-extrabold text-accent-ink hover:bg-accent/10"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            طلب الدفعة الناقصة
          </Button>
        )}
      </div>

      <OwnerReceiptDialog
        orderId={order.id}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
      <RequestRemainingDialog
        order={order}
        open={remainingOpen}
        onOpenChange={setRemainingOpen}
      />
    </div>
  );
}

/**
 * هل تأكيد الطلب ممنوع الآن؟ (طلبات المحافظ فقط):
 * - بلا إشعار رفع (payment_status === null)
 * - بانتظار تحويل العميل للمتبقي (partial_requested)
 * مستخدم في كبسولات/قائمة تغيير الحالة لتعطيل خيار «تأكيد».
 */
export function isOwnerConfirmGated(order: OrderListOut): boolean {
  if (order.payment_method !== "wallet") return false;
  if (order.status !== "pending") return false;
  const status = order.payment_status ?? null;
  return status === null || status === "partial_requested";
}
