"use client";

/**
 * /courier/settings — إعداداتي (شاشة 9/11).
 * PATCH /courier/me {public_name?, photo_url?, region_id?, preferred_shifts?}
 * — الاسم العلني + الصورة (رفع عبر POST /courier/documents doc_type=photo
 * ثم تمرير url في photo_url) + المنطقة + أوقات التفضيل.
 * النموذج مكوّن ابن مستقل بمفتاح courier_id — يُعبّأ مرة واحدة عند الوصل
 * (نمط React السليم لنموذج يحرّر محلياً — بلا setState داخل effect).
 */

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCourierMe,
  useCourierProfileUpdate,
  useCourierDocUpload,
} from "@/hooks/useCourier";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";
import type { CourierMe } from "@/services/courier-api-client";

/* المناطق — عام */
function useCourierRegions() {
  return useQuery({
    queryKey: ["courier:regions"],
    queryFn: async () => {
      const res = await fetch("/api/regions", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("تعذّر تحميل المناطق");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/* ─── نموذج الإعدادات — ابن مستقل يُعبّأ مرة عند الوصل ─── */
function SettingsForm({ me }: { me: CourierMe }) {
  const update = useCourierProfileUpdate();
  const docUpload = useCourierDocUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const regionsQuery = useCourierRegions();

  const [publicName, setPublicName] = useState(me.public_name);
  const [regionId, setRegionId] = useState<number | null>(me.region_id);
  const [shifts, setShifts] = useState(me.preferred_shifts ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(me.photo_url);

  const dirty =
    publicName !== me.public_name ||
    regionId !== me.region_id ||
    shifts !== (me.preferred_shifts ?? "") ||
    photoUrl !== me.photo_url;

  const save = () => {
    haptic("tick");
    update.mutate(
      {
        public_name: publicName || undefined,
        region_id: regionId ?? undefined,
        preferred_shifts: shifts || undefined,
        photo_url: photoUrl ?? undefined,
      },
      {
        onSuccess: () => {
          haptic("success");
          toast({ title: "حُفظت إعداداتك ✅" });
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر الحفظ",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      },
    );
  };

  const pickPhoto = () => fileRef.current?.click();

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "الصورة أكبر من 5MB", variant: "destructive" });
      return;
    }
    docUpload.mutate(
      { file, docType: "photo" },
      {
        onSuccess: (res) => {
          setPhotoUrl(res.url);
          haptic("success");
          toast({
            title: "رُفعت صورتك ✅",
            description: "اضغط حفظ لتعتمد",
          });
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر رفع الصورة",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <section
      aria-label="تعديل بياناتي"
      className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="user"
        className="hidden"
        onChange={onPhoto}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* الصورة العلنية */}
      <div className="flex items-center gap-4">
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt="صورتك العلنية"
            className="h-16 w-16 rounded-2xl border-2 border-primary/30 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Camera className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={pickPhoto}
          disabled={docUpload.isPending}
          className="h-11 gap-2 rounded-xl native-tap"
          aria-label="تغيير الصورة"
        >
          {docUpload.isPending ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4.5 w-4.5" aria-hidden="true" />
          )}
          {photoUrl ? "تغيير الصورة" : "أضف صورتك"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-public-name">الاسم العلني (يظهر للمتاجر)</Label>
        <Input
          id="settings-public-name"
          value={publicName}
          onChange={(e) => setPublicName(e.target.value.slice(0, 120))}
          className="h-12 rounded-xl"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label>منطقة العمل</Label>
        {regionsQuery.isLoading ? (
          <div className="flex h-12 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            جارٍ التحميل…
          </div>
        ) : regionsQuery.isError ? (
          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            تعذّر تحميل المناطق — تحقق من اتصالك
          </p>
        ) : (
          <Select
            value={regionId ? String(regionId) : undefined}
            onValueChange={(v) => setRegionId(Number(v))}
            dir="rtl"
          >
            <SelectTrigger className="h-12 rounded-xl" dir="rtl">
              <SelectValue placeholder="اختر منطقتك" />
            </SelectTrigger>
            <SelectContent dir="rtl" className="max-h-72">
              {(regionsQuery.data as { id: number; name: string }[]).map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-shifts">أوقات تفضيلك</Label>
        <Input
          id="settings-shifts"
          value={shifts}
          onChange={(e) => setShifts(e.target.value.slice(0, 60))}
          placeholder="صباحي / مسائي / مرن"
          className="h-12 rounded-xl"
          maxLength={60}
        />
        <p className="text-[11px] text-muted-foreground">
          توجيه فقط — التوفر الفعلي بالمفتاح في الرئيسية
        </p>
      </div>

      <Button
        size="lg"
        onClick={save}
        disabled={!dirty || update.isPending}
        className="h-13 w-full gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
        aria-label="حفظ الإعدادات"
      >
        {update.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-5 w-5" aria-hidden="true" />
        )}
        حفظ التعديلات
      </Button>
    </section>
  );
}

/* ─── الصفحة ─── */
export default function CourierSettingsPage() {
  const { data: me, isLoading, isError, error, refetch, isRefetching } =
    useCourierMe();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </main>
    );
  }
  if (isError || !me) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <CourierScreenHeader title="إعداداتي" icon={Settings} />
        <WaitMode
          reason={error instanceof Error ? error.message : "تعذّر تحميل إعداداتك"}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-8">
      <CourierScreenHeader title="إعداداتي" icon={Settings} />
      <SettingsForm key={me.courier_id} me={me} />
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        بياناتك الحساسة (الهوية والرخصة) تُعدَّل عبر «إعادة فحص المستندات» من
        شاشة وضع الانتظار عند طلب الإدارة
      </p>
    </main>
  );
}
