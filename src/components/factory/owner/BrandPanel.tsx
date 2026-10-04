"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 apiGet,
 apiPut,
 apiUploadAsset,
 assetUrl,
 formatMoney,
 type ApiResult,
} from "@/lib/factory/api";
import type { BrandFacilityRow, BrandPackage } from "@/lib/factory/types";
import { useSession } from "@/store/session";
import { LoginGate } from "@/components/factory/shared/LoginGate";
import { CompletenessMeter, ErrorBox } from "@/components/factory/shared/Bits";
import { Coins, ImagePlus, Palette, Save, Store, Trash2 } from "lucide-react";

/** قيود كل نوع أصل كما في عقود الباك — تُعرض للمستخدم قبل الرفع */
const ASSET_KINDS: { kind: string; label: string; constraint: string }[] = [
 { kind: "logo", label: "الشعار الرئيسي", constraint: "صورة مربعة — الحد الأدنى 640×640" },
 { kind: "app_icon", label: "أيقونة التطبيق", constraint: "مربعة إلزاماً — الحد الأدنى 512×512" },
 { kind: "splash", label: "شاشة البداية", constraint: "أبعاد طولية مقترحة 800×1200" },
 { kind: "banner", label: "بانر", constraint: "عريض — يظهر أعلى المتجر" },
 { kind: "cover", label: "غلاف", constraint: "عريض — غلاف الملف الشخصي" },
 { kind: "favicon", label: "أيقونة الموقع", constraint: "مربعة صغيرة للمتصفح" },
];

