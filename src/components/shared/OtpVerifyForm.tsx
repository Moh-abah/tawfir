"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  RotateCw,
  ArrowRight,
  MessageCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useVerifyOtp } from "@/hooks/useVerifyOtp";
import { useResendOtp } from "@/hooks/useResendOtp";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { OtpRequestOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";
import { cn } from "@/lib/utils";

/**
 * OtpVerifyForm — الجولة 20.
 *
 * شاشة التحقق المرن التسلسلي: المستخدم أدخل رقم جواله في «form» ثم انتقل
 * إلى هنا. تُظهر:
 *  - رسالة واضحة «أرسلنا كود 6 أرقام إلى رقمك عبر واتساب»
 *  - الرقم مُقنّع جزئياً (آخر 4 أرقام ظاهرة، الباقي نجوم)
 *  - InputOTP بـ 6 خانات
 *  - زر «تحقق» (يستدعي POST /otp/verify) — عند النجاح يستدعي onVerified()
 *  - زر «إعادة إرسال الكود» مع عدّاد تنازلي 60ث (يستدعي POST /otp/resend)
 *  - زر «رجوع» يستدعي onBack()
 *  - في وضع التطوير: إذا كان الرد يحمل dev_code نُظهره في صندوق muted
 *    «كود الاختبار: XXXX» — هذا الحقل غائب في الإنتاج.
 *  - أخطاء الخادم (422 «الكود غير صحيح. محاولات متبقية: N» أو
 *    «يرجى الانتظار N ثانية») تُعرض داخل النموذج بلا toast.
 */

const RESEND_COOLDOWN_SEC = 60;

/** قناع جزئي للرقم: 77******67 — يُظهر آخر 4 أرقام فقط. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  const head = digits.slice(0, 2);
  const tail = digits.slice(-2);
  const stars = "*".repeat(digits.length - 4);
  return `${head}${stars}${tail}`;
}

export interface OtpVerifyFormProps {
  /** رقم الجوال المُتحقق منه (يُظهر مُقنّعاً). */
  target: string;
  /** اسم المستخدم (اختياري — يُمرّر في طلب إعادة الإرسال). */
  name?: string | null;
  /** نتيجة الطلب الأولي POST /otp/request (لها dev_code المحتمل). */
  initialResult?: OtpRequestOut | null;
  /** يُستدعى عند نجاح التحقق (يُنتقل لمرحلة إنشاء الحساب). */
  onVerified: () => void;
  /** يُستدعى عند الضغط على «رجوع» (يعود لمرحلة form). */
  onBack: () => void;
  className?: string;
}

