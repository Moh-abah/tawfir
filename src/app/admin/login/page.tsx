"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
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
import { useAdminAuth, useAdminLogin } from "@/hooks/useAdminAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { ForgotPasswordDialog } from "@/components/shared/ForgotPasswordDialog";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { accessToken, hydrated } = useAdminAuth();
  const login = useAdminLogin();
  const prefersReduced = usePrefersReducedMotion();
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { toast } = useToast();

  /* وصل المستخدم هنا بعد انتهاء جلسته (refresh فشل) — أبلغه بلطف */
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("expired=1")) {
      toast({
        title: "انتهت الجلسة",
        description: "يرجى تسجيل الدخول من جديد",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/admin/login");
    }
  }, [toast]);

  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace("/admin");
    }
  }, [hydrated, accessToken, router]);

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

  const formStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.1 } },
  };

  const formFieldVariants = prefersReduced
    ? {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0 },
    }
    : {
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
    };

  /* ✦ الجلد 2-b: قشرة AuthShell الموحّدة — كحلي غامر + هالات زمردية/ذهبية
     + الشعار الكامل المقصوص variant=full + تاغلاين «وفّر أكثر.. عِش أجمل» */
  return (
    <AuthShell backHref="/">
      {/* h1 لكل صفحة — الوصولية (شاشة الدخول الإدارية) */}
      <h1 className="sr-only">تسجيل الدخول — لوحة تحكم توفير</h1>
      <motion.div
        {...cardAnimation}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="login-card-shimmer rounded-2xl border-border/60 bg-card/95 shadow-soft-lg backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              أدخل بيانات الاعتماد للوصول للوحة التحكم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              initial="hidden"
              animate="visible"
              variants={formStagger}
              noValidate
            >
              <motion.div className="space-y-2" variants={formFieldVariants}>
                <Label htmlFor="identifier">اسم المستخدم</Label>
                <Input
                  id="identifier"
                  autoComplete="identifier"
                  autoFocus
                  {...register("identifier")}
                />
                {formState.errors.identifier && (
                  <p className="text-xs text-destructive" role="alert">
                    {formState.errors.identifier.message}
                  </p>
                )}
              </motion.div>

              <motion.div className="space-y-2" variants={formFieldVariants}>
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
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-xs text-destructive" role="alert">
                    {formState.errors.password.message}
                  </p>
                )}
              </motion.div>

              {/* حوار استعادة كلمة المرور — POST /auth/forgot-password */}
              <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />

              <motion.div
                className="flex items-center"
                variants={formFieldVariants}
              >
                <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
                  <span className="text-sm text-muted-foreground">تذكرني (7 أيام)</span>
                </label>
              </motion.div>

              <motion.div variants={formFieldVariants}>
                <Button
                  type="submit"
                  className="w-full min-h-[44px] rounded-full"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  )}
                  {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
                </Button>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex w-full flex-col items-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة للموقع
        </Link>
        <span className="text-xs text-white/50">
          لوحة تحكم المشرفين — توفير
        </span>
      </div>
    </AuthShell>
  );
}
