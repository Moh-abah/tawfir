"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Hourglass,
  Home,
  Info,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  RotateCw,
  ShieldCheck,
  Store,
  UploadCloud,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { ImageUrlField } from "@/components/shared/ImageUrlField";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { WorkingHoursSelector } from "@/components/shared/WorkingHoursSelector";
import {
  StoreLocationPicker,
  type StoreLocation,
} from "@/components/shared/StoreLocationPicker";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useOwnerRegister, parseRegisterError } from "@/hooks/useOwnerRegister";
import { useRequestOtp } from "@/hooks/useRequestOtp";
import { useVerifyOtp } from "@/hooks/useVerifyOtp";
import { useResendOtp } from "@/hooks/useResendOtp";
import type {
  OwnerRegisterInput,
  OwnerRegisterResult,
} from "@/services/owner.service";
import type { ApiError } from "@/services/api-client";
import { useRegions } from "@/hooks/useRegions";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { normalizeYemeniPhone, validateYemeniPhone } from "@/lib/yemen";
import type { FacilityType, OtpRequestOut } from "@/types/api.generated";

/* ════════════════════════════════════════════════════════════════ */
/*  ثوابت المرحلة                                                    */
/* ════════════════════════════════════════════════════════════════ */

/**
 * مفتاح sessionStorage لموقع المتجر المعلّق: الباك اند الحالي لا يقبل
 * latitude/longitude في POST /owner/register — نحفظ الإحداثيات محلياً
 * {lat, lng, source, label} بعد نجاح التسجيل، وتلتقطها صفحة إدارة
 * المتجر عند أول تسجيل دخول لترفعها عبر PUT /owner/facility/{id}.
 */
const PENDING_LOCATION_KEY = "tawfir_owner_pending_location";

/** رسالة خطأ الجوال اليمني الموحّدة (التحقق عبر validateYemeniPhone). */
const PHONE_MSG = "أدخل رقم جوال يمني صحيح (مثال: 777 123 456)";

/* ════════════════════════════════════════════════════════════════ */
/*  مخطط التحقق — عربي كامل (يمني — لا سعودي)                        */
/* ════════════════════════════════════════════════════════════════ */

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    email: z
      .string()
      .min(1, { message: "البريد الإلكتروني مطلوب" })
      .email({ message: "صيغة البريد الإلكتروني غير صحيحة" }),
    /* الجوال: PhoneInput (2-a) يبث دائماً القيمة المطبّعة، والتحقق عبر
       validateYemeniPhone — يقبل ما كتبه المستخدم بمسافات ثم يُطبَّع */
    phone: z.string().refine((v) => validateYemeniPhone(v) === null, {
      message: PHONE_MSG,
    }),
    password: z
      .string()
      .min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
    password_confirm: z
      .string()
      .min(1, { message: "تأكيد كلمة المرور مطلوب" }),
    facility_name: z
      .string()
      .min(2, { message: "اسم المتجر يجب أن يكون حرفين على الأقل" }),
    facility_type: z.enum(["restaurant", "cafe"], {
      message: "اختر نوع المتجر",
    }),
    region_id: z.number().positive({ message: "اختر منطقة المتجر" }),
    description: z.string().trim().optional(),
    /* العنوان إلزامي الآن — طلب المالك مباشرة */
    address: z
      .string()
      .trim()
      .min(3, { message: "العنوان مطلوب (٣ أحرف على الأقل)" }),
    phone_facility: z
      .string()
      .refine((v) => !v || validateYemeniPhone(v) === null, {
        message: PHONE_MSG,
      }),
    working_hours: z.string().trim().optional(),
    image_url: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^https?:\/\/.+/u.test(v), {
        message: "أدخل رابطاً صالحاً يبدأ بـ http",
      }),
    discount_rate: z
      .number()
      .int()
      .min(10, { message: "النسبة يجب أن تكون 10 على الأقل" })
      .max(30, { message: "النسبة يجب أن تكون 30 على الأكثر" }),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["password_confirm"],
  });

type FormValues = z.infer<typeof registerSchema>;

