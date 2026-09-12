"use client";

/**
 * /courier/login — دخول المندوب (POST /courier/auth/login).
 * بعد النجاح: توجيه ذكي حسب حالة التوثيق:
 *   verified → /courier/home · غيرها → /courier/waiting
 * (التوجيه يعتمد على GET /courier/me بعد التخزين).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Bike, Loader2, LockKeyhole } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { useCourierLogin, useCourierMe, useCourierSession } from "@/hooks/useCourier";
import { unlockCourierAudio } from "@/lib/courier-call-sound";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "البريد أو الجوال مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
type FormValues = z.infer<typeof schema>;

function CourierLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasToken, hydrated } = useCourierSession();
  const login = useCourierLogin();

  /* بعد الدخول: قراءة الملف لقرار التوجيه (توثيق؟) */
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const { data: me, isLoading: meLoading } = useCourierMe(justLoggedIn);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast({
        title: "انتهت الجلسة",
        description: "يرجى تسجيل الدخول من جديد",
        variant: "destructive",
      });
      router.replace("/courier/login");
    }
  }, [searchParams, toast, router]);

  /* توطين موجود — توجيه فوري */
  useEffect(() => {
    if (hydrated && hasToken && !justLoggedIn) router.replace("/courier/home");
  }, [hydrated, hasToken, justLoggedIn, router]);

  /* قرار التوجيه بعد الدخول حسب حالة التوثيق */
  useEffect(() => {
    if (justLoggedIn && me) {
      const target =
        me.verification_status === "verified" ? "/courier/home" : "/courier/waiting";
      router.replace(target);
    }
  }, [justLoggedIn, me, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  function onSubmit(values: FormValues) {
    unlockCourierAudio();
    login.mutate(values, {
      onSuccess: () => {
        haptic("success");
        setJustLoggedIn(true);
      },
      onError: (err: unknown) => {
        toast({
          title: "تعذّر الدخول",
          description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      },
    });
  }

  const busy = login.isPending || (justLoggedIn && meLoading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full rounded-3xl border border-border/60 bg-card/90 p-6 shadow-soft backdrop-blur"
    >
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bike className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-extrabold text-foreground">
          دخول مندوبي توفير
        </h1>
        <p className="text-xs text-muted-foreground">
          جاهز لاستقبال نداءات اليوم؟ لننطلق
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="courier-identifier">البريد الإلكتروني أو الجوال</Label>
          <Input
            id="courier-identifier"
            autoComplete="username"
            inputMode="text"
            placeholder="courier@tawfir.local"
            aria-invalid={Boolean(formState.errors.identifier)}
            className="h-12 rounded-xl"
            {...register("identifier")}
          />
          {formState.errors.identifier && (
            <p role="alert" className="text-xs text-destructive">
              {formState.errors.identifier.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="courier-password">كلمة المرور</Label>
          <PasswordInput
            id="courier-password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(formState.errors.password)}
            className="h-12 rounded-xl"
            {...register("password")}
          />
          {formState.errors.password && (
            <p role="alert" className="text-xs text-destructive">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="h-13 w-full gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              جارٍ تجهيز بوابتك…
            </>
          ) : (
            <>
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              دخول
            </>
          )}
        </Button>
      </form>

      <p className="mt-5 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        ليس لديك حساب؟
        <Link
          href="/courier/register"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          سجّل كمندوب جديد
        </Link>
      </p>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Link
          href="/courier"
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          العودة لشاشة التعريف
        </Link>
      </p>
    </motion.div>
  );
}

export default function CourierLoginPage() {
  return (
    <AuthShell backHref="/courier">
      <Suspense fallback={null}>
        <CourierLoginForm />
      </Suspense>
    </AuthShell>
  );
}