function BrandEditor({ facilityId }: { facilityId: number }) {
 const token = useSession((s) => s.tokens.owner)!;
 const [brand, setBrand] = useState<BrandPackage | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
 const [form, setForm] = useState({
  display_name: "",
  tagline: "",
  primary_color: "",
  secondary_color: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_address: "",
  instagram: "",
 });
 const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
 const [uploadingKind, setUploadingKind] = useState<string | null>(null);

 const load = useCallback(async () => {
  setLoading(true);
  setErr(null);
  const r = await apiGet<BrandPackage>("/owner/brand", { facility_id: facilityId }, token);
  if (r.ok) {
   setBrand(r.data);
   setForm({
    display_name: r.data.display_name ?? "",
    tagline: r.data.tagline ?? "",
    primary_color: r.data.colors.primary ?? "",
    secondary_color: r.data.colors.secondary ?? "",
    contact_phone: r.data.contacts.phone ?? "",
    contact_whatsapp: r.data.contacts.whatsapp ?? "",
    contact_address: r.data.contacts.address ?? "",
    instagram: r.data.social_links?.instagram ?? "",
   });
  } else {
   setErr({ error: r.error, errors: r.errors });
  }
  setLoading(false);
 }, [facilityId, token]);

 useEffect(() => {
  /* استثناء موثق: نمط «جلب عند التركيب» — setLoading/setErr متزامنتان
     عمداً قبل النداء الشبكي (سلوك مقصود لشاشة التحميل، لا تسلسل خاطئ).
     الملف من جولة المصنع — لا يُغيَّر سلوكه من جولة الدفع. */
  // eslint-disable-next-line react-hooks/set-state-in-effect
  load();
 }, [load]);

 const save = async () => {
  setSaving(true);
  setErr(null);
  const body: Record<string, string> = {};
  if (form.display_name !== (brand?.display_name ?? "")) body.display_name = form.display_name;
  if (form.tagline !== (brand?.tagline ?? "")) body.tagline = form.tagline;
  if (form.primary_color !== (brand?.colors.primary ?? "")) body.primary_color = form.primary_color;
  if (form.secondary_color !== (brand?.colors.secondary ?? "")) body.secondary_color = form.secondary_color;
  if (form.contact_phone !== (brand?.contacts.phone ?? "")) body.contact_phone = form.contact_phone;
  if (form.contact_whatsapp !== (brand?.contacts.whatsapp ?? "")) body.contact_whatsapp = form.contact_whatsapp;
  if (form.contact_address !== (brand?.contacts.address ?? "")) body.contact_address = form.contact_address;
  if (form.instagram !== (brand?.social_links?.instagram ?? "")) body.social_links = JSON.stringify({ instagram: form.instagram || null });

  const r = await apiPut<BrandPackage>(`/owner/brand?facility_id=${facilityId}`, body, token);
  setSaving(false);
  if (r.ok) {
   setBrand(r.data);
   toast.success("تم حفظ الهوية", { description: `الاكتمال الآن: ${r.data.completeness.percent}%` });
   setForm((f) => ({ ...f, instagram: r.data.social_links?.instagram ?? "" }));
  } else {
   setErr({ error: r.error, errors: r.errors });
   toast.error(r.error);
  }
 };

 const upload = async (kind: string, file: File) => {
  setUploadingKind(kind);
  setErr(null);
  const r = await apiUploadAsset(file, kind, facilityId, token);
  setUploadingKind(null);
  if (r.ok) {
   toast.success(`تم رفع ${kind} (201)`);
   const pkg = (r.data as { brand?: BrandPackage }).brand ?? (r.data as unknown as BrandPackage);
   if (pkg?.completeness) setBrand(pkg);
   else load();
  } else {
   setErr({ error: r.error, errors: r.errors });
   toast.error(r.error);
  }
 };

 const removeAsset = async (assetId: number, kind: string) => {
  const { apiDelete } = await import("@/lib/factory/api");
  const r = (await apiDelete(
   `/owner/brand/assets/${assetId}?facility_id=${facilityId}`,
   token
  )) as ApiResult<unknown>;
  if (r.ok) {
   toast.success(`حُذف الأصل ${kind}`);
   load();
  } else {
   setErr({ error: r.error, errors: r.errors });
   toast.error(r.error);
  }
 };

 if (loading) return <div className="h-64 animate-pulse rounded-xl bg-stone-200" />;

 return (
  <div className="space-y-4">
   <ErrorBox error={err?.error} errors={err?.errors} />

   {brand && (
    <Card>
     <CardHeader className="pb-3">
      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
       <Palette className="h-4 w-4 text-emerald-700" /> حزمة الهوية — منشأة #{brand.facility_id}
       <Badge variant="outline" className="gap-1">
        <Coins className="h-3 w-3" /> العملة من الرد: {brand.currency}
       </Badge>
      </CardTitle>
      <CardDescription>
       الحفظ عبر PUT /owner/brand — الأخطاء تُعرض كما ترد من الخادم (مثال 422: «اللون الأساسي غير صالح…»)
      </CardDescription>
     </CardHeader>
     <CardContent className="space-y-5">
      <CompletenessMeter percent={brand.completeness.percent} missing={brand.completeness.missing} />

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label htmlFor="display_name">الاسم التجاري</Label>
        <Input id="display_name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
       </div>
       <div className="space-y-2">
        <Label htmlFor="tagline">الشعار النصي (tagline)</Label>
        <Input id="tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
       </div>
       <div className="space-y-2">
        <Label htmlFor="primary_color">اللون الأساسي (hex)</Label>
        <div className="flex gap-2">
         <Input id="primary_color" dir="ltr" placeholder="#RRGGBB" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="font-mono" />
         <input
          type="color"
          aria-label="اختيار اللون الأساسي"
          value={/^#[0-9a-fA-F]{6}$/.test(form.primary_color) ? form.primary_color : "#888888"}
          onChange={(e) => setForm({ ...form, primary_color: e.target.value.toUpperCase() })}
          className="h-9 w-12 cursor-pointer rounded border border-stone-200 bg-white p-1"
         />
        </div>
       </div>
       <div className="space-y-2">
        <Label htmlFor="secondary_color">اللون الثانوي (hex)</Label>
        <div className="flex gap-2">
         <Input id="secondary_color" dir="ltr" placeholder="#RRGGBB" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="font-mono" />
         <input
          type="color"
          aria-label="اختيار اللون الثانوي"
          value={/^#[0-9a-fA-F]{6}$/.test(form.secondary_color) ? form.secondary_color : "#888888"}
          onChange={(e) => setForm({ ...form, secondary_color: e.target.value.toUpperCase() })}
          className="h-9 w-12 cursor-pointer rounded border border-stone-200 bg-white p-1"
         />
        </div>
       </div>
       <div className="space-y-2">
        <Label htmlFor="contact_phone">هاتف التواصل</Label>
        <Input id="contact_phone" dir="ltr" inputMode="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        <p className="text-[11px] text-stone-500">يُقبل 7XXXXXXXX (اليمن) أو 05XXXXXXXX (السعودية) — التطبيع خادمي</p>
       </div>
       <div className="space-y-2">
        <Label htmlFor="contact_whatsapp">واتساب</Label>
        <Input id="contact_whatsapp" dir="ltr" inputMode="tel" value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} />
       </div>
       <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="contact_address">العنوان</Label>
        <Input id="contact_address" value={form.contact_address} onChange={(e) => setForm({ ...form, contact_address: e.target.value })} />
       </div>
       <div className="space-y-2">
        <Label htmlFor="instagram">إنستغرام (معرّف الحساب)</Label>
        <Input id="instagram" dir="ltr" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
       </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
       <Button onClick={save} disabled={saving} className="gap-1.5">
        <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ…" : "حفظ الهوية"}
       </Button>
       <span className="text-xs text-stone-500">يُرسَل ما تغيّر فقط — كل حقل اختياري في العقد</span>
      </div>
     </CardContent>
    </Card>
   )}

   {brand && (
    <Card>
     <CardHeader className="pb-3">
      <CardTitle className="text-base">أصول الهوية — رفع عبر POST /owner/brand/assets</CardTitle>
      <CardDescription>لكل نوع قيوده — والرد 201 يعيد الحزمة كاملة فيتحدث المؤشر فوراً</CardDescription>
     </CardHeader>
     <CardContent>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
       {ASSET_KINDS.map((a) => {
        const existing = brand.assets?.[a.kind];
        return (
         <div key={a.kind} className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
           <p className="text-sm font-bold text-stone-800">{a.label}</p>
           <Badge variant="outline" className="font-mono text-[10px]">{a.kind}</Badge>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-stone-500">{a.constraint}</p>
          <div className="mb-3 flex h-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
           {existing ? (
            <img src={assetUrl(existing.url)} alt={`${a.label} الحالي`} className="max-h-20 object-contain" />
           ) : (
            <span className="text-xs text-stone-400">لا أصل مرفوع</span>
           )}
          </div>
          <div className="flex items-center gap-2">
           <input
            ref={(el) => { fileRefs.current[a.kind] = el; }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
             const f = e.target.files?.[0];
             if (f) upload(a.kind, f);
             e.target.value = "";
            }}
           />
           <Button
            size="sm"
            variant="secondary"
            className="flex-1 gap-1.5"
            disabled={uploadingKind === a.kind}
            onClick={() => fileRefs.current[a.kind]?.click()}
           >
            <ImagePlus className="h-3.5 w-3.5" />
            {uploadingKind === a.kind ? "جارٍ الرفع…" : "رفع"}
           </Button>
           {existing && "id" in existing && typeof existing.id === "number" && (
            <Button size="sm" variant="ghost" aria-label={`حذف ${a.label}`} onClick={() => removeAsset(existing.id as number, a.kind)}>
             <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </Button>
           )}
          </div>
          {existing?.size_label && <p className="mt-2 text-[10px] text-stone-400">الحجم المرفوع: {existing.size_label}</p>}
         </div>
        );
       })}
      </div>
     </CardContent>
    </Card>
   )}
  </div>
 );
}

