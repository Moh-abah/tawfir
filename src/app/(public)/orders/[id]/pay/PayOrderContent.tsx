"use client";

/**
 * PayOrderContent — شاشة دفع الطلب إلكترونيًا /orders/{id}/pay
 * ═══════════════════════════════════════════════════════════════
 * بوّابة العرض (بترتيب حاسم):
 *  1. حارس الجلسة: عميل غير مسجّل → /login?next=/orders/{id}/pay.
 *  2. بوابة السوق: غير سعودي → «الدفع الإلكتروني متاح للسوق السعودي
 *     فقط» — السوق اليمني كاش ولا يرى أي نموذج دفع إطلاقاً.
 *  3. «مدفوع سابقًا»: دفعة paid موجودة → لا إعادة دفع.
 *  4. وضع البوابة: embedded=false أو mode≠embedded → «تحت الصيانة»
 *     (الدفع عند الاستلام متاح دائماً) — بلا نموذج.
 *  5. embedded → ملخص المبلغ (MoneyText بعملة الطلب SAR) + نموذج
 *     مويسر المدمج + ملاحظة أمان. المبلغ يأتي حياً من الطلب — لا
 *     أرقام تسعير في الكود (برونزية-3).
 *  6. جوال iOS + وسيلة applepay → زر Apple Pay أنيق يفتح نفس
 *     الشاشة بوضع «الورقة النظيفة» (?sf=1) داخل SFSafariViewController
 *     — متصفح داخل التطبيق (لا خروج) لأن ApplePaySession لا يعمل
 *     داخل WKWebView (docs/MOBILE-PAYMENT-DECISIONS.md — قرار 3).
 *  7. وضع الورقة (?sf=1) ← صفحة دفع نظيفة بلا غلاف — تُفتح من
 *     التطبيق فقط وتستلم معاملات النموذج علنية الطبيعة (pk/مبلغ/
 *     وسائل) — سلطة التحقق النهائية للباك إند حصراً (verify).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { MoyasarEmbeddedForm } from "@/components/finance/MoyasarEmbeddedForm";
import { MoneyText } from "@/components/finance/finance-ui";
import { useOrderDetail } from "@/hooks/useOrderDetail";
import {
  useFinanceOrderPayments,
  useLocaleMe,
  usePaymentsConfig,
} from "@/hooks/useFinance";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { isSaudiCountry, currencyFromCountry } from "@/services/locale.service";
import {
  nativeApplePayAvailable,
  openApplePaySheet,
  setApplePaySheetContext,
  useSafariSheetParams,
} from "@/lib/payment-bridge";
import { useLang } from "@/lib/i18n";

export default function PayOrderContent({ orderId }: { orderId: string }) {
  /* معرّف الطلب داخل Suspense احتياطاً (نمط الصفحات الداخلية في التطبيق).
     PayEntry نقطة الفصل: وضع الورقة النظيفة يُفحص هنا (بعد useSearchParams
     الذي يشتغل تحت Suspense بلا اختلاف ترطيب) قبل أي حارس جلسة. */
  return (
    <Suspense fallback={null}>
      <PayEntry orderId={orderId} />
    </Suspense>
  );
}

function PayEntry({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  if (searchParams.get("sf") === "1") {
    return <SafariSheetPay />;
  }
  return <PayRoute orderId={orderId} />;
}

function PayRoute({ orderId }: { orderId: string }) {
  const { t } = useLang();
  const router = useRouter();
  const { accessToken, hydrated } = useCustomerAuth();

  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);
  const loginHref = `/login?next=${encodeURIComponent(`/orders/${orderId}/pay`)}`;

  /* حارس الجلسة — بعد ترطيب التوكن فقط (لا توجيه أثناء الترطيب) */
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace(loginHref);
    }
  }, [hydrated, accessToken, router, loginHref]);

  if (!hydrated || !accessToken) {
    return (
      <>
        <ScreenHeader title={t("payment.electronic")} fallbackHref="/orders" />
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          {!hydrated ? null : (
            <p className="text-center text-sm text-muted-foreground">
              {t("payment.redirectingLogin")}
            </p>
          )}
        </div>
      </>
    );
  }

  if (numericId === null) {
    return (
      <>
        <ScreenHeader title={t("payment.electronic")} fallbackHref="/orders" />
        <ErrorState
          title={t("orders.invalidId")}
          message={t("orders.cantDetermine")}
        />
      </>
    );
  }

  return <PayInner orderId={numericId} />;
}

