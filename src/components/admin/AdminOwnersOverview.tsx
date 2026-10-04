"use client";

/**
 * AdminOwnersOverview — تبويب «لوحة المالكين» (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 * من GET /finance/owner/overview (استجابة واحدة تُغني عن عدة نداءات):
 *  - KPI أعلى: عمولات لكل عملة — تكرار ديناميكي على مفاتيح commissions
 *    (MoneyText بعملة كل مفتاح كما تعيدها الاستجابة).
 *  - جدول المالكين: debt (أمبر إن >0) / accumulated / paid (success)
 *    + شارة cap_reached + زر «البطاقة» يفتح Dialog يجلب بطاقة التاجر
 *    عبر useAdminOwnerCard.
 *  - أحدث 5 إشعارات/عمليات صرف من نفس الاستجابة كقوائم جانبية
 *    (max-h-96 overflow-y-auto).
 *
 * ملاحظة موثقة: أسطر owners لا تحمل عملة في العقد (OwnerOverviewRow)
 * — تُعرض أرقامها كما هي بلا رمز عملة، والعملة الصريحة في بطاقة
 * التاجر (OwnerFinanceCard.currency) وداخل KPI العمولات.
 */

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Banknote,
  Loader2,
  Store,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  useAdminOwnerCard,
  useOwnerOverview,
} from "@/hooks/useFinance";
import {
  FinanceStatusBadge,
  MoneyText,
  NOTIFICATION_STATUS_AR,
  PAYOUT_STATUS_AR,
  destinationTypeLabel,
} from "@/components/finance/finance-ui";
import { formatDate } from "@/lib/format";
import type { OwnerFinanceCard } from "@/services/finance.service";
import { cn } from "@/lib/utils";