export function OtpVerifyForm({
  target,
  name,
  initialResult,
  onVerified,
  onBack,
  className,
}: OtpVerifyFormProps) {
  const { toast } = useToast();
  const prefersReduced = usePrefersReducedMotion();
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(
    initialResult?.dev_code ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SEC);

  const verifyMutation = useVerifyOtp();
  const resendMutation = useResendOtp();

  /* العدّاد التنازلي لإعادة الإرسال — يبدأ فور التركيب. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (prefersReduced) {
      /* في وضع تقليل الحركة لا نُفعّل العدّاد المرئي — لكن المنطق يبقى
         لتعطيل الزر فترة معقولة. نُبقي العدّاد داخلياً بصمت. */
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [prefersReduced]);

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      setError("أدخل كود 6 أرقام كامل");
      return;
    }
    setError(null);
    verifyMutation.mutate(
      { target, code },
      {
        onSuccess: (data) => {
          if (data.verified) {
            toast({
              title: "تم التحقق من الرقم",
              description: "جارٍ إنشاء حسابك...",
            });
            onVerified();
          } else {
            setError("تعذّر التحقق من الكود");
          }
        },
        onError: (err: ApiError) => {
          setError(err.message || "الكود غير صحيح");
        },
      }
    );
  };

  const handleResend = () => {
    setError(null);
    resendMutation.mutate(
      { target, name: name ?? undefined },
      {
        onSuccess: (data) => {
          setCode("");
          setDevCode(data.dev_code ?? null);
          setSecondsLeft(RESEND_COOLDOWN_SEC);
          toast({
            title: "تم إعادة إرسال الكود",
            description: data.detail || "أرسلنا كوداً جديداً إلى رقمك",
          });
        },
        onError: (err: ApiError) => {
          /* 422 من cooldown: نُظهر الرسالة داخل النموذج + نُحدّث العدّاد
             إن استطعنا استخراج الثواني من النص. */
          setError(err.message || "تعذّر إعادة الإرسال");
          const match = /(\d+)\s*ثانية/.exec(err.message || "");
          if (match) {
            const secs = parseInt(match[1], 10);
            if (secs > secondsLeft) setSecondsLeft(secs);
          }
        },
      }
    );
  };

  const maskedPhone = useMemo(() => maskPhone(target), [target]);
  const canResend = secondsLeft === 0 && !resendMutation.isPending;
  const canVerify = code.length === 6 && !verifyMutation.isPending;

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("mx-auto w-full max-w-md", className)}
    >
      <Card className="rounded-2xl border-border/60 shadow-soft-lg">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                background:
                  "color-mix(in srgb, var(--logo-emerald) 18%, transparent)",
                color: "var(--logo-emerald)",
              }}
            >
              <MessageCircle className="h-7 w-7" aria-hidden="true" />
            </span>
          </div>
          <CardTitle className="text-xl">تأكيد رقم الجوال</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            أرسلنا كود 6 أرقام إلى رقمك عبر واتساب
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* الرقم المقنّع */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">رقمك المُسجّل</p>
            <p
              dir="ltr"
              className="mt-1 text-base font-bold tabular-nums text-foreground"
            >
              {maskedPhone}
            </p>
          </div>

          {/* صندوق كود الاختبار — يظهر فقط في وضع التطوير */}
          {devCode && (
            <div
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--logo-gold) 40%, transparent)",
                background:
                  "color-mix(in srgb, var(--logo-gold) 6%, transparent)",
                color: "var(--logo-gold)",
              }}
              role="status"
              aria-live="polite"
            >
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                كود الاختبار:{" "}
                <span
                  dir="ltr"
                  className="font-bold tracking-[0.18em] tabular-nums"
                >
                  {devCode}
                </span>
              </span>
            </div>
          )}

          {/* حقل OTP */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                value={code}
                onChange={(val) => {
                  setCode(val);
                  if (error) setError(null);
                }}
                maxLength={6}
                autoFocus
                dir="ltr"
                disabled={verifyMutation.isPending}
                aria-label="كود التحقق المكوّن من 6 أرقام"
                containerClassName="justify-center"
              >
                <InputOTPGroup
                  className="gap-2 sm:gap-3"
                  style={
                    {
                      "--slot-size": "3rem",
                    } as CSSProperties
                  }
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* رسالة الخطأ من الخادم */}
            {error && (
              <p
                className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            {/* زر التحقق */}
            <Button
              type="submit"
              className="min-h-[48px] w-full gap-2 rounded-full text-base font-bold"
              disabled={!canVerify}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  تحقق
                </>
              )}
            </Button>
          </form>

          {/* إعادة الإرسال + الرجوع */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={!canResend}
              className="min-h-[44px] w-full gap-2 rounded-full"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  جارٍ الإرسال...
                </>
              ) : secondsLeft > 0 ? (
                <>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  إعادة الإرسال بعد {secondsLeft} ث
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  إعادة إرسال الكود
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={verifyMutation.isPending || resendMutation.isPending}
              className="min-h-[44px] w-full gap-1 rounded-full text-muted-foreground"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              رجوع لتعديل البيانات
            </Button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            لم يصلك الكود؟ تأكد من رقمك أعلاه وانتظر دقيقة قبل إعادة الإرسال.
            الكود صالح لمدة 5 دقائق.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
