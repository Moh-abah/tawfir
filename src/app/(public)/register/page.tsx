"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  User,
  Lock,
  ShieldCheck,
  Crown,
  Sparkles,
  Gift,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DiscountBadge } from "@/components/shared/DiscountBadge";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { RegionSelector } from "@/components/public/RegionSelector";
import { OtpVerifyForm } from "@/components/shared/OtpVerifyForm";
import { MemberCard } from "@/components/public/MemberCard";
import { useRegionStore } from "@/store/region.store";
import { useRegister } from "@/hooks/useRegister";
import { useRequestOtp } from "@/hooks/useRequestOtp";
import { customerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useQueryClient } from "@tanstack/react-query";
import { DISCOUNT_RATE } from "@/lib/site-config";
import type {
  MyMembershipCard,
  OtpRequestOut,
  RegisterOut,
} from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";
import { cn } from "@/lib/utils";

/* ─── Zod Schema ─────────────────────────────────── */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const registerSchema = z
  .object({
    full_name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    // البريد اختياري (الجولة 20) — لكن عند إدخاله يجب أن يكون صحيحاً.
    email: z
      .string()
      .email({ message: "صيغة البريد الإلكتروني غير صحيحة" })
      .optional()
      .or(z.literal("")),
    // الجوال اليمني: 9 أرقام تبدأ بـ 70 أو 71 أو 73 أو 77 أو 78 (لا يقبل 05 في البداية)
    phone: z
      .string()
      .min(9, { message: "رقم الجوال يجب أن يكون 9 أرقام" })
      .regex(/^(7[01378])\d{7}$/, {
        message: "أدخل رقم جوال يمني صحيح (يبدأ بـ 70/71/73/77/78)",
      }),
    password: z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }),
    password_confirm: z.string().min(8, { message: "تأكيد كلمة المرور مطلوب" }),
    region_id: z.number().positive({ message: "يرجى اختيار منطقة" }),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["password_confirm"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

/* ─── Step Indicator Data ─────────────────────────── */
const STEPS = [
  { num: 1, label: "البيانات الشخصية", icon: User },
  { num: 2, label: "كلمة المرور", icon: Lock },
  { num: 3, label: "تأكيد الحساب", icon: ShieldCheck },
] as const;

/* ─── Password Strength ───────────────────────────── */
function getPasswordStrength(password: string): {
  level: "weak" | "medium" | "strong";
  label: string;
  percent: number;
} {
  if (password.length === 0) return { level: "weak", label: "", percent: 0 };
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
    return { level: "strong", label: "قوية", percent: 100 };
  }
  if (password.length >= 6 && hasLetters && hasNumbers) {
    return { level: "medium", label: "متوسطة", percent: 60 };
  }
  return { level: "weak", label: "ضعيفة", percent: 30 };
}

const STYLES: Record<string, { bar: string; text: string }> = {
  weak: { bar: "bg-destructive", text: "text-destructive" },
  medium: { bar: "bg-accent", text: "text-accent-ink" },
  strong: { bar: "bg-success", text: "text-success" },
};

function PasswordStrengthBar({ password }: { password: string }) {
  const reduced = useReducedMotion();
  const { level, label, percent } = getPasswordStrength(password);
  if (!password) return null;
  const style = STYLES[level];
  const animate = reduced ? { width: `${percent}%` } : { width: `${percent}%` };
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", style.bar)}
          initial={reduced ? { width: `${percent}%` } : { width: 0 }}
          animate={animate}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <p className={cn("text-xs", style.text)}>{label}</p>
    </div>
  );
}

/* ─── Confetti Particles (ذهبي/سماوي — توكنات الهوية) ─── */
const CONFETTI_SHAPES = [
  { className: "bg-accent rounded-full", size: 10, shape: "circle" },
  { className: "bg-secondary rounded-sm", size: 9, shape: "square", rotate: 24 },
  { className: "bg-cat-facility rounded-sm", size: 8, shape: "triangle", rotate: -18 },
  { className: "bg-accent rounded-sm", size: 7, shape: "square", rotate: 45 },
  { className: "bg-secondary rounded-full", size: 8, shape: "circle" },
  { className: "bg-primary rounded-sm", size: 9, shape: "square", rotate: -32 },
  { className: "bg-accent rounded-full", size: 6, shape: "circle" },
  { className: "bg-secondary rounded-sm", size: 7, shape: "square", rotate: 60 },
] as const;

