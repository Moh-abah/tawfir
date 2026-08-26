"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  UserRound,
  Store,
  CheckCircle2,
  LogIn,
  Home,
  Hourglass,
  BadgePercent,
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
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useOwnerRegister, parseRegisterError } from "@/hooks/useOwnerRegister";
import type { OwnerRegisterResult } from "@/services/owner.service";
import { useRegions } from "@/hooks/useRegions";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { FacilityType } from "@/types/api.generated";

/* ════════════════════════════════════════════════════════════════ */
/*  مخطط التحقق — عربي كامل (يمني — لا سعودي)                        */
/* ════════════════════════════════════════════════════════════════ */
/**
 * صيغة الجوال اليمني:
 *  - محلي: 7XXXXXXXX (9 خانات تبدأ بـ 7)
 *  - دولي: +967 7XXXXXXXX أو 9677XXXXXXXX
 */
const YEMENI_PHONE = /^(?:\+?967)?0?7\d{8}$/u;

const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    email: z
      .string()
      .min(1, { message: "البريد الإلكتروني مطلوب" })
      .email({ message: "صيغة البريد الإلكتروني غير صحيحة" }),
    phone: z
      .string()
      .min(9, { message: "رقم الجوال يجب أن يكون 9 أرقام على الأقل" })
      .regex(YEMENI_PHONE, {
        message: "أدخل رقم جوال يمني صحيح (مثال: 7XXXXXXXX)",
      }),
    password: z
      .string()
      .min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
    password_confirm: z
      .string()
      .min(1, { message: "تأكيد كلمة المرور مطلوب" }),
    facility_name: z
      .string()
      .min(2, { message: "اسم المنشأة يجب أن يكون حرفين على الأقل" }),
    facility_type: z.enum(["restaurant", "cafe"], {
      message: "اختر نوع المنشأة",
    }),
    region_id: z.number().positive({ message: "اختر منطقة المنشأة" }),
    description: z.string().trim().optional(),
    address: z.string().trim().optional(),
    phone_facility: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || YEMENI_PHONE.test(v), {
        message: "أدخل رقم جوال يمني صحيح (مثال: 7XXXXXXXX)",
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
      .max(30, { message: "النسبة يجب أن تكون 30 على الأكثر" })
      .default(30),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["password_confirm"],
  });

type FormValues = z.infer<typeof registerSchema>;

/* ════════════════════════════════════════════════════════════════ */
/*  أنماط أزرار نوع المنشأة — مطاعم ومقاهي فقط                       */
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

