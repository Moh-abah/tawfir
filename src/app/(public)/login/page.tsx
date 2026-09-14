"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, LogIn, ArrowRight, Bike, CircleUserRound } from "lucide-react";
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
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ForgotPasswordDialog } from "@/components/shared/ForgotPasswordDialog";
import { useCustomerAuth, useCustomerLogin } from "@/hooks/useCustomerAuth";
import { useCourierLogin, useCourierMe, useCourierSession } from "@/hooks/useCourier";
import { unlockCourierAudio } from "@/lib/courier-call-sound";
import { haptic } from "@/lib/haptic";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  identifier: z.string().min(1, "البريد الإلكتروني أو رقم الجوال مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
type FormValues = z.infer<typeof schema>;

/** تعقيم باراميتر next: مسار داخلي فقط، ليس /login نفسه ولا بوابات الأدمن/المالك */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/account";
  }
  if (raw === "/login" || raw === "/register") return "/account";
  if (raw.startsWith("/admin") || raw.startsWith("/owner")) return "/account";
  return raw;
}

type LoginRole = "customer" | "courier";

/**
 * شاشة الدخول الموحّدة — تطبيق واحد للجميع (الجولة 24):
 * مبدّل أعلى البطاقة يحدد الدور: [عميل] أو [مندوب توصيل] — نفس التطبيق
 * المثبَّت ونفس الرابط، والصلاحيات تتحدد تلقائياً بعد الدخول:
 *  • عميل → تطبيق المشتريات المعتاد (بطاقة الخصم/المتاجر/الطلبات)
 *  • مندوب → لوحة المندوب الميدانية (النداءات/المهام/الأرباح) مع إمكانية
 *    التبديل لوضع العميل في أي وقت من نفس التطبيق.
 */
