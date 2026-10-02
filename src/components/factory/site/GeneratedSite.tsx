"use client";

/**
 * الموقع المولَّد — قالب المتجر الموحّد (Task 4-b)
 *
 * قالب واحد يتلوّن من بيانات التاجر الحية — بلا هوية مصمتة:
 *  - الألوان عبر متغيرات --brand / --brand2 (fallback محايد emerald فقط عند null)
 *  - العملة حصراً من resolve.currency (أو brand.currency في معاينة المالك) عبر formatMoney
 *  - الكتالوج حصراً من مسارات resolve.catalog (أو مسارات المالك الحية في المعاينة)
 *  - احترام site.features كمفاتيح العزل (لا منشآت أخرى / لا بانرات منصة / لا مناطق / لا عروض متقاطعة)
 *
 * تبويبان أعلى الشاشة (خارج القالب):
 *  1) وضع النطاق الحقيقي — GET /tenant/resolve?host=... بلا توكن (404 → NoSitePage)
 *  2) معاينة المالك (قبل التفعيل) — بناء كائن شبيه بالـresolve من /owner/brand و /owner/{id}/products حياً
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  WS_NOTIFICATIONS,
  apiGet,
  apiPost,
  assetUrl,
  formatMoney,
  isValidPhone,
  normalizePhoneInput,
} from "@/lib/factory/api";
import type {
  BrandFacilityRow,
  BrandPackage,
  OrderRow,
  OtpRequestResponse,
  ResolveResponse,
  TenantProduct,
  TenantSiteFeatures,
} from "@/lib/factory/types";
import { useSession } from "@/store/session";
import { ErrorBox, TestModeNote } from "@/components/factory/shared/Bits";
import {
  BellRing,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Globe,
  KeyRound,
  Loader2,
  LogIn,
  MapPin,
  Minus,
  PackageSearch,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  Wallet as WalletIcon,
  X,
} from "lucide-react";

/* =============================== مساعدات عامة =============================== */

/**
 * مسارات resolve.catalog مطلقة تبدأ /api/v1/... — وAPI_BASE ينتهي أصلاً بـ/api/v1
 * فنُزيل التكرار فقط؛ المسارات النسبية تمر كما هي (لا نغيّر شكلها إطلاقاً).
 */
function catalogPath(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return p.trim().replace(/^\/api\/v1(?=\/)/, "");
}

/** تعامل مرن مع أي شكل رد: مصفوفة أو مغلّف ترقيم {items} أو {data}/{results} */
function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.results)) return o.results as T[];
  }
  return [];
}

