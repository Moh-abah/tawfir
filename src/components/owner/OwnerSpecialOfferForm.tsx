"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, CalendarClock, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOwnerProducts } from "@/hooks/useOwnerProducts";
import { useCreateSpecialOffer } from "@/hooks/useSpecialOffers";
import { formatCurrency } from "@/lib/format";
import type { SpecialOfferCreate } from "@/types/api.generated";

/* ──────────────────────────────────────────────────────────── */
/*  مخطّط التحقق — zod                                          */
/* ──────────────────────────────────────────────────────────── */
const offerSchema = z
  .object({
    product_id: z
      .number({ message: "اختر المنتج" })
      .int()
      .positive({ message: "اختر المنتج" }),
    title: z
      .string()
      .trim()
      .min(3, { message: "العنوان يجب أن يكون 3 أحرف على الأقل" })
      .max(255, { message: "العنوان طويل جداً (255 حد أقصى)" }),
    offer_discount_rate: z
      .number()
      .int()
      .min(10, { message: "الخصم الأدنى 10%" })
      .max(50, { message: "الخصم الأقصى 50%" }),
    quantity_limit: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^\d+$/.test(v.trim()),
        { message: "الكمية يجب أن تكون رقماً صحيحاً" }
      )
      .refine(
        (v) => !v || parseInt(v, 10) > 0,
        { message: "الكمية يجب أن تكون أكبر من صفر" }
      ),
    ends_at: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.ends_at) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(data.ends_at);
      if (Number.isNaN(picked.getTime())) return false;
      picked.setHours(0, 0, 0, 0);
      return picked.getTime() >= today.getTime();
    },
    {
      message: "تاريخ الانتهاء يجب أن يكون اليوم أو بعده",
      path: ["ends_at"],
    }
  );

type OfferFormValues = z.infer<typeof offerSchema>;

