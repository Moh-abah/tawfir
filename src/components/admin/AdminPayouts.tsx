"use client";

/**
 * AdminPayouts — تبويب «الصرف للمندوبين» (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 *  - فلتر حالة chips (الكل/paid/awaiting_activation/failed/initiated/queued).
 *  - «مزامنة من مويسر» → POST /finance/payouts/poll (usePollPayouts).
 *  - جدول (سطح المكتب) ينهار لبطاقات (موبايل): المبلغ MoneyText بالعملة،
 *    destination_type عبر destinationTypeLabel، شارة PAYOUT_STATUS_AR،
 *    failure_reason في صندوق صغير عند وجودها.
 *  - «تنفيذ صرف»: Dialog — courier_id إلزامي، amount/destination_id/
 *    order_id اختيارية — البرونزية-4: مفتاح idempotency داخل الـhook.
 */

import { useState } from "react";
import {
  Banknote,
  Bike,
  Loader2,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminPayouts,
  useExecutePayout,
  usePollPayouts,
} from "@/hooks/useFinance";
import {
  destinationTypeLabel,
  FinanceStatusBadge,
  MoneyText,
  PAYOUT_STATUS_AR,
} from "@/components/finance/finance-ui";
import { formatDate } from "@/lib/format";
import type { PayoutOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

const PAYOUT_FILTERS = [
  { value: "", label: "الكل" },
  { value: "paid", label: PAYOUT_STATUS_AR.paid },
  { value: "awaiting_activation", label: PAYOUT_STATUS_AR.awaiting_activation },
  { value: "failed", label: PAYOUT_STATUS_AR.failed },
  { value: "initiated", label: PAYOUT_STATUS_AR.initiated },
  { value: "queued", label: PAYOUT_STATUS_AR.queued },
];

export default function AdminPayouts() {
  const [status, setStatus] = useState<string>("");
  const query = useAdminPayouts(status || null);
  const poll = usePollPayouts();
  const execute = useExecutePayout();

  /* نموذج تنفيذ الصرف */
  const [formOpen, setFormOpen] = useState(false);
  const [courierId, setCourierId] = useState("");
  const [amount, setAmount] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [orderId, setOrderId] = useState("");

  const courierValid = Number(courierId) > 0;

  const openForm = () => {
    setCourierId("");
    setAmount("");
    setDestinationId("");
    setOrderId("");
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!courierValid) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    execute.mutate(
      {
        courier_id: Number(courierId),
        amount: num(amount),
        destination_id: num(destinationId),
        order_id: num(orderId),
      },
      { onSuccess: () => setFormOpen(false) }
    );
  };

  const items = query.data ?? [];

  return (
    <div className="space-y-4">
      {/* ── رأس الأدوات: فلاتر + مزامنة + تنفيذ ── */}
      <div className="flex flex-wrap items-center gap-2">
        {PAYOUT_FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-full border px-4 text-xs font-bold transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => poll.mutate()}
          disabled={poll.isPending}
          className="min-h-[44px] flex-1 gap-1.5 rounded-full sm:flex-none"
        >
          <RefreshCw
            className={cn("h-4 w-4", poll.isPending && "animate-spin")}
            aria-hidden="true"
          />
          مزامنة من مويسر
        </Button>
        <Button
          type="button"
          onClick={openForm}
          className="min-h-[44px] flex-1 gap-1.5 rounded-full sm:flex-none"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          تنفيذ صرف
        </Button>
      </div>

      {poll.isError && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-2.5 text-xs font-bold text-destructive">
          {poll.error instanceof Error
            ? poll.error.message
            : "تعذّرت المزامنة من مويسر — أعد المحاولة."}
        </p>
      )}

      {/* ── الحالات الثلاث ── */}
      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="تعذّر تحميل سجل الصرف"
          message={
            query.error instanceof Error
              ? query.error.message
              : "لم نتمكن من جلب payouts. أعد المحاولة."
          }
          onRetry={() => query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="لا عمليات صرف في هذه الحالة"
          description="ستظهر أوامر الصرف هنا بعد تنفيذها أو مزامنتها من مويسر."
        />
      ) : (
        <>
          {/* جدول — سطح المكتب */}
          <div className="hidden max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-border/60 md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-right">الطلب</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الوجهة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">سبب الفشل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular-nums font-bold">{p.id}</TableCell>
                    <TableCell className="whitespace-nowrap">مندوب #{p.courier_id}</TableCell>
                    <TableCell className="tabular-nums">
                      {p.order_id != null ? `#${p.order_id}` : "—"}
                    </TableCell>
                    <TableCell>
                      <MoneyText amount={p.amount} currency={p.currency} strong />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {destinationTypeLabel(p.destination_type)}
                    </TableCell>
                    <TableCell>
                      <FinanceStatusBadge status={p.status} dictionary={PAYOUT_STATUS_AR} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(p.created_at)}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {p.failure_reason ? (
                        <span
                          dir="auto"
                          className="inline-block rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-bold text-destructive"
                        >
                          {p.failure_reason}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* بطاقات — موبايل */}
          <div className="grid gap-3 md:hidden">
            {items.map((p) => (
              <PayoutCard key={p.id} payout={p} />
            ))}
          </div>
        </>
      )}

      {/* ── حوار تنفيذ الصرف ── */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && execute.isPending) return;
          setFormOpen(open);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تنفيذ صرف لمندوب</DialogTitle>
            <DialogDescription>
              أمر صرف عبر مويسر — القيم المالية بالعملة كما يعيدها الخادم.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="payout-courier">رقم المندوب (إلزامي)</Label>
              <Input
                id="payout-courier"
                type="number"
                min={1}
                inputMode="numeric"
                dir="ltr"
                value={courierId}
                onChange={(e) => setCourierId(e.target.value)}
                placeholder="رقم المندوب من الأسطول"
                className="min-h-[44px] text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-amount">المبلغ (اختياري)</Label>
              <Input
                id="payout-amount"
                type="number"
                min={0}
                inputMode="decimal"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="اتركه فارغاً للمبلغ الافتراضي"
                className="min-h-[44px] text-left"
              />
              <p className="text-[11px] text-muted-foreground">
                اتركه فارغاً للمبلغ الافتراضي.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payout-destination">وجهة الصرف (اختياري)</Label>
                <Input
                  id="payout-destination"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  placeholder="destination_id"
                  className="min-h-[44px] text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payout-order">الطلب (اختياري)</Label>
                <Input
                  id="payout-order"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="order_id"
                  className="min-h-[44px] text-left"
                />
              </div>
            </div>

            <p className="rounded-lg bg-amber-500/10 p-2.5 text-[11px] font-bold leading-relaxed text-amber-700 dark:text-amber-400">
              بيئة sandbox قد تعيد awaiting_activation — بانتظار تفعيل عقد
              التحويلات الصادرة.
            </p>

            {execute.isError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-2.5 text-xs font-bold text-destructive"
              >
                {execute.error instanceof Error
                  ? execute.error.message
                  : "تعذّر تنفيذ الصرف — أعد المحاولة"}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={execute.isPending}
              className="min-h-[44px] rounded-full"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={!courierValid || execute.isPending}
              className="min-h-[44px] gap-1.5 rounded-full"
            >
              {execute.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              <Send className="h-4 w-4" aria-hidden="true" />
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── بطاقة payout للموبايل ─────────────────────────────────── */

function PayoutCard({ payout: p }: { payout: PayoutOut }) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-soft">
      <CardContent className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
            <Bike className="h-4 w-4 text-primary" aria-hidden="true" />
            صرف #{p.id} — مندوب #{p.courier_id}
          </p>
          <FinanceStatusBadge status={p.status} dictionary={PAYOUT_STATUS_AR} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <MoneyText amount={p.amount} currency={p.currency} strong className="text-base" />
          <span className="text-[11px] text-muted-foreground">{formatDate(p.created_at)}</span>
        </div>
        <dl className="space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">الطلب</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {p.order_id != null ? `#${p.order_id}` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">الوجهة</dt>
            <dd className="font-bold text-foreground">{destinationTypeLabel(p.destination_type)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">المحاولات</dt>
            <dd className="font-bold tabular-nums text-foreground">{p.attempt_count}</dd>
          </div>
        </dl>
        {p.failure_reason && (
          <p
            dir="auto"
            className="flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-[11px] font-bold leading-relaxed text-destructive"
          >
            <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {p.failure_reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

