"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateCard,
  useUpdateCard,
} from "@/hooks/useAdminCards";
import { useRegions } from "@/hooks/useRegions";
import type { Card, CardCreate, CardUpdate } from "@/types/api.generated";

type CardInput = CardCreate;

const schema = z.object({
  name: z.string().min(2, "الاسم قصير جدًا"),
  platform_name: z.string().min(1, "اسم المنصة مطلوب"),
  region_id: z.string().min(1, "المنطقة مطلوبة"),
  display_order: z.number().int().min(0, "قيمة غير صحيحة"),
  is_published: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface CardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Card;
}

export function CardForm({ open, onOpenChange, initial }: CardFormProps) {
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const isPending = createCard.isPending || updateCard.isPending;
  const { data: regions } = useRegions(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      platform_name: initial?.platform_name ?? "",
      region_id: initial?.region_id ? String(initial.region_id) : "",
      display_order: initial?.display_order ?? 0,
      is_published: initial?.is_published ?? false,
    },
    values: {
      name: initial?.name ?? "",
      platform_name: initial?.platform_name ?? "",
      region_id: initial?.region_id ? String(initial.region_id) : "",
      display_order: initial?.display_order ?? 0,
      is_published: initial?.is_published ?? false,
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState } = form;

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? "",
        platform_name: initial?.platform_name ?? "",
        region_id: initial?.region_id ? String(initial.region_id) : "",
        display_order: initial?.display_order ?? 0,
        is_published: initial?.is_published ?? false,
      });
    }
  }, [open, initial, reset]);

  function handleClose(next: boolean) {
    onOpenChange(next);
  }

  async function onSubmit(values: FormValues) {
    const payload: CardCreate = {
      name: values.name,
      platform_name: values.platform_name,
      region_id: Number(values.region_id),
      display_order: values.display_order,
      is_published: values.is_published,
    };
    if (initial) {
      await updateCard.mutateAsync({ id: initial.id, data: payload satisfies CardUpdate });
    } else {
      await createCard.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPublished = useWatch({ control: form.control, name: "is_published" });
  const regionId = useWatch({ control: form.control, name: "region_id" });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "تعديل بطاقة" : "إضافة بطاقة"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "عدّل بيانات البطاقة ثم احفظ التغييرات."
              : "أدخل بيانات البطاقة الجديدة."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">اسم البطاقة</Label>
            <Input
              id="card-name"
              placeholder="مثال: بطاقة توفير الذهبية"
              {...register("name")}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">
                {formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-platform">اسم المنصة</Label>
            <Input
              id="card-platform"
              placeholder="مثال: Visa"
              {...register("platform_name")}
            />
            {formState.errors.platform_name && (
              <p className="text-xs text-destructive">
                {formState.errors.platform_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>المنطقة</Label>
            <Select
              value={regionId}
              onValueChange={(v) => setValue("region_id", v)}
              dir="rtl"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                {regions?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.region_id && (
              <p className="text-xs text-destructive">
                {formState.errors.region_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-order">الترتيب</Label>
            <Input
              id="card-order"
              type="number"
              min={0}
              {...register("display_order")}
            />
            {formState.errors.display_order && (
              <p className="text-xs text-destructive">
                {formState.errors.display_order.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="card-published">منشورة</Label>
              <p className="text-xs text-muted-foreground">
                إظهار البطاقة للعملاء
              </p>
            </div>
            <Switch
              id="card-published"
              checked={isPublished}
              onCheckedChange={(v) => setValue("is_published", v)}
            />
          </div>

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
              {isPending ? "جارٍ الحفظ..." : initial ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
