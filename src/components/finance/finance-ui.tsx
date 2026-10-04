"use client";

/**
 * finance-ui.tsx — مكوّنات عرض مالية مشتركة (جولة v2)
 * ═══════════════════════════════════════════════════════════════
 * - MoneyText: مبلغ + عملة من الاستجابة كما هي (برونزية-3: لا أرقام ميتة،
 *   برونزية-5: العملة بجوار كل مبلغ).
 * - PaymentOut.amount استثناء موثق: هللات سعودية → نقسم على 100 للعرض.
 * - FinanceStatusBadge: شارات ملوّنة بنص عربي لكل حالات الجولة المالية
 *   (دفعات/إشعارات/صرف/قيود).
 */

import { cn } from "@/lib/utils";

export type CurrencyCode = string; // "SAR" | "YER" كما تعيدها الاستجابة

/** تنسيق مبلغ بالعملة — ar-SA للسعودية و ar-YE لليمن. */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: CurrencyCode | null | undefined
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num == null || Number.isNaN(num)) return "—";
  const locale = String(currency ?? "") === "SAR" ? "ar-SA" : "ar-YE";
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
  const symbol =
    currency === "SAR" ? "ر.س" : currency === "YER" ? "ر.ي" : String(currency ?? "");
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/** مبلغ + اتجاه LTR للأرقام داخل النص العربي. */
export function MoneyText({
  amount,
  currency,
  className,
  strong,
}: {
  amount: number | string | null | undefined;
  currency: CurrencyCode | null | undefined;
  className?: string;
  strong?: boolean;
}) {
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        strong && "font-extrabold",
        className
      )}
    >
      <span>{formatMoney(amount, currency)}</span>
    </span>
  );
}

/**
 * مبلغ دفعة Moyasar — الوحدة الموثقة: هللات سعودية (×100).
 * الاستجابة تعيد currency — نقسم فقط عندما SAR (موثق في openapi v2 §7.1).
 */
export function paymentAmountMajor(payment: {
  amount: number;
  currency: string;
}): number {
  if (String(payment.currency).toUpperCase() === "SAR") return payment.amount / 100;
  return payment.amount;
}

/* ═══════════════ قواميس الحالات العربية ═══════════════ */

export const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: "مدفوعة",
  pending: "بانتظار الدفع",
  failed: "فاشلة",
  initiated: "بدأت",
  approved: "مؤكدة",
  refunded: "مستردة",
  captured: "محصّلة",
  cancelled: "ملغاة",
};

export const NOTIFICATION_STATUS_AR: Record<string, string> = {
  submitted: "مقدَّم — بانتظار المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  pending: "قيد المراجعة",
};

export const PAYOUT_STATUS_AR: Record<string, string> = {
  paid: "مصروف",
  awaiting_activation: "بانتظار تفعيل التحويلات",
  initiated: "بدأ التنفيذ",
  queued: "في الطابور",
  pending: "معلّق",
  failed: "فاشل",
  processing: "قيد المعالجة",
};

export const ENTRY_TYPE_AR: Record<string, string> = {
  order_payment: "تحصيل طلب",
  platform_commission: "عمولة المنصة",
  courier_due: "مستحق مندوب",
  owner_due: "مستحق تاجر",
  payout: "صرف لمندوب",
  commission_settlement: "تسوية عمولة",
  yemen_settlement: "تسوية إشعار يمني",
};

export const PARTY_TYPE_AR: Record<string, string> = {
  platform: "المنصة",
  owner: "تاجر",
  courier: "مندوب",
  customer: "عميل",
};

export const ENTRY_STATUS_AR: Record<string, string> = {
  settled: "مُسوّى",
  pending: "معلّق",
  hold: "محجوز",
  reversed: "معكوس",
};

type Tone = "success" | "warning" | "destructive" | "secondary" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  secondary: "bg-secondary/10 text-secondary border-secondary/30",
  accent: "bg-accent/15 text-accent-ink border-accent/40",
};

function toneForStatus(status: string): Tone {
  const s = String(status);
  if (["paid", "approved", "settled", "captured", "initiated"].includes(s)) return "success";
  if (
    ["pending", "submitted", "queued", "awaiting_activation", "processing", "hold"].includes(s)
  )
    return "warning";
  if (["failed", "rejected", "reversed"].includes(s)) return "destructive";
  if (s === "refunded") return "accent";
  return "secondary";
}

/** شارة حالة مالية ملوّنة بنص عربي — تتغذى من قواميس الحالات أعلاه. */
export function FinanceStatusBadge({
  status,
  dictionary,
  className,
}: {
  status: string | null | undefined;
  dictionary?: Record<string, string>;
  className?: string;
}) {
  const s = String(status ?? "");
  const dict = dictionary ?? PAYMENT_STATUS_AR;
  const label = dict[s] ?? s;
  const tone = toneForStatus(s);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-5",
        TONE_CLASSES[tone],
        className
      )}
    >
      {["pending", "submitted", "awaiting_activation"].includes(s) ? (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {label}
    </span>
  );
}

/** وصف وجهة صرف بالعربي. */
export function destinationTypeLabel(type: string | null | undefined): string {
  return String(type) === "bank" ? "حساب بنكي (IBAN)" : "محفظة STC Pay";
}