function PayInner({ orderId }: { orderId: number }) {
  const { t } = useLang();
  const orderQuery = useOrderDetail(orderId);
  const paymentsQuery = useFinanceOrderPayments(orderId);
  const locale = useLocaleMe(true);

  /* بوابة السوق — لا نموذج دفع قبل حسم البلد (الافتراضي غير السعودي ممنوع).
     v3.2.1: قرار تفعيل الدفع من رد الخادم نفسه (config.enabled) —
     966 → true بطرق مويسر، 967 → false نمط إشعارات. */
  const marketKnown = locale.isSuccess;
  const configQuery = usePaymentsConfig(marketKnown);

  const hasPaid = paymentsQuery.data?.some((p) => p.status === "paid") ?? false;

  /* ═══ Apple Pay على iOS (جولة الجوال v6) ═══ حالة الورقة — hooks
     في الأعلى دائماً (قواعد hooks) قبل أي عائد مبكر. */
  const [sheetState, setSheetState] = useState<"idle" | "opening">("idle");
  const [sheetError, setSheetError] = useState<string | null>(null);

  /* ── 1) بوابة السوق: تحميل/خطأ/غير سعودي ── */
  if (locale.isPending) {
    return (
      <Shell>
        <PaySkeleton />
      </Shell>
    );
  }
  if (locale.isError) {
    return (
      <Shell>
        <ErrorState
          title={t("payment.marketUnknown")}
          message={locale.error?.message || t("common.retryLater")}
          onRetry={() => locale.refetch()}
        />
      </Shell>
    );
  }
  if (!isSaudiCountry(locale.data?.country_code)) {
    return (
      <Shell>
        <GateCard
          icon={<Banknote className="h-8 w-8 text-primary" aria-hidden="true" />}
          title={t("payment.saudiOnly")}
          body={t("payment.saudiOnlyBody")}
        >
          <Button asChild className="min-h-[44px] gap-2 rounded-full">
            <Link href={`/orders/${orderId}`}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {t("payment.backToOrder")}
            </Link>
          </Button>
        </GateCard>
      </Shell>
    );
  }

  /* ── 2) فحص «مدفوع سابقًا» — ننتظر حسم الدفعات قبل أي نموذج دفع ── */
  if (paymentsQuery.isLoading) {
    return (
      <Shell>
        <PaySkeleton />
      </Shell>
    );
  }
  if (hasPaid) {
    return (
      <Shell>
        <GateCard
          icon={<CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />}
          title={t("payment.alreadyPaid")}
          body={t("payment.alreadyPaidBody")}
        >
          <Button asChild className="min-h-[44px] gap-2 rounded-full">
            <Link href={`/orders/${orderId}`}>{t("payment.continueOrder")}</Link>
          </Button>
        </GateCard>
      </Shell>
    );
  }

  /* ── 3) تفاصيل الطلب — مصدر المبلغ الحي ── */
  if (orderQuery.isPending) {
    return (
      <Shell>
        <PaySkeleton />
      </Shell>
    );
  }
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <Shell>
        <ErrorState
          title={t("payment.orderLoadFailed")}
          message={
            orderQuery.error?.message ||
            t("payment.checkConnection")
          }
          onRetry={() => orderQuery.refetch()}
        />
      </Shell>
    );
  }

  const order = orderQuery.data;
  /* عملة البوابة من رد الخادم نفسه (v3.2.1: payments/config.currency) */
  const orderCurrency = configQuery.data?.currency ?? currencyFromCountry(locale.data?.country_code);

  /* ── 4) وضع البوابة — direct أو تعطيل embedded → صيانة ── */
  if (configQuery.isPending) {
    return (
      <Shell>
        <PaySkeleton />
      </Shell>
    );
  }
  if (configQuery.isError || !configQuery.data) {
    return (
      <Shell>
        <ErrorState
          title={t("payment.configFailed")}
          message={
            configQuery.error?.message ||
            t("payment.checkConnection")
          }
          onRetry={() => configQuery.refetch()}
        />
      </Shell>
    );
  }
  const config = configQuery.data;
  const embeddedReady = config.embedded === true && config.mode === "embedded";
  /* v3.2.1 — الحرس الخادمي: العلم enabled من الرد هو الحاكم.
     967 يعيد enabled=false بنمط إشعارات → بطاقة ودودة بدل نموذج مويسر. */
  if (config.enabled === false) {
    return (
      <Shell>
        <GateCard
          icon={<Banknote className="h-8 w-8 text-primary" aria-hidden="true" />}
          title={t("payment.notInMarket")}
          body={t("payment.notInMarketBody")}
        >
          <Button asChild className="min-h-[44px] gap-2 rounded-full">
            <Link href={`/orders/${orderId}`}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {t("payment.backToOrder")}
            </Link>
          </Button>
        </GateCard>
      </Shell>
    );
  }

  /* داخل تطبيق iOS لا يتوفر ApplePaySession في الـWKWebView — يعرض
     نموذج مويسر البطاقات/STC Pay فقط، وزر Apple Pay أدناه يفتح
     نفس الشاشة بوضع الورقة النظيفة داخل SFSafariViewController
     (متصفح داخل التطبيق — المستخدم يعود بـ«تم» بلا خروج حقيقي). */
  const applePayReady = embeddedReady && nativeApplePayAvailable(config.methods);

  const handleApplePay = async () => {
    if (sheetState !== "idle") return;
    setSheetError(null);
    setSheetState("opening");
    setApplePaySheetContext({
      amountMajor: order.total,
      orderId: order.id,
      publishableKey: config.publishable_key,
      methods: config.methods,
      currency: config.currency ?? null,
    });
    const res = await openApplePaySheet(order.id);
    if (res.closed) {
      /* أُغلقت الورقة (بأي نتيجة) — الحالة الحقيقية من الخادم حصراً:
         إن تم الدفع تنقلب الشاشة لبطاقة «مدفوع سابقًا» تلقائياً. */
      setSheetState("idle");
      void paymentsQuery.refetch();
      void orderQuery.refetch();
    } else {
      setSheetState("idle");
      setSheetError(res.error ?? t("payment.sheetError"));
    }
  };

  if (!embeddedReady) {
    return (
      <Shell>
        <GateCard
          icon={<Wrench className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          title={t("payment.maintenance")}
          body={t("payment.maintenanceBody")}
        >
          <Button asChild variant="outline" className="min-h-[44px] gap-2 rounded-full">
            <Link href={`/orders/${orderId}`}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {t("payment.backToOrder")}
            </Link>
          </Button>
        </GateCard>
      </Shell>
    );
  }

  /* ── 5) النموذج المدمج — المبلغ حي من الطلب والمفتاح من الإعدادات ── */
  return (
    <Shell>
      <div className="space-y-5">
        {/* ملخص المبلغ — بيانات حية من الخادم حصراً */}
        <section
          className="rounded-2xl border border-primary/25 bg-primary/5 p-5"
          aria-label={t("payment.amountAria")}
        >
          <p className="text-sm font-bold text-muted-foreground">
            {t("payment.amountForOrder")}{" "}
            <span dir="ltr" className="tabular-nums text-foreground">
              #{order.id}
            </span>
          </p>
          <div className="mt-1 text-3xl font-black text-primary">
            <MoneyText amount={order.total} currency={orderCurrency} strong />
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{t("cart.subtotalPlain")}</span>
              <MoneyText amount={order.subtotal} currency={orderCurrency} />
            </div>
            <div className="flex items-center justify-between">
              <span>{t("cart.deliveryFeeLabel")}</span>
              <MoneyText amount={order.delivery_fee} currency={orderCurrency} />
            </div>
          </div>
          {typeof order.distance_km === "number" &&
            typeof order.billed_km === "number" &&
            typeof order.per_km_price === "number" && (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {t("orders.feeTransparency")}{" "}
                <span dir="ltr" className="tabular-nums">
                  {t("orders.kmWithVal", { km: order.distance_km })}
                </span>{" "}
                {t("orders.billedPrefix")}{" "}
                <span dir="ltr" className="tabular-nums">
                  {t("orders.billedPerKm", { km: order.billed_km, price: order.per_km_price })}
                </span>
              </p>
            )}
          {order.address_imprecise ? (
            <span className="mt-2 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {t("cart.impreciseAddress")}
            </span>
          ) : null}
        </section>

        {/* نموذج مويسر المدمج — بيانات البطاقة لا تمر عبر خوادمنا */}
        <section aria-label={t("payment.secureFormAria")}>
          {applePayReady ? (
            <div className="mb-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleApplePay()}
                disabled={sheetState !== "idle"}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-xl font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
                aria-label={t("payment.applePayAria")}
              >
                {sheetState === "opening" ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <span dir="ltr">
                    <span aria-hidden="true">&#63743;</span> Pay
                  </span>
                )}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {t("payment.applePayHint")}
              </p>
              {sheetError ? (
                <p role="alert" className="text-center text-xs font-bold text-destructive">
                  {sheetError}
                </p>
              ) : null}
            </div>
          ) : null}
          <MoyasarEmbeddedForm
            amountMajor={order.total}
            orderId={order.id}
            publishableKey={config.publishable_key}
            methods={config.methods}
            currency={config.currency ?? orderCurrency}
          />
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {t("payment.securityNote")}
          </p>
        </section>

        <Button asChild variant="outline" className="min-h-[44px] w-full gap-2 rounded-full">
          <Link href={`/orders/${orderId}`}>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {t("payment.backToOrderLink")}
          </Link>
        </Button>
      </div>
    </Shell>
  );
}