/* ════════════════════════════════════════════════════════════════ */
/*  شاشة النجاح — «بانتظار موافقة المشرف»                            */
/* ════════════════════════════════════════════════════════════════ */
function SuccessScreen({ result }: { result: OwnerRegisterResult }) {
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
              className="h-10 w-10"
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            />
          </motion.span>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-foreground">
              بانتظار موافقة المشرف
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              تم استلام طلب تسجيل منشأتك بنجاح وحالتها الآن:{" "}
              <span className="font-bold text-foreground">{result.status}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              سجّل دخولك لمتابعة حالة المنشأة ومراجعة طلباتها عند الموافقة
            </p>
          </div>

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
  const [successResult, setSuccessResult] =
    useState<OwnerRegisterResult | null>(null);
  const [serverGeneralError, setServerGeneralError] = useState<string | null>(
    null
  );

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

  function onSubmit(values: FormValues) {
    setServerGeneralError(null);
    register.mutate(
      {
        ...values,
        /* الحقول الاختيارية: النص الفارغ يتحول إلى null كما يتوقع الـ API */
        description: values.description?.trim() || null,
        address: values.address?.trim() || null,
        phone_facility: values.phone_facility?.trim() || null,
        working_hours: values.working_hours?.trim() || null,
        image_url: values.image_url?.trim() || null,
        discount_rate: values.discount_rate,
      },
      {
        onSuccess: (result) => {
          setSuccessResult(result);
        },
        onError: (error) => {
          const parsed = parseRegisterError(error);
          for (const [fieldName, message] of Object.entries(parsed.fields)) {
            form.setError(fieldName as keyof FormValues, { message });
          }
          setServerGeneralError(parsed.general);
        },
      }
    );
  }

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 24, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };

  const floatVariants = prefersReduced
    ? { initial: { opacity: 0.15 }, animate: { opacity: 0.15 } }
    : { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 0.15, scale: 1 } };

  /* ─── شاشة النجاح تحل محل النموذج — لا توجيه تلقائي ─── */
  if (successResult) {
    return (
      <div
        className={cn(
          "login-ocean-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4",
          !prefersReduced && "animate-hero-gradient"
        )}
      >
        <div
          className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
          aria-hidden="true"
        />
        <div className="absolute left-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <SuccessScreen result={successResult} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "login-ocean-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4",
        !prefersReduced && "animate-hero-gradient"
      )}
    >
      {/* زخرفة النقش */}
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      {/* الأشكال العائمة */}
      <motion.div
        className="login-blob-cyan pointer-events-none absolute -top-20 right-1/4 h-72 w-72 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.2 }}
        aria-hidden="true"
      />
      <motion.div
        className="login-blob-deep pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.5 }}
        aria-hidden="true"
      />
      <motion.div
        className="login-blob-gold pointer-events-none absolute top-1/3 left-[10%] h-48 w-48 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.8 }}
        aria-hidden="true"
      />

      <div className="absolute left-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 my-8 w-full max-w-md space-y-6">
        {/* الشعار — نسخة الجوال */}
        <div className="flex flex-col items-center gap-3 text-center md:hidden">
          <div className="login-logo-glow">
            <TawfirLogo variant="mark" className="h-20 w-auto" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-foreground">توفير</span>
            <span className="text-sm text-muted-foreground">
              سجّل منشأتك وانضم لشركاء توفير
            </span>
          </div>
        </div>

        {/* زر تثبيت تطبيق المالك — يعمل على صفحة التسجيل أيضاً */}
        <PWAInstallButton portal="owner" variant="full" />

        {/* النموذج */}
        <motion.div
          {...cardAnimation}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <Card className="login-card-shimmer border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center">
              <CardTitle>تسجيل منشأة جديدة</CardTitle>
              <CardDescription>
                أنشئ حساب مالك وأضف منشأتك — تُراجع الإدارة طلبك قبل الظهور
                للعملاء
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    hint="حساب المالك الذي ستدير به منشأتك"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="full_name">الاسم الكامل</Label>
                    <Input
                      id="full_name"
                      autoComplete="name"
                      disabled={register.isPending}
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
                        disabled={register.isPending}
                        aria-invalid={!!formState.errors.email}
                        className="min-h-[44px]"
                        {...registerField("email")}
                      />
                      <FieldError message={formState.errors.email?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الجوال</Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        disabled={register.isPending}
                        aria-invalid={!!formState.errors.phone}
                        className="min-h-[44px]"
                        placeholder="7XXXXXXXX"
                        {...registerField("phone")}
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
                        disabled={register.isPending}
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
                        disabled={register.isPending}
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

                {/* ─── القسم ب: بيانات المنشأة ─── */}
                <div className="space-y-4">
                  <SectionTitle
                    icon={Store}
                    title="بيانات المنشأة"
                    hint="تظهر للعملاء بعد موافقة الإدارة"
                  />

                  <div className="space-y-2">
                    <Label htmlFor="facility_name">اسم المنشأة</Label>
                    <Input
                      id="facility_name"
                      autoComplete="organization"
                      disabled={register.isPending}
                      aria-invalid={!!formState.errors.facility_name}
                      className="min-h-[44px]"
                      {...registerField("facility_name")}
                    />
                    <FieldError
                      message={formState.errors.facility_name?.message}
                    />
                  </div>

                  {/* نوع المنشأة — اختيار بصري بالدوائر الملونة (مطاعم ومقاهي فقط) */}
                  <Controller
                    name="facility_type"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>نوع المنشأة</Label>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="radiogroup"
                          aria-label="نوع المنشأة"
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
                                disabled={register.isPending}
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
                            value={field.value ? String(field.value) : undefined}
                            onValueChange={(v) => field.onChange(Number(v))}
                            disabled={register.isPending}
                          >
                            <SelectTrigger
                              id="region_id"
                              className="h-[44px] w-full"
                              aria-label="اختيار المنطقة"
                            >
                              <SelectValue placeholder="اختر منطقة المنشأة" />
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

                  {/* وصف المنشأة */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      وصف المنشأة{" "}
                      <span className="text-muted-foreground">(اختياري)</span>
                    </Label>
                    <Textarea
                      id="description"
                      rows={3}
                      disabled={register.isPending}
                      placeholder="نبذة قصيرة عن منشأتك تظهر للعملاء"
                      {...registerField("description")}
                    />
                    <FieldError
                      message={formState.errors.description?.message}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address">
                        العنوان{" "}
                        <span className="text-muted-foreground">(اختياري)</span>
                      </Label>
                      <Input
                        id="address"
                        autoComplete="street-address"
                        disabled={register.isPending}
                        className="min-h-[44px]"
                        {...registerField("address")}
                      />
                      <FieldError message={formState.errors.address?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_facility">
                        جوال المنشأة{" "}
                        <span className="text-muted-foreground">(اختياري)</span>
                      </Label>
                      <Input
                        id="phone_facility"
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        disabled={register.isPending}
                        placeholder="7XXXXXXXX"
                        className="min-h-[44px]"
                        {...registerField("phone_facility")}
                      />
                      <FieldError
                        message={formState.errors.phone_facility?.message}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="working_hours">
                        ساعات العمل{" "}
                        <span className="text-muted-foreground">(اختياري)</span>
                      </Label>
                      <Input
                        id="working_hours"
                        dir="ltr"
                        disabled={register.isPending}
                        placeholder="08:00 - 23:00"
                        className="min-h-[44px]"
                        {...registerField("working_hours")}
                      />
                      <FieldError
                        message={formState.errors.working_hours?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image_url">
                        رابط صورة المنشأة{" "}
                        <span className="text-muted-foreground">(اختياري)</span>
                      </Label>
                      <Input
                        id="image_url"
                        type="url"
                        dir="ltr"
                        inputMode="url"
                        disabled={register.isPending}
                        placeholder="https://..."
                        className="min-h-[44px]"
                        {...registerField("image_url")}
                      />
                      <FieldError
                        message={formState.errors.image_url?.message}
                      />
                    </div>
                  </div>

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
                          disabled={register.isPending}
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
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {register.isPending
                    ? "جارٍ إرسال الطلب..."
                    : "إرسال طلب التسجيل"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/owner/login"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            لديك حساب؟ سجّل الدخول
          </Link>
          <span className="text-xs text-muted-foreground/70">
            بوابة أصحاب المنشآت — توفير
          </span>
        </div>
      </div>
    </div>
  );
}