interface OwnerSpecialOfferFormProps {
  facilityId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES: OfferFormValues = {
  product_id: 0,
  title: "",
  offer_discount_rate: 30,
  quantity_limit: "",
  ends_at: "",
};

/* ──────────────────────────────────────────────────────────
   غلاف استجابي (الجولة 4): Dialog على الديسكتوب
   و BottomSheet (rounded-t-2xl + مقبض سحب + safe-area)
   على الموبايل — نفس المحتوى تماماً.
   ────────────────────────────────────────────────────────── */
function ResponsiveOfferShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="scroll-area-thin max-h-[85dvh] overflow-y-auto
            rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <div className="bottom-sheet-grip mt-1" aria-hidden="true" />
          <SheetHeader className="text-right">
            <SheetTitle className="flex items-center gap-2 text-right text-base">
              {title}
            </SheetTitle>
            <SheetDescription className="text-right">
              {description}
            </SheetDescription>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          wide
            ? "rounded-2xl sm:max-w-lg"
            : "rounded-2xl sm:max-w-md"
        }
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function OwnerSpecialOfferForm({
  facilityId,
  open,
  onOpenChange,
}: OwnerSpecialOfferFormProps) {
  const [submitting, setSubmitting] = useState(false);

  // جلب منتجات المنشأة (نأخذ 100 منتج — يكفي للقائمة المنسدلة)
  const { data: productsData, isLoading: productsLoading } = useOwnerProducts(
    facilityId,
    { page: 1, page_size: 100 }
  );

  const createMutation = useCreateSpecialOffer();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  // عند الإغلاق: نُعيد الضبط
  useEffect(() => {
    if (!open) {
      reset(DEFAULT_VALUES);
    }
  }, [open, reset]);

  // المنتجات المتاحة فقط (is_available === true)
  const availableProducts = useMemo(() => {
    const items = productsData?.items ?? [];
    return items.filter((p) => p.is_available);
  }, [productsData]);

  const discountRate = watch("offer_discount_rate");
  const quantityLimit = watch("quantity_limit");
  const endsAt = watch("ends_at");
  const productId = watch("product_id");

  const selectedProduct = useMemo(() => {
    if (!productId) return null;
    return availableProducts.find((p) => p.id === productId) ?? null;
  }, [productId, availableProducts]);

  // معاينة السعر التقديرية (للعرض فقط — الحساب الحقيقي في الخادم)
  const pricePreview = useMemo(() => {
    if (!selectedProduct) return null;
    const base = parseFloat(selectedProduct.price);
    if (Number.isNaN(base)) return null;
    const discount = (base * discountRate) / 100;
    return {
      base,
      final: base - discount,
    };
  }, [selectedProduct, discountRate]);

  // ملاحظة: لا نُعيد null عند !open — الغلاف يبقى مركّباً حتى يستقر
  // useIsMobile من أول تحميل (بلا وميض Dialog→Sheet على الموبايل)،
  // وDialog/Sheet نفسهما لا يعرضان شيئاً وهما مغلقان.

  // حالة: لا توجد منتجات متاحة
  if (!productsLoading && availableProducts.length === 0) {
    return (
      <ResponsiveOfferShell
        open={open}
        onOpenChange={onOpenChange}
        title={
          <>
            <Sparkles className="h-5 w-5 text-primary" />
            إنشاء عرض خاص
          </>
        }
        description="لا توجد منتجات متاحة في منشأتك. أضف منتجات أولاً لتتمكّن من إنشاء عروض خاصة عليها."
      >
        <div className="flex flex-row-reverse gap-2">
          <Button
            variant="outline"
            className="native-tap min-h-[44px] rounded-full"
            onClick={() => onOpenChange(false)}
          >
            حسناً
          </Button>
        </div>
      </ResponsiveOfferShell>
    );
  }

  const onSubmit = (values: OfferFormValues) => {
    setSubmitting(true);

    const payload: SpecialOfferCreate = {
      product_id: values.product_id,
      title: values.title.trim(),
      offer_discount_rate: values.offer_discount_rate,
      quantity_limit:
        values.quantity_limit && values.quantity_limit.trim() !== ""
          ? parseInt(values.quantity_limit, 10)
          : null,
      ends_at: values.ends_at && values.ends_at.trim() !== ""
        ? new Date(values.ends_at).toISOString()
        : null,
    };

    createMutation.mutate(
      { facilityId, data: payload },
      {
        onSuccess: () => {
          setSubmitting(false);
          onOpenChange(false);
        },
        onError: () => {
          setSubmitting(false);
        },
      }
    );
  };

  return (
    <ResponsiveOfferShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <Sparkles className="h-5 w-5 text-primary" />
          إنشاء عرض خاص
        </>
      }
      description="أنشئ عرضاً حصرياً لأعضاء توفير — سيُشعِر كل الأعضاء فور نشره."
      wide
    >

        {productsLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="نموذج إنشاء عرض خاص"
          >
            {/* اختيار المنتج */}
            <div className="space-y-2">
              <Label htmlFor="offer-product">اختيار المنتج *</Label>
              <Controller
                control={control}
                name="product_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    dir="rtl"
                  >
                    <SelectTrigger
                      id="offer-product"
                      className="w-full min-h-[44px]"
                      aria-invalid={!!errors.product_id}
                    >
                      <SelectValue placeholder="اختر منتجاً من قائمتك..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatCurrency(p.price)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.product_id && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.product_id.message as string}
                </p>
              )}
            </div>

            {/* عنوان العرض */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="offer-title">عنوان العرض *</Label>
                <span className="text-xs text-muted-foreground">
                  {watch("title").length}/255
                </span>
              </div>
              <Input
                id="offer-title"
                placeholder="مثال: عرض حصري — 10 دجاجات بخصم 30%"
                maxLength={255}
                aria-invalid={!!errors.title}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.title.message as string}
                </p>
              )}
            </div>

            {/* نسبة الخصم */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="offer-discount">نسبة الخصم *</Label>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                  {discountRate}%
                </span>
              </div>
              <Controller
                control={control}
                name="offer_discount_rate"
                render={({ field }) => (
                  <Slider
                    id="offer-discount"
                    min={10}
                    max={50}
                    step={5}
                    value={[field.value]}
                    onValueChange={(values: number[]) => {
                      if (values.length > 0) field.onChange(values[0]);
                    }}
                    aria-label="نسبة الخصم"
                  />
                )}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>10% (الأدنى)</span>
                <span>50% (الأقصى)</span>
              </div>
              {errors.offer_discount_rate && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.offer_discount_rate.message as string}
                </p>
              )}

              {/* معاينة السعر */}
              {pricePreview && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">السعر الأساسي:</span>
                    <span className="line-through text-muted-foreground">
                      {formatCurrency(pricePreview.base)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-medium">بعد خصم العضو:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(pricePreview.final)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    * السعر النهائي للأعضاء قد يُحسب بخصم إضافي بحسب نسبة
                    منشأتك.
                  </p>
                </div>
              )}
            </div>

            {/* كمية محددة */}
            <div className="space-y-2">
              <Label htmlFor="offer-quantity">كمية محددة (اختياري)</Label>
              <Input
                id="offer-quantity"
                type="number"
                min={1}
                inputMode="numeric"
                dir="ltr"
                placeholder="اتركه فارغاً = غير محدود"
                aria-invalid={!!errors.quantity_limit}
                {...register("quantity_limit")}
              />
              {errors.quantity_limit ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.quantity_limit.message as string}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  عند بيع هذه الكمية يُنهى العرض تلقائياً.
                </p>
              )}
              {quantityLimit && quantityLimit.trim() !== "" && /^\d+$/.test(quantityLimit.trim()) && (
                <p className="text-xs text-primary">
                  سيتم إنهاء العرض بعد بيع {parseInt(quantityLimit, 10)} وحدة.
                </p>
              )}
            </div>

            {/* تاريخ الانتهاء */}
            <div className="space-y-2">
              <Label htmlFor="offer-ends" className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                تاريخ انتهاء (اختياري)
              </Label>
              <Input
                id="offer-ends"
                type="date"
                dir="ltr"
                aria-invalid={!!errors.ends_at}
                {...register("ends_at")}
              />
              {errors.ends_at ? (
                <p className="text-xs text-destructive" role="alert">
                  {errors.ends_at.message as string}
                </p>
              ) : endsAt ? (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  سينتهي العرض في {new Date(endsAt).toLocaleDateString("ar-EG")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <InfinityIcon className="h-3 w-3" />
                  اتركه فارغاً = عرض دائم بدون تاريخ انتهاء.
                </p>
              )}
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-row-reverse gap-2 pt-2">
              <Button
                type="submit"
                className="native-tap min-h-[44px] flex-1 gap-2 rounded-full"
                disabled={submitting || createMutation.isPending}
              >
                {(submitting || createMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Sparkles className="h-4 w-4" />
                نشر العرض
              </Button>
              <Button
                type="button"
                variant="outline"
                className="native-tap min-h-[44px] rounded-full"
                disabled={submitting || createMutation.isPending}
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        )}
    </ResponsiveOfferShell>
  );
}
