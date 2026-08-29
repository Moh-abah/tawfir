"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  ImagePlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ImageUrlField } from "@/components/shared/ImageUrlField";
import { resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "@/services/upload.service";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — مطابق للخادم
const MAX_SIDE = 1200; // أقصى بُعد بعد الضغط
const QUALITY = 0.85;

interface ImageUploaderProps {
  id?: string;
  /** القيمة الحالية (مسار نسبي /uploads/... أو رابط كامل أو نص فارغ). */
  value: string;
  onChange: (value: string) => void;
  /** مجلد الرفع في الخادم — products للمنتجات وfacilities للمتاجر. */
  folder: "products" | "facilities";
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * ضغط الصورة جانبياً قبل الرفع (canvas):
 * - تصغير لأقصى بُعد 1200px (صور كاميرات الموبايل 4000px+ ضخمة)
 * - تحويل إلى webp بجودة 0.85 — رفع أسرع وقبول مضمون
 * - لو كان الناتج أكبر من الأصل (نادر) يُرفع الأصل كما هو
 */
async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    // صورة صغيرة أصلاً وليست webp → حوّلها webp مضغوطة على أي حال للتوحيد
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName || "image"}.webp`, { type: "image/webp" });
  } catch {
    // متصفح لا يدعم createImageBitmap أو صورة غير قابلة للفك — ارفعها كما هي
    return file;
  }
}

/**
 * رافع الصور الحقيقي — الجولة الختامية.
 *
 * POST /api/v1/uploads (multipart: file + folder) — للمالك/المشرف فقط.
 * - منطقة سحب وإفلات + زر «اختر من الجهاز» + معاينة فورية
 * - تحقق جانبي: النوع + الحجم ≤ 5MB (رسائل عربية مطابقة للخادم)
 * - ضغط canvas (1200px / 0.85 / webp) قبل الإرسال
 * - شريط تقدم فعلي (XHR upload progress) + إعادة محاولة عند الفشل
 * - خيار «أو ألصق رابطاً» قابل للطي (ImageUrlField الحالي بداخله)
 */
export function ImageUploader({
  id,
  value,
  onChange,
  folder,
  label = "الصورة",
  hint,
  className,
  disabled,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const trimmed = value.trim();
  const uploading = progress !== null;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      // تحقق النوع — نفس رسالة الخادم العربية
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("نوع الصورة غير مسموح. المسموح: .png، .jpg، .jpeg، .webp");
        return;
      }
      // حد أقصى للمعالجة — فك ترميز صورة أضخم قد ينهار المتصفح على الموبايل
      // (الصور بين 5MB و25MB تُقبل إن أنقذها الضغط تحت الحد — سيناريو كاميرا الموبايل)
      if (file.size > 25 * 1024 * 1024) {
        setError("حجم الملف كبير جدًا — اختر صورة أصغر من 25MB");
        return;
      }
      setLastFile(file);
      setProgress(1);
      try {
        const compressed = await compressImage(file);
        if (compressed.size > MAX_SIZE_BYTES) {
          throw new Error("حجم الصورة يتجاوز 5MB حتى بعد الضغط — اختر صورة أصغر");
        }
        const result = await uploadImage(compressed, folder, (pct) => setProgress(pct));
        onChange(result.url);
        setProgress(null);
        toast({
          title: "تم رفع الصورة",
          description: `الحجم بعد الضغط: ${Math.round(compressed.size / 1024)}KB`,
        });
      } catch (e) {
        setProgress(null);
        setError(e instanceof Error ? e.message : "فشل رفع الصورة");
      }
    },
    [folder, onChange, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [disabled, uploading, handleFile]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium leading-none text-foreground">
          {label}
          <span className="text-muted-foreground"> (اختياري)</span>
        </label>
        <button
          type="button"
          onClick={() => setShowLink((s) => !s)}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          disabled={disabled || uploading}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {showLink ? "إخفاء حقل الرابط" : "أو ألصق رابطاً"}
        </button>
      </div>

      {/* منطقة السحب والإفلات / الرفع */}
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="رفع صورة — اسحبها هنا أو اضغط للاختيار من جهازك"
        aria-disabled={disabled || uploading}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
          dragOver
            ? "border-secondary bg-secondary/10"
            : "border-border bg-muted/30 hover:border-secondary/60 hover:bg-secondary/5",
          (disabled || uploading) && "cursor-not-allowed opacity-70"
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-secondary" aria-hidden="true" />
            <p className="text-sm font-medium">جارٍ الرفع... {progress}%</p>
            <div className="w-full max-w-[240px]">
              <Progress value={progress ?? 0} className="h-2" aria-label="تقدم رفع الصورة" />
            </div>
            <p className="text-xs text-muted-foreground">تُضغط الصورة تلقائياً قبل الإرسال</p>
          </>
        ) : trimmed ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="relative">
              <img
                src={resolveImageUrl(trimmed)}
                alt="معاينة الصورة المرفوعة"
                className="h-24 w-24 rounded-xl border border-border object-cover"
              />
              <span className="absolute -bottom-1.5 -left-1.5 rounded-full bg-secondary p-1 text-secondary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تمت إضافة الصورة — اضغط للاستبدال
            </p>
          </div>
        ) : (
          <>
            <span className="rounded-full bg-secondary/15 p-3 text-secondary">
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">اسحب الصورة هنا</p>
            <p className="text-xs text-muted-foreground">
              أو اضغط للاختيار من جهازك — PNG / JPG / WebP حتى 5MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5 rounded-full"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              اختر من الجهاز
            </Button>
          </>
        )}
      </div>

      {/* خطأ الرفع + إعادة المحاولة */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
        >
          <span className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </span>
          {lastFile && !uploading && (
            <button
              type="button"
              onClick={() => void handleFile(lastFile)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 font-bold underline-offset-2 hover:underline"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {/* حذف الصورة الحالية */}
      {trimmed && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled}
          onClick={() => {
            onChange("");
            setError(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          إزالة الصورة
        </Button>
      )}

      {/* حقل الرابط القابل للطي — ImageUrlField الحالي */}
      {showLink && (
        <ImageUrlField
          id={id ? `${id}-link` : undefined}
          value={value}
          onChange={onChange}
          label={`رابط ${label} مباشر`}
          hint={hint ?? "بديل الرفع: ألصق رابط صورة مباشراً (يُستخدم كما هو دون رفع)."}
          disabled={disabled || uploading}
        />
      )}
    </div>
  );
}
