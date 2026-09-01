"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ForgotPasswordDialog } from "@/components/shared/ForgotPasswordDialog";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useOwnerAuth, useOwnerLogin } from "@/hooks/useOwnerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "اسم المستخدم أو البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
type FormValues = z.infer<typeof schema>;

function OwnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, hydrated } = useOwnerAuth();
  const login = useOwnerLogin();
  const rawNext = searchParams.get("next") || "";
  const nextUrl = (() => {
    if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")) {
      if (rawNext === "/" || rawNext.startsWith("/owner/")) return rawNext;
    }
    return "/owner";
  })();
  const prefersReduced = usePrefersReducedMotion();
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { toast } = useToast();

  /* وصل المستخدم هنا بعد انتهاء جلسته (refresh فشل) — أبلغه بلطف */
  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast({
        title: "انتهت الجلسة",
        description: "يرجى تسجيل الدخول من جديد",
        variant: "destructive",
      });
      router.replace("/owner/login");
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
    login.mutate({ ...values, remember: rememberMe });
  }

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } };

  /* ✦ الجلد 2-b: قشرة AuthShell الموحّدة — كحلي غامر + هالات زمردية/ذهبية
     + الشعار الكامل المقصوص variant=full + تاغلاين «وفّر أكثر.. عِش أجمل» */
  return (
    <AuthShell backHref="/">
      {/* h1 لكل صفحة — الوصولية */}
      <h1 className="sr-only">تسجيل الدخول — بوابة مالكي المتاجر</h1>
      {/* زر تثبيت تطبيق المالك — فوق نموذج الدخول */}
      <PWAInstallButton portal="owner" variant="full" />

      {/* بطاقة الدخول */}
      <motion.div
        {...cardAnimation}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="w-full"
      >
        <Card className="login-card-shimmer rounded-2xl border-border/60 bg-card/95 shadow-soft-lg backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">بوابة المالك</CardTitle>
            <CardDescription>
              تسجيل دخول أصحاب المتاجر — وفّر أكثر.. عِش أجمل
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="identifier">البريد الإلكتروني أو اسم المستخدم</Label>
                <Input
                  id="identifier"
                  autoComplete="email"
                  autoFocus
                  dir="ltr"
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

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  aria-label="تذكرني"
                />
                <Label htmlFor="remember-me" className="text-sm cursor-pointer select-none">
                  تذكرني (7 أيام)
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full min-h-[44px] rounded-full"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* روابط سفلية فوق الكحلي — أبيض/ذهبي هوية */}
      <div className="flex w-full flex-col items-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للرئيسية
        </Link>
        {/* تسجيل متجر جديد — لمن لديه متجر وغير مسجل */}
        <Link
          href="/owner/register"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-[color:var(--logo-gold-light)] hover:underline"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          لديك متجر وليس لديك حساب؟ سجّل متجرك
        </Link>
        <span className="text-xs text-white/50">
          بوابة أصحاب المتاجر — توفير
        </span>
      </div>
    </AuthShell>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense>
      <OwnerLoginForm />
    </Suspense>
  );
}
