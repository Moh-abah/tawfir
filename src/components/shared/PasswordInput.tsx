"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * حقل كلمة مرور مع زر إظهار/إخفاء (Eye / EyeOff).
 * يُستعمل في: دخول العميل، تسجيل العميل، دخول المالك، تسجيل المالك، دخول الأدمن.
 * يدعم كل خصائص <Input> العادي (register، autoComplete، disabled، إلخ).
 */
export interface PasswordInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "ref"
  > {
  /** تمرير "text" لإظهار كلمة المرور افتراضياً (للتعديل مثلاً)، يبقى زر التبديل يعمل */
  defaultVisible?: boolean;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(
  { className, defaultVisible = false, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(defaultVisible);
  const toggle = React.useCallback(() => setVisible((v) => !v), []);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pe-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        // تجنّب إرسال النموذج عند النقر على الزر
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
});
