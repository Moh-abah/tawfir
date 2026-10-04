"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  BellRing,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MoneyText } from "@/components/finance/finance-ui";
import { useOwnerFinanceCard } from "@/hooks/useFinance";
import type { OwnerFinanceCard } from "@/services/finance.service";

/* ═══════════════ لوحة ألوان التوكنات (فاتح/داكن) ═══════════════ */

type Tone = "success" | "warning" | "accent" | "secondary";

const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  accent: "bg-accent/15 text-accent-ink",
  secondary: "bg-secondary/10 text-secondary",
};

const TONE_VALUE: Record<Tone, string> = {
  success: "text-success",
  warning: "text-amber-700 dark:text-amber-300",
  accent: "text-accent-ink",
  secondary: "text-foreground",
};

/* ═══════════════ بطاقة إحصائية واحدة ═══════════════ */

function StatCard({
  icon: Icon,
  label,
  tone,
  hint,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-soft",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            TONE_CHIP[tone]
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="mt-2.5">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ═══════════════ سطر العدادات (فواتير/طلبات/تحويلات) ═══════════════ */

function CountItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p
          dir="ltr"
          className="text-lg font-bold leading-none tabular-nums text-foreground"
        >
          {value.toLocaleString("ar-EG")}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ═══════════════ الهياكل المؤقتة (skeleton) ═══════════════ */

function PanelSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="جارٍ تحميل البطاقة المالية">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="mt-3 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="hidden h-9 w-full sm:block" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ اللوحة الرئيسية ═══════════════ */

/**
 * بطاقة التاجر المالية — GET /finance/owner/card عبر useOwnerFinanceCard.
 * كل المبالغ من الاستجابة كما هي (برونزية-3/5): MoneyText + العملة بجوار كل مبلغ،
 * والعملة نفسها تأتي من card.currency (YER أو SAR كما يراها الخادم حرفياً).
 */
export function OwnerFinanceCardPanel() {
  const {
    data: card,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useOwnerFinanceCard(true, 60);

  const debtTone: Tone =
    card != null && Number(card.outstanding_debt) > 0 ? "warning" : "success";

  /* سقف الذمة: يُعرض فقط إن وُجد وليس null وليس نصاً فارغاً */
  const hasDebtCap =
    card?.debt_cap != null && String(card.debt_cap).trim() !== "";

  const errorDetail =
    error instanceof Error && error.message
      ? error.message
      : "تعذّر تحميل بطاقتك المالية. تحقق من اتصالك ثم أعد المحاولة.";

  return (
    <section aria-label="بطاقة التاجر المالية" className="space-y-3">
      {/* ترويسة القسم + زر التحديث اليدوي (التحديث الحي 60s من الـhook) */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">بطاقتي المالية</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="min-h-[44px] gap-1.5 rounded-full px-4"
          aria-label="تحديث البطاقة المالية"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
            aria-hidden="true"
          />
          تحديث
        </Button>
      </div>

      {isLoading ? (
        <PanelSkeleton />
      ) : isError ? (
        /* خطأ — detail عربي من الخادم + زر إعادة */
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                تعذّر تحميل البطاقة المالية
              </p>
              <p className="break-words text-xs leading-relaxed text-destructive/90">
                {errorDetail}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="min-h-[44px] gap-1.5 rounded-full border-destructive/40 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                  aria-hidden="true"
                />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      ) : card ? (
        <CardBody card={card} debtTone={debtTone} hasDebtCap={hasDebtCap} />
      ) : null}
    </section>
  );
}

/* ═══════════════ جسم البطاقة (بيانات كاملة) ═══════════════ */

function CardBody({
  card,
  debtTone,
  hasDebtCap,
}: {
  card: OwnerFinanceCard;
  debtTone: Tone;
  hasDebtCap: boolean;
}) {
  return (
    <div className="space-y-3">
      {/* ═══ بانر السقف — نص الخادم الموثق عند cap_reached ═══ */}
      {card.cap_reached === true && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-400/10"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold leading-relaxed text-amber-700 dark:text-amber-300">
              ذمة التاجر بلغت السقف — يلزم تسديد العمولات قبل قبول طلبات جديدة
            </p>
            {hasDebtCap && (
              <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
                سقف الذمة المسموح:{" "}
                <MoneyText amount={card.debt_cap} currency={card.currency} />
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══ شبكة البطاقات ═══ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* الذمة القائمة — amber إن > 0، success إن 0 */}
        <StatCard
          icon={Wallet}
          label="الذمة القائمة"
          tone={debtTone}
          hint={
            Number(card.outstanding_debt) > 0
              ? "عمولات مستحقة لم تُسدَّد بعد"
              : undefined
          }
        >
          <MoneyText
            amount={card.outstanding_debt}
            currency={card.currency}
            strong
            className={cn("text-xl", TONE_VALUE[debtTone])}
          />
        </StatCard>

        {/* العمولات المتراكمة */}
        <StatCard icon={Percent} label="العمولات المتراكمة" tone="accent">
          <MoneyText
            amount={card.accumulated_commissions}
            currency={card.currency}
            strong
            className="text-xl text-foreground"
          />
        </StatCard>

        {/* المدفوع */}
        <StatCard
          icon={BadgeCheck}
          label="المدفوع"
          tone="success"
          hint="إجمالي ما سُدِّد من عمولاتك"
        >
          <MoneyText
            amount={card.paid_total}
            currency={card.currency}
            strong
            className="text-xl text-success"
          />
        </StatCard>

        {/* إشعارات معلّقة — عدّاد وليس مبلغاً */}
        <StatCard
          icon={BellRing}
          label="إشعارات معلّقة"
          tone="secondary"
          hint={
            Number(card.pending_notifications) > 0
              ? "إشعارات تسديد بانتظار مراجعة فريق المنصة"
              : "لا توجد إشعارات بانتظار المراجعة"
          }
        >
          <p
            dir="ltr"
            className={cn(
              "text-xl font-extrabold tabular-nums",
              Number(card.pending_notifications) > 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-foreground"
            )}
          >
            {Number(card.pending_notifications).toLocaleString("ar-EG")}
          </p>
        </StatCard>

        {/* سقف الذمة — سطر معلومات عندما يُرسله الخادم (ليس null/"") */}
        {hasDebtCap && !card.cap_reached && (
          <StatCard
            icon={Percent}
            label="سقف الذمة المسموح"
            tone="secondary"
            hint="أقصى ذمة تُقبل قبل إيقاف الطلبات الجديدة"
          >
            <MoneyText
              amount={card.debt_cap}
              currency={card.currency}
              strong
              className="text-xl text-foreground"
            />
          </StatCard>
        )}

        {/* ═══ سطر معلومات العدادات — فواتير/طلبات/تحويلات ═══ */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:col-span-2 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <CountItem icon={Receipt} label="الفواتير" value={card.invoices_count} />
            <span
              className="hidden h-8 w-px shrink-0 bg-border sm:block"
              aria-hidden="true"
            />
            <CountItem icon={ShoppingBag} label="الطلبات" value={card.orders_count} />
            <span
              className="hidden h-8 w-px shrink-0 bg-border sm:block"
              aria-hidden="true"
            />
            <CountItem
              icon={ArrowLeftRight}
              label="التحويلات"
              value={card.transfers_count}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
