"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, LogIn, ArrowRight } from "lucide-react";
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
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ForgotPasswordDialog } from "@/components/shared/ForgotPasswordDialog";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useCustomerAuth, useCustomerLogin } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useToast } from "@/hooks/use-toast";

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

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, hydrated } = useCustomerAuth();
  const login = useCustomerLogin();
  const prefersReduced = usePrefersReducedMotion();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

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
    if (hydrated && accessToken) {
      router.replace(nextUrl);
    }
  }, [hydrated, accessToken, router, nextUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  function onSubmit(values: FormValues) {
    setFormError(null);
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

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      <ScreenHeader title="تسجيل الدخول" fallbackHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10 pb-24 sm:py-16">
        {/* الشعار */}
        <div className="flex flex-col items-center gap-3 text-center">
          <TawfirLogo className="h-14 w-auto" />
          <TawfirPillBadge />
        </div>

      <motion.div
        {...cardAnimation}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="login-card-shimmer rounded-2xl border-border/60 shadow-soft-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">أهلاً بك من جديد</CardTitle>
            <CardDescription>
              أدخل بياناتك للوصول إلى بطاقتك وحسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier">البريد الإلكتروني أو رقم الجوال</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  autoFocus
                  dir="ltr"
                  className="text-left"
                  disabled={login.isPending}
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
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-secondary transition-colors hover:text-secondary/80 hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  dir="ltr"
                  className="text-left"
                  disabled={login.isPending}
                  aria-invalid={!!formState.errors.password}
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-xs text-destructive" role="alert">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* حوار استعادة كلمة المرور — POST /auth/forgot-password */}
              <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />

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
                className="w-full min-h-[44px] gap-2 rounded-full"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-bold text-secondary hover:underline"
          >
            سجّل الآن
          </Link>
        </p>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
    </>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense>
      <CustomerLoginForm />
    </Suspense>
  );
}
