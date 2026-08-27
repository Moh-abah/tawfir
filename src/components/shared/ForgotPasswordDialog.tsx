"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFlowService } from "@/services/auth-flow.service";
import type { ForgotPasswordOut } from "@/types/api.generated";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * حوار «نسيت كلمة المرور؟» — الجولة الختامية.
 *
 * POST /auth/forgot-password {email}:
 * - دائماً رسالة نجاح عامة (لا نكشف وجود الحساب)
 * - في الإنتاج القناة هي البريد (reset_token=null دائماً)
 * - خارج الإنتاج يُرجع reset_token للاختبار — نعرضه كملاحظة إن حضر
 */
export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ForgotPasswordOut | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authFlowService.forgotPassword(email.trim()),
    onSuccess: (data) => {
      setResult(data ?? { detail: "" });
      setFormError(null);
    },
    onError: (e: Error) => {
      setFormError(e.message || "تعذّر إرسال الطلب. حاول مرة أخرى.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError("أدخل بريدك الإلكتروني");
      return;
    }
    setResult(null);
    mutation.mutate();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      /* إعادة الحالة الابتدائية عند الإغلاق */
      setEmail("");
      setResult(null);
      setFormError(null);
      mutation.reset();
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15">
              <KeyRound className="h-4.5 w-4.5 text-secondary" aria-hidden="true" />
            </span>
            استعادة كلمة المرور
          </DialogTitle>
          <DialogDescription>
            أدخل بريدك الإلكتروني وسنرسل لك خطوات إعادة التعيين.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* النتيجة — رسالة عامة لا تكشف وجود الحساب */
          <div
            role="status"
            className="flex flex-col items-center gap-3 rounded-xl bg-success/10 p-5 text-center"
          >
            <MailCheck className="h-8 w-8 text-success" aria-hidden="true" />
            <p className="text-sm font-bold text-foreground">
              {result.detail ||
                "إن وُجد حساب بهذا البريد فستصلك رسالة بخطوات إعادة التعيين"}
            </p>
            <p className="text-xs text-muted-foreground">
              تحقق من صندوق الوارد (ومجلد الرسائل غير المرغوبة).
            </p>
            {/* خارج الإنتاج فقط — الخادم يرجع التوكن للاختبار */}
            {result.reset_token && (
              <p className="break-all rounded-lg bg-muted p-2 text-[11px] text-muted-foreground" dir="ltr">
                reset_token (بيئة اختبار): {result.reset_token}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full rounded-full"
              onClick={() => handleOpenChange(false)}
            >
              تم
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
              <Input
                id="forgot-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                className="text-left"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>

            {formError && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter className="flex-row-reverse gap-2">
              <Button
                type="submit"
                className="min-h-[44px] flex-1 gap-2 rounded-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MailCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {mutation.isPending ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] flex-1 rounded-full"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
