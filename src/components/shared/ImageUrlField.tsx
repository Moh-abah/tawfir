"use client";

import { useState } from "react";
import { ImagePlus, Trash2, ExternalLink, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ImageUrlFieldProps {
  id?: string;
  /** القيمة الحالية (رابط الصورة أو نص فارغ). */
  value: string;
  /** يُستدعى عند كل تغيير للقيمة (نفس توقيع onChange في الحقول المُسجَّلة). */
  onChange: (value: string) => void;
  /** ربط react-hook-form اختياري (تُمرَّر النتيجة إلى Input). */
  onBlur?: () => void;
  /** اسم الحقل للوصول من أجل التركيز/الإكمال التلقائي. */
  name?: string;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * حقل رابط صورة محسّن — الجولة 5.
 *
 * ⚠️ سياق الباك إند: لا يوفّر الباك إند (حسب OpenAPI الحي) نقطة رفع صور
 * عامة (POST /uploads) — إنشاء/تعديل المنتجات والمنشآت يقبل `image_url`
 * نصياً فقط (JSON). لذلك يُحسَّن حقل الرابط بدل الرفع:
 *  - placeholder عربي واضح + إرشاد مختصر
 *  - تحقق فوري أن القيمة رابط صالح (http/https) قبل العرض
 *  - معاينة مباشرة للصورة عند لصق رابط صالح
 *  - زر «حذف الصورة» يمسح القيمة
 *  - تحذير لطيف إن كانت القيمة نصاً غير رابط
 * عند توفر POST /api/v1/uploads لاحقاً يُستبدل هذا المكوّن برافع فعلي
 * (drag & drop + multipart) — موثّق في BLOCKERS.md ومطلوب_من_الباك_ند.md.
 */
export function ImageUrlField({
  id,
  value,
  onChange,
  onBlur,
  name,
  label = "صورة المنتج",
  hint,
  className,
  disabled,
}: ImageUrlFieldProps) {
  // الرابط الذي فشل تحميله — يُقارن بالقيمة الحالية بدل إعادة الضبط عبر effect
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);

  const trimmed = value.trim();
  const isHttpUrl = /^https?:\/\/.+/i.test(trimmed);
  const isRelativePath = trimmed.startsWith("/");
  const isLikelyUrl = isHttpUrl || isRelativePath;
  const previewError = erroredUrl === trimmed;
  const showPreview = isLikelyUrl && trimmed.length > 3 && !previewError;

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none text-foreground"
      >
        {label}
        <span className="text-muted-foreground"> (اختياري)</span>
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ImagePlus
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://example.com/photo.jpg"
            className="min-h-[44px] pr-9 text-left"
            aria-describedby={id ? `${id}-hint` : undefined}
          />
        </div>
        {trimmed && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onChange("")}
            disabled={disabled}
            aria-label="حذف الصورة"
            title="حذف الصورة"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* إرشاد + حالة القيمة */}
      <p
        id={id ? `${id}-hint` : undefined}
        className={cn(
          "text-xs leading-relaxed",
          trimmed && !isLikelyUrl ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {hint ??
          "ألصق رابط صورة مباشراً (ينتهي بـ .jpg أو .png أو .webp). يظهر المعاينة تلقائياً."}
        {trimmed && !isLikelyUrl && (
          <span className="mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" aria-hidden="true" />
            القيمة الحالية ليست رابطاً صالحاً — يجب أن تبدأ بـ https://
          </span>
        )}
      </p>

      {/* المعاينة الفورية */}
      {showPreview && (
        <div className="relative inline-flex overflow-hidden rounded-xl border border-border bg-muted/40">
          { }
          <img
            src={resolveImageUrl(trimmed)}
            alt="معاينة الصورة"
            className="h-28 w-28 object-cover"
            onError={() => setErroredUrl(trimmed)}
            loading="lazy"
          />
          {isHttpUrl && (
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-1 left-1 rounded-lg bg-background/85 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              aria-label="فتح الرابط في تبويب جديد"
              title="فتح الرابط"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {/* فشل تحميل المعاينة */}
      {isLikelyUrl && previewError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          تعذّر تحميل المعاينة من هذا الرابط — تأكد أنه رابط صورة مباشر وصالح.
        </p>
      )}
    </div>
  );
}
