"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { authFlowService, type PortalRoleKey } from "@/services/auth-flow.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PasswordChangeCardProps {
  /** الدور الحالي — يحدد عميل API وصفحة الدخول بعد الخروج. */
  role: PortalRoleKey;
  className?: string;
}

/** صفحة الدخول الخاصة بكل دور (للتوجيه بعد الخروج التلقائي). */
const LOGIN_PATH: Record<PortalRoleKey, string> = {
  customer: "/login",
  owner: "/owner/login",
  admin: "/admin/login",
};

/**
 * قسم «أمان الحساب» — تغيير كلمة المرور (الجولة الختامية).
 *
 * PUT /me/password → عند النجاح:
 * - الخادم يُبطل كل refresh tokens (كل الجلسات تنتهي)
 * - توست «تم التغيير — سجّل دخولك من جديد» ثم خروج تلقائي بعد 2 ثانية
 * أخطاء 400 تُعرض تحت الحقل (مثل «كلمة المرور الحالية غير صحيحة»).
 */
export function PasswordChangeCard({ role, className }: PasswordChangeCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [logoutIn, setLogoutIn] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      authFlowService.changePassword(role, {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: (res) => {
      toast({
        title: "تم تغيير كلمة المرور",
        description: res?.detail || "سجّل دخولك من جديد — انتهت كل جلساتك الأخرى",
      });
      /* خروج تلقائي بعد ثانيتين (كل refresh tokens بُطلت في الخادم) */
      setLogoutIn(2);
      const timer = setInterval(() => {
        setLogoutIn((v) => {
          if (v === null) return null;
          if (v <= 1) {
            clearInterval(timer);
            /* مسح الجلسة محلياً + توجيه — كل الجلسات بُطلت خادمياً */
            if (role === "customer") {
              document.cookie = "tawfir_customer_token=; Path=/; Max-Age=0; SameSite=Lax";
              document.cookie = "tawfir_customer_refresh=; Path=/; Max-Age=0; SameSite=Lax";
              window.location.assign("/login");
            } else if (role === "owner") {
              document.cookie = "tawfir_owner_token=; Path=/; Max-Age=0; SameSite=Lax";
              document.cookie = "tawfir_owner_refresh=; Path=/; Max-Age=0; SameSite=Lax";
              document.cookie = "tawfir_owner_remember=; Path=/; Max-Age=0; SameSite=Lax";
              window.location.assign("/owner/login");
            } else {
              document.cookie = "tawfir_admin_token=; Path=/; Max-Age=0; SameSite=Lax";
              document.cookie = "tawfir_admin_refresh=; Path=/; Max-Age=0; SameSite=Lax";
              document.cookie = "tawfir_admin_remember=; Path=/; Max-Age=0; SameSite=Lax";
              window.location.assign("/admin/login");
            }
            router.refresh();
            return null;
          }
          return v - 1;
        });
      }, 1000);
    },
    onError: (e: Error) => {
      /* 400 «كلمة المرور الحالية غير صحيحة» — تحت الحقل مباشرة */
      setFieldError(e.message || "تعذّر تغيير كلمة المرور");
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
      setFieldError("تأكيد كلمة المرور لا يطابق الجديدة");
      return;
    }
    if (newPassword === currentPassword) {
      setFieldError("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }
    mutation.mutate();
  }

  const busy = mutation.isPending || logoutIn !== null;

  return (
    <Card className={cn("rounded-2xl border-border/60 shadow-soft", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15">
            <ShieldCheck className="h-4.5 w-4.5 text-secondary" aria-hidden="true" />
          </span>
          أمان الحساب
        </CardTitle>
        <CardDescription>
          غيّر كلمة المرور دورياً لحماية حسابك — ستنتهي كل جلساتك الأخرى بعد التغيير.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logoutIn !== null ? (
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-xl bg-success/10 p-5 text-center"
          >
            <Loader2 className="h-6 w-6 animate-spin text-success" aria-hidden="true" />
            <p className="text-sm font-bold text-foreground">
              تم التغيير — سيتم تحويلك لصفحة الدخول خلال {logoutIn}...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="pw-current">كلمة المرور الحالية</Label>
              <PasswordInput
                id="pw-current"
                autoComplete="current-password"
                dir="ltr"
                className="text-left"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={busy}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pw-new">كلمة المرور الجديدة</Label>
                <PasswordInput
                  id="pw-new"
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={busy}
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">تأكيد الجديدة</Label>
                <PasswordInput
                  id="pw-confirm"
                  autoComplete="new-password"
                  dir="ltr"
                  className="text-left"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={busy}
                  minLength={8}
                  required
                />
              </div>
            </div>

            {/* خطأ الخادم/التحقق — تحت الحقول */}
            {fieldError && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {fieldError}
              </p>
            )}

            <Button
              type="submit"
              className="min-h-[44px] w-full gap-2 rounded-full sm:w-auto"
              disabled={busy || !currentPassword || !newPassword || !confirmPassword}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              {mutation.isPending ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