/* ─── عناصر عرض مشتركة ──────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <>
      <ScreenHeader title={t("payment.electronic")} fallbackHref="/orders" />
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6">
        {children}
      </div>
    </>
  );
}

function PaySkeleton() {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t("payment.preparing")}
      </div>
    </div>
  );
}

function GateCard({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-soft">
      {icon}
      <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {children}
    </div>
  );
}

/* ─── وضع «الورقة النظيفة» (?sf=1) — Apple Pay داخل تطبيق iOS ────── */

/**
 * SafariSheetPay — شاشة الدفع النظيفة التي تُفتح داخل
 * SFSafariViewController من زر Apple Pay في التطبيق.
 * • بلا جلسة عمداً: سياق الورقة معزول عن جلسة التطبيق — المعاملات
 *   (المبلغ/المفتاح العلني/الوسائل) تأتي من الـURL علنية الطبيعة.
 * • الأمن غير متأثر: المبلغ هنا استرشادي للنموذج فقط — التحقق
 *   النهائي (مبلغ/عملة/طلب) في الباك إند عبر pay/verify حصراً،
 *   وأي عبث يُنتج دفعة مرفوضة لا طلباً مدفوعاً.
 * • SSR/الترطيب: المعاملات تُقرأ بعد الجبل فقط (بلا اختلاف ترطيب).
 */