function FacilitiesIndex({ onSelect, selectedId }: { onSelect: (id: number, name: string) => void; selectedId: number | null }) {
 const token = useSession((s) => s.tokens.owner)!;
 const [rows, setRows] = useState<BrandFacilityRow[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  (async () => {
   const r = await apiGet<BrandFacilityRow[]>("/owner/brand/facilities", undefined, token);
   if (r.ok) setRows(r.data);
   setLoading(false);
  })();
 }, [token]);

 if (loading) return <div className="h-24 animate-pulse rounded-xl bg-stone-200" />;

 return (
  <Card>
   <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
     <Store className="h-4 w-4 text-emerald-700" /> منشآتي — فهرس الاكتمال (GET /owner/brand/facilities)
    </CardTitle>
   </CardHeader>
   <CardContent>
    <ul className="space-y-2">
     {rows.map((f) => (
      <li key={f.facility_id}>
       <button
        onClick={() => onSelect(f.facility_id, f.name)}
        className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-start transition-colors ${selectedId === f.facility_id ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white hover:bg-stone-50"
         }`}
       >
        <span className="text-sm font-bold text-stone-800">
         {f.name} <span className="font-mono text-[10px] text-stone-400">#{f.facility_id}</span>
        </span>
        <span className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-64">
         <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
          <span
           className={`block h-full rounded-full ${f.is_complete ? "bg-emerald-500" : f.completeness_percent >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
           style={{ width: `${f.completeness_percent}%` }}
          />
         </span>
         <span className="text-xs font-bold text-stone-600">{f.completeness_percent}%</span>
        </span>
       </button>
      </li>
     ))}
     {rows.length === 0 && <li className="text-sm text-stone-500">لا منشآت — سجّل منشأتك أولاً من بوابة المالك</li>}
    </ul>
   </CardContent>
  </Card>
 );
}

