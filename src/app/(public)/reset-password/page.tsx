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
import { AuthShell } from "@/components/shared/AuthShell";
import { authFlowService } from "@/services/auth-flow.service";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";

/**
 * صفحة إعادة تعيين كلمة المرور — /reset-password?token=...
 * التوكن أحادي الاستخدام (30 دقيقة) يصل عبر البريد من رابط الاستعادة.
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLang();
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
        title: t("auth.reset.doneTitle"),
        description: t("auth.reset.toastDesc"),
      });
      setTimeout(() => router.push("/login"), 2500);
    },
    onError: (e: Error) => {
      setFieldError(e.message || t("auth.reset.errGeneric"));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (newPassword.length < 8) {
      setFieldError(t("auth.reset.errMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError(t("auth.reset.errMismatch"));
      return;
    }
    mutation.mutate();
  }

  return (
    <AuthShell backHref="/login">
      <Card className="w-full rounded-2xl border-border/60 bg-card/95 shadow-soft-lg backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("auth.reset.title")}</CardTitle>
          <CardDescription>
            {t("auth.reset.desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div role="status" className="flex flex-col items-center gap-3 p-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">
                {t("auth.reset.doneTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("auth.reset.redirecting")}
              </p>
            </div>
          ) : !token ? (
            /* لا توكن في الرابط — الرابط غير صالح */
            <div role="alert" className="space-y-4 p-2 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-bold text-foreground">{t("auth.reset.invalidLink")}</p>
              <p className="text-xs text-muted-foreground">
                {t("auth.reset.invalidLinkDesc")}
              </p>
              <Button asChild className="min-h-[44px] w-full rounded-full">
                <Link href="/login">{t("auth.reset.backToLogin")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="reset-new">{t("auth.reset.newPassword")}</Label>
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
                <p className="text-xs text-muted-foreground">{t("auth.reset.minHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">{t("auth.field.passwordConfirm")}</Label>
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
                {mutation.isPending ? t("auth.reset.saving") : t("auth.reset.saveCta")}
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
        {t("auth.reset.backToLogin")}
      </Link>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
