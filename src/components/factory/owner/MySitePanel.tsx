"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiGet } from "@/lib/factory/api";
import type { BrandFacilityRow, Completeness, TenantSite } from "@/lib/factory/types";
import { useSession } from "@/store/session";
import { LoginGate } from "@/components/factory/shared/LoginGate";
import { CompletenessMeter, ErrorBox } from "@/components/factory/shared/Bits";
import {
  ArrowLeftRight,
  Copy,
  Eye,
  Globe,
  Info,
  RefreshCw,
  Store,
  TriangleAlert,
} from "lucide-react";

/* ---------- أدوات مشتركة داخل اللوحة ---------- */

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

/** تطبيع رد GET /owner/tenant-site: الموقع مباشرة أو داخل site، أو null عند عدم الوجود */
function normalizeSite(raw: unknown): TenantSite | null {
  if (!raw || typeof raw !== "object") return null;
  if ("slug" in (raw as Record<string, unknown>)) return raw as TenantSite;
  const inner = (raw as { site?: unknown }).site;
  if (inner && typeof inner === "object" && "slug" in (inner as Record<string, unknown>)) {
    return inner as TenantSite;
  }
  return null;
}

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

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("نُسخ إلى الحافظة", { description: text });
  } catch {
    toast.error("تعذّر النسخ تلقائياً — انسخ النص يدوياً");
  }
}

/* ---------- اختيار المنشأة عندما لا توجد منشأة محفوظة ---------- */