function ConfettiParticles() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI_SHAPES.map((piece, i) => {
        const angle = (i / CONFETTI_SHAPES.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 60 + Math.random() * 80;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist - 40;
        return (
          <motion.span
            key={i}
            className={cn("absolute left-1/2 top-1/2", piece.className)}
            style={{
              width: piece.size,
              height: piece.size,
              marginLeft: -piece.size / 2,
              marginTop: -piece.size / 2,
              rotate: "rotate" in piece ? piece.rotate : 0,
              borderRadius: piece.shape === "circle" ? "9999px" : "3px",
            }}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1, x: tx, y: ty }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/* ─── Success Screen — بعد التسجيل (مع أو بدون عضوية مجانية) ─── */
function SuccessScreen({
  data,
  membership,
  freeGrantedByDetail,
}: {
  data: RegisterOut;
  /** بطاقة العضوية من /me بعد تسجيل الدخول التلقائي. null إن لم تُجلب. */
  membership?: MyMembershipCard | null;
  /** true إن كانت رسالة الباك إند تذكر «عضوية مجانية» (احتياط إن فشل /me). */
  freeGrantedByDetail?: boolean;
}) {
  const reduced = useReducedMotion();
  const hasActiveMembership = !!membership && membership.is_active;
  const showFreeCard = hasActiveMembership || freeGrantedByDetail;

  return (
    <motion.div
      initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative mx-auto w-full max-w-md text-center"
    >
      <ConfettiParticles />

      <div className="mb-6 flex justify-center">
        {showFreeCard ? (
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--logo-emerald) 22%, transparent)",
            }}
          >
            <Gift
              className="h-10 w-10"
              style={{ color: "var(--logo-emerald)" }}
              aria-hidden="true"
            />
          </span>
        ) : (
          <CheckCircle2 className="h-16 w-16 text-success" />
        )}
      </div>
      <h2 className="mb-2 text-2xl font-extrabold text-foreground">
        {showFreeCard ? "تم إنشاء حسابك! 🎁" : "تم إنشاء حسابك!"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {data.detail || "أهلاً بك في منصة توفير"}
      </p>

      {/* بطاقة العضوية الحقيقية إن وُجدت من /me */}
      {hasActiveMembership && membership ? (
        <div className="mb-6">
          <MemberCard membership={membership} />
        </div>
      ) : freeGrantedByDetail ? (
        /* علم الباك إند يُفيد بمنح عضوية مجانية لكن /me لم يصل — نُظهر رسالة
           بديلة (العميل will see the card in /account بعد دخوله). */
        <div
          className="mb-6 rounded-2xl border border-border/60 p-5 text-center shadow-soft"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--logo-emerald) 12%, transparent), color-mix(in srgb, var(--logo-gold) 8%, transparent))",
          }}
        >
          <div className="mb-2 flex items-center justify-center gap-2">
            <Gift
              className="h-5 w-5"
              style={{ color: "var(--logo-emerald)" }}
              aria-hidden="true"
            />
            <span className="text-base font-extrabold text-foreground">
              حصلت على عضوية توفير المجانية
            </span>
          </div>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
            ستظهر بطاقة عضويتك مع رقم العضوية في صفحة حسابك بعد تسجيل الدخول.
          </p>
        </div>
      ) : (
        /* بطاقة دعوة الاشتراك في العضوية (التدفق اليدوي) */
        <div
          className="mb-8 rounded-2xl border border-border/60 p-5 text-center shadow-soft"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--logo-gold) 12%, transparent), color-mix(in srgb, var(--logo-emerald) 8%, transparent))",
          }}
        >
          <div className="mb-3 flex items-center justify-center">
            <TawfirLogo className="h-10 w-auto" />
          </div>
          <div className="mb-3 flex items-center justify-center gap-2">
            <DiscountBadge percentage={DISCOUNT_RATE} />
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              اشترك الآن
            </span>
          </div>
          <h2 className="mb-1 text-lg font-extrabold text-foreground">
            اشترك في عضوية توفير لخصم حتى 30%
          </h2>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
            مبلغ سنوي ثابت 3000 ر.ي، موافقة يدوية خلال 24-48 ساعة.
            عند الموافقة تظهر بطاقة عضويتك في حسابك.
          </p>
        </div>
      )}

      <div className="mx-auto flex max-w-sm flex-col gap-3">
        <Button asChild size="lg" className="min-h-[44px] w-full gap-2 rounded-full">
          <Link href="/account">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            حسابي
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="min-h-[44px] w-full gap-2 rounded-full"
        >
          <Link href="/">
            تصفّح الوجبات
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Stage — تحديد المرحلة في تدفق التسجيل ──────────── */
type RegisterStage = "form" | "otp" | "success";

