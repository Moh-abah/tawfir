"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { ArrowRight, MapPin, Loader2, Save, Check, Package, Eye, EyeOff, BadgeCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/format";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { ownerService } from "@/services/owner.service";
import { useUpdateMyFacility } from "@/hooks/useUpdateMyFacility";
import { useOwnerProducts } from "@/hooks/useOwnerProducts";
import type { Facility, OwnerFacilityUpdate } from "@/types/api.generated";
import { useQuery } from "@tanstack/react-query";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
};

export default function FacilityEditContent() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const router = useRouter();
const prefersReduced = usePrefersReducedMotion();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: facility, isLoading, isError, error } = useQuery<Facility>({
    queryKey: ["my-facility", facilityId],
    queryFn: () => ownerService.getMyFacility(facilityId),
  });

  const { data: productData } = useOwnerProducts(facilityId, { page: 1, page_size: 1 });

  const updateMutation = useUpdateMyFacility(facilityId);

  const form = useForm<OwnerFacilityUpdate>({
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      working_hours: "",
      image_url: "",
      is_visible: false,
      latitude: null,
      longitude: null,
    },
  });
  const { register, handleSubmit, control, reset } = form;

  // Populate form when data loads
  useEffect(() => {
    if (facility) {
      reset({
        name: facility.name,
        description: facility.description ?? "",
        address: facility.address ?? "",
        phone: facility.phone ?? "",
        working_hours: facility.working_hours ?? "",
        image_url: facility.image_url ?? "",
        is_visible: facility.is_visible,
        latitude: facility.latitude,
        longitude: facility.longitude,
      });
    }
  }, [facility, reset]);

  function onSubmit(data: OwnerFacilityUpdate) {
    updateMutation.mutate(data, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => {
          router.push(`/owner/facilities/${facilityId}/products`);
        }, 1200);
      },
    });
  }

  const pageAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 flex-1 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          {(error as Error).message || "حدث خطأ أثناء تحميل المتجر"}
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const productCount = productData?.total ?? 0;

  return (
    <motion.div
      className="space-y-6"
      variants={pageAnimation}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => router.back()}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{facility?.name ?? "تعديل المتجر"}</h1>
          <p className="text-sm text-muted-foreground">تعديل بيانات وإعدادات المتجر</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
          <Package className="h-4 w-4 text-secondary" />
          <span className="text-muted-foreground">المنتجات:</span>
          <span className="font-semibold">{productCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
          {facility?.is_visible ? (
            <Eye className="h-4 w-4 text-secondary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">الحالة:</span>
          <span className={cn(
            "font-semibold",
            facility?.is_visible
              ? "text-secondary"
              : "text-muted-foreground"
          )}>
            {facility?.is_visible ? "ظاهرة" : "مخفية"}
          </span>
        </div>
        <Badge variant="secondary" className="h-9 rounded-full px-4 text-sm">
          {FACILITY_TYPE_LABELS[facility?.type ?? ""] || facility?.type}
        </Badge>
      </div>

      {/* Form wrapped in visual card */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Section: Basic Info */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">المعلومات الأساسية</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">اسم المتجر *</Label>
                  <Input id="name" {...register("name", { required: "اسم المتجر مطلوب" })} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea id="description" rows={3} {...register("description")} />
                </div>

                {facility?.image_url && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>الصورة الحالية</Label>
                    <div className="overflow-hidden rounded-xl border">
                      <ImageWithSkeleton
                        src={resolveImageUrl(facility.image_url)}
                        alt={facility.name}
                        width={320}
                        height={180}
                        className="mx-auto h-[180px] w-[320px]"
                      />
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <Controller
                    name="image_url"
                    control={control}
                    render={({ field }) => (
                      <ImageUploader
                        id="image_url"
                        label="صورة المتجر"
                        folder="facilities"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        disabled={updateMutation.isPending}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4 sm:col-span-2">
                  <div>
                    <Label htmlFor="is_visible">المتجر ظاهر للعملاء</Label>
                    <p className="text-xs text-muted-foreground">
                      عند التعطيل لن يظهر المتجر في التطبيق
                    </p>
                  </div>
                  <Controller
                    name="is_visible"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Section Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">معلومات التواصل والموقع</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Section: Contact & Location */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-semibold">معلومات التواصل والموقع</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input id="address" {...register("address")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input id="phone" dir="ltr" {...register("phone")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working_hours">ساعات العمل</Label>
                  <Input id="working_hours" placeholder="مثال: 8 صباحا - 11 مساء" {...register("working_hours")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="latitude">خط العرض</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    dir="ltr"
                    {...register("latitude", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">خط الطول</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    dir="ltr"
                    {...register("longitude", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-full"
                onClick={() => {
                  const lat = form.getValues("latitude");
                  const lng = form.getValues("longitude");
                  if (lat && lng) {
                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                  } else {
                    window.open("https://www.google.com/maps", "_blank");
                  }
                }}
              >
                <MapPin className="h-4 w-4" />
                حدد على الخريطة
              </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                className="rounded-full min-h-[44px]"
                onClick={() => router.back()}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className={cn(
                  "rounded-full min-h-[44px] gap-2 transition-all duration-300",
                  showSuccess
                    ? "bg-success hover:bg-success text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                disabled={updateMutation.isPending || showSuccess}
              >
                {showSuccess ? (
                  <Check className="h-4 w-4" />
                ) : updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {showSuccess ? "تم الحفظ بنجاح" : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}