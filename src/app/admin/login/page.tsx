"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAdminAuth, useAdminLogin } from "@/hooks/useAdminAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TawfirLogo } from "@/components/shared/TawfirLogo"; // ✅ استيراد الشعار الجديد
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

  const floatVariants = prefersReduced
    ? { initial: { opacity: 0.15 }, animate: { opacity: 0.15 } }
    : {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 0.15, scale: 1 },
    };

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

  return (
    // ✅ التعديل 1 – الحاوية: حذف style واستبدالها بالكلاسات
    <div
      className={cn(
        "login-page-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4",
        !prefersReduced && "animate-hero-gradient"
      )}
    >
      {/* Decorative background pattern */}
      <div className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

      {/* ✅ التعديل 2 – الأشكال العائمة: استبدال style بالكلاسات */}
      <motion.div
        className="login-shape-primary pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.2 }}
      />
      <motion.div
        className="login-shape-secondary pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.5 }}
      />
      <motion.div
        className="login-shape-accent pointer-events-none absolute top-1/3 right-[10%] h-48 w-48 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.8 }}
      />

      <div className="absolute left-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Logo / Brand area with floating animation */}
        <div
          className={cn(
            "flex flex-col items-center gap-3 text-center",
            !prefersReduced && "animate-float"
          )}
        >
          {/* ✅ التعديل 3 – استبدال الشعار القديم بمكوّن TawfirLogo الجديد */}
          <TawfirLogo  className="h-24 w-24" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold">توفير</span>
            <span className="text-sm text-muted-foreground">لوحة تحكم المشرفين</span>
          </div>
        </div>

        <motion.div
          {...cardAnimation}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* ✅ التعديل 4 – الكارد: تعديل الخلفية والحدود ليتكيف مع الوضعين */}
          <Card className="border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl login-card-shimmer">
            <CardHeader className="text-center">
              <CardTitle>تسجيل الدخول</CardTitle>
              <CardDescription>أدخل بيانات الاعتماد للوصول للوحة التحكم</CardDescription>
            </CardHeader>
            <CardContent>
              <motion.form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={formStagger}
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
                    className="w-full min-h-[44px]"
                    disabled={login.isPending}
                  >
                    {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
                  </Button>
                </motion.div>
              </motion.form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للموقع
          </Link>
          <span className="text-xs text-muted-foreground/60">
            مدعوم من توفير
          </span>
        </div>
      </div>
    </div>
  );
}