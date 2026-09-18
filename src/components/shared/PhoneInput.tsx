"use client";

/**
 * PhoneInput — إدخال رقم الجوال اليمني الذكي (توفير — 2-a)
 * ═══════════════════════════════════════════════════════════════════
 * يعالج مشكلة المستخدم الحالية: كتابة الجوال بمسافات/شرطات أو برمز
 * الدولة (+967 / 0967 / 00967) أو بأرقام عربية-هندية كان يرفضها
 * التحقق القديم.
 *
 *   • يعرض قيمة منسّقة جميلاً "777 123 456" أثناء الكتابة (3-3-3).
 *   • onValueChange يرسل دائماً القيمة المطبّعة "777123456"
 *     (normalizeYemeniPhone) — فلا يصل للباك اند أي رمز دولة أو مسافات.
 *   • لا يفحص الصحة إطلاقاً — التحقق مسؤولية zod في الصفحة عبر
 *     validateYemeniPhone (تظهر الرسالة العربية عند الإرسال).
 *   • مزامنة خارجية آمنة: إعادة تعيين النموذج (value → "") تُفرّغ
 *     الحقل فوراً دون مسّ أثناء الكتابة الجارية.
 */

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatYemeniPhoneDisplay, normalizeYemeniPhone } from "@/lib/yemen";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /** القيمة المطبّعة "777123456" أو "" */
  value: string;
  /** يُستدعى بكل تغيير بالقيمة المطبّعة (9 خانات تبدأ بـ 7 أو "") */
  onValueChange: (normalized: string) => void;
  id: string;
}

export function PhoneInput({
  value,
  onValueChange,
  id,
  className,
  disabled,
  ...rest
}: PhoneInputProps) {
  /* القيمة المعروضة: تنسيق 3-3-3 أثناء الكتابة */
  const [display, setDisplay] = useState<string>(() =>
    formatYemeniPhoneDisplay(value),
  );

  /* آخر قيمة مزامَنة مع الأعلى — تُحدَّث عند الكتابة وعند الاستقبال
     (نمط «ضبط الحالة عند تغيّر الخاصية» الرسمي — بلا effects) */
  const [syncedValue, setSyncedValue] = useState(value);

  /* مزامنة خارجية (إعادة تعيين النموذج value → "") بلا مسّ الكتابة */
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDisplay(formatYemeniPhoneDisplay(value));
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    /* طبّع فوراً: يقبل "777 123 456" و"+967 777123456" و"07771234567" */
    const normalized = normalizeYemeniPhone(e.target.value);
    setSyncedValue(normalized);
    onValueChange(normalized);
    setDisplay(formatYemeniPhoneDisplay(normalized));
  };

  return (
    <div className="relative">
      <Phone
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        dir="ltr"
        value={display}
        onChange={handleChange}
        disabled={disabled}
        autoComplete="tel"
        placeholder="777 123 456"
        className={cn(
          "h-11 min-h-[44px] native-tap rounded-xl pl-9 pr-3 text-base tabular-nums tracking-wide",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