/* ════════════════════════════════════════════════════════════════ */
/*  أنماط أزرار نوع المتجر — مطاعم وكافتيريات فقط                     */
/* ════════════════════════════════════════════════════════════════ */
const TYPE_CIRCLES: Record<FacilityType, { active: string; idle: string }> = {
  restaurant: {
    active: "bg-cat-restaurant text-white shadow-soft",
    idle: "bg-cat-restaurant-soft text-cat-restaurant",
  },
  cafe: {
    active: "bg-cat-cafe text-white shadow-soft",
    idle: "bg-cat-cafe-soft text-cat-cafe",
  },
};

const FACILITY_TYPES: ReadonlyArray<{ key: FacilityType; icon: LucideIcon }> = [
  { key: "restaurant", icon: TYPE_ICON.restaurant },
  { key: "cafe", icon: TYPE_ICON.cafe },
];

/* ════════════════════════════════════════════════════════════════ */
/*  مكوّنات مساعدة                                                   */
/* ════════════════════════════════════════════════════════════════ */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/* ─── مؤشر الخطوات (١ بيانات الحساب ← ٢ بيانات المتجر) ─────────── */

function StepPill({
  index,
  label,
  done,
}: {
  index: string;
  label: string;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors",
        done
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      )}
      aria-current={done ? "step" : undefined}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{index}</span>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

/** مؤشر حي يكتمل مع تعبئة الحقول — يُشترك في القيم عبر useWatch فقط. */
function StepsIndicator({ control }: { control: Control<FormValues> }) {
  const [fullName, email, phone, password, passwordConfirm] = useWatch({
    control,
    name: ["full_name", "email", "phone", "password", "password_confirm"],
  });
  const [facilityName, facilityType, regionId, address] = useWatch({
    control,
    name: ["facility_name", "facility_type", "region_id", "address"],
  });

  const step1Done =
    (fullName ?? "").trim().length >= 2 &&
    (email ?? "").trim().length > 0 &&
    validateYemeniPhone(phone ?? "") === null &&
    (password ?? "").length >= 6 &&
    password === passwordConfirm;
  const step2Done =
    (facilityName ?? "").trim().length >= 2 &&
    !!facilityType &&
    !!regionId &&
    (address ?? "").trim().length >= 3;

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="مؤشر خطوات التسجيل"
    >
      <StepPill index="١" label="بيانات الحساب" done={step1Done} />
      <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
      <StepPill index="٢" label="بيانات المتجر" done={step2Done} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  شاشة OTP لتاجر — قبل إتمام التسجيل                               */
/* ════════════════════════════════════════════════════════════════ */

/** قناع جزئي للرقم: 77*****67 — يُظهر آخر خانتين وأول خانتين فقط. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  return `${digits.slice(0, 2)}${"*".repeat(digits.length - 4)}${digits.slice(-2)}`;
}

interface OwnerOtpScreenProps {
  /** الجوال المُرسل إليه الكود (مطبّع "777123456"). */
  target: string;
  /** اسم التاجر — يُمرّر في طلب إعادة الإرسال. */
  name?: string | null;
  /** رد POST /otp/request الأولي (ttl_seconds + dev_code الاختباري). */
  initialResult: OtpRequestOut | null;
  /** عند نجاح التحقق — ننفّذ تسجيل المتجر الفعلي. */
  onVerified: () => void;
  /** الرجوع للنموذج (تغيير الرقم/البيانات) — القيم محفوظة كما هي. */
  onBack: () => void;
}

