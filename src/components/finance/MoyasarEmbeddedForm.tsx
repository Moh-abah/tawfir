"use client";

/**
 * MoyasarEmbeddedForm — النموذج المدمج لبوابة مويسر (جولة المالية v2)
 * ═══════════════════════════════════════════════════════════════
 * القواعد المالية الملزمة هنا:
 *  - لا حقول بطاقة يدوية إطلاقاً (رقم/تاريخ/CVC ممنوعة) — نموذج مويسر
 *    المستضاف (iframe) يتولى إدخال البطاقة ويتواصل مع api.moyasar.com
 *    مباشرة من عنده؛ كودنا لا يلمس بيانات البطاقة ولا يستضيفها.
 *  - المبلغ يُحوَّل هللات (×100) حصراً عند التمرير لمويسر — الوحدة
 *    الموثقة في openapi v2 §7.1 (114 SAR = 11400 halalas).
 *  - callback_url يعود إلى /payment/return?order={orderId} حيث يُتحقق
 *    حتمياً من الدفعة عبر POST /finance/orders/{id}/pay/verify.
 *  - publishable_api_key يأتي حياً من GET /finance/payments/config —
 *    لا مفتاح مكتوب في الكود.
 *  - مصدر السكربت: حزمة moyasar-payment-form الرسمية عبر jsDelivr
 *    (عقد docs.moyasar.com الحالي — Basic Integration). مويسر أوقفت
 *    مسارها القديم cdn.moyasar.com/mpay/* بالكامل (S3 AccessDenied
 *    لكل الإصدارات) وكان تثبيت 1.7.3 القديم سبب «فشل تحميل بوابة
 *    الدفع» لدى العملاء.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/** نوع عقد كائن Moyasar العالمي — الحد الأدنى الذي نستعمله فقط. */
declare global {
  interface Window {
    Moyasar?: {
      init: (cfg: Record<string, unknown>) => void;
    };
  }
}

/* ═══ مصادر الحزمة الرسمية بالترتيب (v2.3.0 المثبّتة ثم نطاق 2.x احتياطاً) ═══
   jsDelivr يخدمها بلا حجب جغرافي وبكاش immutable — وأي فشل (شبكة أو
   محتوى غير سكربتي) ينزل تلقائياً للمرشح التالي قبل إعلان الخطأ. */
const MOYASAR_JS_URLS = [
  "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.umd.min.js",
  "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2/dist/moyasar.umd.min.js",
] as const;

/* أنماط النموذج الرسمية — الحزمة الجديدة لا تضيف أنماطها بنفسها
   (عكس mpay القديم) فيلزم ربط moyasar.css صراحة. الربط جهد أفضل:
   فشلها تدهور عرضي فقط ولا يمنع الدفع فلا نعلن خطأً للعميل بسببها. */
const MOYASAR_CSS_URLS = [
  "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.3.0/dist/moyasar.css",
  "https://cdn.jsdelivr.net/npm/moyasar-payment-form@2/dist/moyasar.css",
] as const;

/* ربط الأنماط مرة واحدة على مستوى الوحدة */
let moyasarCssInjected = false;

function injectMoyasarCss(): void {
  if (typeof document === "undefined" || moyasarCssInjected) return;
  for (const href of MOYASAR_CSS_URLS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  moyasarCssInjected = true;
}

/** تحميل مرشح واحد — لا ينجح إلا إذا ظهر الكائن العالمي Moyasar فعلاً.
    بعض مزودات الكاش تعيد صفحة خطأ (XML/HTML) بحالة 200 فحدث load
    ينطلق بلا مكتبة — الحكم النهائي على الكائن العالمي لا على الحدث. */
function tryLoadScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const cleanup = () => script.remove();
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        if (window.Moyasar) resolve();
        else {
          cleanup();
          reject(new Error("bad-payload"));
        }
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("network"));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });
}

/* وعد تحميل مفرد على مستوى الوحدة — السكربت يُحمّل مرة واحدة مهما
   تكرر التركيب. عند فشل كل المرشحين تُسقط الإشارة كي يسمح زر
   الإعادة بمحاولة جديدة من أولها. */
let moyasarScriptPromise: Promise<void> | null = null;

function loadMoyasarScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.Moyasar) return Promise.resolve();
  if (moyasarScriptPromise) return moyasarScriptPromise;

  injectMoyasarCss();

  moyasarScriptPromise = (async () => {
    for (const src of MOYASAR_JS_URLS) {
      try {
        await tryLoadScript(src);
        return;
      } catch {
        /* ننتقل للمرشح التالي */
      }
    }
    moyasarScriptPromise = null;
    /* نص الحالة يُترجم عند العرض (payment.gatewayLoadFailed) — المصادر
       والمنطق لا يُلمسان (عقد مويسر 40-c) */
    throw new Error("payment.gatewayLoadFailed");
  })();

  return moyasarScriptPromise;
}