function FacilityPicker({ onSelect }: { onSelect: (id: number, name: string) => void }) {
  const token = useSession((s) => s.tokens.owner)!;
  const [rows, setRows] = useState<BrandFacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  const load = useCallback(async () => {
    // يبدأ بـ await حتى لا يُجرى أي setState بشكل متزامن داخل المؤثر
    const r = await apiGet<BrandFacilityRow[]>("/owner/brand/facilities", undefined, token);
    if (r.ok) {
      setRows(r.data);
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
    setLoading(false);
  }, [token]);

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="inline-flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-700" /> اختر منشأتك — GET /owner/brand/facilities
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              load();
            }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </CardTitle>
        <CardDescription>موقع المنشأة يُجلب بعدها عبر GET /owner/tenant-site?facility_id=…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ErrorBox error={err?.error} errors={err?.errors} />
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-stone-200" />
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">لا منشآت مرتبطة بهذا المالك</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {rows.map((f) => (
              <li key={f.facility_id}>
                <button
                  type="button"
                  onClick={() => onSelect(f.facility_id, f.name)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-start transition-colors hover:bg-stone-50"
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
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- بطاقة «موقعي» ---------- */

function MySiteCard({
  facilityId,
  facilityName,
  onChangeFacility,
}: {
  facilityId: number;
  facilityName: string | null;
  onChangeFacility: () => void;
}) {
  const token = useSession((s) => s.tokens.owner)!;
  const [site, setSite] = useState<TenantSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [previewNote, setPreviewNote] = useState<PreviewNote | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    // يبدأ بـ await حتى لا يُجرى أي setState بشكل متزامن داخل المؤثر
    const r = await apiGet<unknown>("/owner/tenant-site", { facility_id: facilityId }, token);
    setPreviewNote(null);
    if (r.ok) {
      // 200 مع null أو 404 = لا موقع بعد؛ أخطاء أخرى تُعرض حرفياً
      setSite(normalizeSite(r.data));
    } else if (r.status === 404) {
      setSite(null);
    } else {
      setSite(null);
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
    setLoading(false);
  }, [facilityId, token]);

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

  const preview = async () => {
    if (!site?.slug) return;
    setPreviewing(true);
    setPreviewNote({ ok: true });
    const note = await fetchTenantConfig(site.slug);
    setPreviewing(false);
    if (note.ok) {
      toast.success("الموقع يعود بإعداده قبل أي DNS", {
        description: note.title ? `عنوان الموقع: ${note.title}` : undefined,
      });
    } else {
      toast.error(note.error);
    }
    setPreviewNote(note);
  };

  const bc: Completeness | undefined = site?.brand_completeness;
  const incomplete = !!bc && typeof bc.percent === "number" && bc.percent < 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          المنشأة: <strong>{facilityName ?? `#${facilityId}`}</strong>
          <span className="mx-2 text-stone-300">·</span>
          <span className="font-mono text-xs text-stone-400">facility_id={facilityId}</span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              load();
            }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button variant="outline" onClick={onChangeFacility} className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" /> تغيير المنشأة
          </Button>
        </div>
      </div>

      <ErrorBox error={err?.error} errors={err?.errors} />

      {loading ? (
        <div className="h-56 animate-pulse rounded-xl bg-stone-200" />
      ) : !site ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Info className="h-6 w-6 text-stone-400" />
            <p className="text-sm font-semibold text-stone-700">لا موقع بعد</p>
            <p className="text-sm text-stone-500">تُنشأ المواقع وتُفعّل من إدارة المصنع</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span>{site.site_title || site.slug}</span>
              <StatusBadge status={site.status} />
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-2">
              <span>موقعي — GET /owner/tenant-site</span>
              <span>·</span>
              <span className="font-mono text-xs" dir="ltr">{site.slug}</span>
              <span>·</span>
              <span>منشأة #{site.facility_id}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* الدومينات — الفعّال قابل للنسخ */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">الدومين الفعّال:</span>
                <span className="font-mono text-sm font-bold text-stone-800" dir="ltr">{site.effective_domain}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="نسخ الدومين الفعّال"
                  onClick={() => copyText(site.effective_domain)}
                >
                  <Copy className="h-4 w-4 text-stone-500" />
                </Button>
              </div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">الافتراضي:</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-stone-800" dir="ltr">
                  <Globe className="h-3 w-3" /> {site.default_domain}
                </span>
              </p>
              {site.custom_domain ? (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500">دومين مخصص:</span>
                  <span className="font-mono text-xs text-stone-800" dir="ltr">{site.custom_domain}</span>
                </p>
              ) : null}
            </div>

            {/* اكتمال الهوية إن ورد مع الرد */}
            {bc && (
              <div className="space-y-2">
                <CompletenessMeter percent={bc.percent} missing={bc.missing} />
                {incomplete && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>الهوية غير مكتملة ({bc.percent}%)</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      أكمل هويتك من شاشة هويتي ليتمكن الأدمن من التفعيل
                      {bc.missing?.length ? ` — الناقص: ${bc.missing.join(" · ")}` : ""}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* نتيجة المعاينة */}
            {previewNote && !previewNote.ok && previewNote.error && <ErrorBox error={previewNote.error} />}
            {previewNote?.ok && (
              <p className="text-xs text-emerald-700">
                عاد إعداد الموقع ✓ {previewNote.title ? `— العنوان: ${previewNote.title}` : ""}
              </p>
            )}

            {site.slug && (
              <Button onClick={preview} disabled={previewing} className="gap-1.5">
                <Eye className="h-4 w-4" /> {previewing ? "جارٍ الفحص…" : "معاينة إعداد الموقع"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- القسم بعد الدخول: منشأة محفوظة أو اختيار ---------- */

function MySiteSection() {
  const ownerFacilityId = useSession((s) => s.ownerFacilityId);
  const ownerFacilityName = useSession((s) => s.ownerFacilityName);
  const setOwnerFacility = useSession((s) => s.setOwnerFacility);

  if (!ownerFacilityId) {
    return <FacilityPicker onSelect={(id, name) => setOwnerFacility(id, name)} />;
  }
  return (
    <MySiteCard
      facilityId={ownerFacilityId}
      facilityName={ownerFacilityName}
      onChangeFacility={() => setOwnerFacility(null)}
    />
  );
}

/* ---------- اللوحة العلوية + بوابة المالك (نمط BrandPanel حرفياً) ---------- */

export function OwnerMySitePanel() {
  const token = useSession((s) => s.tokens.owner);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">موقعي — لوحة المنشآت</h1>
        <p className="mt-1 text-sm text-stone-600">
          حالة الموقع الفرعي لمنشأتك عبر GET /owner/tenant-site — الإنشاء والتفعيل يتمان من إدارة المصنع
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
          {() => <MySiteSection />}
        </LoginGate>
      ) : (
        <MySiteSection />
      )}
    </div>
  );
}
