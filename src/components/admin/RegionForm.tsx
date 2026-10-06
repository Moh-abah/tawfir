"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useCreateRegion,
  useUpdateRegion,
} from "@/hooks/useAdminRegions";
import type { MarketCountryCode } from "@/services/region.service";
import type { Region } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/**
 * نموذج إنشاء/تعديل منطقة — جولة v5 (الفصل الحقيقي للسوقين)
 * حقل جديد إلزامي: جنسية السوق (967 اليمن افتراضياً كما الباك إند،
 * أو 966 السعودية). في التعديل: تغيير الجنسية يورَّث لكل ما تحت
 * المنطقة — يُطلب تأكيد صريح قبل الحفظ (تحذير تأكيد).
 */

const COUNTRY_OPTIONS: Array<{
  code: MarketCountryCode;
  label: string;
  flag: string;
}> = [
  { code: "967", label: "اليمن", flag: "🇾🇪" },
  { code: "966", label: "السعودية", flag: "🇸🇦" },
];

/* ─── توليد slug لاتيني من الاسم العربي (قابل للتحرير بعد التوليد) ── */
const AR_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j",
  ح: "h", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q",
  ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ى: "a",
  ة: "a", ء: "", ئ: "y", ؤ: "w",
};

export function slugifyArabicName(name: string): string {
  const latin = name
    .trim()
    .split("")
    .map((ch) => AR_TO_LATIN[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  return latin || `region-${Date.now().toString(36)}`;
}

const schema = z.object({
  name: z.string().min(2, "الاسم قصير جدًا"),
  slug: z
    .string()
    .min(2, "المعرّف قصير جدًا")
    .regex(/^[a-z0-9-]+$/, "المعرّف: حروف لاتينية صغيرة وأرقام وشرطات فقط"),
  country_code: z.enum(["966", "967"]),
});
type FormValues = z.infer<typeof schema>;

interface RegionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Region;
  /** سوق يبدأ منه النموذج عند الإنشاء (من مبدّل أدمن المناطق). */
  defaultCountryCode?: MarketCountryCode;
}

export function RegionForm({
  open,
  onOpenChange,
  initial,
  defaultCountryCode = "967",
}: RegionFormProps) {
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const isPending = createRegion.isPending || updateRegion.isPending;
  /** تأكيد تغيير الجنسية في التعديل — يُفعَّل عند الخلاف عن الأصل. */
  const [confirmNationalityChange, setConfirmNationalityChange] =
    useState(false);

  const initialCountry = (initial?.country_code ??
    defaultCountryCode) as MarketCountryCode;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      country_code: initialCountry,
    },
    values: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      country_code: initialCountry,
    },
  });

  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const selectedCountry = watch("country_code");
  /** v5.1 — توليد slug تلقائياً من الاسم ما لم يُحرَّر يدوياً. */
  const slugTouched = useRef(Boolean(initial?.slug));
  const nationalityChanged =
    !!initial && selectedCountry !== initial.country_code;

  function handleClose(next: boolean) {
    if (!next) {
      reset({
        name: initial?.name ?? "",
        slug: initial?.slug ?? "",
        country_code: initialCountry,
      });
      setConfirmNationalityChange(false);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: FormValues) {
    /* تغيير جنسية منطقة قائمة = تأثير مورَّث — تأكيد صريح أولاً */
    if (nationalityChanged && !confirmNationalityChange) {
      setConfirmNationalityChange(true);
      return;
    }
    if (initial) {
      await updateRegion.mutateAsync({
        id: initial.id,
        data: {
          name: values.name,
          slug: values.slug,
          country_code: values.country_code,
        },
      });
    } else {
      await createRegion.mutateAsync({
        name: values.name,
        slug: values.slug || slugifyArabicName(values.name),
        country_code: values.country_code,
      });
    }
    reset({ name: "", slug: "", country_code: defaultCountryCode });
    setConfirmNationalityChange(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "تعديل منطقة" : "إضافة منطقة"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "عدّل اسم المنطقة أو جنسية سوقها ثم احفظ التغييرات."
              : "أدخل اسم المنطقة واختر سوقها (الجنسية)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region-name">اسم المنطقة</Label>
            <Input
              id="region-name"
              placeholder="مثال: الرياض"
              autoFocus
              {...register("name", {
                onChange: (e) => {
                  /* توليد slug تلقائي من الاسم حتى يقرر الأدمن تحريره */
                  if (!slugTouched.current) {
                    setValue("slug", slugifyArabicName(e.target.value), {
                      shouldValidate: false,
                    });
                  }
                },
              })}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="region-slug">
              المعرّف (slug){" "}
              <span className="text-[10px] font-normal text-muted-foreground">
                — يُولَّد تلقائياً وقابل للتعديل
              </span>
            </Label>
            <Input
              id="region-slug"
              dir="ltr"
              placeholder="riyadh"
              className="text-left"
              {...register("slug", {
                onChange: () => {
                  slugTouched.current = true;
                },
              })}
            />
            {formState.errors.slug && (
              <p className="text-xs text-destructive">
                {formState.errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>سوق المنطقة (الجنسية)</Label>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="سوق المنطقة"
            >
              {COUNTRY_OPTIONS.map((c) => {
                const active = selectedCountry === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      setValue("country_code", c.code, { shouldValidate: true })
                    }
                    className={cn(
                      "native-tap flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 text-sm font-bold transition-colors",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span aria-hidden="true">{c.flag}</span>
                    <span>{c.label}</span>
                    <span className="text-[10px] opacity-70">({c.code})</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              المنطقة تظهر حصراً في قوائم سوقها (المناطق/المتاجر لكل سوق
              منفصلة).
            </p>
          </div>

          {/* تحذير تأكيد تغيير الجنسية — تأثير مورَّث لكل ما تحت المنطقة */}
          {confirmNationalityChange && nationalityChanged && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                أنت تحوّل «{initial?.name}» من سوق{" "}
                {initial?.country_code === "966" ? "السعودية 🇸🇦" : "اليمن 🇾🇪"}{" "}
                إلى سوق{" "}
                {selectedCountry === "966" ? "السعودية 🇸🇦" : "اليمن 🇾🇪"}.
                الجنسية تورَّث لكل ما تحت المنطقة (متاجرها وبطاقاتها) وتنتقل
                فوراً بين قوائم السوقين. اضغط «حفظ» مرة أخرى للتأكيد.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "جارٍ الحفظ..."
                : nationalityChanged && confirmNationalityChange
                  ? "تأكيد ونقل المنطقة"
                  : initial
                    ? "حفظ"
                    : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