/* ─── Inline loading banner — أثناء طلب OTP ─────────── */
function InlineRequestingOtp({ message }: { message: string }) {
  return (
    <p
      className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm font-medium text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {message}
    </p>
  );
}

/* ─── Creating Account Overlay — بعد OTP نجح وقبل /me ── */
function CreatingAccountOverlay() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-md text-center"
    >
      <Card className="rounded-2xl border-border/60 shadow-soft-lg">
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
            جارٍ إنشاء حسابك...
          </h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            تحقّقنا من رقمك — نُنشئ حسابك الآن ونجلب بطاقة عضويتك.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Field Helper ───────────────────────────────── */
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Step Indicator ─────────────────────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
  const reduced = useReducedMotion();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = step.num === currentStep;
          const isCompleted = step.num < currentStep;

          return (
            <div key={step.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-colors min-h-[44px] min-w-[44px]",
                    isCompleted && "bg-secondary text-secondary-foreground",
                    isActive && "bg-primary text-primary-foreground",
                    !isCompleted && !isActive && "bg-muted text-muted-foreground"
                  )}
                  initial={false}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </motion.div>
                <span
                  className={cn(
                    "max-w-[80px] text-center text-xs font-medium leading-tight",
                    isCompleted || isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="relative mx-2 mt-[-20px] h-1 flex-1">
                  <div className="absolute inset-0 rounded-full bg-muted" />
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 right-0 rounded-full",
                      step.num < currentStep ? "bg-secondary" : "bg-transparent"
                    )}
                    initial={
                      reduced
                        ? { width: step.num < currentStep ? "100%" : "0%" }
                        : { width: "0%" }
                    }
                    animate={{ width: step.num < currentStep ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ left: 0 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Progress Bar ───────────────────────────────── */
function FormProgressBar({ progress }: { progress: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">تقدم التسجيل</span>
        <span className="text-xs font-bold text-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-secondary to-primary"
          initial={reduced ? { width: `${progress}%` } : { width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ─── Decorative Side Panel ──────────────────────── */
const BENEFITS = [
  "خصم حتى 30% على جميع المتاجر المشتركة",
  "بطاقة عضوية رقمية بعد الموافقة اليدوية",
  "عروض حصرية ومزايا مميزة",
];

function DecorativeSidePanel() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="hidden lg:flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-10 text-center backdrop-blur-md"
    >
      <h2 className="mb-2 text-2xl font-extrabold text-white">انضم لعائلة توفير</h2>
      <p className="mb-6 max-w-xs text-sm text-white/70">
        سجّل الآن واحصل على بطاقة خصم تنفعك في عشرات المتاجر
      </p>
      <TawfirPillBadge className="mb-8 border border-white/15 bg-white/10 text-white backdrop-blur-md shadow-none" />
      <ul className="space-y-4 text-right">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-3 text-sm text-white">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--logo-gold)]/20">
              <Check className="h-3.5 w-3.5 text-[color:var(--logo-gold-light)]" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ─── Register Page ──────────────────────────────── */
export default function RegisterPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stage, setStage] = useState<RegisterStage>("form");
  const [successData, setSuccessData] = useState<RegisterOut | null>(null);
  const [storedValues, setStoredValues] = useState<RegisterValues | null>(null);
  const [initialOtpResult, setInitialOtpResult] =
    useState<OtpRequestOut | null>(null);
  const [membershipAfterRegister, setMembershipAfterRegister] =
    useState<MyMembershipCard | null>(null);
  const [otpRequestError, setOtpRequestError] = useState<string | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { mutate: registerMutate, isPending: isRegisterPending } =
    useRegister();
  const requestOtp = useRequestOtp();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const prefersReduced = usePrefersReducedMotion();

  const isOtpRequesting = requestOtp.isPending;
  const isFormDisabled = isOtpRequesting || isCreatingAccount || isRegisterPending;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
      region_id: undefined,
    },
  });

  const fullName = watch("full_name");
  const email = watch("email");
  const phone = watch("phone");
  const passwordValue = watch("password");
  const passwordConfirm = watch("password_confirm");

  /* ─── Compute progress & active step ──────────── */
  const { progress, currentStep } = useMemo(() => {
    let filled = 0;
    let step = 1;
    if (fullName.trim().length >= 2) filled += 1;
    else return { progress: 0, currentStep: 1 };
    if ((email ?? "").trim().length > 0) filled += 1;
    else return { progress: 33, currentStep: 1 };
    if (phone.trim().length > 0) filled += 1;
    else return { progress: 50, currentStep: 1 };
    step = 2;
    if (passwordValue.length > 0) filled += 1;
    else return { progress: 66, currentStep: 2 };
    if (passwordConfirm.length > 0) {
      filled += 1;
      step = 3;
    }
    const pct = (filled / 5) * 100;
    return { progress: pct, currentStep: step };
  }, [fullName, email, phone, passwordValue, passwordConfirm]);

  useEffect(() => {
    if (selectedRegionId)
      setValue("region_id", selectedRegionId, { shouldValidate: true });
  }, [selectedRegionId, setValue]);

  /* ─── Stage transitions ───────────────────────── */

  /** إرسال النموذج → طلب OTP → الانتقال لمرحلة OTP. */
  const onSubmit = (values: RegisterValues) => {
    setOtpRequestError(null);
    requestOtp.mutate(
      { target: values.phone, name: values.full_name },
      {
        onSuccess: (res) => {
          setStoredValues(values);
          setInitialOtpResult(res);
          setStage("otp");
        },
        onError: (err: ApiError) => {
          setOtpRequestError(err.message || "تعذّر إرسال كود التحقق");
          toast({
            title: "تعذّر إرسال كود التحقق",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  /** عند نجاح التحقق من OTP → إنشاء الحساب → دخول تلقائي → /me. */
  const handleVerified = () => {
    if (!storedValues) return;
    setIsCreatingAccount(true);
    registerMutate(storedValues, {
      onSuccess: async (response) => {
        // محاولة دخول تلقائي (بالهاتف + كلمة المرور) لجلب /me.
        let membership: MyMembershipCard | null = null;
        try {
          const tokens = await customerAuthService.login({
            identifier: storedValues.phone,
            password: storedValues.password,
          });
          useCustomerAuthStore
            .getState()
            .setAuth(tokens.access_token, tokens.refresh_token ?? null);
          // إبطال كاش /me بعد تسجيل الدخول حتى يُجلب من جديد
          queryClient.invalidateQueries({ queryKey: ["me"] });
          try {
            const me = await customerAuthService.getMe();
            membership = me.membership;
          } catch {
            membership = null;
          }
        } catch {
          // فشل الدخول التلقائي — لا يمنع عرض شاشة النجاح (المستخدم يمكنه
          // الدخول يدوياً عبر /login).
          membership = null;
        }
        setMembershipAfterRegister(membership);
        setSuccessData(response);
        setStage("success");
        setIsCreatingAccount(false);
      },
      onError: () => {
        // toast يُطلق بالفعل من useRegister — نعود لمرحلة النموذج.
        setIsCreatingAccount(false);
        setStage("form");
      },
    });
  };

  /** الرجوع من OTP إلى النموذج مع استعادة القيم. */
  const handleBackToForm = () => {
    if (storedValues) {
      // استعادة القيم في النموذج (react-hook-form يحفظها داخلياً لكن نضمن).
      (Object.keys(storedValues) as (keyof RegisterValues)[]).forEach((k) => {
        const v = storedValues[k];
        if (typeof v === "string" || typeof v === "number") {
          setValue(k, v as never, { shouldValidate: false });
        }
      });
    }
    setStage("form");
  };

  /* ─── Stage: success ─── */
  if (stage === "success" && successData) {
    const freeGrantedByDetail = /مجانية|عضوية.*مجاني|مجاني.*عضوية/.test(
      successData.detail || ""
    );
    return (
      <AuthShell>
        <SuccessScreen
          data={successData}
          membership={membershipAfterRegister}
          freeGrantedByDetail={freeGrantedByDetail}
        />
      </AuthShell>
    );
  }

  /* ─── Stage: otp (or creating account overlay) ─── */
  if (stage === "otp" && storedValues) {
    if (isCreatingAccount) {
      return (
        <AuthShell>
          <CreatingAccountOverlay />
        </AuthShell>
      );
    }
    return (
      <AuthShell>
        <motion.div
          className="mb-8 space-y-2 text-center"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-white/80">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            تأكيد ملكية الرقم عبر واتساب
          </p>
        </motion.div>
        <OtpVerifyForm
          target={storedValues.phone}
          name={storedValues.full_name}
          initialResult={initialOtpResult}
          onVerified={handleVerified}
          onBack={handleBackToForm}
        />
      </AuthShell>
    );
  }

  /* ─── Stage: form ─── */
  const formAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <AuthShell wide>
      <motion.div
        className="mb-8 space-y-2 text-center"
        {...formAnimation}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="text-sm font-medium text-white/80">
          انضم إلى توفير — كل وجباتك.. بخصم حتى {DISCOUNT_RATE}%
        </p>
      </motion.div>

      <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="hidden lg:block lg:col-span-2">
          <DecorativeSidePanel />
        </div>

        <motion.div
          className="lg:col-span-3"
          {...formAnimation}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <Card className="relative overflow-hidden rounded-2xl">
            <div className="pointer-events-none absolute top-0 right-0 h-full w-[3px] bg-gradient-to-b from-primary to-secondary" />
            <CardContent className="pt-6">
              <StepIndicator currentStep={currentStep} />
              <FormProgressBar progress={progress} />

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <Field
                  id="full_name"
                  label="الاسم الكامل"
                  error={errors.full_name?.message}
                >
                  <Input
                    id="full_name"
                    autoComplete="name"
                    placeholder="مثال: أحمد محمد"
                    disabled={isFormDisabled}
                    aria-invalid={!!errors.full_name}
                    {...register("full_name")}
                  />
                </Field>

                <Separator />

                <Field
                  id="email"
                  label="البريد الإلكتروني (اختياري)"
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    dir="ltr"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="text-left"
                    disabled={isFormDisabled}
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                </Field>

                <Field
                  id="phone"
                  label="رقم الجوال"
                  error={errors.phone?.message}
                >
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                    placeholder="771234567"
                    className="text-left"
                    disabled={isFormDisabled}
                    aria-invalid={!!errors.phone}
                    {...register("phone")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    سيُرسل كود تحقق 6 أرقام إلى هذا الرقم عبر واتساب.
                  </p>
                </Field>

                <Separator />

                <Field id="region" label="المنطقة" error={errors.region_id?.message}>
                  <RegionSelector />
                </Field>

                <Separator />

                <Field
                  id="password"
                  label="كلمة المرور"
                  error={errors.password?.message}
                >
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    placeholder="........"
                    dir="ltr"
                    className="text-left"
                    disabled={isFormDisabled}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <PasswordStrengthBar password={passwordValue} />
                </Field>

                <Field
                  id="password_confirm"
                  label="تأكيد كلمة المرور"
                  error={errors.password_confirm?.message}
                >
                  <PasswordInput
                    id="password_confirm"
                    autoComplete="new-password"
                    placeholder="........"
                    dir="ltr"
                    className="text-left"
                    disabled={isFormDisabled}
                    aria-invalid={!!errors.password_confirm}
                    {...register("password_confirm")}
                  />
                </Field>

                {/* خطأ طلب OTP إن فشل الإرسال */}
                {otpRequestError && (
                  <p
                    className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    role="alert"
                  >
                    {otpRequestError}
                  </p>
                )}

                {isOtpRequesting && (
                  <InlineRequestingOtp message="جارٍ إرسال كود التحقق إلى واتساب..." />
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full min-h-[44px]"
                  disabled={isFormDisabled}
                >
                  {isOtpRequesting
                    ? "جارٍ إرسال الكود..."
                    : isRegisterPending
                    ? "جارٍ التسجيل..."
                    : "تسجيل العضوية"}
                </Button>
              </form>

              <Separator className="my-5" />

              <p className="text-center text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/login"
                  className="font-bold text-primary hover:underline"
                >
                  تسجيل الدخول
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/70 hover:underline"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>
      </div>
    </AuthShell>
  );
}