function normalizeHostInput(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function toNumber(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function orderStatusTone(status?: string): string {
  switch (status) {
    case "pending":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "confirmed":
    case "preparing":
    case "ready":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "out_for_delivery":
      return "border-amber-300 bg-amber-100 text-amber-900";
    case "delivered":
    case "completed":
      return "border-emerald-400 bg-emerald-100 text-emerald-900";
    case "cancelled":
    case "rejected":
      return "border-rose-300 bg-rose-50 text-rose-800";
    default:
      return "border-stone-300 bg-stone-100 text-stone-700";
  }
}

/** الحزمة الموحّدة التي يتغذى عليها القالب — من resolve حي أو من ردود المالك الحية */
interface SiteBundle {
  title: string;
  tagline: string | null;
  logoUrl: string | null;
  primary: string | null;
  secondary: string | null;
  currency: string;
  features: TenantSiteFeatures;
  facilityId: number;
  productsPath: string;
  offersPath: string;
  ordersPath: string;
  facilityPath: string | null;
  facilityFallback: TenantFacilityInfo | null;
  catalogToken: string | null;
  preview: boolean;
  status: string | null;
  siteUrl: string;
}

interface TenantFacilityInfo {
  name?: string;
  address?: string | null;
  phone?: string | null;
  working_hours?: string | null;
}

interface OfferRow {
  id?: number;
  facility_id?: number | null;
  title?: string | null;
  offer_discount_rate?: number | null;
  base_price?: number | string | null;
  member_price?: number | string | null;
  non_member_price?: number | string | null;
  is_active?: boolean;
  product?: { name?: string | null; image_url?: string | null } | null;
}

interface CartLine {
  product: TenantProduct;
  qty: number;
}

interface IsolationCounts {
  products: number;
  offers: number;
  facilityName: string;
}

/** قيم العزل الافتراضية عند غياب features — القالب الأبيض يعزل افتراضياً */
const ISOLATED_FEATURES: TenantSiteFeatures = {
  show_other_facilities: false,
  show_platform_banners: false,
  show_region_aggregation: false,
  show_cross_facility_offers: false,
  single_facility_mode: true,
};

const ISOLATION_ROWS: { key: keyof TenantSiteFeatures; label: string; isolatedWhen: boolean }[] = [
  { key: "show_other_facilities", label: "لا أي قائمة أو روابط لمنشآت أخرى في أي مكان", isolatedWhen: false },
  { key: "show_platform_banners", label: "لا بانرات «توفير» أو أي ترويج للمنصة", isolatedWhen: false },
  { key: "show_region_aggregation", label: "لا شرائح تجميع المناطق", isolatedWhen: false },
  { key: "show_cross_facility_offers", label: "العروض من هذه المنشأة فقط — بلا شارة «عروض المنصة»", isolatedWhen: false },
  { key: "single_facility_mode", label: "متجر واحد — موقع رسمي (شارة الفوتر)", isolatedWhen: true },
];

/** متغيرات الهوية على جذر القالب — fallback محايد emerald عند null فقط */
function brandVars(primary: string | null, secondary: string | null): CSSProperties {
  return {
    "--brand": primary ?? "#16a34a",
    "--brand2": secondary ?? "#15803d",
  } as CSSProperties;
}

/* =============================== NoSitePage =============================== */

/** صفحة مهذبة عندما يرد الخادم 404 «لا يوجد موقع تاجر فعّال على هذا النطاق» — الرسالة حرفياً */
function NoSitePage({ host, message, status }: { host: string; message: string; status: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <Globe className="h-8 w-8 text-stone-400" />
        </div>
        <p className="text-lg font-extrabold text-stone-900">{message}</p>
        <p className="max-w-md text-sm leading-relaxed text-stone-500">
          النطاق <span dir="ltr" className="font-mono text-stone-700">{host || "—"}</span> لا يقابل حالياً أي موقع تاجر مفعّل. تفعيل المواقع يتم من
          لوحة الإدارة بعد أن يُكمل التاجر هوية وموقعه — جرّب حل النطاق مجدداً بعد التفعيل، أو اعرض القالب من تبويب «معاينة المالك».
        </p>
        <Badge variant="outline" className="font-mono text-[11px]">استجابة الخادم: {status === 0 ? "network" : status}</Badge>
      </CardContent>
    </Card>
  );
}

/* =============================== ProductCard =============================== */

function ProductCard({ p, currency, onAdd }: { p: TenantProduct; currency: string; onAdd: (p: TenantProduct) => void }) {
  const initial = (p.name ?? "").trim().slice(0, 2) || "؟";
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="relative flex h-28 items-center justify-center overflow-hidden sm:h-36" style={{ background: "color-mix(in srgb, var(--brand) 10%, #ffffff)" }}>
        {p.image_url ? (
          <img src={assetUrl(p.image_url)} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl font-black" style={{ color: "var(--brand)" }}>{initial}</span>
        )}
        {!p.is_available && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-bold text-stone-700 sm:text-sm">غير متاح حالياً</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-1 text-sm font-bold text-stone-900" title={p.name}>{p.name}</p>
        {p.category && <p className="text-[11px] font-semibold" style={{ color: "var(--brand)" }}>{p.category}</p>}
        {p.description && <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-extrabold" style={{ color: "var(--brand)" }}>{formatMoney(p.price, currency)}</span>
          <Button
            size="sm"
            disabled={!p.is_available}
            onClick={() => onAdd(p)}
            className="h-8 gap-1 bg-[var(--brand)] px-2.5 text-[11px] text-white hover:opacity-90"
          >
            <ShoppingCart className="h-3.5 w-3.5" /> أضف للسلة
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =============================== OffersStrip =============================== */

/** شريط العروض — من كتالوج المنشأة فقط (بلا أي شارة «عروض المنصة» احتراماً للعزل) */
function OffersStrip({ offers, currency }: { offers: OfferRow[]; currency: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {offers.map((o, i) => (
        <div key={o.id ?? i} className="min-w-56 max-w-64 shrink-0 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--brand) 35%, white)", background: "color-mix(in srgb, var(--brand) 7%, white)" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-900">{o.title ?? "عرض خاص"}</p>
              {o.product?.name && <p className="mt-0.5 truncate text-xs text-stone-500">{o.product.name}</p>}
            </div>
            {typeof o.offer_discount_rate === "number" && (
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: "var(--brand)" }}>−{o.offer_discount_rate}%</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            {o.member_price != null && <span className="text-sm font-extrabold" style={{ color: "var(--brand)" }}>{formatMoney(o.member_price, currency)}</span>}
            {o.base_price != null && <span className="text-stone-400 line-through">{formatMoney(o.base_price, currency)}</span>}
            {o.non_member_price != null && <span className="text-stone-600">غير الأعضاء: {formatMoney(o.non_member_price, currency)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================== FacilityInfo =============================== */

function FacilityInfo({ facility, fallbackName }: { facility: TenantFacilityInfo | null; fallbackName: string }) {
  const name = facility?.name || fallbackName;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
        <Store className="h-4 w-4" style={{ color: "var(--brand)" }} /> {name}
      </p>
      <div className="mt-2 grid gap-1.5 text-xs text-stone-600 sm:grid-cols-3">
        {facility?.address && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" /> <span>{facility.address}</span>
          </p>
        )}
        {facility?.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" /> <span dir="ltr" className="font-mono">{facility.phone}</span>
          </p>
        )}
        {facility?.working_hours && (
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-stone-400" /> <span>{facility.working_hours}</span>
          </p>
        )}
      </div>
      {!facility?.address && !facility?.phone && !facility?.working_hours && (
        <p className="mt-1 text-xs text-stone-400">لم تُنشر بيانات تواصل لهذه المنشأة بعد.</p>
      )}
    </div>
  );
}
/* =============================== CartDrawer + Checkout =============================== */

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bundle: SiteBundle;
  lines: CartLine[];
  total: number;
  onQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onNeedAuth: () => void;
  onOrdered: (order: { id?: number; total?: unknown; address: string }) => void;
}

function CartDrawer({ open, onOpenChange, bundle, lines, total, onQty, onRemove, onNeedAuth, onOrdered }: CartDrawerProps) {
  const customerToken = useSession((s) => s.tokens.customer);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  /** POST resolve.catalog.orders بتوكن العميل — العقد نفسه في الوضعين */
  const submitOrder = async () => {
    if (!customerToken) {
      toast.info("أكمل تسجيل الدخول السريع بالجوال ثم أكّد طلبك");
      onNeedAuth();
      return;
    }
    if (!address.trim()) {
      setErr({ error: "أدخل عنوان التوصيل أولاً" });
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await apiPost<Record<string, unknown>>(
      catalogPath(bundle.ordersPath),
      {
        facility_id: bundle.facilityId,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        delivery_address: address.trim(),
        payment_method: "cash",
      },
      customerToken
    );
    setBusy(false);
    if (r.ok) {
      const d = r.data as { id?: number; total?: number };
      toast.success(d.id != null ? `تم إنشاء الطلب #${d.id}` : "تم إنشاء الطلب بنجاح");
      onOrdered({ id: d.id, total: d.total, address: address.trim() });
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={brandVars(bundle.primary, bundle.secondary)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" style={{ color: "var(--brand)" }} /> سلة الطلب — {bundle.title}
          </DialogTitle>
          <DialogDescription>الكميات والإجمالي بعملة المنشأة من الـAPI: {bundle.currency}</DialogDescription>
        </DialogHeader>

        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">السلة فارغة — أضف منتجاً من الشبكة أعلاه.</p>
        ) : (
          <div className="space-y-3">
            <ul className="max-h-56 space-y-2 overflow-y-auto pl-1">
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 rounded-lg border border-stone-200 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-900">{l.product.name}</p>
                    <p className="text-xs text-stone-500">{formatMoney(l.product.price, bundle.currency)} / للوحدة</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" aria-label="إنقاص الكمية" onClick={() => onQty(l.product.id, -1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-black">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" aria-label="زيادة الكمية" onClick={() => onQty(l.product.id, +1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="إزالة من السلة" onClick={() => onRemove(l.product.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                  <span className="w-24 text-end text-sm font-extrabold" style={{ color: "var(--brand)" }}>
                    {formatMoney(toNumber(l.product.price) * l.qty, bundle.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-600">الإجمالي</span>
              <span className="text-base font-black" style={{ color: "var(--brand)" }}>{formatMoney(total, bundle.currency)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-address">عنوان التوصيل</Label>
              <Textarea
                id="delivery-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المدينة — الحي — الشارع — أقرب علامة مميزة"
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
              <span className="font-semibold text-stone-700">طريقة الدفع</span>
              <Badge variant="outline" className="gap-1">
                <WalletIcon className="h-3 w-3" /> الدفع عند الاستلام (cash)
              </Badge>
            </div>

            {!customerToken && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                لا جلسة عميل بعد — زر التأكيد سيفتح تسجيل الدخول السريع بالجوال (OTP) ثم تُكمل الطلب.
              </p>
            )}

            <ErrorBox error={err?.error} errors={err?.errors} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button onClick={submitOrder} disabled={busy || lines.length === 0} className="gap-1.5 bg-[var(--brand)] text-white hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {busy ? "جارٍ إرسال الطلب…" : "تأكيد الطلب — إتمام الطلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =============================== AuthDialog (OTP + دخول) =============================== */

const WEB_CUSTOMER_PASSWORD = "TawSite123!";

function AuthDialog({ open, onOpenChange, bundle }: { open: boolean; onOpenChange: (v: boolean) => void; bundle: SiteBundle }) {
  const setToken = useSession((s) => s.setToken);
  const [step, setStep] = useState<"phone" | "code" | "login">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  // يُعاد تركيب هذا الحوار بمفتاح جديد عند كل فتح (انظر Storefront) فتبدأ حالته نظيفة بلا تأثير إعادة تعيين

  const doLogin = useCallback(
    async (identifier: string, password: string) => {
      setBusy(true);
      setErr(null);
      const r = await apiPost<{ access_token?: string }>("/auth/login", { identifier, password });
      setBusy(false);
      if (r.ok && r.data.access_token) {
        setToken("customer", r.data.access_token);
        toast.success("تم الدخول — أكمل طلبك من السلة");
        onOpenChange(false);
      } else if (r.ok) {
        setErr({ error: "لم يُرجع الخادم توكن الدخول" });
      } else {
        setErr({ error: r.error, errors: r.errors });
      }
    },
    [setToken, onOpenChange]
  );

  const requestCode = async () => {
    const target = normalizePhoneInput(phone);
    if (!isValidPhone(phone)) {
      setErr({ error: "صيغة الجوال غير صحيحة — مثال: 7XXXXXXXX (اليمن) أو 05XXXXXXXX (السعودية)" });
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await apiPost<OtpRequestResponse>("/otp/request", { target });
    setBusy(false);
    if (r.ok) {
      setDevCode(r.data.dev_code ?? null);
      setStep("code");
      toast.success("أُرسل كود التحقق إلى الجوال");
    } else {
      setErr({ error: r.error, errors: r.errors });
    }
  };
  const tryRegister = async (verifiedToken: string | null) => {
    setBusy(true);
    setErr(null);
    const r = await apiPost<Record<string, unknown>>("/auth/register", {
      full_name: "عميل الموقع",
      email: `web${Date.now()}@tawfir-demo.com`,
      phone: normalizePhoneInput(phone),
      password: WEB_CUSTOMER_PASSWORD,
      password_confirm: WEB_CUSTOMER_PASSWORD,
      ...(verifiedToken ? { otp_verified_token: verifiedToken } : {}),
    });
    setBusy(false);
    if (r.ok) {
      toast.success("تم إنشاء حسابك — جارٍ الدخول…");
      await doLogin(normalizePhoneInput(phone), WEB_CUSTOMER_PASSWORD);
    } else if (r.status === 409) {
      // «تسجيل 409 يتحول دخول»: الجوال مسجّل مسبقاً — نجرّب الدخول التلقائي بكلمة المرور المولّدة نفسها
      // (تعمل لحساب سُجّل من هذا القالب سابقاً)، وإن فشل نعرض نموذج الدخول اليدوي بكلمة مرور صاحب الحساب.
      setConflict(true);
      const lr = await apiPost<{ access_token?: string }>("/auth/login", {
        identifier: normalizePhoneInput(phone),
        password: WEB_CUSTOMER_PASSWORD,
      });
      if (lr.ok && lr.data.access_token) {
        setToken("customer", lr.data.access_token);
        toast.success("الجوال مسجّل مسبقاً — تم الدخول تلقائياً بحسابك");
        onOpenChange(false);
      } else {
        setLoginId(normalizePhoneInput(phone));
        setStep("login");
        setErr(lr.ok ? { error: "لم يُرجع الخادم توكن الدخول" } : { error: lr.error, errors: lr.errors });
        toast.info("هذا الجوال مسجّل مسبقاً — أدخل كلمة مرور حسابك للدخول ومتابعة الطلب");
      }
    } else {
      setErr({ error: r.error, errors: r.errors });
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 4) {
      setErr({ error: "أدخل كود التحقق المرسل إلى جوالك" });
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await apiPost<Record<string, unknown>>("/otp/verify", {
      target: normalizePhoneInput(phone),
      code: code.trim(),
    });
    setBusy(false);
    if (r.ok) {
      const vt = typeof (r.data as Record<string, unknown>).verified_token === "string"
        ? ((r.data as Record<string, unknown>).verified_token as string)
        : null;
      await tryRegister(vt);
    } else {
      setErr({ error: r.error, errors: r.errors });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" style={brandVars(bundle.primary, bundle.secondary)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" style={{ color: "var(--brand)" }} /> دخول سريع بالجوال — لإتمام الطلب
          </DialogTitle>
          <DialogDescription>توثيق ملكية الجوال عبر OTP ثم إنشاء حساب زبون الموقع (أو الدخول إن كنت مسجلاً).</DialogDescription>
        </DialogHeader>

        {step === "phone" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="auth-phone">رقم الجوال</Label>
              <Input
                id="auth-phone"
                dir="ltr"
                inputMode="tel"
                className="text-left font-mono"
                placeholder="7XXXXXXXX أو 05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <ErrorBox error={err?.error} errors={err?.errors} />
            <Button onClick={requestCode} disabled={busy} className="w-full gap-1.5 bg-[var(--brand)] text-white hover:opacity-90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} أرسل الكود
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <TestModeNote devCode={devCode} />
            <p className="text-xs text-stone-500">صفر انتظار — يمكنك إعادة الإرسال فوراً إن لم يصلك الكود.</p>
            <div className="space-y-2">
              <Label htmlFor="auth-code">كود التحقق</Label>
              <Input
                id="auth-code"
                dir="ltr"
                inputMode="numeric"
                className="text-left font-mono tracking-[0.4em]"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
            <ErrorBox error={err?.error} errors={err?.errors} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={requestCode} disabled={busy} className="flex-1 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> إعادة الإرسال
              </Button>
              <Button onClick={verifyCode} disabled={busy} className="flex-1 gap-1.5 bg-[var(--brand)] text-white hover:opacity-90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} تحقق وتابع
              </Button>
            </div>
          </div>
        )}

        {conflict && (step === "code" || step === "login") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-bold">هذا الجوال مسجّل مسبقاً لدى المنصة.</p>
            <p className="mt-0.5 text-xs">لا مشكلة — أدخل كلمة مرور حسابك للدخول ومتابعة طلبك.</p>
            <Button
              size="sm"
              className="mt-2 gap-1.5 bg-[var(--brand)] text-white hover:opacity-90"
              onClick={() => {
                setLoginId(normalizePhoneInput(phone));
                setStep("login");
              }}
            >
              <LogIn className="h-3.5 w-3.5" /> لدي حساب — دخول
            </Button>
          </div>
        )}

        {step === "login" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="auth-login-id">الجوال أو البريد</Label>
              <Input id="auth-login-id" dir="ltr" className="text-left font-mono" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-login-pw">كلمة المرور</Label>
              <Input id="auth-login-pw" type="password" dir="ltr" className="text-left" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
            </div>
            <ErrorBox error={err?.error} errors={err?.errors} />
            <Button onClick={() => doLogin(loginId.trim(), loginPw)} disabled={busy} className="w-full gap-1.5 bg-[var(--brand)] text-white hover:opacity-90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} دخول
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =============================== الإشعارات الحية (WebSocket) =============================== */

interface LiveItem {
  id: string;
  time: string;
  title: string;
  body: string;
}

function LiveNotifications({ token, active }: { token: string | null; active: boolean }) {
  const [wsState, setWsState] = useState<"idle" | "connecting" | "open" | "closed">("idle");
  const [items, setItems] = useState<LiveItem[]>([]);

  useEffect(() => {
    if (!active || !token) return;
    let ws: WebSocket | null = null;
    let retries = 0; // المحاولة الأولى + إعادتان = 3 محاولات كحد أقصى
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = (title: string, body: string) => {
      setItems((prev) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, time: fmtTime(new Date()), title, body }, ...prev].slice(0, 20));
    };

    const connect = () => {
      if (cancelled) return;
      setWsState("connecting");
      try {
        ws = new WebSocket(`${WS_NOTIFICATIONS}?token=${encodeURIComponent(token)}`);
      } catch {
        setWsState("closed");
        return;
      }
      ws.onopen = () => setWsState("open");
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const d = JSON.parse(String(ev.data)) as Record<string, unknown>;
          if (d.type === "hello") push("اتصال مؤكد", `مرحباً — معرّف المستخدم: ${String(d.user_id ?? "—")}`);
          else if (d.type === "pong") push("نبض الاتصال", "pong");
          else push(String(d.title ?? d.notification_type ?? "إشعار"), String(d.body ?? JSON.stringify(d)));
        } catch {
          push("رسالة", String(ev.data).slice(0, 200));
        }
      };
      ws.onclose = () => {
        setWsState("closed");
        if (!cancelled && retries < 2) {
          retries += 1;
          timer = setTimeout(connect, 5000); // إعادة المحاولة بعد 5 ثوانٍ
        }
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* تجاهل */
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* تجاهل */
      }
    };
  }, [active, token]);

  const dot =
    wsState === "open" ? "bg-emerald-500" : wsState === "connecting" ? "bg-amber-500 animate-pulse" : "bg-rose-500 animate-pulse";
  const label =
    wsState === "open" ? "متصل" : wsState === "connecting" ? "جارٍ الاتصال…" : "منقطع — إعادة محاولة تلقائية (حتى 3 محاولات)";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-emerald-700" /> الإشعارات الحية
          <Badge variant="outline" className="gap-1.5 text-[11px]">
            <span className={`inline-block h-2 w-2 rounded-full ${dot}`} /> {label}
          </Badge>
        </CardTitle>
        <CardDescription dir="ltr" className="text-left font-mono text-[11px]">{WS_NOTIFICATIONS}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-stone-500">بانتظار الإشعارات — ستظهر رسائل تحديث الطلب هنا بوقتها.</p>
        ) : (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                <span className="shrink-0 font-mono text-[10px] text-stone-400">{it.time}</span>
                <span className="min-w-0">
                  <span className="font-bold text-stone-800">{it.title}</span>
                  {it.body && <span className="block truncate text-xs text-stone-500">{it.body}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* =============================== طلباتي =============================== */

function OrdersDialog({ open, onOpenChange, bundle }: { open: boolean; onOpenChange: (v: boolean) => void; bundle: SiteBundle }) {
  const customerToken = useSession((s) => s.tokens.customer);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      setRows([]);
      if (!customerToken) {
        setErr({ error: "لا جلسة عميل فعّالة — سجّل دخولك من السلة أولاً" });
        setLoading(false);
        return;
      }
      const r = await apiGet<unknown>("/orders", { page: 1 }, customerToken);
      if (!alive) return;
      setLoading(false);
      if (r.ok) setRows(asArray<OrderRow>(r.data));
      else setErr({ error: r.error, errors: r.errors });
    })();
    return () => {
      alive = false;
    };
  }, [open, customerToken]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={brandVars(bundle.primary, bundle.secondary)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" style={{ color: "var(--brand)" }} /> طلباتي — GET /orders?page=1
          </DialogTitle>
          <DialogDescription>حالة كل طلب كما يرد من الخادم حرفياً.</DialogDescription>
        </DialogHeader>
        {loading && <div className="h-24 animate-pulse rounded-xl bg-stone-100" />}
        {!loading && <ErrorBox error={err?.error} errors={err?.errors} />}
        {!loading && !err && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-500">لا طلبات بعد — أول طلب لك سيظهر هنا فوراً.</p>
        )}
        {!loading && rows.length > 0 && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {rows.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900">
                    طلب #{o.id}
                    {typeof o.facility_name === "string" && o.facility_name && (
                      <span className="text-xs font-normal text-stone-500"> — {o.facility_name}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-stone-400">{o.created_at ? new Date(o.created_at).toLocaleString("ar-YE") : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`font-mono text-[10px] ${orderStatusTone(o.status)}`}>{o.status}</Badge>
                  <span className="text-sm font-extrabold" style={{ color: "var(--brand)" }}>
                    {formatMoney((o.total_amount ?? (o as Record<string, unknown>).total) as string | number | null, o.currency ?? bundle.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =============================== محفظتي =============================== */

function walletRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as Record<string, unknown>[];
    if (Array.isArray(o.wallets)) return o.wallets as Record<string, unknown>[];
    return [o];
  }
  return [];
}

function WalletDialog({ open, onOpenChange, bundle }: { open: boolean; onOpenChange: (v: boolean) => void; bundle: SiteBundle }) {
  const customerToken = useSession((s) => s.tokens.customer);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      setData(null);
      if (!customerToken) {
        setErr({ error: "لا جلسة عميل فعّالة — سجّل دخولك من السلة أولاً" });
        setLoading(false);
        return;
      }
      const r = await apiGet<unknown>("/wallets", undefined, customerToken);
      if (!alive) return;
      setLoading(false);
      if (r.ok) setData(r.data);
      else setErr({ error: r.error, errors: r.errors });
    })();
    return () => {
      alive = false;
    };
  }, [open, customerToken]);

  const rows = data !== null ? walletRows(data) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={brandVars(bundle.primary, bundle.secondary)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-4 w-4" style={{ color: "var(--brand)" }} />
            محفظتي — GET /wallets
          </DialogTitle>
          <DialogDescription>الرصيد بعملة الـAPI إن وردت — وأي شكل رد يُقرأ مرناً (مصفوفة أو كائن).</DialogDescription>
        </DialogHeader>
        {loading && <div className="h-20 animate-pulse rounded-xl bg-stone-100" />}
        {!loading && <ErrorBox error={err?.error} errors={err?.errors} />}
        {!loading && !err && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-500">لا محافظ معروضة لهذا الحساب.</p>
        )}
        {!loading && rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((row, i) => {
              const balance = row.balance ?? row.balance_amount ?? row.amount ?? row.credit;
              const cur = typeof row.currency === "string" ? row.currency : bundle.currency;
              const account = row.account_number ?? row.account ?? row.iban;
              return (
                <li key={i} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-stone-800">{String(row.provider_name ?? row.name ?? row.label ?? row.title ?? "محفظة")}</p>
                    {(typeof balance === "string" || typeof balance === "number") && (
                      <span className="text-sm font-black text-emerald-700">{formatMoney(balance, cur)}</span>
                    )}
                  </div>
                  {account != null && (
                    <p dir="ltr" className="mt-1 text-left font-mono text-xs text-stone-500">{String(account)}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =============================== Storefront (القلب) =============================== */

function Storefront({ bundle, onCounts }: { bundle: SiteBundle; onCounts?: (c: IsolationCounts) => void }) {
  const customerToken = useSession((s) => s.tokens.customer);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [facility, setFacility] = useState<TenantFacilityInfo | null>(bundle.facilityFallback);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id?: number; total?: unknown; address: string } | null>(null);
  const [wsOn, setWsOn] = useState(false);

  /** الكتالوج حصراً من مسارات الحزمة — منتجات وعروض وبيانات المنشأة
   *  الحالات الأولية تأتي من useState (loading=true) — وكل ضبط الحالة بعد أول await
   *  يُعاد تركيب المكوّن كاملاً عبر key عند تغيّر الحزمة (نطاق آخر/منشأة أخرى) فتنظف السلة والجلسات */
  useEffect(() => {
    let alive = true;
    (async () => {
      const pr = await apiGet<unknown>(
        catalogPath(bundle.productsPath),
        { page: 1, page_size: 100 },
        bundle.catalogToken
      );
      if (!alive) return;
      if (pr.ok) setProducts(asArray<TenantProduct>(pr.data));
      else setLoadErr({ error: pr.error, errors: pr.errors });

      const or = await apiGet<unknown>(
        catalogPath(bundle.offersPath),
        { page: 1, page_size: 50 },
        bundle.catalogToken
      );
      if (!alive) return;
      if (or.ok) {
        const rows = asArray<OfferRow>(or.data);
        // عزل العروض: show_cross_facility_offers=false → لهذه المنشأة فقط (إن ورد facility_id في العنصر)
        setOffers(
          bundle.features.show_cross_facility_offers
            ? rows
            : rows.filter((o) => o.facility_id == null || o.facility_id === bundle.facilityId)
        );
      }

      if (bundle.facilityPath) {
        const fr = await apiGet<TenantFacilityInfo>(catalogPath(bundle.facilityPath));
        if (!alive) return;
        if (fr.ok) setFacility(fr.data);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [bundle]);

  useEffect(() => {
    onCounts?.({ products: products.length, offers: offers.length, facilityName: facility?.name || bundle.title });
  }, [products, offers, facility, bundle.title, onCounts]);

  const addToCart = (p: TenantProduct) => {
    if (!p.is_available) return;
    setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
    toast.success(`أضيف «${p.name}» إلى السلة`);
  };
  const changeQty = (id: number, delta: number) =>
    setCart((c) => {
      const q = (c[id] ?? 0) + delta;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  const removeLine = (id: number) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });

  const lines: CartLine[] = products
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ product: p, qty: cart[p.id] }));
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = lines.reduce((s, l) => s + toNumber(l.product.price) * l.qty, 0);

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">{bundle.currency}</span>
      <Button size="sm" variant="ghost" className="gap-1.5 px-2.5 text-[11px] text-white hover:bg-white/20 hover:text-white sm:text-xs" onClick={() => setOrdersOpen(true)}>
        <ClipboardList className="h-3.5 w-3.5" /> طلباتي
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 px-2.5 text-[11px] text-white hover:bg-white/20 hover:text-white sm:text-xs" onClick={() => setWalletOpen(true)}>
        <WalletIcon className="h-3.5 w-3.5" /> محفظتي
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ===== القالب داخل حدود مضمنة ===== */}
      <Card className="mx-auto w-full max-w-5xl bg-white shadow-sm">
        <CardContent className="p-0">
          <div style={brandVars(bundle.primary, bundle.secondary)} className="flex flex-col rounded-xl">
            {/* شريط المتصفح المضمن */}
            <div className="flex items-center gap-2 rounded-t-xl border-b border-stone-200 bg-stone-50 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span dir="ltr" className="mx-auto rounded-md bg-white px-3 py-0.5 text-[11px] text-stone-500 shadow-sm">
                {bundle.siteUrl}
              </span>
            </div>

            {/* ترويسة الهوية — تتلوّن من بيانات التاجر */}
            <header className="bg-[var(--brand)] px-4 pb-4 pt-4 text-white sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                {bundle.logoUrl ? (
                  <img src={bundle.logoUrl} alt={bundle.title} className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <Store className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-black sm:text-xl">{bundle.title}</h2>
                  {bundle.tagline && <p className="truncate text-xs text-white/85 sm:text-sm">{bundle.tagline}</p>}
                </div>
                {headerActions}
              </div>
              {!bundle.preview && bundle.status && (
                <span className="mt-2 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">حالة الموقع: {bundle.status}</span>
              )}
            </header>
            <div className="h-1.5 bg-[var(--brand2)]" />

            {/* جسم القالب */}
            <div className="rounded-b-xl bg-white p-4 sm:p-6">
              {lastOrder && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    تم إنشاء طلبك بنجاح{lastOrder.id != null ? ` — رقم الطلب #${lastOrder.id}` : ""}
                  </p>
                  {lastOrder.total != null && (
                    <p className="mt-1 text-sm text-emerald-800">
                      الإجمالي: <strong>{formatMoney(lastOrder.total as string | number, bundle.currency)}</strong>
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-emerald-700">التوصيل إلى: {lastOrder.address}</p>
                  <p className="mt-1 text-xs text-emerald-600">الإشعارات الحية مفعّلة الآن — تابعها أسفل القالب وحالة الطلب من «طلباتي».</p>
                  <Button size="sm" variant="ghost" className="mt-2 h-7 text-emerald-800" onClick={() => setLastOrder(null)}>
                    إخفاء
                  </Button>
                </div>
              )}

              {/* مفاتيح العزل المفعّلة تُرسم كشرائط محايدة — وعند الإيقاف لا يُرسم شيء أصلاً (العزل حقيقي لا شارة) */}
              {(bundle.features.show_platform_banners ||
                bundle.features.show_region_aggregation ||
                bundle.features.show_other_facilities) && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                  {bundle.features.show_platform_banners && (
                    <Badge variant="outline" className="text-[11px] text-stone-600">بانرات المنصة معروضة على هذا النطاق</Badge>
                  )}
                  {bundle.features.show_region_aggregation && (
                    <Badge variant="outline" className="text-[11px] text-stone-600">تجميع المناطق مفعّل</Badge>
                  )}
                  {bundle.features.show_other_facilities && (
                    <Badge variant="outline" className="text-[11px] text-stone-600">إظهار منشآت أخرى مفعّل</Badge>
                  )}
                </div>
              )}

              {offers.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-2 text-sm font-extrabold text-stone-800">عروض المنشأة الحالية</h3>
                  <OffersStrip offers={offers} currency={bundle.currency} />
                </section>
              )}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-stone-900">المنتجات</h3>
                  <span className="text-xs text-stone-500">{products.length} منتج</span>
                </div>
                {loading && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-44 animate-pulse rounded-xl bg-stone-100" />
                    ))}
                  </div>
                )}
                {!loading && loadErr && <ErrorBox error={loadErr.error} errors={loadErr.errors} />}
                {!loading && !loadErr && products.length === 0 && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 py-10 text-center">
                    <PackageSearch className="h-8 w-8 text-stone-300" />
                    <p className="text-sm text-stone-500">لا منتجات منشورة بعد لهذه المنشأة.</p>
                  </div>
                )}
                {!loading && products.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {products.map((p) => (
                      <ProductCard key={p.id} p={p} currency={bundle.currency} onAdd={addToCart} />
                    ))}
                  </div>
                )}
              </section>

              <div className="mt-6">
                <FacilityInfo facility={facility} fallbackName={bundle.title} />
              </div>

              {/* شريط السلة العائم داخل القالب */}
              {cartCount > 0 && (
                <div className="sticky bottom-3 mt-5">
                  <Button onClick={() => setCartOpen(true)} className="flex w-full items-center justify-between rounded-xl bg-[var(--brand)] px-4 py-3 text-white shadow-lg hover:opacity-95">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <ShoppingBag className="h-4 w-4" /> سلتك: {cartCount} عنصر
                    </span>
                    <span className="text-sm font-black">{formatMoney(cartTotal, bundle.currency)} · إتمام الطلب</span>
                  </Button>
                </div>
              )}
            </div>

            {/* فوتر القالب — شارة العزل الوحيدة المسموحة */}
            <footer className="rounded-b-xl border-t border-stone-200 px-4 py-3 text-center">
              {bundle.features.single_facility_mode && (
                <Badge className="mb-1.5 gap-1 bg-[var(--brand)] text-white hover:bg-[var(--brand)]">
                  <ShieldCheck className="h-3 w-3" /> متجر واحد — موقع رسمي
                </Badge>
              )}
              <p className="text-xs text-stone-500">{bundle.title} — جميع الأسعار بعملة المنشأة: {bundle.currency}</p>
            </footer>
          </div>
        </CardContent>
      </Card>

      {wsOn && <LiveNotifications token={customerToken} active={wsOn} />}

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        bundle={bundle}
        lines={lines}
        total={cartTotal}
        onQty={changeQty}
        onRemove={removeLine}
        onNeedAuth={() => setAuthOpen(true)}
        onOrdered={(order) => {
          setLastOrder(order);
          setCart({});
          setCartOpen(false);
          setWsOn(true); // تفعيل المتابعة الحية بعد أول طلب فعلي
        }}
      />
      <AuthDialog key={authOpen ? "auth-open" : "auth-closed"} open={authOpen} onOpenChange={setAuthOpen} bundle={bundle} />
      <OrdersDialog open={ordersOpen} onOpenChange={setOrdersOpen} bundle={bundle} />
      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} bundle={bundle} />
    </div>
  );
}

/* =============================== IsolationPanel =============================== */

function IsolationPanel({
  features,
  counts,
  source,
  primary,
  secondary,
}: {
  features: TenantSiteFeatures;
  counts: IsolationCounts | null;
  source: "resolve" | "preview";
  primary: string | null;
  secondary: string | null;
}) {
  return (
    <Card className="mx-auto w-full max-w-5xl" style={brandVars(primary, secondary)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-emerald-700" /> لوحة العزل — مفاتيح site.features
        </CardTitle>
        <CardDescription>
          {source === "resolve"
            ? "فحص حي للمفاتيح الواردة في استجابة /tenant/resolve — القالب يطبّقها حرفياً."
            : "معاينة المالك قبل التفعيل: كل مفاتيح العزل مطفأة والقالب نفسه يعرض منشأتك وحدها."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {ISOLATION_ROWS.map((r) => {
            const ok = features[r.key] === r.isolatedWhen;
            const Icon = ok ? Check : X;
            return (
              <li key={r.key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-emerald-600" : "text-rose-600"}`} />
                <span className="min-w-0">
                  <span dir="ltr" className="block font-mono text-[10px] text-stone-500">{r.key}</span>
                  {r.label} — {ok ? "مُطبّق على هذا العرض" : "غير معزول (المفتاح يسمح بالإظهار)"}
                </span>
              </li>
            );
          })}
        </ul>
        <Separator />
        <div className="grid gap-3 text-center sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-lg font-black" style={{ color: "var(--brand)" }}>{counts?.products ?? "…"}</p>
            <p className="text-xs text-stone-500">المنتجات المعروضة من الكتالوج</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-lg font-black" style={{ color: "var(--brand)" }}>{counts?.offers ?? "…"}</p>
            <p className="text-xs text-stone-500">العروض (بعد فلترة العزل)</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="truncate text-sm font-black text-stone-800">{counts?.facilityName ?? "…"}</p>
            <p className="text-xs text-stone-500">المنشأة الوحيدة المعروضة</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =============================== تبويب 1: وضع النطاق الحقيقي =============================== */

interface RealDomainTabProps {
  host: string;
  onHostChange: (v: string) => void;
  resolved: ResolveResponse | null;
  onResolved: (r: ResolveResponse | null) => void;
  noSite: { message: string; status: number } | null;
  onNoSite: (v: { message: string; status: number } | null) => void;
}

function RealDomainTab({ host, onHostChange, resolved, onResolved, noSite, onNoSite }: RealDomainTabProps) {
  const [resolving, setResolving] = useState(false);
  const [counts, setCounts] = useState<IsolationCounts | null>(null);
  const handleCounts = useCallback((c: IsolationCounts) => setCounts(c), []);

  /** GET /tenant/resolve?host=... — بلا توكن (أول نداء يفعله أي زائر) */
  const resolveNow = async () => {
    const h = normalizeHostInput(host);
    if (!h) {
      toast.error("أدخل نطاقاً أولاً — مثال: demo.tawfir.giize.com");
      return;
    }
    setResolving(true);
    const r = await apiGet<ResolveResponse>("/tenant/resolve", { host: h });
    setResolving(false);
    if (r.ok) {
      onNoSite(null);
      onResolved(r.data);
      toast.success("حُلّ النطاق — القالب يعرض هوية التاجر الحية");
    } else {
      onResolved(null);
      onNoSite({ message: r.error, status: r.status });
    }
  };

  const bundle = useMemo<SiteBundle | null>(() => {
    if (!resolved) return null;
    const b = resolved.brand;
    return {
      title: resolved.site?.title || b.display_name || "متجر التاجر",
      tagline: b.tagline ?? null,
      logoUrl: assetUrl(b.assets?.logo?.url) ?? null,
      primary: b.colors?.primary ?? null,
      secondary: b.colors?.secondary ?? null,
      currency: resolved.currency,
      features: resolved.site?.features ?? ISOLATED_FEATURES,
      facilityId: b.facility_id,
      productsPath: resolved.catalog?.products ?? "",
      offersPath: resolved.catalog?.offers ?? "",
      ordersPath: resolved.catalog?.orders ?? "/orders",
      facilityPath: resolved.catalog?.facility ?? null,
      facilityFallback: null,
      catalogToken: null,
      preview: false,
      status: resolved.site?.status ?? null,
      siteUrl: resolved.site?.domain ?? host,
    };
  }, [resolved, host]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-emerald-700" /> حل النطاق — GET /tenant/resolve (بلا توكن)
          </CardTitle>
          <CardDescription>
            أول نداء يفعله زائر موقع تاجر. حالياً يرد 404 لكل النطاقات («لا يوجد موقع تاجر فعّال على هذا النطاق»)
            لأن التفعيل يتم من الإدارة — والقالب يعرض صفحة المهذبة عندئذٍ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); resolveNow(); }} className="flex flex-col gap-2 sm:flex-row">
            <Input
              dir="ltr"
              className="flex-1 text-left font-mono"
              placeholder="demo.tawfir.giize.com"
              value={host}
              onChange={(e) => onHostChange(e.target.value)}
              aria-label="النطاق الزائر"
            />
            <Button type="submit" disabled={resolving} className="gap-1.5">
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {resolving ? "جارٍ الحل…" : "حل النطاق"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {noSite && <NoSitePage host={host} message={noSite.message} status={noSite.status} />}

      {bundle && (
        <>
          <Storefront key={`${bundle.siteUrl}|${bundle.facilityId}|${bundle.productsPath}`} bundle={bundle} onCounts={handleCounts} />
          <IsolationPanel features={bundle.features} counts={counts} source="resolve" primary={bundle.primary} secondary={bundle.secondary} />
        </>
      )}
    </div>
  );
}

/* =============================== تبويب 2: معاينة المالك (قبل التفعيل) =============================== */

/** جسّر المعاينة — يُركَّب بkey لكل منشأة فتبدأ حالاته نظيفة (loading=true) بلا ضبط متزامن في التأثير */
function PreviewInner({ facilityId, token, facilityName }: { facilityId: number; token: string; facilityName: string | null }) {
  const [bundle, setBundle] = useState<SiteBundle | null>(null);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [counts, setCounts] = useState<IsolationCounts | null>(null);
  const handleCounts = useCallback((c: IsolationCounts) => setCounts(c), []);

  /** بناء كائن شبيه بالـresolve من ردود حية فقط — الهوية من GET /owner/brand، والكتالوج يجلبه Storefront من مسارات المالك */
  useEffect(() => {
    let alive = true;
    (async () => {
      const br = await apiGet<BrandPackage>("/owner/brand", { facility_id: facilityId }, token);
      if (!alive) return;
      if (!br.ok) {
        setErr({ error: br.error, errors: br.errors });
        return;
      }
      const b = br.data;
      setBundle({
        title: b.display_name || facilityName || `منشأة #${facilityId}`,
        tagline: b.tagline ?? null,
        logoUrl: assetUrl(b.assets?.logo?.url) ?? null,
        primary: b.colors?.primary ?? null,
        secondary: b.colors?.secondary ?? null,
        currency: b.currency,
        features: ISOLATED_FEATURES,
        facilityId,
        productsPath: `/owner/${facilityId}/products`,
        offersPath: `/owner/${facilityId}/special-offers`,
        ordersPath: "/orders",
        facilityPath: null,
        facilityFallback: {
          name: b.display_name ?? facilityName ?? undefined,
          address: b.contacts?.address ?? null,
          phone: b.contacts?.phone ?? null,
          working_hours: null,
        },
        catalogToken: token,
        preview: true,
        status: null,
        siteUrl: "preview.local — قبل تفعيل النطاق",
      });
    })();
    return () => {
      alive = false;
    };
  }, [facilityId, token, facilityName]);

  return (
    <>
      {/* الشارة الكهرمانية الثابتة أعلى القالب */}
      <div className="sticky top-2 z-30 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold leading-relaxed text-amber-900 shadow-sm sm:text-sm">
        وضع معاينة — يقرأ هويتك ومنتجاتك الحية من{" "}
        <span dir="ltr" className="font-mono">/owner/brand</span> و
        <span dir="ltr" className="font-mono"> /owner/{facilityId}/products</span> · النطاق الفعلي يعمل بعد تفعيل
        الموقع من الإدارة
      </div>

      {err && <ErrorBox error={err.error} errors={err.errors} />}

      {bundle && (
        <>
          <Storefront key={`${bundle.facilityId}|${bundle.productsPath}`} bundle={bundle} onCounts={handleCounts} />
          <IsolationPanel features={bundle.features} counts={counts} source="preview" primary={bundle.primary} secondary={bundle.secondary} />
        </>
      )}

      {!bundle && !err && <div className="h-72 animate-pulse rounded-xl bg-stone-100" />}
    </>
  );
}

function OwnerPreviewTab() {
  const ownerToken = useSession((s) => s.tokens.owner);
  const ownerFacilityId = useSession((s) => s.ownerFacilityId);
  const ownerFacilityName = useSession((s) => s.ownerFacilityName);
  const setOwnerFacility = useSession((s) => s.setOwnerFacility);

  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [noFacilities, setNoFacilities] = useState(false);

  /** إن لم تُختر منشأة: GET /owner/brand/facilities واختيار الأولى تلقائياً */
  useEffect(() => {
    if (!ownerToken || ownerFacilityId != null || noFacilities) return;
    let alive = true;
    (async () => {
      const r = await apiGet<BrandFacilityRow[]>("/owner/brand/facilities", undefined, ownerToken);
      if (!alive) return;
      if (r.ok) {
        if (r.data.length > 0) setOwnerFacility(r.data[0].facility_id, r.data[0].name);
        else setNoFacilities(true);
      } else {
        setErr({ error: r.error, errors: r.errors });
      }
    })();
    return () => {
      alive = false;
    };
  }, [ownerToken, ownerFacilityId, noFacilities, setOwnerFacility]);

  if (!ownerToken) {
    return (
      <Card className="mx-auto max-w-lg border-amber-300 bg-amber-50">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <KeyRound className="h-7 w-7 text-amber-700" />
          </div>
          <p className="text-base font-extrabold text-amber-900">معاينة المالك تتطلب جلسة مالك فعّالة</p>
          <p className="max-w-sm text-sm leading-relaxed text-amber-800">
            ادخل من شاشة «هويتي (منشآتي)» أولاً — جلسة المالك تُخزَّن محلياً وتُقرأ هنا مباشرة، ثم تُبنى هذه المعاينة من بياناتك الحية:{" "}
            <span dir="ltr" className="font-mono">GET /owner/brand</span> و
            <span dir="ltr" className="font-mono"> GET /owner/{"{id}"}/products</span>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {noFacilities && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-8 text-center text-sm text-amber-900">
            لا منشآت مرتبطة بحسابك — سجّل منشأتك من شاشة «هويتي (منشآتي)» أولاً ثم أعد هذه المعاينة.
          </CardContent>
        </Card>
      )}

      {err && !noFacilities && <ErrorBox error={err.error} errors={err.errors} />}

      {ownerFacilityId != null && (
        <PreviewInner key={ownerFacilityId} facilityId={ownerFacilityId} token={ownerToken} facilityName={ownerFacilityName} />
      )}
    </div>
  );
}

/* =============================== الجذر =============================== */

export function GeneratedSite() {
  // حالة النطاق الحقيقي مرفوعة هنا لتبقى عند تبديل التبويبين
  const [host, setHost] = useState("");
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);
  const [noSite, setNoSite] = useState<{ message: string; status: number } | null>(null);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">الموقع المولَّد — قالب المتجر الموحّد</h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          قالب واحد يتلوّن من بيانات التاجر: الألوان والشعار والعملة والكتالوج كلها من الـAPI — مع مفاتيح عزل
          site.features تجعله موقع التاجر وحده، لا منصة.
        </p>
      </header>

      <Tabs defaultValue="real">
        <TabsList className="flex w-full justify-start sm:w-auto">
          <TabsTrigger value="real" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> وضع النطاق الحقيقي
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Store className="h-3.5 w-3.5" /> معاينة المالك (قبل التفعيل)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="real" className="mt-4">
          <RealDomainTab host={host} onHostChange={setHost} resolved={resolved} onResolved={setResolved} noSite={noSite} onNoSite={setNoSite} />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <OwnerPreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