function OwnerOtpScreen({
  target,
  name,
  initialResult,
  onVerified,
  onBack,
}: OwnerOtpScreenProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* كود الاختبار — يظهر فقط في وضع التطوير (null في الإنتاج) */
  const [devCode, setDevCode] = useState<string | null>(
    initialResult?.dev_code ?? null
  );

  const verifyMutation = useVerifyOtp();
  const resendMutation = useResendOtp();

  /* العدّاد التنازلي لإعادة الإرسال: من ttl_seconds في الرد مقيّداً
     بحد 60 ثانية (فترة الانتظار الفعلية على الخادم) — أو 60 افتراضاً */
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const ttl = initialResult?.ttl_seconds ?? 0;
    return ttl > 0 ? Math.min(ttl, 60) : 60;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) {
      setError("أدخل كود التحقق المكوّن من 6 أرقام كاملاً");
      return;
    }
    setError(null);
    verifyMutation.mutate(
      { target, code },
      {
        onSuccess: (data) => {
          if (data.verified) {
            onVerified();
          } else {
            setError("كود التحقق غير صحيح — أعد المحاولة");
          }
        },
        onError: (err: ApiError) => {
          /* 422 عربي من الخادم: «الكود غير صحيح. محاولات متبقية: N» */
          setError(err.message || "كود التحقق غير صحيح");
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
          const ttl = data.ttl_seconds ?? 0;
          setSecondsLeft(ttl > 0 ? Math.min(ttl, 60) : 60);
        },
        onError: (err: ApiError) => {
          /* 422 من cooldown: نُحدّث العدّاد من نص «يرجى الانتظار N ثانية» */
          setError(err.message || "تعذّر إعادة إرسال الكود");
          const match = /(\d+)\s*ثانية/.exec(err.message || "");
          if (match) {
            const secs = parseInt(match[1], 10);
            if (secs > secondsLeft) setSecondsLeft(secs);
          }
        },
      }
    );
  };

  const maskedPhone = maskPhone(target);
  const validityMinutes = Math.max(
    1,
    Math.round((initialResult?.ttl_seconds || 300) / 60)
  );
  const canResend = secondsLeft === 0 && !resendMutation.isPending;
  const canVerify = code.length === 6 && !verifyMutation.isPending;

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 20, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative z-10 my-4 w-full max-w-md"
    >
      <Card className="login-card-shimmer border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
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
          <CardTitle>تأكيد رقم جوال التاجر</CardTitle>
          <CardDescription className="leading-relaxed">
            أرسلنا كود تحقق من 6 أرقام إلى جوالك عبر واتساب — أكمل التحقق
            لإرسال طلب تسجيل متجرك
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* الرقم المقنّع */}
          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              رقم الجوال المُرسل إليه الكود
            </p>
            <p
              dir="ltr"
              className="mt-1 text-base font-bold tabular-nums text-foreground"
            >
              {maskedPhone}
            </p>
          </div>

          {/* كود الاختبار — وضع التطوير فقط (غائب في الإنتاج) */}
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
                <InputOTPGroup className="gap-2 sm:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-10 text-lg font-bold sm:h-14 sm:w-12"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p
                className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="min-h-[48px] w-full gap-2 rounded-full text-base font-bold"
              disabled={!canVerify}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  تأكيد الكود وإتمام التسجيل
                </>
              )}
            </Button>
          </form>

          {/* إعادة الإرسال + تغيير الرقم */}
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
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  جارٍ إعادة الإرسال...
                </>
              ) : secondsLeft > 0 ? (
                <>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  إعادة إرسال الكود بعد {secondsLeft} ث
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
              تغيير الرقم أو تعديل البيانات
            </Button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            لم يصلك الكود؟ تأكد من رقمك أعلاه وانتظر دقيقة قبل إعادة الإرسال —
            الكود صالح لمدة {validityMinutes}{" "}
            {validityMinutes === 1 ? "دقيقة" : "دقائق"}.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  غطاء «جارٍ إرسال طلب التسجيل» — بعد نجاح التحقق مباشرة            */
/* ════════════════════════════════════════════════════════════════ */
function CreatingRequestOverlay() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.2 }}
      className="relative z-10 my-4 w-full max-w-md text-center"
    >
      <Card className="login-card-shimmer border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--logo-emerald) 18%, transparent)",
              color: "var(--logo-emerald)",
            }}
          >
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-extrabold text-foreground">
            جارٍ إرسال طلب التسجيل...
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            تحقّقنا من رقم جوالك بنجاح — نُنشئ حسابك ومتجرك الآن ونرسل الطلب
            للإدارة للمراجعة.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  شاشة النجاح — «بانتظار موافقة المشرف»                            */
