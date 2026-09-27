"use client";

/**
 * مدفوعات المطعم — /owner/facilities/{id}/payments
 * ═══════════════════════════════════════════════════════════════
 * السجلات + التحويلات + الإشعارات + الإجماليات في شاشة واحدة:
 * - الإجماليات: طلبات المحافظ، المؤكد/المعلّق/المرفوض/بانتظار التكملة،
 *   المبالغ المؤكدة والمعلقة والمتبقية على العملاء، المبلغ الموصَّل
 *   فعلياً (ما اشتغل به التاجر عبر النظام)، ومقارنة الكاش.
 * - السجلات: كل طلب محفظة بفلاتر (الكل/معلّق/مؤكد/مرفوض/بانتظار
 *   التكملة) + ترقيم صفحات + تفصيل المبلغ (وجبة + توصيل) + صور الإشعار.
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  Loader2,
  Package,
  Store,
  TrendingUp,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import {
  OwnerWalletOrderPanel,
  PaymentStatusBadge,
} from "@/components/owner/OwnerWalletOrderPanel";
import { useFacilityPayments } from "@/hooks/useWallets";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { useOwnerOrders } from "@/hooks/useOwnerOrders";
import { formatCurrency, formatDate, resolveImageUrl } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import type { WalletPaymentItem } from "@/types/api-extra";
import type { OrderListOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── بطاقة إجمالية ─────────────────────────────────────── */
function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "bg-primary/10 text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p dir="ltr" className="truncate text-lg font-black leading-tight tabular-nums text-foreground">
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
        </p>
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        {sub && <p className="truncate text-[10px] text-muted-foreground/80">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── فلاتر الحالة ──────────────────────────────────────── */
const STATUS_FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: "الكل" },
  { key: "pending", label: "بانتظار المراجعة" },
  { key: "approved", label: "المؤكدة" },
  { key: "partial_requested", label: "بانتظار التكملة" },
  { key: "rejected", label: "المرفوضة" },
];

