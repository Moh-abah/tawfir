"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/shared/ImageUploader";
import {
  useCreateFacility,
  useUpdateFacility,
} from "@/hooks/useAdminFacilities";
import { useRegions } from "@/hooks/useRegions";
import { useAdminCards } from "@/hooks/useAdminCards";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { ApiError } from "@/services/api-client";
import type { HTTPValidationError, Facility, FacilityType } from "@/types/api.generated";

const TYPE_OPTIONS: { value: FacilityType; label: string }[] = [
  { value: "restaurant", label: "مطعم" },
  { value: "cafe", label: "مقهى" },
];

const schema = z.object({
  name: z.string().min(2, "الاسم قصير جدًا"),
  type: z.string().min(1, "النوع مطلوب"),
  region_id: z.string().min(1, "المنطقة مطلوبة"),
  description: z.string(),
  is_visible: z.boolean(),
  display_order: z.number().int().min(0, "قيمة غير صحيحة"),
  card_ids: z.array(z.number()),
  owner_id: z.string(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^7[01378]\d{7}$/u.test(v), {
      message: "أدخل رقم جوال يمني صحيح (مثال: 7XXXXXXXX)",
    }),
  working_hours: z.string(),
  image_url: z.string(),
  discount_rate: z
    .number()
    .int("يجب أن يكون عدداً صحيحاً")
    .min(0, "النسبة لا يمكن أن تكون أقل من 0")
    .max(100, "النسبة لا يمكن أن تتجاوز 100"),
});

type FormValues = z.infer<typeof schema>;

function getDefaultValues(facility?: Facility): FormValues {
  return {
    name: facility?.name ?? "",
    type: facility?.type ?? "",
    region_id: facility?.region_id ? String(facility.region_id) : "",
    description: facility?.description ?? "",
    is_visible: facility?.is_visible ?? true,
    display_order: facility?.display_order ?? 0,
    card_ids: facility?.cards?.map((c) => c.id) ?? [],
    owner_id: facility?.owner_id ? String(facility.owner_id) : "",
    address: facility?.address ?? "",
    latitude: facility?.latitude ?? null,
    longitude: facility?.longitude ?? null,
    phone: facility?.phone ?? "",
    working_hours: facility?.working_hours ?? "",
    image_url: facility?.image_url ?? "",
    discount_rate: facility?.discount_rate ?? 30,
  };
}

interface FacilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Facility;
}

