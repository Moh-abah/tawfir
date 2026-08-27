"use client";

import { useState } from "react";
import {
  CreditCard,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Hourglass,
  Loader2,
  Inbox,
  Receipt,
  ImageOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { useAdminMembershipRequests } from "@/hooks/useAdminMembershipRequests";
import { useModerateMembershipRequest } from "@/hooks/useModerateMembershipRequest";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MEMBERSHIP_STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDate, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { MembershipRequestOut, MembershipRequestStatus } from "@/types/api.generated";

/* ─── فلترة الحالة ──────────────────────────────────── */
type StatusFilter = MembershipRequestStatus | "all";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "pending", label: MEMBERSHIP_STATUS_LABEL.pending },
  { value: "approved", label: MEMBERSHIP_STATUS_LABEL.approved },
  { value: "rejected", label: MEMBERSHIP_STATUS_LABEL.rejected },
];

/* ─── أنماط شارات الحالة (توكنات Tailwind) ─────────── */
const STATUS_TONE: Record<MembershipRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

const STATUS_ICON: Record<MembershipRequestStatus, LucideIcon> = {
  pending: Hourglass,
  approved: CheckCircle2,
  rejected: XCircle,
};

/* ─── حجم الصفحة ─────────────────────────────────────── */
const PAGE_SIZE = 10;

/* ─── خريطة طريقة الدفع ─────────────────────────────── */
function paymentMethodLabel(method: string): string {
  if (method === "cash") return "نقدًا";
  if (method === "wallet") return "محفظة";
  return method;
}

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
                    <Skeleton className="h-5 w-full max-w-[140px]" />
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