export default function OwnerPaymentsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const facilityId = useMemo(() => {
    const n = Number(params?.id);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [params?.id]);

  const { data: facilities } = useMyFacilities();
  const facility = facilities?.find((f) => f.id === facilityId);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const paymentsQuery = useFacilityPayments(facilityId || null, {
    payment_status: statusFilter,
    page,
    page_size: 20,
  });
  const data = paymentsQuery.data;
  const items: WalletPaymentItem[] = data?.items ?? [];
  const summary = data?.summary;

  /* ربط رقم الطلب ببطاقة الطلب الحية (لعرض لوحة المحفظة والإجراءات) */
  const ordersQuery = useOwnerOrders(facilityId);
  const liveOrders = useMemo(() => {
    const map = new Map<number, OrderListOut>();
    for (const o of ordersQuery.data?.items ?? []) map.set(o.id, o);
    return map;
  }, [ordersQuery.data]);

  const [receiptView, setReceiptView] = useState<WalletPaymentItem | null>(null);

  if (!facilityId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState title="معرّف المتجر غير صالح" message="تعذّر تحديد المتجر المطلوب." />
      </main>
    );
  }

  return (
    <PullToRefresh onRefresh={() => paymentsQuery.refetch()}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6"
        dir="rtl"
      >
        {/* رأس الصفحة */}
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
                <Banknote className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  مدفوعات المطعم
                </h1>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                {facility?.name ?? "متجري"} — سجلات التحويلات والإجماليات
              </p>
            </div>
          </div>
          <Link href={`/owner/facilities/${facilityId}/wallets`}>
            <Button variant="outline" className="gap-2 rounded-full min-h-[44px]">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">محافظ التحويل</span>
            </Button>
          </Link>
        </div>

        {/* الإجماليات */}
        {paymentsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : paymentsQuery.isError ? (
          <ErrorState
            title="تعذّر تحميل المدفوعات"
            message={
              paymentsQuery.error instanceof Error
                ? paymentsQuery.error.message
                : "تحقق من اتصالك بالإنترنت"
            }
            onRetry={() => void paymentsQuery.refetch()}
          />
        ) : summary ? (
          <section aria-label="إجماليات المدفوعات" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard
                icon={Wallet}
                label="إجمالي طلبات المحافظ"
                value={summary.wallet_orders_count ?? 0}
                sub={`من ${summary.total_orders_count ?? 0} طلب إجمالاً`}
              />
              <SummaryCard
                icon={CheckCircle2}
                label="تحويلات مؤكدة (إجمالي الدفع)"
                value={summary.approved_amount ?? 0}
                sub={`${summary.approved_count ?? 0} طلب مؤكد`}
                tone="bg-success/15 text-success"
              />
              <SummaryCard
                icon={Hourglass}
                label="مبالغ بانتظار المراجعة"
                value={summary.pending_amount ?? 0}
                sub={`${summary.pending_count ?? 0} طلب معلّق`}
                tone="bg-accent/15 text-accent-ink"
              />
              <SummaryCard
                icon={TrendingUp}
                label="ما اشتغل به عبر النظام (موصَّل)"
                value={summary.delivered_amount ?? 0}
                sub="مجموع طلبات المحافظ الموصَّلة"
                tone="bg-secondary/15 text-secondary"
              />
              <SummaryCard
                icon={Clock}
                label="بانتظار تكملة الدفعة"
                value={summary.partial_requested_count ?? 0}
                sub={`مبالغ متبقية: ${(summary.partial_requested_amount ?? 0).toLocaleString("en-US")} ر.ي`}
                tone="bg-accent/15 text-accent-ink"
              />
              <SummaryCard
                icon={Package}
                label="دفعات ناقصة اكتملت"
                value={summary.completed_partial_count ?? 0}
                tone="bg-primary/10 text-primary"
              />
              <SummaryCard
                icon={Ban}
                label="تحويلات مرفوضة"
                value={summary.rejected_count ?? 0}
                tone="bg-destructive/10 text-destructive"
              />
              <SummaryCard
                icon={Banknote}
                label="طلبات كاش (للمقارنة)"
                value={summary.cash_orders_count ?? 0}
                tone="bg-muted text-muted-foreground"
              />
            </div>
          </section>
        ) : null}

        {/* الفلاتر */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="فلترة حالة الدفع">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key ?? "all"}
              type="button"
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={cn(
                "native-tap inline-flex min-h-[40px] items-center rounded-full border px-4 text-xs font-bold transition-colors",
                statusFilter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
              )}
              aria-pressed={statusFilter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* السجلات */}
        {paymentsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <EmptyState
                icon={Wallet}
                title="لا توجد سجلات مدفوعات"
                description={
                  statusFilter
                    ? "لا توجد طلبات بهذه الحالة — جرّب فلتراً آخر."
                    : "عندما يطلب عميل بالدفع عبر محفظة سيظهر سجل تحويله هنا مع صورة الإشعار."
                }
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => {
              const live = liveOrders.get(p.order_id);
              return (
                <li key={p.order_id}>
                  <Card className="rounded-2xl border-border/60">
                    <CardContent className="space-y-3 p-4">
                      {/* رأس السجل */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-extrabold text-foreground">
                              طلب{" "}
                              <span dir="ltr" className="tabular-nums">
                                #{p.order_id}
                              </span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDate(p.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PaymentStatusBadge status={p.payment_status} />
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {ORDER_STATUS_LABEL[p.status as keyof typeof ORDER_STATUS_LABEL] ?? p.status}
                          </span>
                        </div>
                      </div>

                      {/* العميل والمبلغ */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate text-foreground">
                              {p.customer_name ?? "عميل"}
                            </span>
                            <span dir="ltr" className="text-xs">
                              {p.customer_phone ?? ""}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                            {p.wallet_label ?? "—"}
                          </p>
                        </div>
                        <div className="space-y-1 text-sm sm:text-left">
                          <div className="flex items-center gap-2 text-xs sm:justify-end">
                            <span className="text-muted-foreground">الوجبات:</span>
                            <span dir="ltr" className="font-bold tabular-nums">
                              {formatCurrency(p.subtotal)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:justify-end">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <span className="text-muted-foreground">التوصيل:</span>
                            <span dir="ltr" className="font-bold tabular-nums">
                              {formatCurrency(p.delivery_fee)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-extrabold sm:justify-end">
                            <span className="text-muted-foreground">الإجمالي (المحوَّل):</span>
                            <span dir="ltr" className="tabular-nums text-primary">
                              {formatCurrency(p.amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* صورة الإشعار + زر العرض */}
                      {p.receipt && (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative h-12 w-16 overflow-hidden rounded-lg border bg-muted">
                              <ImageWithSkeleton
                                src={resolveImageUrl(p.receipt.receipt_image_url)}
                                alt="إشعار التحويل"
                                fill
                                className="object-cover"
                                skeletonClassName="rounded-none"
                              />
                            </div>
                            <div className="text-[11px] leading-tight text-muted-foreground">
                              <p className="font-bold text-foreground">
                                {p.receipt.completion_image_url
                                  ? "إشعاران مرفوعان (الأول + التكملة)"
                                  : "إشعار التحويل مرفوع"}
                              </p>
                              {p.receipt.sender_name && (
                                <p>المُحوِّل: {p.receipt.sender_name}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setReceiptView(p)}
                            className="min-h-[40px] gap-1.5 rounded-full px-3 text-xs font-bold"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            عرض
                          </Button>
                        </div>
                      )}

                      {/* لوحة الإجراءات الحية (تأكيد/دفعة ناقصة) — إن كان الطلب قائماً */}
                      {live && live.status === "pending" && (
                        <div className="border-t border-border/40 pt-2.5">
                          <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">
                            إجراءات سريعة — الطلب ما زال بانتظار تأكيدك:
                          </p>
                          <OwnerWalletOrderPanel order={live} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {/* ترقيم الصفحات */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || paymentsQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] rounded-full"
            >
              السابق
            </Button>
            <span className="text-xs font-bold text-muted-foreground">
              صفحة {data.page} من {data.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages || paymentsQuery.isFetching}
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              className="min-h-[44px] rounded-full"
            >
              التالي
            </Button>
          </div>
        )}

        {/* نافذة عرض الإشعار */}
        <Dialog open={!!receiptView} onOpenChange={(o) => !o && setReceiptView(null)}>
          <DialogContent className="rounded-2xl sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                إشعار التحويل — طلب{" "}
                <span dir="ltr" className="tabular-nums">
                  #{receiptView?.order_id}
                </span>
              </DialogTitle>
              <DialogDescription>
                الإجمالي المحوَّل:{" "}
                {receiptView && (
                  <span dir="ltr" className="font-extrabold tabular-nums">
                    {formatCurrency(receiptView.amount)}
                  </span>
                )}{" "}
                (وجبة + توصيل)
              </DialogDescription>
            </DialogHeader>
            {receiptView?.receipt && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <figure className="space-y-1">
                    <div className="relative h-56 overflow-hidden rounded-xl border bg-muted">
                      <ImageWithSkeleton
                        src={resolveImageUrl(receiptView.receipt.receipt_image_url)}
                        alt="إشعار التحويل"
                        fill
                        className="object-contain"
                        skeletonClassName="rounded-none"
                      />
                    </div>
                    <figcaption className="text-center text-[11px] text-muted-foreground">
                      الإشعار الأول
                    </figcaption>
                  </figure>
                  {receiptView.receipt.completion_image_url && (
                    <figure className="space-y-1">
                      <div className="relative h-56 overflow-hidden rounded-xl border bg-muted">
                        <ImageWithSkeleton
                          src={resolveImageUrl(receiptView.receipt.completion_image_url)}
                          alt="إشعار التكملة"
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
                  {receiptView.receipt.sender_name && (
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">اسم المُحوِّل</p>
                      <p className="font-extrabold text-foreground">
                        {receiptView.receipt.sender_name}
                      </p>
                    </div>
                  )}
                  {receiptView.receipt.wallet_snapshot && (
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">المحفظة وقت التحويل</p>
                      <p dir="ltr" className="truncate font-extrabold text-foreground">
                        {receiptView.receipt.wallet_snapshot}
                      </p>
                    </div>
                  )}
                  {receiptView.receipt.paid_amount != null && (
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">المستلم (تراكمي)</p>
                      <p dir="ltr" className="font-extrabold tabular-nums text-foreground">
                        {formatCurrency(receiptView.receipt.paid_amount)}
                      </p>
                    </div>
                  )}
                  {receiptView.receipt.remaining_amount != null && (
                    <div className="rounded-lg bg-muted/60 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">المتبقي</p>
                      <p dir="ltr" className="font-extrabold tabular-nums text-accent-ink">
                        {formatCurrency(receiptView.receipt.remaining_amount)}
                      </p>
                    </div>
                  )}
                </div>
                {receiptView.receipt.rejection_reason && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                    سبب الرفض: {receiptView.receipt.rejection_reason}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </PullToRefresh>
  );
}
