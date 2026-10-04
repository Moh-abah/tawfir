"use client";

/**
 * المالية والمستحقات — /courier/finance (جولة v2 — Task 4-c)
 * ═══════════════════════════════════════════════════════════════
 * بوابة المندوب المالية فوق طبقة العقود الحية:
 *   1) بطاقة «رصيدي المستحق» — receivable + العملة من الاستجابة
 *      (MoneyText — لا أرقام ميتة) + تحديث يدوي.
 *   2) وجهات الصرف — bank: IBAN بنكي · wallet: STC Pay (لا PayPal إطلاقاً).
 *   3) سجل «مستحقاتي» — PayoutOut بالحالات العربية الجاهزة من الخادم.
 * الحالات الثلاث لكل قسم: skeleton / خطأ detail عربي + إعادة / فراغ بذكاء.
 * داخل حارس بوابة المندوب (layout) تلقائياً — لا مصادقة محلية هنا.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock,
  Info,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCcw,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import {
  useCourierBalance,
  useCourierDestinations,
  useCreateCourierDestination,
  useMyPayouts,
} from "@/hooks/useFinance";
import {
  FinanceStatusBadge,
  MoneyText,
  PAYOUT_STATUS_AR,
  destinationTypeLabel,
} from "@/components/finance/finance-ui";
import { formatDate } from "@/lib/format";
import { toEnglishDigits } from "@/lib/yemen";
import type {
  DestinationIn,
  DestinationOut,
  PayoutOut,
} from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ═══════════════ أدوات عرض مساعدة ═══════════════ */

/** IBAN مخفي جزئياً: SA** **** 1234 — تُعرض آخر 4 خانات فقط. */
function maskIban(iban: string | null | undefined): string {
  const clean = String(iban ?? "").replace(/[\s-]/g, "").toUpperCase();
  if (clean.length <= 4) return `SA** **** ${clean || "••••"}`;
  return `${clean.slice(0, 2)}** **** ${clean.slice(-4)}`;
}

/** شارة توثيق الوجهة — «موثقة» success / «قيد التوثيق» amber. */
function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-success">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      موثقة
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-amber-700 dark:text-amber-400">
      <Clock className="h-3 w-3" aria-hidden="true" />
      قيد التوثيق
    </span>
  );
}

/** خطأ قسم داخلي — detail عربي كما هو + زر إعادة (لمس ≥44px). */
function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
      </span>
      <p className="break-words text-sm leading-relaxed text-foreground">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="min-h-[44px] gap-2 rounded-full native-tap"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        إعادة المحاولة
      </Button>
    </div>
  );
}

/* ═══════════════ 1) بطاقة الرصيد ═══════════════ */

function CourierBalanceCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useCourierBalance();
  const receivable = data?.receivable;

  return (
    <section
      aria-label="رصيدي المستحق"
      className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-bl from-primary/15 via-card to-card p-5 shadow-soft"
    >
      <div
        className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Banknote className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground">رصيدي المستحق</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-9 w-36 rounded-xl" />
            ) : isError ? (
              <p className="mt-1 break-words text-xs font-bold leading-relaxed text-destructive">
                {error instanceof Error ? error.message : "تعذّر تحميل الرصيد"}
              </p>
            ) : (
              <MoneyText
                amount={receivable}
                currency={data?.currency}
                strong
                className="mt-0.5 text-3xl leading-9 text-primary"
              />
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="تحديث الرصيد"
        >
          <RefreshCcw
            className={cn("h-4.5 w-4.5", isFetching && "animate-spin")}
            aria-hidden="true"
          />
        </Button>
      </div>

      {isError && !isLoading ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          className="mt-4 min-h-[44px] gap-2 rounded-full native-tap"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          إعادة المحاولة
        </Button>
      ) : receivable === 0 && !isLoading ? (
        <div className="relative mt-4 flex items-center gap-2 rounded-2xl bg-success/10 px-3 py-2.5 text-xs font-bold text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          لا مستحقات معلّقة الآن
        </div>
      ) : (
        <p className="relative mt-3 text-[11px] text-muted-foreground">
          مجموع مستحقاتك غير المصروفة بعد — يُحدَّث تلقائياً كل دقيقة
        </p>
      )}
    </section>
  );
}

