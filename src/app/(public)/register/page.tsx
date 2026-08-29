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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DiscountBadge } from "@/components/shared/DiscountBadge";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { RegionSelector } from "@/components/public/RegionSelector";
import { useRegionStore } from "@/store/region.store";
import { useRegister } from "@/hooks/useRegister";
import { DISCOUNT_RATE } from "@/lib/site-config";
import type { RegisterOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── Zod Schema ─────────────────────────────────── */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const registerSchema = z
  .object({
    full_name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    email: z.string().email({ message: "صيغة البريد الإلكتروني غير صحيحة" }),
    // الجوال اليمني: 9 أرقام تبدأ بـ 70 أو 71 أو 73 أو 77 أو 78 (لا يقبل 05 في البداية)
    phone: z
      .string()
      .min(9, { message: "رقم الجوال يجب أن يكون 9 أرقام" })
      .regex(/^(7[01378])\d{7}$/, {
        message: "أدخل رقم جوال يمني صحيح (يبدأ بـ 70/71/73/77/78)",
      }),
    password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
    password_confirm: z.string().min(6, { message: "تأكيد كلمة المرور مطلوب" }),
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
  medium: { bar: "bg-accent", text: "text-accent" },
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

/* ─── Success Screen — لا عضوية تلقائية بعد التسجيل ─── */
function SuccessScreen({ data }: { data: RegisterOut }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative mx-auto w-full max-w-md text-center"
    >
      <ConfettiParticles />

      <div className="mb-6 flex justify-center">
        <CheckCircle2 className="h-16 w-16 text-success" />
      </div>
      <h2 className="mb-2 text-2xl font-extrabold text-foreground">
        تم إنشاء حسابك!
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {data.detail || "أهلاً بك في منصة توفير"}
      </p>

      {/* بطاقة دعوة الاشتراك في العضوية */}
      <div
        className="mb-8 rounded-2xl border border-border/60 p-5 text-center shadow-soft"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--logo-gold) 12%, transparent), color-mix(in srgb, var(--logo-blue) 8%, transparent))",
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
          اشترك في عضوية توفير لخصم 30%
        </h2>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
          مبلغ سنوي ثابت 3000 ر.ي، موافقة يدوية خلال 24-48 ساعة.
          عند الموافقة تظهر بطاقة عضويتك في حسابك.
        </p>
      </div>

      <div className="mx-auto flex max-w-sm flex-col gap-3">
        <Button asChild size="lg" className="min-h-[44px] w-full gap-2 rounded-full">
          <Link href="/membership/subscribe">
            <Crown className="h-4 w-4" aria-hidden="true" />
            اشترك في العضوية
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
  "خصم 30% على جميع المتاجر المشتركة",
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
      className="hidden lg:flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-10 text-center"
    >
      <TawfirLogo className="mb-6 h-14 w-auto" />
      <h2 className="mb-2 text-2xl font-extrabold text-foreground">انضم لعائلة توفير</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        سجّل الآن واحصل على بطاقة خصم تنفعك في عشرات المتاجر
      </p>
      <TawfirPillBadge className="mb-8" />
      <ul className="space-y-4 text-right">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-3 text-sm text-foreground">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <Check className="h-3.5 w-3.5 text-secondary" />
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
  const [successData, setSuccessData] = useState<RegisterOut | null>(null);
  const { mutate, isPending } = useRegister();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const prefersReduced = usePrefersReducedMotion();

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
    if (email.trim().length > 0) filled += 1;
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

  const onSubmit = (values: RegisterValues) => {
    mutate(values, {
      onSuccess: (response) => {
        setSuccessData(response);
      },
    });
  };

  /* شاشة النجاح — لا توجيه تلقائي لـ /login */
  if (successData) {
    return (
      <>
        <ScreenHeader title="تسجيل العضوية" fallbackHref="/" />
        <div className="mx-auto w-full max-w-md px-4 py-10">
          <SuccessScreen data={successData} />
        </div>
      </>
    );
  }

  const formAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      <ScreenHeader title="تسجيل العضوية" fallbackHref="/" />
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.div
          className="mb-8 space-y-2 text-center"
          {...formAnimation}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p className="text-sm text-muted-foreground">
            انضم إلى توفير واحصل على بطاقة خصم 30%
          </p>
        </motion.div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
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
                    disabled={isPending}
                    aria-invalid={!!errors.full_name}
                    {...register("full_name")}
                  />
                </Field>

                <Separator />

                <Field
                  id="email"
                  label="البريد الإلكتروني"
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
                    disabled={isPending}
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
                    disabled={isPending}
                    aria-invalid={!!errors.phone}
                    {...register("phone")}
                  />
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
                    placeholder="......"
                    dir="ltr"
                    className="text-left"
                    disabled={isPending}
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
                    placeholder="......"
                    dir="ltr"
                    className="text-left"
                    disabled={isPending}
                    aria-invalid={!!errors.password_confirm}
                    {...register("password_confirm")}
                  />
                </Field>

                <Button
                  type="submit"
                  className="w-full rounded-full min-h-[44px]"
                  disabled={isPending}
                >
                  {isPending ? "جارٍ التسجيل..." : "تسجيل العضوية"}
                </Button>
              </form>

              <Separator className="my-5" />

              <p className="text-center text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/login"
                  className="font-medium text-secondary hover:underline"
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
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-secondary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
    </>
  );
}