export interface MoyasarEmbeddedFormProps {
  /** المبلغ بالوحدة الكبرى — يُحوَّل هللات داخلياً (×100). */
  amountMajor: number;
  orderId: number;
  /** المفتاح العام الحي من /finance/payments/config — لا قيم ميتة. */
  publishableKey: string;
  /** وسائل الدفع المسموحة من الخادم (credit | applepay | ...). */
  methods: string[];
  /** عملة البوابة من /finance/payments/config (v3.2.1 — بلا ثابت). */
  currency: string;
  /** وصف الدفعة الظاهر في لوحة مويسر. */
  description?: string;
}

type FormPhase = "loading" | "ready" | "error";

export function MoyasarEmbeddedForm(props: MoyasarEmbeddedFormProps) {
  /* عدّاد المحاولات — الإعادة تعيد تركيب الباني الداخلي بحالة نظيفة
     (بداية "loading") بدل إعادة ضبط الحالة داخل تأثير */
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  return <MoyasarFormInner key={attempt} {...props} onRetry={retry} />;
}

function MoyasarFormInner({
  amountMajor,
  orderId,
  publishableKey,
  methods,
  currency,
  description,
  onRetry,
}: MoyasarEmbeddedFormProps & { onRetry: () => void }) {
  const { t, lang } = useLang();
  /* الحالة البدائية "loading" — كل التغييرات تحدث من ردود نداءات غير متزامنة */
  const [phase, setPhase] = useState<FormPhase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const buildForm = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    /* تنظيف أي بناء سابق قبل إعادة init (تفادي iframe مكرر) */
    container.replaceChildren();

    if (!window.Moyasar) {
      setPhase("error");
      setErrorMsg(t("payment.formInitFailed"));
      return;
    }

    /* حزمة مويسر v2 صارمة: وجود applepay في methods دون تكوين Apple
       Pay يرمي «Apple Pay configuration is required» ويمنع رسم النموذج
       كله. أبل باي في توفير مسارها الخاص حصراً (زر الدفع داخل التطبيق
       عبر SFSafariViewController — docs/MOBILE-PAYMENT-DECISIONS.md قرار
       3) لا النموذج المدمج، وللخادم لا تكوين أبل باي يُمرَّر للنموذج —
       فلنمرر للنموذج وسائل الدفع ما يدعمه بلا تكوين إضافي. */
    const embeddedMethods = methods.filter((m) => m !== "applepay");

    window.Moyasar.init({
      element: ".mysr-form",
      /* هللات: الوحدة الموثقة لمويسر — تقريب آمن للأعداد الصحيحة */
      amount: Math.round(amountMajor * 100),
      currency,
      description: description ?? `توفير — طلب رقم ${orderId}`,
      publishable_api_key: publishableKey,
      /* العودة إلى شاشة التحقق الحتمي بعد إتمام النموذج */
      callback_url:
        window.location.origin + `/payment/return?order=${orderId}`,
      methods: embeddedMethods.length > 0 ? embeddedMethods : ["creditcard"],
      /* لغة النموذج تتبع لغة التطبيق (ar/en) — العقد نفسه بلا تغيير */
      language: lang === "en" ? "en" : "ar",
    });
    setPhase("ready");
  }, [amountMajor, description, lang, methods, orderId, publishableKey]);

  useEffect(() => {
    let cancelled = false;

    loadMoyasarScript()
      .then(() => {
        if (!cancelled) buildForm();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(
          err instanceof Error
            ? t(err.message)
            : t("payment.gatewayRetry")
        );
        setPhase("error");
      });

    return () => {
      cancelled = true;
    };
  }, [buildForm]);

  return (
    <div className="space-y-3">
      {/* حاوية النموذج المدمج — LTR لأن حقول البطاقة اتجاهها لاتيني */}
      <div
        ref={containerRef}
        className="mysr-form min-h-[80px] overflow-hidden rounded-xl border border-border/60 bg-card px-1 py-2"
        dir="ltr"
        aria-busy={phase === "loading"}
      />

      {phase === "loading" && (
        <p className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("payment.formPreparing")}
        </p>
      )}

      {phase === "error" && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center"
        >
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed">
              {errorMsg || t("payment.gatewayFailed")}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="min-h-[44px] gap-2 rounded-full"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("common.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MoyasarEmbeddedForm;
