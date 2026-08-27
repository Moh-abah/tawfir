"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { authFlowService } from "@/services/auth-flow.service";
import { useToast } from "@/hooks/use-toast";

/**
 * صفحة إعادة تعيين كلمة المرور — /reset-password?token=...
 * التوكن أحادي الاستخدام (30 دقيقة) يصل عبر البريد من رابط الاستعادة.
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authFlowService.resetPassword(token, newPassword),
    onSuccess: () => {
      setDone(true);
      toast({
        title: "تم تعيين كلمة المرور الجديدة",
        description: "سجّل دخولك الآن بكلمة المرور الجديدة",
      });
      setTimeout(() => router.push("/login"), 2500);
    },
    onError: (e: Error) => {
      setFieldError(e.message || "تعذّر إعادة التعيين — قد يكون الرابط منتهياً");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (newPassword.length < 8) {
      setFieldError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("التأكيد لا يطابق كلمة المرور الجديدة");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10 sm:py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <TawfirLogo className="h-14 w-auto" />
        <TawfirPillBadge />
      </div>

      <Card className="w-full rounded-2xl border-border/60 shadow-soft-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>
            أدخل كلمة المرور الجديدة لحسابك لإتمام الاستعادة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div role="status" className="flex flex-col items-center gap-3 p-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">
                تم تعيين كلمة المرور الجديدة
              </p>
              <p className="text-xs text-muted-foreground">
                سيتم تحويلك لصفحة الدخول خلال لحظات...
              </p>
            </div>
          ) : !token ? (
            /* لا توكن في الرابط — الرابط غير صالح */
            <div role="alert" className="space-y-4 p-2 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">رابط غير صالح</p>
              <p className="text-xs text-muted-foreground">
                رابط إعادة التعيين ناقص أو منتهٍ — اطلب رابطاً جديداً من صفحة الدخول.
              </p>
              <Button asChild className="min-h-[44px] w-full rounded-full">
                <Link href="/login">العودة لتسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="reset-new">كلمة المرور الجديدة</Label>
                <PasswordInput
                  id="reset-new"
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={mutation.isPending}
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">تأكيد كلمة المرور</Label>
                <PasswordInput
                  id="reset-confirm"
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={mutation.isPending}
                  minLength={8}
                  required
                />
              </div>

              {fieldError && (
                <p className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive" role="alert">
                  {fieldError}
                </p>
              )}

              <Button
                type="submit"
                className="min-h-[44px] w-full gap-2 rounded-full"
                disabled={mutation.isPending || !newPassword || !confirmPassword}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                {mutation.isPending ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Link
        href="/login"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        العودة لتسجيل الدخول
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