function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, hydrated } = useCustomerAuth();
  const login = useCustomerLogin();
  const prefersReduced = usePrefersReducedMotion();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  /* تهيئة كسولة من الرابط العميق: /login?mode=courier يفتح تبويب
     المندوب مباشرة — البوابات القديمة (/courier/login) تحوّل هنا تلقائياً */
  const [role, setRole] = useState<LoginRole>(() =>
    searchParams.get("mode") === "courier" ? "courier" : "customer",
  );

  /* تنظيف الرابط بعد التهيئة الكسولة (بلا setState — منع السلاسل) */
  useEffect(() => {
    if (searchParams.get("mode") === "courier") {
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  /* ── حالة المندوب ── */
  const courierLogin = useCourierLogin();
  const { hasToken: hasCourierToken, hydrated: courierHydrated } =
    useCourierSession();
  const [justCourierLoggedIn, setJustCourierLoggedIn] = useState(false);
  const { data: courierMe, isLoading: courierMeLoading } =
    useCourierMe(justCourierLoggedIn);

  const nextUrl = sanitizeNext(searchParams.get("next"));

  /* وصل المستخدم هنا بعد انتهاء جلسته (refresh فشل) — أبلغه بلطف */
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast({
        title: "انتهت الجلسة",
        description: "يرجى تسجيل الدخول من جديد",
        variant: "destructive",
      });
      /* نظّف الباراميتر حتى لا يتكرر التوست عند إعادة التحميل */
      router.replace("/login");
    }
  }, [searchParams, toast, router]);

  useEffect(() => {
    if (role === "customer" && hydrated && accessToken) {
      router.replace(nextUrl);
    }
  }, [role, hydrated, accessToken, router, nextUrl]);

  /* مندوب مسجّل مسبقاً واختار وضع المندوب → وجهه فوراً للوحة */
  useEffect(() => {
    if (role === "courier" && courierHydrated && hasCourierToken && !justCourierLoggedIn) {
      router.replace("/courier/home");
    }
  }, [role, courierHydrated, hasCourierToken, justCourierLoggedIn, router]);

  /* قرار التوجيه بعد دخول المندوب حسب حالة التوثيق */
  useEffect(() => {
    if (justCourierLoggedIn && courierMe) {
      const target =
        courierMe.verification_status === "verified"
          ? "/courier/home"
          : "/courier/waiting";
      router.replace(target);
    }
  }, [justCourierLoggedIn, courierMe, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  function onSubmit(values: FormValues) {
    setFormError(null);
    if (role === "courier") {
      unlockCourierAudio();
      courierLogin.mutate(values, {
        onSuccess: () => {
          haptic("success");
          setJustCourierLoggedIn(true);
        },
        onError: (err: unknown) => {
          setFormError(
            err instanceof Error
              ? err.message
              : "تعذّر تسجيل الدخول كمندوب",
          );
        },
      });
      return;
    }
    login.mutate(values, {
      onSuccess: () => {
        router.replace(nextUrl);
      },
      onError: (e: Error) => {
        /* رسالة الخادم العربية تُعرض هنا مباشرة (detail) */
        setFormError(e.message || "تعذّر تسجيل الدخول");
      },
    });
  }

  const busy =
    role === "courier"
      ? courierLogin.isPending || (justCourierLoggedIn && courierMeLoading)
      : login.isPending;

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <AuthShell>
      <motion.div
        {...cardAnimation}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="login-card-shimmer rounded-2xl border-border/60 bg-card/95 shadow-soft-lg backdrop-blur-sm">
          {/* ── مبدّل الدور: عميل / مندوب — تطبيق واحد للجميع ── */}
          <div className="px-4 pt-4 sm:px-6 sm:pt-6" role="tablist" aria-label="نوع الحساب">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={role === "customer"}
                onClick={() => {
                  setRole("customer");
                  setFormError(null);
                  haptic("tick");
                }}
                className={cn(
                  "native-tap flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all sm:text-sm",
                  role === "customer"
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CircleUserRound className="h-4.5 w-4.5" aria-hidden="true" />
                دخول كعميل
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === "courier"}
                onClick={() => {
                  setRole("courier");
                  setFormError(null);
                  haptic("tick");
                }}
                className={cn(
                  "native-tap flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all sm:text-sm",
                  role === "courier"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Bike className="h-4.5 w-4.5" aria-hidden="true" />
                مندوب توصيل
              </button>
            </div>
          </div>

          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {role === "customer" ? "أهلاً بك من جديد" : "دخول مندوبي توفير"}
            </CardTitle>
            <CardDescription>
              {role === "customer"
                ? "أدخل بياناتك للوصول إلى بطاقتك وحسابك — وفّر أكثر.. عِش أجمل"
                : "جاهز لاستقبال نداءات اليوم؟ لننطلق — نفس تطبيق توفير بصلاحيات المندوب"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {role === "courier"
                    ? "البريد الإلكتروني أو جوال المندوب"
                    : "البريد الإلكتروني أو رقم الجوال"}
                </Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  autoFocus
                  dir="ltr"
                  className="text-left"
                  disabled={busy}
                  aria-invalid={!!formState.errors.identifier}
                  {...register("identifier")}
                />
                {formState.errors.identifier && (
                  <p className="text-xs text-destructive" role="alert">
                    {formState.errors.identifier.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                  {role === "customer" && (
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs font-medium text-secondary transition-colors hover:text-secondary/80 hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  dir="ltr"
                  className="text-left"
                  disabled={busy}
                  aria-invalid={!!formState.errors.password}
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-xs text-destructive" role="alert">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* حوار استعادة كلمة المرور — عميل فقط */}
              {role === "customer" && (
                <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
              )}

              {/* خطأ الخادم — رسالة عربية من detail مباشرة */}
              {formError && (
                <p
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full min-h-[44px] gap-2 rounded-full",
                  role === "courier" && "bg-primary",
                )}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : role === "courier" ? (
                  <Bike className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {busy
                  ? "جارٍ الدخول..."
                  : role === "courier"
                    ? "دخول لوحة المندوب"
                    : "تسجيل الدخول"}
              </Button>

              {/* إنشاء حساب مندوب جديد — من نفس شاشة الدخول */}
              {role === "courier" && (
                <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-4 text-center">
                  <p className="text-xs font-bold text-foreground">
                    ليس لديك حساب مندوب؟
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    انضم لفريق توصيل توفير وابدأ باستقبال النداءات اليوم
                  </p>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-[44px] w-full gap-2 rounded-full border-primary/40 font-bold"
                  >
                    <Link href="/courier/register">
                      <Bike className="h-4 w-4" aria-hidden="true" />
                      إنشاء حساب مندوب توصيل
                    </Link>
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex w-full flex-col items-center gap-3">
        {role === "customer" ? (
          <>
            <p className="text-sm text-muted-foreground">
              ليس لديك حساب؟{" "}
              <Link
                href="/register"
                className="font-bold text-[color:var(--logo-gold-light)] hover:underline"
              >
                سجّل الآن
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              تريد العمل معنا في التوصيل؟{" "}
              <Link
                href="/courier/register"
                className="font-bold text-primary hover:underline"
              >
                أنشئ حساب مندوب توصيل
              </Link>
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setRole("customer")}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary/80 native-tap"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            العودة لدخول العملاء
          </button>
        )}
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground/80 transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>
      </div>
    </AuthShell>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense>
      <CustomerLoginForm />
    </Suspense>
  );
}
