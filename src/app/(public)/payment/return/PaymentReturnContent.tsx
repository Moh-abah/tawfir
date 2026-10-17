"use client";

/**
 * PaymentReturnContent — شاشة رجوع العميل من نموذج مويسر المدمج
 * ═══════════════════════════════════════════════════════════════
 * العقد المالي (جولة v2):
 *  - لا نثق بحالة الرابط وحدها: التحقق الحتمي يتم حصراً عبر
 *    POST /finance/orders/{id}/pay/verify (useVerifyEmbeddedPayment)
 *    والذي يبطل كاش الطلبات وتفاصيل الطلب عند النجاح تلقائياً
 *    (finance:order-payments + order-detail + orders).
 *  - البرونزية-4: مفتاح idempotency واحد لكل نية تحقق — يُولَّد مرة
 *    في useRef وتُعاد استعماله في كل الإعادات (idempotent بلا دفعات مزدوجة).
 *  - سياسة «غير مدفوعة بعد»: إعادة تلقائية حتى 3 مرات بفاصل 3 ثوانٍ
 *    بنفس المفتاح، ثم زر «تحقق مجددًا» اليدوي بنفس المفتاح.
 *  - «مدفوع سابقًا»: تُفحص دفعات الطلب قبل أي تحقق — وجود دفعة paid
 *    يعرض شاشة «مدفوع سابقًا» ويمنع أي محاولة دفع/تحقق جديدة.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Loader2,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { FinanceStatusBadge } from "@/components/finance/finance-ui";
import { useFinanceOrderPayments, useVerifyEmbeddedPayment } from "@/hooks/useFinance";
import { reuseIdempotencyKey } from "@/lib/idempotency";
import { haptic } from "@/lib/haptic";
import { useLang } from "@/lib/i18n";

/** أقصى عدد لإعادات التحقق التلقائية لحالة «غير مدفوعة بعد». */
const MAX_AUTO_RETRIES = 3;
/** الفاصل بين الإعادات التلقائية (ميلي ثانية). */
const AUTO_RETRY_DELAY_MS = 3000;

/** علامة «غير مدفوعة بعد» في رسالة الخادم — تستدعي إعادة تحقق لا فشلاً نهائياً. */
function isNotPaidYetError(message: string | undefined): boolean {
  return (message ?? "").includes("غير مدفوعة بعد");
}

export default function PaymentReturnContent() {
  const { t } = useLang();
  /* useSearchParams يتطلب حدود Suspense عند التصيير الثابت (نمط Next الرسمي) */
  return (
    <Suspense
      fallback={
        <>
          <ScreenHeader title={t("payment.returnTitle")} fallbackHref="/orders" />
          <VerifySpinner label={t("payment.returnPreparing")} />
        </>
      }
    >
      <PaymentReturnInner />
    </Suspense>
  );
}

function PaymentReturnInner() {
  const { t } = useLang();
  const params = useSearchParams();
  const orderParam = params.get("order");
  /* Moyasar يُلحق معرّف الدفع عند العودة — نقبل payment_id ثم id (نفس المعرّف) */
  const paymentIdParam = params.get("payment_id") ?? params.get("id");
  const orderId = useMemo(() => {
    const n = Number(orderParam);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
  }, [orderParam]);
  const paymentId = paymentIdParam?.trim() || null;

  /* «مدفوع سابقًا» — فحص دفعات الطلب قبل أي تحقق (يبطل معه أيضاً كاش الطلبات) */
  const paymentsQuery = useFinanceOrderPayments(orderId, orderId != null);
  const hasPaid = paymentsQuery.data?.some((p) => p.status === "paid") ?? false;

  return (
    <>
      <ScreenHeader title={t("payment.returnTitle")} fallbackHref="/orders" />
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        {!orderId || !paymentId ? (
          <MissingParamsView />
        ) : hasPaid ? (
          <SuccessView orderId={orderId} alreadyPaid />
        ) : (
          <VerifyFlow
            orderId={orderId}
            paymentId={paymentId}
            paymentsReady={!paymentsQuery.isLoading}
          />
        )}
      </div>
    </>
  );
}

