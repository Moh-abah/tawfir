"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiGet, apiPatch, apiPost } from "@/lib/factory/api";
import type { Completeness, TenantSite } from "@/lib/factory/types";
import { LoginGate } from "@/components/factory/shared/LoginGate";
import { ErrorBox } from "@/components/factory/shared/Bits";
import {
  Eye,
  Globe,
  Hash,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";

/* ---------- أدوات مشتركة داخل اللوحة ---------- */

/** الرد قد يكون مصفوفة أو {items:[...]} — نتعامل مع الحالتين */
function asSites(data: unknown): TenantSite[] {
  if (Array.isArray(data)) return data as TenantSite[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: TenantSite[] }).items;
  }
  return [];
}

function isIncomplete(bc?: Completeness): boolean {
  return !!bc && typeof bc.percent === "number" && bc.percent < 100;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** فحص معاينة الموقع العام: GET /tenant/{slug}/config (بلا توكن) */
type PreviewNote = { ok: boolean; title?: string; error?: string };
async function fetchTenantConfig(slug: string): Promise<PreviewNote> {
  const r = await apiGet<Record<string, unknown>>(`/tenant/${encodeURIComponent(slug)}/config`);
  if (r.ok) {
    const site = (r.data as { site?: { title?: unknown } } | null)?.site;
    const title = site && typeof site.title === "string" ? site.title : undefined;
    return { ok: true, title };
  }
  return { ok: false, error: r.error };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        فعّال
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
        موقوف
      </Badge>
    );
  }
  if (status === "draft") {
    return (
      <Badge variant="outline" className="border-stone-200 bg-stone-50 text-stone-600">
        مسودة
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

/* ---------- نموذج الإنشاء/التعديل ---------- */

interface SiteFormState {
  facility_id: string;
  slug: string;
  site_title: string;
  seo_description: string;
  custom_domain: string;
}

const EMPTY_FORM: SiteFormState = {
  facility_id: "",
  slug: "",
  site_title: "",
  seo_description: "",
  custom_domain: "",
};

/* ---------- شاشة مدير المواقع (بعد الدخول) ---------- */

function SitesManager({ token }: { token: string }) {
  const [sites, setSites] = useState<TenantSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  // نتائج لكل بطاقة
  const [previews, setPreviews] = useState<Record<string, PreviewNote>>({});
  const [dnsChecks, setDnsChecks] = useState<Record<number, Record<string, unknown>>>({});

  // الديالوجات
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TenantSite | null>(null);
  const [filter, setFilter] = useState<"" | "draft" | "active" | "suspended">("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // يبدأ بـ await حتى لا يُجرى أي setState بشكل متزامن داخل المؤثر
  const load = useCallback(async () => {
    const r = await apiGet<unknown>("/admin/tenant-sites", { status: filter || undefined }, token);
    if (r.ok) {
      setSites(asSites(r.data));
    } else {
      setErr({ error: r.error, errors: r.errors });
      setSites([]);
    }
    setLoading(false);
  }, [filter, token]);

  useEffect(() => {
    // الجلب يُؤجَّل إلى مايكروتاسك مع حراسة alive — لا تحديث حالة بشكل متزامن داخل المؤثر
    let alive = true;
    void Promise.resolve().then(() => {
      if (alive) void load();
    });
    return () => {
      alive = false;
    };
  }, [load]);

  /* معاينة: 200 → توست + عنوان الموقع | 404 → الرسالة الحرفية */
  const preview = async (site: TenantSite) => {
    setPreviews((p) => ({ ...p, [site.slug]: { ok: true } }));
    const note = await fetchTenantConfig(site.slug);
    if (note.ok) {
      toast.success("الموقع يعود بإعداده قبل أي DNS", {
        description: note.title ? `عنوان الموقع: ${note.title}` : undefined,
      });
      setPreviews((p) => ({ ...p, [site.slug]: note }));
    } else {
      toast.error(note.error);
      setPreviews((p) => ({ ...p, [site.slug]: note }));
    }
  };

  /* فحص DNS: الرد الحرفي — resolved / ips / points_to_server / note */
  const domainCheck = async (site: TenantSite) => {
    setBusyId(site.id);
    const r = await apiPost<Record<string, unknown>>(`/admin/tenant-sites/${site.id}/domain-check`, undefined, token);
    setBusyId(null);
    if (r.ok) {
      setDnsChecks((p) => ({ ...p, [site.id]: r.data ?? {} }));
      toast.success("تم فحص الدومين");
    } else {
      toast.error(r.error);
    }
  };

  /* تفعيل/إيقاف — التفعيل محجوب قبل اكتمال الهوية */
  const setStatus = async (site: TenantSite, status: "active" | "suspended") => {
    if (status === "active" && isIncomplete(site.brand_completeness)) {
      toast.error("أكمل الهوية أولاً");
      return;
    }
    setBusyId(site.id);
    const r = await apiPost<unknown>(`/admin/tenant-sites/${site.id}/status`, { status }, token);
    setBusyId(null);
    if (r.ok) {
      toast.success(`تم إسناد الحالة: ${status === "active" ? "فعّال" : "موقوف"}`);
      load();
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  const FILTERS: { value: typeof filter; label: string }[] = [
    { value: "", label: "الكل" },
    { value: "draft", label: "draft" },
    { value: "active", label: "active" },
    { value: "suspended", label: "suspended" },
  ];

  return (
    <div className="space-y-4">
      {/* شريط الأدوات: تحديث + فلتر حالة + إنشاء */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setLoading(true);
            load();
          }}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> إنشاء موقع
        </Button>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1" role="group" aria-label="فلتر الحالة">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors ${
                filter === f.value ? "bg-emerald-600 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!loading && <span className="text-sm text-stone-500">{sites.length} موقع</span>}
      </div>

      <ErrorBox error={err?.error} errors={err?.errors} />

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-stone-200" />
      ) : sites.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-stone-500">
            لا مواقع بعد — أنشئ أول موقع عبر «إنشاء موقع»
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-xl pr-1">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                busy={busyId === site.id}
                previewNote={previews[site.slug]}
                dnsResult={dnsChecks[site.id]}
                onPreview={() => preview(site)}
                onDnsCheck={() => domainCheck(site)}
                onActivate={() => setStatus(site, "active")}
                onSuspend={() => setStatus(site, "suspended")}
                onEdit={() => setEditing(site)}
              />
            ))}
          </div>
        </div>
      )}

      <CreateSiteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        token={token}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
      {editing && (
        <EditSiteDialog
          site={editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          token={token}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------- بطاقة موقع تاجر ---------- */

function SiteCard({
  site,
  busy,
  previewNote,
  dnsResult,
  onPreview,
  onDnsCheck,
  onActivate,
  onSuspend,
  onEdit,
}: {
  site: TenantSite;
  busy: boolean;
  previewNote?: PreviewNote;
  dnsResult?: Record<string, unknown>;
  onPreview: () => void;
  onDnsCheck: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onEdit: () => void;
}) {
  const incomplete = isIncomplete(site.brand_completeness);
  const domainDiffers = !!site.effective_domain && site.effective_domain !== site.default_domain;

  // حقول فحص DNS كما يرد حرفياً (الأنواع دفاعية لأن الرد مفتوح)
  const resolvedRaw = dnsResult?.resolved;
  const resolvedBool = typeof resolvedRaw === "boolean" ? resolvedRaw : null;
  const ips = Array.isArray(dnsResult?.ips) ? (dnsResult?.ips as unknown[]).map((x) => String(x)) : [];
  const points = dnsResult && "points_to_server" in dnsResult ? dnsResult.points_to_server : undefined;
  const note = dnsResult && typeof dnsResult.note === "string" ? dnsResult.note : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="line-clamp-1">{site.site_title || site.slug}</span>
          <StatusBadge status={site.status} />
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs" dir="ltr">
            <Hash className="h-3 w-3" /> {site.slug}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Store className="h-3 w-3" /> {site.facility_name || "منشأة"} #{site.facility_id}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {/* الدومينات */}
        <div className="space-y-1.5">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-500">الدومين الافتراضي:</span>
            <span className="font-mono text-xs text-stone-800" dir="ltr">{site.default_domain}</span>
          </p>
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-500">الفعّال:</span>
            <span className="font-mono text-xs text-stone-800" dir="ltr">{site.effective_domain}</span>
            {domainDiffers && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                مختلف عن الافتراضي
              </Badge>
            )}
          </p>
          {site.custom_domain ? (
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500">دومين مخصص:</span>
              <span className="font-mono text-xs text-stone-800" dir="ltr">{site.custom_domain}</span>
            </p>
          ) : null}
        </div>

        {/* تنبيه الهوية غير المكتملة — يعطّل التفعيل */}
        {incomplete && site.brand_completeness && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>الهوية غير مكتملة</AlertTitle>
            <AlertDescription className="text-amber-700">
              النسبة: {site.brand_completeness.percent}% — الناقص:{" "}
              {site.brand_completeness.missing?.length ? site.brand_completeness.missing.join(" · ") : "—"}
            </AlertDescription>
          </Alert>
        )}

        {/* نتيجة فحص DNS كما وردت */}
        {dnsResult && (
          <div className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
            <p className="flex items-center gap-2">
              <span className="font-semibold text-stone-500">resolved:</span>
              {resolvedBool === true ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">نعم</Badge>
              ) : resolvedBool === false ? (
                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">لا</Badge>
              ) : (
                <Badge variant="outline">{String(resolvedRaw)}</Badge>
              )}
            </p>
            {ips.length > 0 && (
              <p>
                <span className="font-semibold text-stone-500">ips:</span>{" "}
                <span className="font-mono" dir="ltr">{ips.join(" · ")}</span>
              </p>
            )}
            {points !== undefined && (
              <p>
                <span className="font-semibold text-stone-500">points_to_server:</span>{" "}
                <span>{String(points)}</span>
              </p>
            )}
            {note && <p className="text-stone-600">{note}</p>}
          </div>
        )}

        {/* نتيجة المعاينة */}
        {previewNote && !previewNote.ok && previewNote.error && (
          <ErrorBox error={previewNote.error} />
        )}
        {previewNote?.ok && (
          <p className="text-xs text-emerald-700">
            عاد إعداد الموقع ✓ {previewNote.title ? `— العنوان: ${previewNote.title}` : ""}
          </p>
        )}

        <Separator />

        {/* الإجراءات */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onPreview} className="gap-1.5">
            <Eye className="h-4 w-4" /> معاينة
          </Button>
          <Button variant="outline" onClick={onDnsCheck} disabled={busy} className="gap-1.5">
            <Globe className="h-4 w-4" /> فحص DNS
          </Button>
          <Button variant="secondary" onClick={onEdit} disabled={busy} className="gap-1.5">
            <Pencil className="h-4 w-4" /> تعديل
          </Button>
          {site.status === "active" ? (
            <Button variant="outline" onClick={onSuspend} disabled={busy} className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50">
              <Pause className="h-4 w-4" /> إيقاف
            </Button>
          ) : incomplete ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex" tabIndex={0}>
                  <Button disabled className="gap-1.5">
                    <Play className="h-4 w-4" /> تفعيل
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>أكمل الهوية أولاً</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={onActivate} disabled={busy} className="gap-1.5">
              <Play className="h-4 w-4" /> تفعيل
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- ديالوج الإنشاء: POST /admin/tenant-sites ---------- */

function CreateSiteDialog({
  open,
  onOpenChange,
  token,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  token: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<SiteFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  const submit = async () => {
    setErr(null);
    if (!form.facility_id || Number.isNaN(Number(form.facility_id))) {
      setErr({ error: "معرّف المنشأة مطلوب (رقم)" });
      return;
    }
    if (!SLUG_RE.test(form.slug.trim())) {
      setErr({ error: "المعرّف (slug) يجب أن يكون حروفاً لاتينية صغيرة وأرقاماً وشرطات" });
      return;
    }
    setBusy(true);
    const body = {
      facility_id: Number(form.facility_id),
      slug: form.slug.trim(),
      site_title: form.site_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      custom_domain: form.custom_domain.trim() || null,
    };
    const r = await apiPost<TenantSite>("/admin/tenant-sites", body, token);
    setBusy(false);
    if (r.ok) {
      toast.success("تم إنشاء الموقع", {
        description: (r.data as { status?: string })?.status
          ? `الحالة كما يرد من الخادم: ${(r.data as { status: string }).status}`
          : undefined,
      });
      setForm(EMPTY_FORM);
      onCreated();
    } else {
      // 409 «slug مستخدم/دومين مرتبط» أو 422 «المعرّف محجوز لنطاقات النظام» — كما ترد حرفياً
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء موقع تاجر — POST /admin/tenant-sites</DialogTitle>
          <DialogDescription>الحد الأدنى للعقد: facility_id + slug — والباقي اختياري كما في SiteCreate</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ErrorBox error={err?.error} errors={err?.errors} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-facility">facility_id (رقم)</Label>
              <Input
                id="create-facility"
                type="number"
                min={1}
                inputMode="numeric"
                dir="ltr"
                className="w-full"
                value={form.facility_id}
                onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">slug (لاتيني صغير)</Label>
              <Input
                id="create-slug"
                dir="ltr"
                className="w-full font-mono"
                placeholder="bake"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
              <p className="text-[11px] text-stone-500">حروف صغيرة/أرقام/شرطات — 409 إن كان مستخدماً</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create-title">site_title</Label>
              <Input
                id="create-title"
                className="w-full"
                value={form.site_title}
                onChange={(e) => setForm({ ...form, site_title: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create-seo">seo_description</Label>
              <Textarea
                id="create-seo"
                rows={3}
                className="w-full"
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="create-domain">custom_domain (اختياري)</Label>
              <Input
                id="create-domain"
                dir="ltr"
                className="w-full font-mono"
                placeholder="shop.example.com"
                value={form.custom_domain}
                onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              />
              <p className="text-[11px] text-stone-500">
                اختياري — يُمسح لاحقاً بإرسال نص فارغ عبر التعديل
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "جارٍ الإنشاء…" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- ديالوج التعديل: PATCH /admin/tenant-sites/{site_id} ---------- */

function EditSiteDialog({
  site,
  onOpenChange,
  token,
  onSaved,
}: {
  site: TenantSite;
  onOpenChange: (o: boolean) => void;
  token: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SiteFormState>({
    facility_id: String(site.facility_id),
    slug: site.slug,
    site_title: site.site_title ?? "",
    seo_description: site.seo_description ?? "",
    custom_domain: site.custom_domain ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  const submit = async () => {
    setErr(null);
    if (!SLUG_RE.test(form.slug.trim())) {
      setErr({ error: "المعرّف (slug) يجب أن يكون حروفاً لاتينية صغيرة وأرقاماً وشرطات" });
      return;
    }
    setBusy(true);
    // يُرسل ما تغيّر فقط — custom_domain="" يزيل الدومين المخصص (عقد SiteUpdate)
    const body: Record<string, string> = {};
    if (form.slug.trim() !== site.slug) body.slug = form.slug.trim();
    if (form.site_title !== (site.site_title ?? "")) body.site_title = form.site_title;
    if (form.seo_description !== (site.seo_description ?? "")) body.seo_description = form.seo_description;
    if (form.custom_domain.trim() !== (site.custom_domain ?? "")) body.custom_domain = form.custom_domain.trim();

    const r = await apiPatch<TenantSite>(`/admin/tenant-sites/${site.id}`, body, token);
    setBusy(false);
    if (r.ok) {
      toast.success("تم حفظ التعديلات");
      onSaved();
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            تعديل الموقع <span className="font-mono" dir="ltr">{site.slug}</span> — PATCH /admin/tenant-sites/{site.id}
          </DialogTitle>
          <DialogDescription>يُرسَل ما تغيّر فقط — ومرّر نصاً فارغاً في الدومين المخصص لإزالته</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ErrorBox error={err?.error} errors={err?.errors} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-slug">slug</Label>
              <Input
                id="edit-slug"
                dir="ltr"
                className="w-full font-mono"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-facility">facility_id (للعرض — لا يتغير عبر PATCH)</Label>
              <Input id="edit-facility" dir="ltr" className="w-full font-mono" value={form.facility_id} disabled />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-title">site_title</Label>
              <Input
                id="edit-title"
                className="w-full"
                value={form.site_title}
                onChange={(e) => setForm({ ...form, site_title: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-seo">seo_description</Label>
              <Textarea
                id="edit-seo"
                rows={3}
                className="w-full"
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-domain">custom_domain</Label>
              <Input
                id="edit-domain"
                dir="ltr"
                className="w-full font-mono"
                placeholder="اتركه فارغاً لإزالة الدومين المخصص"
                value={form.custom_domain}
                onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              />
              <p className="text-[11px] text-stone-500">
                النص الفارغ «» يزيل الدومين المخصص — حسب وصف SiteUpdate في العقد
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- اللوحة العلوية + بوابة الأدمن ---------- */

export function AdminTenantSitesPanel() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">مواقع التجار — لوحة الإدارة</h1>
        <p className="mt-1 text-sm text-stone-600">
          إنشاء وتعديل وتفعيل مواقع المنشآت + فحص DNS — كل شيء عبر /admin/tenant-sites كما في العقد
        </p>
      </header>

      <LoginGate
        role="admin"
        title="بوابة الأدمن"
        description="دخول إدارة المصنع — POST /admin/login (identifier + password)"
        endpoint="/admin/login"
        mode="identifier"
        placeholder="email الأدمن"
        hint="حد موثق: بيانات الأدمن المُسلَّمة تعيد 401 «Invalid admin credentials» — بوابة حقيقية تعمل متى توفرت بيانات صالحة"
      >
        {(token) => <SitesManager token={token} />}
      </LoginGate>
    </div>
  );
}