/* ═══════════════ 2) وجهات الصرف ═══════════════ */

type DestinationType = "bank" | "wallet";

type FormValues = {
  holder_name: string;
  iban: string;
  mobile: string;
  city: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = { holder_name: "", iban: "", mobile: "", city: "" };

/** تحقق خفيف — الخادم هو المرجع النهائي (أخطاء detail تُعرض كما هي). */
function validateForm(type: DestinationType, v: FormValues): FormErrors {
  const errors: FormErrors = {};

  const holder = v.holder_name.trim();
  if (!holder) errors.holder_name = "اسم صاحب الحساب إلزامي";
  else if (holder.length < 3)
    errors.holder_name = "الاسم قصير جداً — 3 خانات على الأقل";
  else if (holder.length > 160) errors.holder_name = "الاسم طويل جداً (160 خانة كحد أقصى)";

  if (type === "bank") {
    const iban = toEnglishDigits(v.iban).replace(/[\s-]/g, "");
    if (!iban) errors.iban = "رقم IBAN إلزامي";
    else if (!/^[A-Za-z0-9]{2,34}$/.test(iban))
      errors.iban = "IBAN غير صالح — من 2 إلى 34 خانة لاتينية/أرقام فقط";
    if (v.city.trim().length > 80) errors.city = "اسم المدينة طويل (80 خانة كحد أقصى)";
  } else {
    const raw = toEnglishDigits(v.mobile).replace(/[^\d]/g, "");
    /* الخادم يطلب الصيغة 9665XXXXXXXX حصراً — نطبّع 05… تلقائياً */
    const mobile = raw.startsWith("05") ? `966${raw.slice(1)}` : raw;
    if (!mobile) errors.mobile = "رقم STC Pay إلزامي";
    else if (!/^9665\d{8}$/.test(mobile))
      errors.mobile = "رقم سعودي غير صالح — الصيغة: 9665XXXXXXXX";
  }

  return errors;
}

function DestinationFormDialog({
  open,
  onOpenChange,
  destinations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: DestinationOut[];
}) {
  const [type, setType] = useState<DestinationType>("bank");
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const createMutation = useCreateCourierDestination();

  const sameTypeExists = destinations.some((d) => d.type === type);

  const setField = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const handleSubmit = () => {
    const nextErrors = validateForm(type, values);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const holder = values.holder_name.trim();
    const body: DestinationIn =
      type === "bank"
        ? {
            type: "bank",
            holder_name: holder,
            iban: toEnglishDigits(values.iban).replace(/[\s-]/g, ""),
            city: values.city.trim() || null,
            country: "SA",
          }
        : {
            type: "wallet",
            holder_name: holder,
            mobile: (() => {
              const raw = toEnglishDigits(values.mobile).replace(/[^\d]/g, "");
              return raw.startsWith("05") ? `966${raw.slice(1)}` : raw;
            })(),
            country: "SA",
          };

    createMutation.mutate(body, {
      onSuccess: () => {
        setValues(EMPTY_FORM);
        setErrors({});
        setServerError(null);
        onOpenChange(false);
      },
      onError: (err) =>
        setServerError(err instanceof Error ? err.message : "تعذّر إضافة وجهة الصرف"),
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValues(EMPTY_FORM);
      setErrors({});
      setServerError(null);
      setType("bank");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92dvh] overflow-y-auto rounded-3xl">
        <DialogHeader className="text-start">
          <DialogTitle className="text-base font-extrabold text-foreground">
            إضافة وجهة صرف
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            ستُحوَّل مستحقاتك إلى هذه الوجهة — بنك (IBAN) أو محفظة STC Pay.
          </DialogDescription>
        </DialogHeader>

        {/* منتقي النوع — أزرار تبديل كبيرة */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع الوجهة">
          {(
            [
              { value: "bank", label: "حساب بنكي", hint: "IBAN", icon: Landmark },
              { value: "wallet", label: "محفظة STC Pay", hint: "رقم الجوال", icon: Smartphone },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={type === opt.value}
              onClick={() => {
                setType(opt.value);
                setErrors({});
                setServerError(null);
              }}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition-colors native-tap",
                type === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <opt.icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-extrabold">{opt.label}</span>
              <span className="text-[10px] opacity-80">{opt.hint}</span>
            </button>
          ))}
        </div>

        {sameTypeExists && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-bold leading-relaxed text-amber-700 dark:text-amber-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            لديك وجهة من النوع نفسه — ستُستخدم أحدث وجهة عند الصرف
          </div>
        )}

        <div className="space-y-3.5">
          {/* اسم صاحب الحساب */}
          <div className="space-y-1.5">
            <Label htmlFor="dest-holder" className="text-xs font-bold text-foreground">
              اسم صاحب الحساب <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dest-holder"
              value={values.holder_name}
              onChange={(e) => setField("holder_name", e.target.value)}
              placeholder="الاسم كما في الحساب"
              autoComplete="name"
              className="min-h-[44px] rounded-2xl"
              aria-invalid={Boolean(errors.holder_name)}
            />
            {errors.holder_name ? (
              <p className="text-[11px] font-bold text-destructive">{errors.holder_name}</p>
            ) : null}
          </div>

          {type === "bank" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dest-iban" className="text-xs font-bold text-foreground">
                  رقم IBAN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dest-iban"
                  dir="ltr"
                  value={values.iban}
                  onChange={(e) => setField("iban", e.target.value)}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  inputMode="text"
                  autoComplete="off"
                  className="min-h-[44px] rounded-2xl text-left"
                  aria-invalid={Boolean(errors.iban)}
                />
                {errors.iban ? (
                  <p className="text-[11px] font-bold text-destructive">{errors.iban}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">IBAN يبدأ بـ SA</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dest-city" className="text-xs font-bold text-foreground">
                  المدينة <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="dest-city"
                  value={values.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="مثال: الرياض"
                  className="min-h-[44px] rounded-2xl"
                  aria-invalid={Boolean(errors.city)}
                />
                {errors.city ? (
                  <p className="text-[11px] font-bold text-destructive">{errors.city}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="dest-mobile" className="text-xs font-bold text-foreground">
                رقم STC Pay <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dest-mobile"
                dir="ltr"
                value={values.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                placeholder="9665XXXXXXXX"
                inputMode="numeric"
                autoComplete="off"
                className="min-h-[44px] rounded-2xl text-left tabular-nums"
                aria-invalid={Boolean(errors.mobile)}
              />
              {errors.mobile ? (
                <p className="text-[11px] font-bold text-destructive">{errors.mobile}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  الصيغة: 9665XXXXXXXX — يُطبَّع تلقائياً من 05…
                </p>
              )}
            </div>
          )}
        </div>

        {/* خطأ الخادم — detail كما هو */}
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[11px] font-bold leading-relaxed text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{serverError}</span>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="min-h-[48px] w-full gap-2 rounded-2xl text-sm font-extrabold native-tap"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {createMutation.isPending ? "جارٍ الحفظ…" : "حفظ الوجهة"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function DestinationCard({ destination: d }: { destination: DestinationOut }) {
  const isBank = d.type === "bank";
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isBank ? (
            <Landmark className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-extrabold text-foreground">
              {destinationTypeLabel(d.type)}
            </p>
            <VerifiedBadge verified={Boolean(d.is_verified)} />
          </div>
          <p className="mt-0.5 truncate text-sm font-bold text-foreground">
            {d.holder_name}
          </p>
          {isBank ? (
            <p
              dir="ltr"
              className="mt-0.5 truncate text-left text-sm font-extrabold tabular-nums text-muted-foreground"
            >
              {maskIban(d.iban)}
            </p>
          ) : (
            <p
              dir="ltr"
              className="mt-0.5 truncate text-left text-sm font-extrabold tabular-nums text-muted-foreground"
            >
              {d.mobile ?? "—"}
            </p>
          )}
          {(d.city || d.country) && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {[d.city, d.country].filter(Boolean).join(" — ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CourierDestinationsSection() {
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useCourierDestinations();
  const destinations: DestinationOut[] = data ?? [];

  return (
    <section aria-label="وجهات الصرف" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Landmark className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          وجهات الصرف
        </h2>
        <Button
          onClick={() => setFormOpen(true)}
          size="sm"
          className="min-h-[44px] gap-1.5 rounded-full native-tap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة وجهة
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-4">
        <p className="text-xs leading-relaxed text-foreground">
          أضف وجهة صرفك (حساب بنكي IBAN أو محفظة STC Pay) لتصلك مستحقاتك تلقائياً بعد
          تنفيذ الصرف.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <SectionError
          message={
            error instanceof Error
              ? error.message
              : "تعذّر تحميل وجهات الصرف — أعد المحاولة"
          }
          onRetry={() => void refetch()}
        />
      ) : destinations.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Landmark className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <p className="font-extrabold text-foreground">
              لا وجهات بعد — أضف وجهتك الأولى لتصلك مستحقاتك
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              حساب بنكي (IBAN يبدأ بـ SA) أو محفظة STC Pay (الصيغة 9665XXXXXXXX).
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {destinations.map((d) => (
            <li key={d.id}>
              <DestinationCard destination={d} />
            </li>
          ))}
        </ul>
      )}

      <DestinationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        destinations={destinations}
      />
    </section>
  );
}

/* ═══════════════ 3) سجل مستحقاتي (عمليات الصرف) ═══════════════ */

function PayoutRow({ payout: p }: { payout: PayoutOut }) {
  const meta = [
    p.order_id != null ? `طلب #${p.order_id}` : null,
    destinationTypeLabel(p.destination_type),
    formatDate(p.created_at),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <MoneyText amount={p.amount} currency={p.currency} strong className="text-base" />
          <p className="mt-1 break-words text-[11px] text-muted-foreground">{meta}</p>
        </div>
        <FinanceStatusBadge status={p.status} dictionary={PAYOUT_STATUS_AR} />
      </div>

      {p.status === "failed" && p.failure_reason ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-[11px] font-bold leading-relaxed text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="break-words">{p.failure_reason}</span>
        </div>
      ) : null}

      {p.attempt_count > 1 ? (
        <p className="mt-1.5 text-[10px] font-bold text-muted-foreground">
          المحاولات: {p.attempt_count}
        </p>
      ) : null}
    </li>
  );
}

function CourierPayoutsSection() {
  const { data, isLoading, isError, error, refetch } = useMyPayouts();
  const payouts: PayoutOut[] = data ?? [];

  return (
    <section aria-label="مستحقاتي" className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
        <ReceiptText className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
        مستحقاتي
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <SectionError
          message={
            error instanceof Error ? error.message : "تعذّر تحميل سجل المستحقات — أعد المحاولة"
          }
          onRetry={() => void refetch()}
        />
      ) : payouts.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ReceiptText className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <p className="font-extrabold text-foreground">
              لا عمليات صرف بعد — تُنشأ تلقائيًا بعد إتمام مهامك
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              هنا ستظهر كل عمليات الصرف مع حالتها ومبلغها وتاريخها.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul
          className="max-h-96 space-y-3 overflow-y-auto pe-1"
          aria-label="سجل عمليات الصرف"
        >
          {payouts.map((p) => (
            <PayoutRow key={p.id} payout={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ═══════════════ الشاشة ═══════════════ */

export default function CourierFinanceContent() {
  const router = useRouter();

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-lg space-y-5 p-4 pb-24"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <CourierScreenHeader title="المالية والمستحقات" icon={Wallet} />
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          onClick={() => router.back()}
          aria-label="رجوع"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      <CourierBalanceCard />
      <CourierDestinationsSection />
      <CourierPayoutsSection />
    </motion.main>
  );
}