/* ════════════════════════════════════════════════════════════════ */
function SuccessScreen({
  result,
  hasPendingLocation,
}: {
  result: OwnerRegisterResult;
  hasPendingLocation: boolean;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 20, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative z-10 w-full max-w-md space-y-6 text-center"
    >
      <Card className="rounded-2xl border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
        <CardContent className="flex flex-col items-center gap-5 p-8 sm:p-10">
          <motion.span
            initial={prefersReduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 18,
              delay: 0.15,
            }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15"
          >
            <Hourglass
              className="h-10 w-10 text-accent-ink"
              aria-hidden="true"
            />
          </motion.span>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-foreground">
              بانتظار موافقة المشرف
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تم استلام طلب تسجيل متجرك بنجاح وحالته الآن:{" "}
              <span className="font-bold text-foreground">{result.status}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              سجّل دخولك لمتابعة حالة المتجر ومراجعة طلباته عند الموافقة
            </p>
          </div>

          {/* ملاحظة موقع المتجر المعلّق — محفوظ محلياً حتى أول تسجيل دخول */}
          {hasPendingLocation && (
            <p
              role="status"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-medium leading-relaxed"
              style={{
                background:
                  "color-mix(in srgb, var(--logo-emerald) 10%, transparent)",
                color: "var(--logo-emerald)",
              }}
            >
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              تم استلام موقع متجرك المحدد — سيُحفظ مع بيانات متجرك تلقائياً
              عند أول تسجيل دخول
            </p>
          )}

          <div className="flex w-full flex-col gap-3">
            <Button asChild className="min-h-[44px] w-full gap-2 rounded-full">
              <Link href="/owner/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                تسجيل الدخول
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] w-full gap-2 rounded-full"
            >
              <Link href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                الرئيسية
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/*  الصفحة                                                           */
/* ════════════════════════════════════════════════════════════════ */
export default function OwnerRegisterPage() {
  const prefersReduced = usePrefersReducedMotion();
  const register = useOwnerRegister();
  const requestOtp = useRequestOtp();

  const [successResult, setSuccessResult] =
    useState<OwnerRegisterResult | null>(null);
  /* مرحلة OTP: null = النموذج · {target,result} = شاشة التحقق */
  const [otpStage, setOtpStage] = useState<{
    target: string;
    result: OtpRequestOut | null;
  } | null>(null);
  const [serverGeneralError, setServerGeneralError] = useState<string | null>(
    null
  );
  /* موقع المتجر (GPS/خريطة) — لا يُرسل مع التسجيل (الباك اند لا يقبل)،
     يُحفظ في sessionStorage بعد النجاح لترفعه إدارة المتجر لاحقاً */
  const [location, setLocation] = useState<StoreLocation | null>(null);
  const [pendingLocationSaved, setPendingLocationSaved] = useState(false);
  /* رفع الصور يتطلب توكناً (401 قبل وجود حساب) → بطاقة توجيه + رابط */
  const [uploadNeedsAuth, setUploadNeedsAuth] = useState(false);

  /* قائمة المناطق — عبر useRegions (يشارك الكاش عبر المفتاح الموحّد) */
  const { data: regions, isLoading: regionsLoading } = useRegions(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
      facility_name: "",
      facility_type: undefined,
      region_id: undefined,
      description: "",
      address: "",
      phone_facility: "",
      working_hours: "",
      image_url: "",
      discount_rate: 30,
    },
  });
  const { register: registerField, handleSubmit, control, formState } = form;

  const isBusy = register.isPending || requestOtp.isPending;

  /* ─── 1) إرسال النموذج → طلب كود OTP (قبل إنشاء المتجر) ─────── */
  function onSubmit(values: FormValues) {
    setServerGeneralError(null);
    /* الجوال المطبّع "777123456" — هكذا يتوقعه /otp/request والباك اند */
    const target = normalizeYemeniPhone(values.phone);
    requestOtp.mutate(
      { target, name: values.full_name.trim() || null },
      {
        onSuccess: (res) => {
          setOtpStage({ target, result: res });
        },
        onError: (err: ApiError) => {
          setServerGeneralError(
            `تعذّر إرسال كود التحقق إلى جوالك: ${err.message || "حاول مجدداً بعد قليل"}`
          );
        },
      }
    );
  }

  /* ─── 2) نجاح التحقق → تسجيل المتجر الفعلي عندئذٍ فقط ────────── */
  function handleVerified() {
    if (!otpStage) return;
    /* القيم محفوظة في react-hook-form رغم إخفاء النموذج أثناء OTP */
    const values = form.getValues();
    const payload: OwnerRegisterInput = {
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      /* يُرسل دائماً مطبّعاً "777123456" (بلا +967 ولا مسافات) */
      phone: normalizeYemeniPhone(values.phone) || values.phone,
      password: values.password,
      password_confirm: values.password_confirm,
      facility_name: values.facility_name.trim(),
      facility_type: values.facility_type,
      region_id: values.region_id,
      description: values.description?.trim() || null,
      /* العنوان إلزامي — نص مقصوص دائماً وليس null */
      address: values.address.trim(),
      phone_facility: values.phone_facility
        ? normalizeYemeniPhone(values.phone_facility) || null
        : null,
      working_hours: values.working_hours?.trim() || null,
      image_url: values.image_url?.trim() || null,
      discount_rate: values.discount_rate,
    };
    register.mutate(payload, {
      onSuccess: (result) => {
        persistPendingLocation();
        setSuccessResult(result);
        setOtpStage(null);
      },
      onError: (error) => {
        const parsed = parseRegisterError(error);
        for (const [fieldName, message] of Object.entries(parsed.fields)) {
          form.setError(fieldName as keyof FormValues, { message });
        }
        setServerGeneralError(parsed.general);
        /* العودة للنموذج لتصحيح أخطاء الخادم (القيم محفوظة) */
        setOtpStage(null);
      },
    });
  }

  /* حفظ الإحداثيات محلياً — ترتفع للباك اند لاحقاً بعد أول تسجيل دخول */
  function persistPendingLocation() {
    if (!location || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        PENDING_LOCATION_KEY,
        JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          source: location.source,
          label: location.label ?? null,
        })
      );
      setPendingLocationSaved(true);
    } catch {
      /* تخزين معطّل/وضع خاص — نتجاهل بصمت */
    }
  }

  /* رصد فشل الرفع بسبب المصادقة (401/توكن/bearer) من ImageUploader */
  const handleUploadError = useCallback((message: string) => {
    if (/401|توكن|bearer/i.test(message)) {
      setUploadNeedsAuth(true);
    }
  }, []);

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 24, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };

  /* ─── شاشة النجاح تحل محل النموذج — لا توجيه تلقائي ─── */
  if (successResult) {
    return (
      <AuthShell backHref="/owner/login">
        <SuccessScreen
          result={successResult}
          hasPendingLocation={pendingLocationSaved}
        />
      </AuthShell>
    );
  }

  /* ─── مرحلة OTP: التحقق من جوال التاجر قبل إنشاء المتجر ─── */
  if (otpStage) {
    if (register.isPending) {
      return (
        <AuthShell backHref="/owner/login">
          <CreatingRequestOverlay />
        </AuthShell>
      );
    }
    return (
      <AuthShell backHref="/owner/login">
        <OwnerOtpScreen
          target={otpStage.target}
          name={form.getValues("full_name")}
          initialResult={otpStage.result}
          onVerified={handleVerified}
          onBack={() => setOtpStage(null)}
        />
      </AuthShell>
    );
  }

  /* ✦ الجلد 2-b: قشرة AuthShell الموحّدة — كحلي غامر + هالات زمردية/ذهبية
     + الشعار الكامل المقصوص variant=full + تاغلاين «وفّر أكثر.. عِش أجمل» */
  return (
    <AuthShell backHref="/owner/login">
      <div className="relative z-10 my-4 w-full max-w-md space-y-6">
        {/* زر تثبيت تطبيق المالك — يعمل على صفحة التسجيل أيضاً */}
        <PWAInstallButton portal="owner" variant="full" />

        {/* النموذج */}
        <motion.div
          {...cardAnimation}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <Card className="login-card-shimmer border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center">
              <CardTitle>تسجيل متجر جديد</CardTitle>
              <CardDescription>
                أنشئ حساب مالك وأضف متجرك — تُراجع الإدارة طلبك قبل الظهور
                للعملاء
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* مؤشر الخطوات — ١ بيانات الحساب ← ٢ بيانات المتجر */}
              <div className="mb-6">
                <StepsIndicator control={control} />
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                {/* ─── القسم أ: بيانات الحساب ─── */}
                <div className="space-y-4">
                  <SectionTitle
                    icon={UserRound}
                    title="بيانات الحساب"
                    hint="حساب المالك الذي ستدير به متجرك"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="full_name">الاسم الكامل</Label>
                    <Input
                      id="full_name"
                      autoComplete="name"
                      disabled={isBusy}
                      aria-invalid={!!formState.errors.full_name}
                      className="min-h-[44px]"
                      {...registerField("full_name")}
                    />
                    <FieldError message={formState.errors.full_name?.message} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        disabled={isBusy}
                        aria-invalid={!!formState.errors.email}
                        className="min-h-[44px]"
                        {...registerField("email")}
                      />
                      <FieldError message={formState.errors.email?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الجوال</Label>
                      {/* PhoneInput (2-a): يقبل المسافات/+967/الأرقام الهندية
                          ويبث القيمة مطبّعة "777123456" */}
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <PhoneInput
                            id="phone"
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            disabled={isBusy}
                            aria-invalid={!!formState.errors.phone}
                          />
                        )}
                      />
                      <FieldError message={formState.errors.phone?.message} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <PasswordInput
                        id="password"
                        dir="ltr"
                        autoComplete="new-password"
                        disabled={isBusy}
                        aria-invalid={!!formState.errors.password}
                        className="min-h-[44px]"
                        {...registerField("password")}
                      />
                      <FieldError message={formState.errors.password?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password_confirm">
                        تأكيد كلمة المرور
                      </Label>
                      <PasswordInput
                        id="password_confirm"
                        dir="ltr"
                        autoComplete="new-password"
                        disabled={isBusy}
                        aria-invalid={!!formState.errors.password_confirm}
                        className="min-h-[44px]"
                        {...registerField("password_confirm")}
                      />
                      <FieldError
                        message={formState.errors.password_confirm?.message}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ─── القسم ب: بيانات المتجر ─── */}
                <div className="space-y-4">
                  <SectionTitle
                    icon={Store}
                    title="بيانات المتجر"
                    hint="تظهر للعملاء بعد موافقة الإدارة"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="facility_name">اسم المتجر</Label>
                    <Input
                      id="facility_name"
                      autoComplete="organization"
                      disabled={isBusy}
                      aria-invalid={!!formState.errors.facility_name}
                      className="min-h-[44px]"
                      {...registerField("facility_name")}
                    />
                    <FieldError
                      message={formState.errors.facility_name?.message}
                    />
                  </div>

                  {/* نوع المتجر — اختيار بصري بالدوائر الملونة (مطاعم وكافتيريات فقط) */}
                  <Controller
                    name="facility_type"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>نوع المتجر</Label>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="radiogroup"
                          aria-label="نوع المتجر"
                        >
                          {FACILITY_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isActive = field.value === type.key;
                            return (
                              <button
                                key={type.key}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                disabled={isBusy}
                                onClick={() =>
                                  field.onChange(isActive ? undefined : type.key)
                                }
                                className="flex min-h-[44px] flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card p-3 transition-all duration-150 hover:border-primary/30 active:scale-95 disabled:opacity-60"
                              >
                                <span
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
                                    isActive
                                      ? TYPE_CIRCLES[type.key].active
                                      : TYPE_CIRCLES[type.key].idle
                                  )}
                                >
                                  <Icon
                                    className="h-6 w-6"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                </span>
                                <span
                                  className={cn(
                                    "text-xs leading-tight",
                                    isActive
                                      ? "font-bold text-foreground"
                                      : "font-medium text-muted-foreground"
                                  )}
                                >
                                  {TYPE_LABEL[type.key]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <FieldError
                          message={formState.errors.facility_type?.message}
                        />
                      </div>
                    )}
                  />

                  {/* المنطقة */}
                  <Controller
                    name="region_id"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="region_id">المنطقة</Label>
                        {regionsLoading ? (
                          <Skeleton className="h-[44px] w-full" />
                        ) : (
                          <Select
                            value={field.value ? String(field.value) : ""}
                            onValueChange={(v) => field.onChange(Number(v))}
                            disabled={isBusy}
                          >
                            <SelectTrigger
                              id="region_id"
                              className="h-[44px] w-full"
                              aria-label="اختيار المنطقة"
                            >
                              <SelectValue placeholder="اختر منطقة المتجر" />
                            </SelectTrigger>
                            <SelectContent>
                              {(regions ?? []).map((region) => (
                                <SelectItem
                                  key={region.id}
                                  value={String(region.id)}
                                >
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FieldError
                          message={formState.errors.region_id?.message}
                        />
                      </div>
                    )}
                  />

                  {/* وصف المتجر */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      وصف المتجر{" "}
                      <span className="text-muted-foreground">(اختياري)</span>
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      disabled={isBusy}
                      placeholder="نبذة قصيرة عن متجرك تظهر للعملاء"
                      {...registerField("description")}
                    />
                    <FieldError
                      message={formState.errors.description?.message}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* العنوان — إلزامي (طلب المالك) */}
                    <div className="space-y-2">
                      <Label htmlFor="address">العنوان</Label>
                      <Input
                        id="address"
                        autoComplete="street-address"
                        disabled={isBusy}
                        aria-invalid={!!formState.errors.address}
                        className="min-h-[44px]"
                        placeholder="مثال: شارع حدة، جوار مركز ..."
                        {...registerField("address")}
                      />
                      <FieldError message={formState.errors.address?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_facility">
                        جوال المتجر{" "}
                        <span className="text-muted-foreground">(اختياري)</span>
                      </Label>
                      <Controller
                        name="phone_facility"
                        control={control}
                        render={({ field }) => (
                          <PhoneInput
                            id="phone_facility"
                            value={field.value ?? ""}
                            onValueChange={field.onChange}
                            disabled={isBusy}
                            autoComplete="off"
                            aria-invalid={!!formState.errors.phone_facility}
                          />
                        )}
                      />
                      <FieldError
                        message={formState.errors.phone_facility?.message}
                      />
                    </div>
                  </div>

                  {/* ─── موقع المتجر: GPS أو من الخريطة ───
                      الإحداثيات اختيارية (الباك اند لا يقبلها عند التسجيل)
                      وتُحفظ محلياً لترفع بعد أول تسجيل دخول */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>موقع المتجر</Label>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{
                          background:
                            "color-mix(in srgb, var(--logo-emerald) 12%, transparent)",
                          color: "var(--logo-emerald)",
                        }}
                        aria-live="polite"
                      >
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {location
                          ? "تم تحديد الموقع"
                          : "يُفضّل — يزيد ظهورك للعملاء"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      حدّد موقع متجرك ليظهر للعملاء القريبين منك — إن حددته
                      الآن سيُحفظ تلقائياً مع متجرك عند أول تسجيل دخول.
                    </p>
                    <StoreLocationPicker
                      value={location}
                      onChange={setLocation}
                      disabled={isBusy}
                      mapReturnPath="/owner/register"
                      idPrefix="owner-register-loc"
                    />
                  </div>

                  {/* ساعات العمل — محدد أيام وأوقات (2-a) بدل النص الحر */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>ساعات العمل</Label>
                      <span className="text-[11px] text-muted-foreground">
                        (اختياري)
                      </span>
                    </div>
                    <Controller
                      name="working_hours"
                      control={control}
                      render={({ field }) => (
                        <WorkingHoursSelector
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          disabled={isBusy}
                        />
                      )}
                    />
                    <FieldError
                      message={formState.errors.working_hours?.message}
                    />
                  </div>

                  {/* صورة المتجر: رفع (يتطلب توكناً!) أو رابط مباشر */}
                  {uploadNeedsAuth ? (
                    <div className="space-y-3">
                      {/* فشل الرفع 401 → توجيه واضح + حقل الرابط بدل السحب */}
                      <div
                        role="alert"
                        className="rounded-2xl border px-4 py-3.5 text-sm leading-relaxed"
                        style={{
                          borderColor:
                            "color-mix(in srgb, var(--logo-gold) 40%, transparent)",
                          background:
                            "color-mix(in srgb, var(--logo-gold) 7%, transparent)",
                        }}
                      >
                        <p
                          className="flex items-center gap-2 font-bold"
                          style={{ color: "var(--logo-gold)" }}
                        >
                          <UploadCloud
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          رفع الصور يتطلب تسجيل دخول
                        </p>
                        <p className="mt-1.5 text-xs text-foreground/90">
                          يمكنك الآن: (١) لصق رابط صورة متجرك مباشرة بالأسفل —
                          أو (٢) رفع الصورة بعد أول تسجيل دخول من صفحة إدارة
                          متجرك.
                        </p>
                      </div>
                      <Controller
                        name="image_url"
                        control={control}
                        render={({ field }) => (
                          <ImageUrlField
                            id="image_url"
                            label="رابط صورة المتجر"
                            hint="ألصق رابط صورة مباشراً (ينتهي بـ .jpg أو .png أو .webp) — تظهر للعملاء بعد موافقة الإدارة."
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            disabled={isBusy}
                          />
                        )}
                      />
                      <FieldError
                        message={formState.errors.image_url?.message}
                      />
                    </div>
                  ) : (
                    <div>
                      <Controller
                        name="image_url"
                        control={control}
                        render={({ field }) => (
                          <ImageUploader
                            id="image_url"
                            label="صورة المتجر"
                            folder="facilities"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onUploadError={handleUploadError}
                            disabled={isBusy}
                          />
                        )}
                      />
                      <FieldError
                        message={formState.errors.image_url?.message}
                      />
                    </div>
                  )}

                  {/* نسبة الخصم لتوفير — شريط تمرير 10-30 */}
                  <Controller
                    name="discount_rate"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="discount_rate" className="gap-1">
                            <BadgePercent
                              className="h-4 w-4 text-primary"
                              aria-hidden="true"
                            />
                            نسبة الخصم لتوفير
                          </Label>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
                            aria-live="polite"
                          >
                            {field.value ?? 30}%
                          </span>
                        </div>
                        <Slider
                          id="discount_rate"
                          min={10}
                          max={30}
                          step={5}
                          value={[field.value ?? 30]}
                          onValueChange={(values: number[]) =>
                            field.onChange(values[0] ?? 30)
                          }
                          disabled={isBusy}
                          aria-label="نسبة الخصم لتوفير"
                          className="min-h-[44px] py-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          اختر نسبة الخصم التي ستمنحها لحاملي بطاقة توفير. لا
                          يمكن تغييرها لاحقاً. للتعديل تواصل: 780090882
                        </p>
                        <FieldError
                          message={formState.errors.discount_rate?.message}
                        />
                      </div>
                    )}
                  />
                </div>

                {/* خطأ عام من الخادم (فوق زر الإرسال) */}
                {serverGeneralError && (
                  <p
                    className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    role="alert"
                  >
                    {serverGeneralError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full min-h-[44px] rounded-full"
                  disabled={isBusy}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {requestOtp.isPending
                    ? "جارٍ إرسال كود التحقق..."
                    : register.isPending
                      ? "جارٍ إرسال الطلب..."
                      : "إرسال طلب التسجيل"}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  بعد الإرسال سنطلب كود تحقق من 6 أرقام يصل جوالك عبر واتساب
                  لإتمام التسجيل.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/owner/login"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[color:var(--logo-gold-light)] hover:underline"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            لديك حساب؟ سجّل الدخول
          </Link>
          <span className="text-xs text-muted-foreground/70">
            بوابة أصحاب المتاجر — توفير
          </span>
        </div>
      </div>
    </AuthShell>
  );
}