export default function AdminOwnersOverview() {
  const overview = useOwnerOverview();
  const [cardOwner, setCardOwner] = useState<number | null>(null);

  const data = overview.data;

  /* أحدث 5 إشعارات/عمليات صرف من نفس الاستجابة — ترتيب تنازلي بالتاريخ */
  const latestNotifications = useMemo(
    () =>
      [...(data?.notifications ?? [])]
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 5),
    [data]
  );
  const latestPayouts = useMemo(
    () =>
      [...(data?.payouts ?? [])]
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 5),
    [data]
  );

  const commissions = Object.entries(data?.commissions ?? {});

  /* ── الحالات الثلاث ── */
  if (overview.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="جارٍ تحميل لوحة المالكين">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (overview.isError || !data) {
    return (
      <ErrorState
        title="تعذّر تحميل لوحة المالكين"
        message={
          overview.error instanceof Error
            ? overview.error.message
            : "لم نتمكن من جلب النظرة الشاملة. أعد المحاولة."
        }
        onRetry={() => overview.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── KPI العمولات لكل عملة (تكرار ديناميكي) ── */}
      <div
        className={cn(
          "grid gap-3",
          commissions.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
        )}
      >
        {commissions.map(([currency, amount]) => (
          <Card key={currency} className="rounded-2xl border-border/60 shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Banknote className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  إجمالي العمولات ({currency})
                </p>
                <MoneyText
                  amount={amount}
                  currency={currency}
                  strong
                  className="text-xl"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {commissions.length === 0 && (
          <Card className="rounded-2xl border-border/60 shadow-soft">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">لا عمولات مسجّلة بعد.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── جدول المالكين (سطح المكتب) ── */}
      {data.owners.length === 0 ? (
        <EmptyState
          icon={Store}
          title="لا مالكين في النظرة الشاملة"
          description="ستظهر ذمم وعمولات التجار هنا مع أول نشاط مالي."
        />
      ) : (
        <>
          <div className="hidden max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-border/60 md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="text-right">التاجر</TableHead>
                  <TableHead className="text-right">الذمة</TableHead>
                  <TableHead className="text-right">المتراكم</TableHead>
                  <TableHead className="text-right">المدفوع</TableHead>
                  <TableHead className="text-right">السقف</TableHead>
                  <TableHead className="text-right">البطاقة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.owners.map((row) => (
                  <TableRow key={row.owner_id}>
                    <TableCell className="whitespace-nowrap font-bold">
                      تاجر #{row.owner_id}
                    </TableCell>
                    <TableCell>
                      <MoneyText
                        amount={row.debt}
                        currency={undefined}
                        strong
                        className={row.debt > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}
                      />
                    </TableCell>
                    <TableCell>
                      <MoneyText amount={row.accumulated} currency={undefined} />
                    </TableCell>
                    <TableCell>
                      <MoneyText
                        amount={row.paid}
                        currency={undefined}
                        className="text-success"
                      />
                    </TableCell>
                    <TableCell>
                      <CapBadge capReached={row.cap_reached} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCardOwner(row.owner_id)}
                        className="min-h-[44px] gap-1.5 rounded-full"
                      >
                        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                        البطاقة
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* بطاقات — موبايل */}
          <div className="grid gap-3 md:hidden">
            {data.owners.map((row) => (
              <Card key={row.owner_id} className="rounded-2xl border-border/60 shadow-soft">
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
                      <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
                      تاجر #{row.owner_id}
                    </p>
                    <CapBadge capReached={row.cap_reached} />
                  </div>
                  <dl className="space-y-1.5 rounded-lg bg-muted/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">الذمة</dt>
                      <dd>
                        <MoneyText
                          amount={row.debt}
                          currency={undefined}
                          strong
                          className={row.debt > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}
                        />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">المتراكم</dt>
                      <dd>
                        <MoneyText amount={row.accumulated} currency={undefined} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">المدفوع</dt>
                      <dd>
                        <MoneyText amount={row.paid} currency={undefined} className="text-success" />
                      </dd>
                    </div>
                  </dl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCardOwner(row.owner_id)}
                    className="min-h-[44px] w-full gap-1.5 rounded-full"
                  >
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    البطاقة المالية
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── أحدث الإشعارات والصرف من نفس الاستجابة ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/60 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              أحدث إشعارات اليمن
            </CardTitle>
            <CardDescription>آخر 5 إشعارات — التبويب المخصص للتفاصيل والمراجعة.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestNotifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا إشعارات بعد.
              </p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pe-1">
                {latestNotifications.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        إشعار #{n.id} · تاجر #{n.owner_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <MoneyText amount={n.amount} currency={n.currency} strong className="text-sm" />
                      <FinanceStatusBadge status={n.status} dictionary={NOTIFICATION_STATUS_AR} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              أحدث عمليات الصرف
            </CardTitle>
            <CardDescription>آخر 5 أوامر صرف للمناديب.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestPayouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا عمليات صرف بعد.
              </p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pe-1">
                {latestPayouts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">
                        صرف #{p.id} · مندوب #{p.courier_id}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {destinationTypeLabel(p.destination_type)} · {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <MoneyText amount={p.amount} currency={p.currency} strong className="text-sm" />
                      <FinanceStatusBadge status={p.status} dictionary={PAYOUT_STATUS_AR} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── حوار بطاقة التاجر ── */}
      <OwnerCardDialog
        ownerId={cardOwner}
        onOpenChange={(open) => {
          if (!open) setCardOwner(null);
        }}
      />
    </div>
  );
}

/* ─── شارة السقف ────────────────────────────────────────────── */

function CapBadge({ capReached }: { capReached: boolean }) {
  return capReached ? (
    <Badge variant="destructive" className="rounded-full">
      بلغ السقف
    </Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full">
      دون السقف
    </Badge>
  );
}

/* ─── حوار بطاقة التاجر (useAdminOwnerCard) ─────────────────── */

function OwnerCardDialog({
  ownerId,
  onOpenChange,
}: {
  ownerId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const card = useAdminOwnerCard(ownerId);

  return (
    <Dialog open={ownerId != null} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>البطاقة المالية — تاجر #{ownerId ?? ""}</DialogTitle>
          <DialogDescription>
            كل حقول بطاقة التاجر كما تعيدها GET /finance/admin/owner/&#123;id&#125;/card.
          </DialogDescription>
        </DialogHeader>

        {card.isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-xl bg-muted" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : card.isError ? (
          <div className="space-y-3">
            <p role="alert" className="rounded-lg bg-destructive/10 p-2.5 text-xs font-bold text-destructive">
              {card.error instanceof Error
                ? card.error.message
                : "تعذّر تحميل البطاقة المالية"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => card.refetch()}
              disabled={card.isFetching}
              className="min-h-[44px] gap-1.5 rounded-full"
            >
              {card.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              إعادة المحاولة
            </Button>
          </div>
        ) : card.data ? (
          <OwnerCardBody card={card.data} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OwnerCardBody({ card }: { card: OwnerFinanceCard }) {
  const currency = card.currency;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-3">
        <span className="text-xs font-bold text-muted-foreground">عملة البطاقة</span>
        <Badge variant="secondary" className="rounded-full">
          {currency}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">المتراكم</dt>
          <dd>
            <MoneyText amount={card.accumulated_commissions} currency={currency} strong className="text-sm" />
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">الذمة</dt>
          <dd>
            <MoneyText
              amount={card.outstanding_debt}
              currency={currency}
              strong
              className={`text-sm ${card.outstanding_debt > 0 ? "text-amber-700 dark:text-amber-400" : ""}`}
            />
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">المدفوع</dt>
          <dd>
            <MoneyText amount={card.paid_total} currency={currency} strong className="text-sm text-success" />
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">المعلق</dt>
          <dd className="text-sm font-extrabold tabular-nums text-foreground">
            {card.pending_notifications} إشعار
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">السقف</dt>
          <dd>
            {card.debt_cap == null ? (
              <span className="text-sm font-extrabold text-muted-foreground">بلا سقف</span>
            ) : (
              <MoneyText amount={card.debt_cap} currency={currency} strong className="text-sm" />
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-border/50 p-3">
          <dt className="text-muted-foreground">حالة السقف</dt>
          <dd className="pt-0.5">
            <CapBadge capReached={card.cap_reached} />
          </dd>
        </div>
      </dl>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
          <dt className="text-muted-foreground">الفواتير</dt>
          <dd className="text-base font-black tabular-nums text-foreground">{card.invoices_count}</dd>
        </div>
        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
          <dt className="text-muted-foreground">الطلبات</dt>
          <dd className="text-base font-black tabular-nums text-foreground">{card.orders_count}</dd>
        </div>
        <div className="rounded-xl bg-muted/40 p-2.5 text-center">
          <dt className="text-muted-foreground">التحويلات</dt>
          <dd className="text-base font-black tabular-nums text-foreground">{card.transfers_count}</dd>
        </div>
      </dl>
    </div>
  );
}