function SafariSheetPay() {
  const { t } = useLang();
  /* null = خادم/لم تُرطَّب أو ليس وضع ورقة — حالة محايدة مطابقة للخادم */
  const params = useSafariSheetParams();

  const ready =
    params != null &&
    params.amountMajor != null &&
    params.orderId != null &&
    params.publishableKey != null &&
    params.currency != null &&
    params.methods.length > 0;

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-md bg-background px-4 pb-10 pt-8"
    >
      <header className="mb-5 flex items-center justify-center gap-2">
        <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
        <h1 className="text-base font-extrabold text-foreground">
          {t("payment.safariTitle")}
        </h1>
      </header>

      {params === null || !ready ? (
        params != null ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center text-sm leading-relaxed text-destructive"
          >
            {t("payment.safariIncomplete")}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("payment.safariPreparing")}
          </div>
        )
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-center">
            <p className="text-xs font-bold text-muted-foreground">
              {t("payment.amountForOrder")}{" "}
              <span dir="ltr" className="tabular-nums">
                #{params.orderId}
              </span>
            </p>
            <div className="mt-1 text-2xl font-black text-primary">
              <MoneyText
                amount={params.amountMajor as number}
                currency={(params.currency ?? "SAR") as string}
                strong
              />
            </div>
          </div>
          <MoyasarEmbeddedForm
            amountMajor={params.amountMajor as number}
            orderId={params.orderId as number}
            publishableKey={params.publishableKey as string}
            methods={params.methods}
            currency={(params.currency ?? "SAR") as string}
          />
          <p className="mt-4 flex items-start justify-center gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            {t("payment.safariDoneNote")}
          </p>
        </>
      )}
    </div>
  );
}
