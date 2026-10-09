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
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** نوع عقد كائن Moyasar العالمي — الحد الأدنى الذي نستعمله فقط. */
declare global {
  interface Window {
    Moyasar?: {
      init: (cfg: Record<string, unknown>) => void;
    };
  }
}

/** سكربت النموذج المدمج الرسمي (إصدار مثبّت — CDN مويسر). */
const MOYASAR_JS_URL = "https://cdn.moyasar.com/mpay/1.7.3/moyasar.js";

/* وعد تحميل مفرد على مستوى الوحدة — السكربت يُحمّل مرة واحدة مهما تكرر التركيب.
   عند فشل CDN تُسقط الإشارة كي يسمح زر الإعادة بمحاولة تحميل جديدة. */
let moyasarScriptPromise: Promise<void> | null = null;

function loadMoyasarScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.Moyasar) return Promise.resolve();
  if (moyasarScriptPromise) return moyasarScriptPromise;

  moyasarScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MOYASAR_JS_URL}"]`
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (window.Moyasar) resolve();
      else reject(new Error("تعذّر تهيئة بوابة الدفع"));
    };
    const onError = () => {
      moyasarScriptPromise = null;
      script.remove();
      reject(new Error("تعذّر تحميل بوابة الدفع — تحقق من اتصالك بالإنترنت"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = MOYASAR_JS_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

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
      setErrorMsg("تعذّر تهيئة بوابة الدفع — أعد المحاولة");
      return;
    }

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
      methods,
      language: "ar",
    });
    setPhase("ready");
  }, [amountMajor, description, methods, orderId, publishableKey]);

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
            ? err.message
            : "تعذّر تحميل بوابة الدفع — أعد المحاولة"
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
          جارٍ تجهيز نموذج الدفع الآمن…
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
              {errorMsg || "تعذّر تحميل بوابة الدفع"}
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
            إعادة المحاولة
          </Button>
        </div>
      )}
    </div>
  );
}

export default MoyasarEmbeddedForm;