export function OwnerBrandPanel() {
 const token = useSession((s) => s.tokens.owner);
 const ownerFacilityId = useSession((s) => s.ownerFacilityId);
 const ownerFacilityName = useSession((s) => s.ownerFacilityName);
 const setOwnerFacility = useSession((s) => s.setOwnerFacility);

 return (
  <div className="space-y-5">
   <header>
    <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">حزمة الهوية — لوحة المنشآت</h1>
    <p className="mt-1 text-sm text-stone-600">
     المهمة A — كل شيء عبر GET/PUT /owner/brand — والاكتمال (percent + missing) كما يرد حرفياً
    </p>
   </header>

   {!token ? (
    <LoginGate
     role="owner"
     title="بوابة المالك"
     description="دخول أصحاب المنشآت — POST /owner/login (identifier يقبل البريد أو الجوال)"
     endpoint="/owner/login"
     mode="identifier"
     placeholder="email أو 7XXXXXXXX"
     hint="وضع الاختبار: يمكنك تسجيل مالك جديد بجوال أي رقم + الكود 123456"
    >
     {() => <FacilitiesIndex onSelect={setOwnerFacility} selectedId={ownerFacilityId} />}
    </LoginGate>
   ) : (
    <>
     <FacilitiesIndex onSelect={setOwnerFacility} selectedId={ownerFacilityId} />
     {ownerFacilityId ? (
      <>
       <p className="text-sm text-stone-600">
        تحرير الهوية لـ: <strong>{ownerFacilityName ?? `منشأة #${ownerFacilityId}`}</strong>
       </p>
       <BrandEditor facilityId={ownerFacilityId} />
      </>
     ) : (
      <Card>
       <CardContent className="py-8 text-center text-sm text-stone-500">
        اختر منشأة من الفهرس أعلاه لتحرير هويتها
       </CardContent>
      </Card>
     )}
    </>
   )}
  </div>
 );
}