/* ─── مسار التحقق الحتمي ─────────────────────────────────── */

function VerifyFlow({
  orderId,
  paymentId,
  paymentsReady,
}: {
  orderId: number;
  paymentId: string;
  paymentsReady: boolean;
}) {
  const { t } = useLang();
  const verify = useVerifyEmbeddedPayment(orderId);
  /* البرونزية-4: مفتاح واحد لكل نية تحقق — يتولد lazily عند أول محاولة.
     كل المحاولات ترسل **نفس المفتاح** حتى الإعادات (idempotent بلا دفعات مزدوجة). */
  const idempotencyKeyRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const [autoRetries, setAutoRetries] = useState(0);

  /* أول تحقق تلقائي — بعد حسم فحص «مدفوع سابقًا» (استعلام الدفعات يكمل أو يفشل) */
  useEffect(() => {
    if (!paymentsReady || startedRef.current) return;
    startedRef.current = true;
    idempotencyKeyRef.current = reuseIdempotencyKey(idempotencyKeyRef.current);
    verify.mutate({
      moyasarPaymentId: paymentId,
      idempotencyKey: idempotencyKeyRef.current,
    });
  }, [paymentsReady, paymentId, verify.mutate]);

  const notPaidYet = isNotPaidYetError(verify.error?.message);

  /* الإعادة التلقائية: «غير مدفوعة بعد» حتى 3 مرات بفاصل 3 ثوانٍ — بنفس المفتاح */
  useEffect(() => {
    if (!verify.isError || !notPaidYet) return;
    if (autoRetries >= MAX_AUTO_RETRIES) return;
    const t = setTimeout(() => {
      setAutoRetries((n) => n + 1);
      idempotencyKeyRef.current = reuseIdempotencyKey(idempotencyKeyRef.current);
      verify.mutate({
        moyasarPaymentId: paymentId,
        idempotencyKey: idempotencyKeyRef.current,
      });
    }, AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(t);
  }, [verify.isError, notPaidYet, autoRetries, paymentId, verify.mutate]);

  /* زر «تحقق مجددًا» اليدوي — يكرر التحقق بنفس المفتاح (idempotent) */
  const runVerify = () => {
    idempotencyKeyRef.current = reuseIdempotencyKey(idempotencyKeyRef.current);
    verify.mutate({
      moyasarPaymentId: paymentId,
      idempotencyKey: idempotencyKeyRef.current,
    });
  };

  /* نبضة إحساس Native عند نجاح موثق من الخادم */
  useEffect(() => {
    if (verify.data?.status === "paid") haptic("success");
  }, [verify.data]);

  /* قبل بدء التحقق (فحص الدفعات جارٍ) وأثناءه — لا شاشة بيضاء */
  if (verify.isPending || !paymentsReady) {
    return <VerifySpinner />;
  }

  /* نجاح موثق من الخادم (status=paid) */
  if (verify.data?.status === "paid") {
    return <SuccessView orderId={orderId} />;
  }

  /* استجابة HTTP ناجحة لكن الحالة ليست paid — بشارة + تحقق يدوي بنفس المفتاح */
  if (verify.data) {
    return (
      <ResultCard>
        <p className="text-sm font-bold text-foreground">
          {t("payment.gatewayStatus")}{" "}
          <FinanceStatusBadge status={verify.data.status} />
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("payment.recheckReassure")}
        </p>
        <Button
          type="button"
          onClick={runVerify}
          disabled={verify.isPending}
          className="min-h-[44px] gap-2 rounded-full"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("payment.reverify")}
        </Button>
        <OrderLinks orderId={orderId} />
      </ResultCard>
    );
  }

  if (verify.isError) {
    const status =
      typeof verify.error === "object" &&
      verify.error !== null &&
      "status" in verify.error
        ? Number((verify.error as { status?: unknown }).status)
        : null;

    /* انتهت الجلسة — الدفع تم غالباً، لكن التحقق يحتاج دخولاً */
    if (status === 401) {
      return (
        <ResultCard>
          <p className="text-sm font-bold text-foreground">
            {t("payment.sessionExpired")}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("payment.sessionExpiredBody")}
          </p>
          <Button asChild className="min-h-[44px] gap-2 rounded-full">
            <Link href={`/login?next=${encodeURIComponent(`/payment/return?order=${orderId}`)}`}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {t("common.signIn")}
            </Link>
          </Button>
        </ResultCard>
      );
    }

    /* «غير مدفوعة بعد» — البوابة لم تعتمد بعد: إعادة تلقائية ثم زر يدوي */
    if (notPaidYet) {
      const autoActive = autoRetries < MAX_AUTO_RETRIES;
      return (
        <ResultCard>
          {autoActive ? (
            <VerifySpinner label={t("payment.autoRetrying")} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground">
                {t("payment.notApproved")}
              </p>
              <Button
                type="button"
                onClick={runVerify}
                disabled={verify.isPending}
                className="min-h-[44px] gap-2 rounded-full"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("payment.reverify")}
              </Button>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("payment.notApprovedNote")}
          </p>
          <OrderLinks orderId={orderId} />
        </ResultCard>
      );
    }

    /* خطأ عقد (مطابقة مبلغ/عملة/طلب آخر) — detail كما هو + تنبيه جسيم */
    return (
      <ResultCard>
        <div
          role="alert"
          className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center"
        >
          <p className="text-sm font-extrabold text-destructive">
            {verify.error?.message || t("payment.verifyFailed")}
          </p>
        </div>
        <div className="flex w-full items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
          <p className="text-sm font-bold leading-relaxed text-accent-ink">
            {t("payment.contactSupport")}
          </p>
        </div>
        <OrderLinks orderId={orderId} />
      </ResultCard>
    );
  }

  return null;
}