/* ─── مودال عرض صورة التحويل ─────────────────────────── */
function ReceiptImageDialog({
  request,
  open,
  onOpenChange,
}: {
  request: MembershipRequestOut | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // الجولة 6: صورة التحويل قد تكون مفقودة من الخادم (404) —
  // نعرض حالة خطأ عربية أنيقة بدل أيقونة صورة مكسورة.
  // نتابع رابط الصورة الذي فشل (بدل boolean) — فتُعاد المحاولة تلقائياً
  // لأي طلب آخر بصورة مختلفة دون الحاجة إلى effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgSrc = request ? resolveImageUrl(request.receipt_image_url) : null;
  const imgFailed = imgSrc !== null && failedSrc === imgSrc;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
                صورة التحويل — طلب رقم {request.id}
              </DialogTitle>
              <DialogDescription>
                المبلغ: {formatCurrency(request.amount)} • طريقة الدفع:{" "}
                {paymentMethodLabel(request.payment_method)}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center rounded-xl bg-muted/40 p-2">
              {imgFailed ? (
                <div className="flex flex-col items-center gap-2 rounded-lg px-10 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <ImageOff className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    تعذّر تحميل صورة التحويل
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    الصورة غير متوفرة على الخادم حالياً. تواصل مع فريق الباك إند
                    للتأكد من رفع الإيصال بشكل صحيح.
                  </p>
                </div>
              ) : (
                <img
                  src={resolveImageUrl(request.receipt_image_url)}
                  alt={`صورة التحويل للطلب رقم ${request.id}`}
                  className="max-h-[70vh] w-auto rounded-lg object-contain"
                  loading="lazy"
                  onError={() => setFailedSrc(imgSrc)}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── مودال الرفض مع السبب ───────────────────────────── */
function RejectReasonDialog({
  request,
  open,
  reason,
  onReasonChange,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  request: MembershipRequestOut | null;
  open: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const trimmed = reason.trim();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            رفض طلب العضوية رقم {request?.id ?? ""}
          </DialogTitle>
          <DialogDescription>
            اكتب سبب الرفض — سيظهر للعميل ليعرف ما يجب تصحيحه قبل إعادة المحاولة.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">سبب الرفض</Label>
          <Textarea
            id="rejection-reason"
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="مثال: صورة التحويل غير واضحة — أعد رفعها بجودة أعلى"
            disabled={isPending}
            className="min-h-[44px]"
            aria-invalid={trimmed.length === 0}
          />
          {trimmed.length === 0 && (
            <p className="text-xs text-muted-foreground">
              السبب مطلوب لتنفيذ الرفض
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="min-h-[44px] w-full rounded-full sm:w-auto"
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!trimmed) return;
              onConfirm(trimmed);
            }}
            disabled={isPending || !trimmed}
            className="min-h-[44px] w-full gap-2 rounded-full sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {isPending ? "جارٍ الرفض..." : "تأكيد الرفض"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── صف طلب عضوية ──────────────────────────────────── */
function MembershipRow({
  request,
  onApprove,
  onReject,
  onViewReceipt,
  isApproving,
  isRejecting,
}: {
  request: MembershipRequestOut;
  onApprove: (id: number) => void;
  onReject: (request: MembershipRequestOut) => void;
  onViewReceipt: (request: MembershipRequestOut) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const StatusIcon = STATUS_ICON[request.status];
  const isPending = request.status === "pending";
  const busy = isApproving || isRejecting;

  return (
    <TableRow className="hover:bg-muted/40">
      <TableCell className="font-mono text-xs text-muted-foreground">
        #{request.id}
      </TableCell>
      <TableCell className="font-medium">
        مستخدم #{request.user_id}
      </TableCell>
      <TableCell className="font-semibold tabular-nums">
        {formatCurrency(request.amount)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {paymentMethodLabel(request.payment_method)}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewReceipt(request)}
          className="min-h-[36px] gap-1.5 rounded-full"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          عرض الصورة
        </Button>
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            "gap-1 border-transparent text-xs",
            STATUS_TONE[request.status]
          )}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {MEMBERSHIP_STATUS_LABEL[request.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {isPending ? (
          "—"
        ) : request.rejection_reason ? (
          <span
            className="line-clamp-2 max-w-[180px]"
            title={request.rejection_reason}
          >
            {request.rejection_reason}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        <div>{formatDate(request.created_at)}</div>
        {request.reviewed_at && (
          <div className="mt-0.5 text-[10px]">
            مراجعة: {formatDate(request.reviewed_at)}
          </div>
        )}
      </TableCell>
      <TableCell>
        {isPending ? (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => onApprove(request.id)}
              disabled={busy}
              className="min-h-[36px] gap-1.5 rounded-full bg-success text-white hover:bg-success/90"
            >
              {isApproving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              موافقة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(request)}
              disabled={busy}
              className="min-h-[36px] gap-1.5 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              رفض
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ─── المكوّن الرئيسي ────────────────────────────────── */
export default function MembershipRequestsContent() {
  const prefersReduced = usePrefersReducedMotion();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [receiptTarget, setReceiptTarget] = useState<MembershipRequestOut | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MembershipRequestOut | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const queryStatus =
    statusFilter === "all" ? null : (statusFilter as MembershipRequestStatus);

  const { data, isLoading, isError, error, refetch } =
    useAdminMembershipRequests(queryStatus, page, PAGE_SIZE);
  const moderate = useModerateMembershipRequest();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

  function handleApprove(id: number) {
    moderate.mutate({ id, action: "approve" });
  }

  function openReject(request: MembershipRequestOut) {
    setRejectTarget(request);
    setRejectReason("");
  }

  function closeReject() {
    setRejectTarget(null);
    setRejectReason("");
  }

  function confirmReject(reason: string) {
    if (!rejectTarget) return;
    moderate.mutate(
      { id: rejectTarget.id, action: "reject", reason },
      {
        onSettled: () => {
          closeReject();
        },
      }
    );
  }

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function goToPage(p: number) {
    if (p < 1 || p > pages) return;
    setPage(p);
  }

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            طلبات العضوية
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            مراجعة طلبات اشتراك العضوية وموافقتها أو رفضها بعد التحقق من صورة التحويل.
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

      {/* المحتوى */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState
          title="تعذّر تحميل طلبات العضوية"
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
          title="لا توجد طلبات عضوية"
          description={
            statusFilter === "pending"
              ? "لا توجد طلبات قيد المراجعة حالياً."
              : statusFilter === "approved"
              ? "لا توجد طلبات موافق عليها بعد."
              : statusFilter === "rejected"
              ? "لا توجد طلبات مرفوضة."
              : "ستظهر هنا طلبات الاشتراك فور تقديمها من العملاء."
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
                    <TableHead className="text-xs">المبلغ</TableHead>
                    <TableHead className="text-xs">طريقة الدفع</TableHead>
                    <TableHead className="text-xs">التحويل</TableHead>
                    <TableHead className="text-xs">الحالة</TableHead>
                    <TableHead className="text-xs">سبب الرفض</TableHead>
                    <TableHead className="text-xs">التاريخ</TableHead>
                    <TableHead className="text-xs">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <MembershipRow
                      key={r.id}
                      request={r}
                      onApprove={handleApprove}
                      onReject={openReject}
                      onViewReceipt={setReceiptTarget}
                      isApproving={
                        moderate.isPending &&
                        moderate.variables?.action === "approve" &&
                        moderate.variables?.id === r.id
                      }
                      isRejecting={
                        moderate.isPending &&
                        moderate.variables?.action === "reject" &&
                        moderate.variables?.id === r.id
                      }
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
                  // عرض الصفحات القريبة + الأولى + الأخيرة مع علامة حذف
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

      {/* مودال عرض صورة التحويل */}
      <ReceiptImageDialog
        request={receiptTarget}
        open={receiptTarget !== null}
        onOpenChange={(v) => {
          if (!v) setReceiptTarget(null);
        }}
      />

      {/* مودال الرفض مع السبب */}
      <RejectReasonDialog
        request={rejectTarget}
        open={rejectTarget !== null}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onOpenChange={(v) => {
          if (!v) closeReject();
        }}
        onConfirm={confirmReject}
        isPending={moderate.isPending}
      />
    </div>
  );
}