export function FacilityForm({ open, onOpenChange, initial }: FacilityFormProps) {
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const isPending = createFacility.isPending || updateFacility.isPending;
  const { data: regions } = useRegions(false);
  const { data: cardsData } = useAdminCards();
  const { data: usersData } = useAdminUsers();

  const cards = cardsData?.items ?? [];
  const owners = useMemo(
    () => (usersData?.items ?? []).filter((u) => u.role === "owner"),
    [usersData]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(initial),
  });

  const { register, handleSubmit, reset, setValue, formState } = form;

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(initial));
      form.clearErrors();
    }
  }, [open, initial, reset, form]);

  /** Map 422 validation errors from API to react-hook-form fields */
  const applyServerErrors = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 422 && err.body) {
        const body = err.body as HTTPValidationError;
        if (Array.isArray(body.detail)) {
          body.detail.forEach((ve) => {
            const fieldName = ve.loc[ve.loc.length - 1];
            if (typeof fieldName === "string") {
              form.setError(fieldName as keyof FormValues, { message: ve.msg, type: "server" });
            }
          });
        }
      }
    },
    [form]
  );

  function handleClose(next: boolean) {
    onOpenChange(next);
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      type: values.type as FacilityType,
      region_id: Number(values.region_id),
      description: values.description || null,
      is_visible: values.is_visible,
      display_order: values.display_order,
      card_ids: values.card_ids?.length ? values.card_ids : undefined,
      owner_id: values.owner_id ? Number(values.owner_id) : null,
      address: values.address || null,
      latitude: values.latitude,
      longitude: values.longitude,
      phone: values.phone || null,
      working_hours: values.working_hours || null,
      image_url: values.image_url || null,
      discount_rate: values.discount_rate,
    };

    try {
      if (initial) {
        await updateFacility.mutateAsync({ id: initial.id, data: payload });
      } else {
        await createFacility.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      applyServerErrors(err);
    }
  }

  const is_visible = useWatch({ control: form.control, name: "is_visible" });
  const regionId = useWatch({ control: form.control, name: "region_id" });
  const facilityType = useWatch({ control: form.control, name: "type" });
  const ownerId = useWatch({ control: form.control, name: "owner_id" });
  const selectedCardIds = useWatch({ control: form.control, name: "card_ids" }) ?? [];

  function toggleCard(cardId: number, checked: boolean | "indeterminate") {
    const current = form.getValues("card_ids") ?? [];
    if (checked === true) {
      if (!current.includes(cardId)) {
        setValue("card_ids", [...current, cardId]);
      }
    } else {
      setValue(
        "card_ids",
        current.filter((id) => id !== cardId)
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {initial ? "تعديل منشأة" : "إضافة منشأة"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "عدّل بيانات المنشأة ثم احفظ التغييرات."
              : "أدخل بيانات المنشأة الجديدة."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pl-1">
          <form
            id="facility-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 px-1"
          >
            {/* ─── الأساسية ─── */}
            <div className="space-y-2">
              <Label htmlFor="fac-name">اسم المنشأة *</Label>
              <Input
                id="fac-name"
                placeholder="مثال: مطعم الشرق"
                {...register("name")}
              />
              {formState.errors.name && (
                <p className="text-xs text-destructive">
                  {formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select
                  value={facilityType}
                  onValueChange={(v) => setValue("type", v)}
                  dir="rtl"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formState.errors.type && (
                  <p className="text-xs text-destructive">
                    {formState.errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>المنطقة *</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="fac-desc">الوصف</Label>
              <Textarea
                id="fac-desc"
                placeholder="وصف مختصر عن المنشأة..."
                rows={3}
                {...register("description")}
              />
              {formState.errors.description && (
                <p className="text-xs text-destructive">
                  {formState.errors.description.message}
                </p>
              )}
            </div>

            {/* ─── الظهور والترتيب ─── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="fac-visible">ظاهرة</Label>
                  <p className="text-xs text-muted-foreground">
                    إظهار المنشأة للعملاء
                  </p>
                </div>
                <Switch
                  id="fac-visible"
                  checked={is_visible}
                  onCheckedChange={(v) => setValue("is_visible", v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fac-order">الترتيب</Label>
                <Input
                  id="fac-order"
                  type="number"
                  min={0}
                  {...register("display_order", { valueAsNumber: true })}
                />
                {formState.errors.display_order && (
                  <p className="text-xs text-destructive">
                    {formState.errors.display_order.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* ─── البطاقات (متعدد اختيار) ─── */}
            <div className="space-y-2">
              <Label>البطاقات المرتبطة</Label>
              <div className="max-h-36 overflow-y-auto no-mobile-scrollbar rounded-md border p-3 space-y-2">
                {cards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    لا توجد بطاقات متاحة.
                  </p>
                ) : (
                  cards.map((card) => (
                    <label
                      key={card.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCardIds.includes(card.id)}
                        onCheckedChange={(checked) =>
                          toggleCard(card.id, checked)
                        }
                      />
                      <span className="text-sm">{card.name}</span>
                    </label>
                  ))
                )}
              </div>
              {formState.errors.card_ids && (
                <p className="text-xs text-destructive">
                  {formState.errors.card_ids.message}
                </p>
              )}
            </div>

            {/* ─── المالك ─── */}
            <div className="space-y-2">
              <Label>المالك</Label>
              <Select
                value={ownerId}
                onValueChange={(v) => setValue("owner_id", v)}
                dir="rtl"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر المالك (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {owners.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      لا يوجد مالكون
                    </SelectItem>
                  ) : (
                    owners.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.full_name} — {o.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formState.errors.owner_id && (
                <p className="text-xs text-destructive">
                  {formState.errors.owner_id.message}
                </p>
              )}
            </div>

            <Separator />

            {/* ─── معلومات التواصل ─── */}
            <div className="space-y-2">
              <Label htmlFor="fac-address">العنوان</Label>
              <Input
                id="fac-address"
                placeholder="مثال: شارع حدة - صنعاء"
                {...register("address")}
              />
              {formState.errors.address && (
                <p className="text-xs text-destructive">
                  {formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fac-lat">خط العرض (Latitude)</Label>
                <Input
                  id="fac-lat"
                  type="number"
                  step="any"
                  placeholder="15.3694"
                  {...register("latitude", {
                    valueAsNumber: true,
                    setValueAs: (v: string) =>
                      v === "" ? null : Number(v),
                  })}
                />
                {formState.errors.latitude && (
                  <p className="text-xs text-destructive">
                    {formState.errors.latitude.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fac-lng">خط الطول (Longitude)</Label>
                <Input
                  id="fac-lng"
                  type="number"
                  step="any"
                  placeholder="44.1910"
                  {...register("longitude", {
                    valueAsNumber: true,
                    setValueAs: (v: string) =>
                      v === "" ? null : Number(v),
                  })}
                />
                {formState.errors.longitude && (
                  <p className="text-xs text-destructive">
                    {formState.errors.longitude.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fac-phone">الهاتف</Label>
                <Input
                  id="fac-phone"
                  placeholder="7XXXXXXXX"
                  dir="ltr"
                  {...register("phone")}
                />
                {formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fac-hours">ساعات العمل</Label>
                <Input
                  id="fac-hours"
                  placeholder="مثال: 8 ص - 12 م"
                  {...register("working_hours")}
                />
                {formState.errors.working_hours && (
                  <p className="text-xs text-destructive">
                    {formState.errors.working_hours.message}
                  </p>
                )}
              </div>
            </div>

            <Controller
              name="image_url"
              control={form.control}
              render={({ field }) => (
                <ImageUploader
                  id="fac-image"
                  label="صورة المنشأة"
                  folder="facilities"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />

            <Separator />

            {/* ─── نسبة الخصم لتوفير (المشرف يمكنه تجاوز قيد 10-30%) ─── */}
            <div className="space-y-2">
              <Label htmlFor="fac-discount-rate">نسبة الخصم لتوفير</Label>
              <Input
                id="fac-discount-rate"
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                dir="ltr"
                {...register("discount_rate", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                0-100% — المشرف يمكنه تجاوز قيد 10-30%
              </p>
              {formState.errors.discount_rate && (
                <p className="text-xs text-destructive">
                  {formState.errors.discount_rate.message}
                </p>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            form="facility-form"
            disabled={isPending}
          >
            {isPending ? "جارٍ الحفظ..." : initial ? "حفظ" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