/* ─── عروض مساعدة ────────────────────────────────────────── */

function VerifySpinner({ label }: { label?: string }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-foreground">
          {t("payment.verifying")}
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {label ?? t("payment.verifyingBody")}
        </p>
      </div>
    </div>
  );
}

function SuccessView({
  orderId,
  alreadyPaid = false,
}: {
  orderId: number;
  alreadyPaid?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-foreground">
          {alreadyPaid ? t("payment.alreadyPaid") : t("payment.successTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {alreadyPaid
            ? t("payment.alreadyPaidShort")
            : t("payment.thanksPreparing")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("common.orderNumber")}{" "}
          <span dir="ltr" className="font-bold tabular-nums text-foreground">
            #{orderId}
          </span>
        </p>
      </div>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <Button asChild size="lg" className="min-h-[48px] w-full rounded-full">
          <Link href={`/orders/${orderId}`}>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {t("payment.continueOrder")}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="min-h-[44px] w-full rounded-full"
        >
          <Link href="/orders">{t("nav.orders")}</Link>
        </Button>
      </div>
    </div>
  );
}

function MissingParamsView() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <LifeBuoy className="h-8 w-8 text-destructive" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-extrabold text-foreground">
          {t("payment.missingParams")}
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {t("payment.missingParamsBody")}
        </p>
      </div>
      <Button asChild size="lg" className="min-h-[44px] w-full max-w-xs rounded-full">
        <Link href="/orders">{t("payment.goToOrders")}</Link>
      </Button>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-soft">
      {children}
    </div>
  );
}

function OrderLinks({ orderId }: { orderId: number }) {
  const { t } = useLang();
  return (
    <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
      <Button asChild variant="outline" className="min-h-[44px] rounded-full">
        <Link href={`/orders/${orderId}`}>{t("payment.continueOrder")}</Link>
      </Button>
      <Button asChild variant="ghost" className="min-h-[44px] rounded-full">
        <Link href="/orders">{t("nav.orders")}</Link>
      </Button>
    </div>
  );
}
