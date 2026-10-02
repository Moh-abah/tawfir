"use client";

/**
 * الكونسول المنفصل — مصنع «توفير» (المهمة 5-a)
 * شاشة كاملة مستقلة منطقياً: دخول → إثبات عزل → 5 تبويبات:
 * جاهزية الهوية / سجل التطبيقات / الخزنة / البناء / السجل
 * كل العقود من openapi.json + اختبار حي موثق في worklog.md — الأخطاء تُعرض حرفياً.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_BASE, apiGet, apiPost, apiUploadKeystore, extractError, type ApiResult } from "@/lib/factory/api";
import type { Completeness } from "@/lib/factory/types";
import { useSession } from "@/store/session";
import { LoginGate } from "@/components/factory/shared/LoginGate";
import { CompletenessMeter, ErrorBox } from "@/components/factory/shared/Bits";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CloudCog,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  Hammer,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  Package,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Store,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================== أنواع محلية (من الرد الحي) ============================== */

interface ConsoleBrandFacility {
  facility_id: number;
  facility_name?: string;
  is_approved?: boolean;
  brand?: {
    display_name?: string | null;
    completeness?: Completeness;
    currency?: string;
    colors?: { primary: string | null; secondary: string | null };
    assets?: Record<string, unknown> | null;
  };
  /* احتياط: بعض الردود قد تُسطّح الحقول */
  completeness?: Completeness;
  currency?: string;
  colors?: { primary: string | null; secondary: string | null };
}

interface ConsoleAppRow {
  id: number;
  facility_id: number;
  facility_name?: string;
  package_id: string;
  display_name: string;
  platform: string;
  build_channel?: string;
  status: string;
  status_note?: string;
  sha256?: string | null;
  manifest?: Record<string, unknown> | null;
  created_at?: string;
  [k: string]: unknown;
}

interface ConsoleJobRow {
  id: number;
  app_build_id?: number;
  build_id?: number;
  driver: string;
  status: string;
  triggered_by?: string;
  started_at?: string | null;
  finished_at?: string | null;
  result?: Record<string, unknown> | null;
  [k: string]: unknown;
}

interface IssueDraft {
  facility_id: string;
  display_name: string;
}

type ErrState = { error: string; errors?: string[]; status?: number } | null;

/* ============================== ثوابت ومساعدات ============================== */

const BUNDLE_FILES = [
  "manifest.json",
  "google-services.json",
  "GoogleService-Info.plist (iOS)",
  "build-job.json",
  "keystore",
  "SIGNING.md",
  "fingerprints_registry.json",
];

const PACKAGE_ID_HINT = "بصمة فريدة com.xxx.xxx — أحرف إنجليزية صغيرة/أرقام/شرطات سفلية ونقطتان على الأقل";

function asRows<T>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && key) {
    const v = (data as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function brandOf(f: ConsoleBrandFacility) {
  return (
    f.brand ?? {
      display_name: f.facility_name ?? null,
      completeness: f.completeness,
      currency: f.currency,
      colors: f.colors,
      assets: null,
    }
  );
}

function parseBrands(d: unknown): { rows: ConsoleBrandFacility[]; count: number | null } {
  const obj = (d ?? {}) as Record<string, unknown>;
  return {
    rows: asRows<ConsoleBrandFacility>(obj, "facilities"),
    count: typeof obj.count === "number" ? obj.count : null,
  };
}

async function copyText(value: string, label = "القيمة") {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`نُسخت ${label}`);
  } catch {
    toast.error("تعذّر النسخ — انسخ يدوياً");
  }
}

function shortSha(s?: string | null): string {
  if (!s) return "—";
  return s.length > 14 ? `${s.slice(0, 14)}…` : s;
}

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("ar");
}

/* ============================== عناصر عرض صغيرة ============================== */

function CopyBtn({ value, label, className }: { value: string; label?: string; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="نسخ"
      className={cn("h-7 gap-1 px-2 text-xs text-stone-500 hover:text-stone-900", className)}
      onClick={() => copyText(value, label)}
    >
      <Copy className="h-3 w-3" /> نسخ
    </Button>
  );
}

function JsonBlock({
  value,
  label,
  tone = "dark",
  maxHeight = "max-h-80",
}: {
  value: unknown;
  label?: string;
  tone?: "dark" | "danger";
  maxHeight?: string;
}) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-stone-600">{label}</p>
          <CopyBtn value={text} label="JSON" />
        </div>
      )}
      <pre
        dir="ltr"
        className={cn(
          "overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed",
          maxHeight,
          tone === "dark"
            ? "border-stone-800 bg-stone-950 text-emerald-200"
            : "border-rose-300 bg-rose-950 text-rose-100"
        )}
      >
        {text}
      </pre>
    </div>
  );
}

const APP_STATUS_META: Record<string, { label: string; cls: string }> = {
  generating: { label: "قيد التوليد", cls: "border-amber-300 bg-amber-50 text-amber-800 animate-pulse" },
  signed: { label: "موقّع", cls: "border-teal-300 bg-teal-50 text-teal-800" },
  ready_for_store: { label: "جاهز للمتجر", cls: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  published: { label: "منشور", cls: "border-stone-700 bg-stone-800 text-stone-50" },
};

function AppStatusBadge({ status }: { status: string }) {
  const meta = APP_STATUS_META[status] ?? { label: status, cls: "border-stone-300 bg-white text-stone-600" };
  return (
    <Badge variant="outline" className={cn("gap-1 whitespace-nowrap", meta.cls)} title={status}>
      {meta.label}
      <span className="font-mono text-[9px] opacity-60">{status}</span>
    </Badge>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    succeeded: "border-emerald-300 bg-emerald-50 text-emerald-800",
    running: "border-amber-300 bg-amber-50 text-amber-800 animate-pulse",
    generating: "border-amber-300 bg-amber-50 text-amber-800 animate-pulse",
    pending: "border-stone-300 bg-stone-50 text-stone-600",
    queued: "border-stone-300 bg-stone-50 text-stone-600",
    failed: "border-rose-300 bg-rose-50 text-rose-800",
  };
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", map[status] ?? "border-stone-300 bg-white text-stone-600")}>
      {status}
    </Badge>
  );
}

/** حقل كلمة مرور مع زر إظهار — type=password افتراضياً */
function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        dir="ltr"
        className="pe-10 font-mono"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute end-2 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function LoadingBox({ className }: { className?: string }) {
  return <div className={cn("h-40 animate-pulse rounded-xl bg-stone-200", className)} />;
}

/* ============================== شريط الجلسة ============================== */

function SessionBar({
  username,
  role,
  expiresAt,
}: {
  username: string;
  role: string;
  expiresAt: number | null;
}) {
  const logoutRole = useSession((s) => s.logoutRole);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const mins = expiresAt !== null ? Math.max(0, Math.ceil((expiresAt - now) / 60000)) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span dir="ltr" className="font-mono">{username}</span>
        <span className="font-normal opacity-80">/ {role}</span>
      </Badge>
      {mins !== null && (
        <Badge
          variant="outline"
          className={cn(
            "gap-1",
            mins > 60
              ? "border-emerald-300 bg-white text-emerald-700"
              : mins > 0
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
          )}
        >
          {mins > 0 ? `تنتهي الجلسة تقديرياً بعد ~${mins} دقيقة` : "انتهت الجلسة تقديرياً — أعد الدخول عند أول 401"}
        </Badge>
      )}
      <Button
        variant="outline"
        size="sm"
        className="ms-auto gap-1.5"
        onClick={() => {
          logoutRole("console");
          toast.info("خروج من الكونسول — حُذف التوكن محلياً");
        }}
      >
        <LogOut className="h-3.5 w-3.5" /> خروج
      </Button>
    </div>
  );
}

/* ============================== بطاقة إثبات العزل ============================== */

type ProbeResult = { status: number; text: string } | null;

function IsolationProofCard({ consoleToken }: { consoleToken: string }) {
  const ownerToken = useSession((s) => s.tokens.owner);
  const [adminProbe, setAdminProbe] = useState<ProbeResult>(null);
  const [ownerProbe, setOwnerProbe] = useState<ProbeResult>(null);
  const [busyA, setBusyA] = useState(false);
  const [busyB, setBusyB] = useState(false);

  const runAdminProbe = async () => {
    setBusyA(true);
    setAdminProbe(null);
    const r = await apiGet<unknown>("/admin/dashboard", undefined, consoleToken);
    setAdminProbe(
      r.ok
        ? { status: r.status, text: JSON.stringify(r.data, null, 2) }
        : { status: r.status, text: r.errors?.length ? `${r.error} — ${r.errors.join(" · ")}` : r.error }
    );
    setBusyA(false);
  };

  const runOwnerProbe = async () => {
    if (!ownerToken) return;
    setBusyB(true);
    setOwnerProbe(null);
    const r = await apiGet<unknown>("/console/brands", undefined, ownerToken);
    setOwnerProbe(
      r.ok
        ? { status: r.status, text: JSON.stringify(r.data, null, 2) }
        : { status: r.status, text: r.errors?.length ? `${r.error} — ${r.errors.join(" · ")}` : r.error }
    );
    setBusyB(false);
  };

  const resultBox = (p: ProbeResult) => {
    if (!p) return null;
    const isolated = p.status === 401;
    return (
      <div
        className={cn(
          "mt-2 space-y-1.5 rounded-lg border p-3",
          isolated ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-stone-700" dir="ltr">
            HTTP {p.status}
          </span>
          {isolated ? (
            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
              <ShieldCheck className="h-3 w-3" /> العزل يعمل
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 bg-white text-amber-800">
              نتيجة غير متوقعة
            </Badge>
          )}
        </div>
        <p className="text-sm leading-relaxed text-stone-800">{isolated ? p.text : ""}</p>
        {!isolated && <JsonBlock value={p.text} maxHeight="max-h-32" />}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-rose-600" /> إثبات العزل — توكن الكونسول محصور بمساراته
        </CardTitle>
        <CardDescription>
          زران يجرّبان العكس حرفياً — 401 المتوقعة دليل أن العزل يعمل، وكل رسالة تُعرض كما وردت من الخادم
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-2 text-sm font-bold text-stone-800">
            أ) توكن الكونسول ← مسار إداري <span className="font-mono text-[10px] text-stone-400">GET /admin/dashboard</span>
          </p>
          <Button size="sm" variant="secondary" className="gap-1.5" disabled={busyA} onClick={runAdminProbe}>
            {busyA ? "جارٍ التجربة…" : "جرّب توكن الكونسول على مسار إداري"}
          </Button>
          {resultBox(adminProbe)}
        </div>
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="mb-2 text-sm font-bold text-stone-800">
            ب) توكن المالك ← مسار الكونسول <span className="font-mono text-[10px] text-stone-400">GET /console/brands</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={busyB || !ownerToken}
            onClick={runOwnerProbe}
            title={!ownerToken ? "سجّل دخول مالك أولاً من لوحة المنشآت" : undefined}
          >
            {ownerToken ? (busyB ? "جارٍ التجربة…" : "جرّب توكن المالك على مسار الكونسول") : "سجّل دخول مالك أولاً من لوحة المنشآت"}
          </Button>
          {!ownerToken && (
            <p className="mt-2 text-xs text-stone-500">
              لا يوجد توكن مالك في هذه الجلسة — سجّل الدخول كمالك من لوحة المنشآت ثم أعد التجربة
            </p>
          )}
          {resultBox(ownerProbe)}
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================== T1 — جاهزية الهوية ============================== */

function ReadinessTab({
  rows,
  count,
  loading,
  err,
  onReload,
  onIssue,
}: {
  rows: ConsoleBrandFacility[];
  count: number | null;
  loading: boolean;
  err: ErrState;
  onReload: () => void;
  onIssue: (facilityId: number, displayName: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Store className="h-4 w-4 text-emerald-700" /> جاهزية الهوية — GET /console/brands
            {count !== null && <Badge variant="outline">{count} منشأة</Badge>}
          </CardTitle>
          <CardDescription>
            «أصدر تطبيقاً» يبقى معطّلاً حتى brand.completeness.is_complete === true — الناقص يُعرض حرفياً من الرد
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onReload} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> تحديث
          </Button>
          {rows.length > 0 && (
            <p className="text-xs text-stone-500">
              المكتملة: {rows.filter((f) => brandOf(f).completeness?.is_complete === true).length} / {rows.length}
            </p>
          )}
        </CardContent>
      </Card>

      <ErrorBox error={err?.error} errors={err?.errors} />
      {loading && <LoadingBox />}

      {!loading && rows.length === 0 && !err && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-stone-500">لا منشآت في رد الخادم</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((f) => {
          const b = brandOf(f);
          const comp = b.completeness;
          const complete = comp?.is_complete === true;
          const name = f.facility_name ?? b.display_name ?? `منشأة #${f.facility_id}`;
          return (
            <Card key={f.facility_id} className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-sm font-bold leading-relaxed text-stone-900">
                    {name}
                    <span className="ms-1 font-mono text-[10px] font-normal text-stone-400">#{f.facility_id}</span>
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "whitespace-nowrap",
                      f.is_approved
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-amber-300 bg-amber-50 text-amber-800"
                    )}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {f.is_approved ? "معتمدة" : "بانتظار الموافقة"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                {comp ? (
                  <CompletenessMeter percent={comp.percent} missing={comp.missing} />
                ) : (
                  <p className="text-xs text-stone-400">لا بيانات اكتمال في الرد</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {b.currency && (
                    <Badge variant="outline" className="text-[10px]">
                      العملة: {b.currency}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1.5">
                    {[b.colors?.primary, b.colors?.secondary].map((c, i) =>
                      c ? (
                        <span
                          key={i}
                          className="inline-block h-5 w-5 rounded-full border border-stone-300 shadow-sm"
                          style={{ background: c }}
                          title={c}
                        />
                      ) : (
                        <span
                          key={i}
                          className="inline-block h-5 w-5 rounded-full border border-dashed border-stone-300 bg-stone-100"
                          title="لون غير محدد"
                        />
                      )
                    )}
                    <span className="text-[10px] text-stone-400">ألوان الرد</span>
                  </span>
                </div>
                <div className="mt-auto space-y-1 border-t border-stone-100 pt-3">
                  <Button
                    size="sm"
                    disabled={!complete}
                    className="w-full gap-1.5"
                    onClick={() => onIssue(f.facility_id, b.display_name || f.facility_name || null)}
                    title={complete ? undefined : "معطّل — أكمل الهوية 100% أولاً من لوحة المنشآت"}
                  >
                    <Package className="h-3.5 w-3.5" /> أصدر تطبيقاً
                  </Button>
                  {!complete && (
                    <p className="text-center text-[11px] text-stone-500">
                      معطّل — الاكتمال {comp?.percent ?? 0}% والأصول ناقصة
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== T2 — سجل التطبيقات ============================== */

function AppsTab({
  token,
  brandRows,
  brandsLoading,
  apps,
  appsLoading,
  appsErr,
  onReloadApps,
  draft,
  setDraft,
  onDownloadBundle,
  downloadingId,
}: {
  token: string;
  brandRows: ConsoleBrandFacility[];
  brandsLoading: boolean;
  apps: ConsoleAppRow[];
  appsLoading: boolean;
  appsErr: ErrState;
  onReloadApps: (status?: string) => void;
  draft: IssueDraft;
  setDraft: (d: IssueDraft) => void;
  onDownloadBundle: (id: number) => void;
  downloadingId: number | null;
}) {
  const [packageId, setPackageId] = useState("");
  const [platform, setPlatform] = useState("android");
  const [channel, setChannel] = useState("capacitor_local");
  const [busy, setBusy] = useState(false);
  const [issueErr, setIssueErr] = useState<ErrState>(null);
  const [issued, setIssued] = useState<unknown>(null);
  const [clientWarn, setClientWarn] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<{ app: unknown; err: ErrState } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* display_name مشترك مع T1 عبر الحالة المرفوعة draft — بلا مزامنة بتأثير */
  const displayName = draft.display_name;

  const facilityName = useMemo(() => {
    const m = new Map<number, string>();
    for (const f of brandRows) m.set(f.facility_id, f.facility_name ?? brandOf(f).display_name ?? `#${f.facility_id}`);
    return m;
  }, [brandRows]);

  const selectedFacilityOk = useMemo(() => {
    if (!draft.facility_id) return false;
    const f = brandRows.find((x) => String(x.facility_id) === draft.facility_id);
    return !!f && brandOf(f).completeness?.is_complete === true;
  }, [draft.facility_id, brandRows]);

  const submit = async () => {
    setIssueErr(null);
    setClientWarn(null);
    if (!selectedFacilityOk) {
      setClientWarn("اختر منشأة مكتملة الهوية 100% من القائمة");
      return;
    }
    if (!/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(packageId.trim())) {
      setClientWarn(`package_id غير صالح — ${PACKAGE_ID_HINT}`);
      return;
    }
    if (!displayName.trim()) {
      setClientWarn("اكتب display_name (اسم التطبيق الظاهر)");
      return;
    }
    setBusy(true);
    const r = await apiPost<unknown>(
      "/console/apps",
      {
        facility_id: Number(draft.facility_id),
        package_id: packageId.trim(),
        display_name: displayName.trim(),
        platform,
        build_channel: channel,
      },
      token
    );
    setBusy(false);
    if (r.ok) {
      setIssued(r.data);
      toast.success(`صُدر التطبيق — HTTP ${r.status}`, { description: `${packageId.trim()} — سُجّل في القائمة أدناه` });
      setPackageId("");
      onReloadApps(statusFilter === "all" ? undefined : statusFilter);
    } else {
      setIssueErr({ error: r.error, errors: r.errors, status: r.status });
      toast.error(`(${r.status}) ${r.error}`);
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    const r = await apiGet<unknown>(`/console/apps/${id}`, undefined, token);
    setDetail(r.ok ? { app: r.data, err: null } : { app: null, err: { error: r.error, errors: r.errors, status: r.status } });
    setDetailLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* نموذج الإصدار */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-emerald-700" /> إصدار تطبيق — POST /console/apps
          </CardTitle>
          <CardDescription>
            201 يعيد الـmanifest كاملاً — أخطاء 422/409 تُعرض حرفياً (سجل البصمات يمنع التكرار نهائياً)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brandRows.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {brandsLoading
                ? "جارٍ تحميل جاهزية الهوية…"
                : "لا منشآت محمّلة — افتح تاب «جاهزية الهوية» أولاً ليُتاح اختيار المنشآت المكتملة"}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المنشأة (المكتملة فقط)</Label>
                <Select
                  value={draft.facility_id}
                  onValueChange={(v) => setDraft({ ...draft, facility_id: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر منشأة مكتملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandRows.map((f) => {
                      const b = brandOf(f);
                      const complete = b.completeness?.is_complete === true;
                      const name = f.facility_name ?? b.display_name ?? `#${f.facility_id}`;
                      return (
                        <SelectItem key={f.facility_id} value={String(f.facility_id)} disabled={!complete}>
                          <span className="flex items-center gap-2">
                            <span>{name}</span>
                            <span className="font-mono text-[10px] text-stone-400">#{f.facility_id}</span>
                            {!complete && (
                              <span className="text-[10px] text-amber-700">
                                اكتمال {b.completeness?.percent ?? 0}% — الناقص: {(b.completeness?.missing ?? []).slice(0, 2).join("، ") || "أصول"}
                              </span>
                            )}
                            {complete && <span className="text-[10px] text-emerald-700">مكتملة ✓</span>}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {draft.facility_id && !selectedFacilityOk && (
                  <p className="text-xs text-amber-700">هذه المنشأة غير مكتملة — الإصدار متاح للمكتملة 100% فقط</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-id">package_id</Label>
                <Input
                  id="pkg-id"
                  dir="ltr"
                  className="font-mono"
                  placeholder="com.example.app"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                />
                <p className="text-xs text-stone-500">{PACKAGE_ID_HINT}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disp-name">display_name</Label>
                <Input
                  id="disp-name"
                  placeholder="اسم التطبيق الظاهر"
                  value={displayName}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="android">android</SelectItem>
                      <SelectItem value="ios">ios</SelectItem>
                      <SelectItem value="both">both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>build_channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capacitor_local">capacitor_local</SelectItem>
                      <SelectItem value="github_actions">github_actions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {clientWarn && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              {clientWarn}
            </div>
          )}
          <ErrorBox error={issueErr?.error} errors={issueErr?.errors} />
          {issueErr?.status === 409 && (
            <p className="text-xs font-semibold text-rose-700">سجل البصمات يمنع التكرار نهائياً — اختر package_id آخر</p>
          )}

          <Button onClick={submit} disabled={busy || brandRows.length === 0} className="gap-1.5">
            <Package className="h-4 w-4" /> {busy ? "جارٍ الإصدار…" : "أصدر التطبيق"}
          </Button>

          {issued !== null && <JsonBlock value={issued} label="رد الإصدار الكامل (manifest) — انسخه كما هو" />}
        </CardContent>
      </Card>

      {/* القائمة */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-teal-700" /> التطبيقات المصدرة — GET /console/apps
            <Badge variant="outline">{apps.length}</Badge>
          </CardTitle>
          <CardDescription>الفلتر عبر query ?status= — التفاصيل تجلب GET /console/apps/{"{id}"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                onReloadApps(v === "all" ? undefined : v);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="فلتر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="generating">generating</SelectItem>
                <SelectItem value="signed">signed</SelectItem>
                <SelectItem value="ready_for_store">ready_for_store</SelectItem>
                <SelectItem value="published">published</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onReloadApps(statusFilter === "all" ? undefined : statusFilter)}
              disabled={appsLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", appsLoading && "animate-spin")} /> تحديث
            </Button>
          </div>

          <ErrorBox error={appsErr?.error} errors={appsErr?.errors} />
          {appsLoading && <LoadingBox className="h-24" />}

          {!appsLoading && apps.length === 0 && !appsErr && (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
              لا تطبيقات — أصدر أول تطبيق من النموذج أعلاه
            </p>
          )}

          {/* جدول — شاشات متوسطة وما فوق */}
          {apps.length > 0 && (
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50">
                    <TableHead>package_id</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المنشأة</TableHead>
                    <TableHead>platform</TableHead>
                    <TableHead>channel</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>sha256</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apps.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {a.package_id}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{a.display_name}</TableCell>
                      <TableCell className="text-xs text-stone-600">
                        {facilityName.get(a.facility_id) ?? ""}
                        <span className="ms-1 font-mono text-[10px] text-stone-400">#{a.facility_id}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {a.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {a.build_channel ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AppStatusBadge status={a.status} />
                      </TableCell>
                      <TableCell>
                        {a.sha256 ? (
                          <span className="flex items-center gap-1">
                            <code className="font-mono text-[10px] text-stone-500" dir="ltr">
                              {shortSha(a.sha256)}
                            </code>
                            <CopyBtn value={a.sha256} label="sha256" className="px-1" />
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openDetail(a.id)}>
                            تفاصيل
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2 text-xs"
                            disabled={downloadingId === a.id}
                            onClick={() => onDownloadBundle(a.id)}
                            title="تنزيل حزمة ZIP"
                          >
                            <Download className="h-3.5 w-3.5" /> ZIP
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* بطاقات — جوال */}
          {apps.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {apps.map((a) => (
                <div key={a.id} className="space-y-2 rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900">{a.display_name}</p>
                    <AppStatusBadge status={a.status} />
                  </div>
                  <p className="font-mono text-xs text-stone-600" dir="ltr">
                    {a.package_id}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {a.platform}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {a.build_channel ?? "—"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      منشأة #{a.facility_id}
                      {facilityName.get(a.facility_id) ? ` — ${facilityName.get(a.facility_id)}` : ""}
                    </Badge>
                  </div>
                  {a.sha256 && (
                    <p className="flex items-center gap-1 font-mono text-[10px] text-stone-500" dir="ltr">
                      {shortSha(a.sha256)}
                      <CopyBtn value={a.sha256} label="sha256" className="px-1" />
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openDetail(a.id)}>
                      تفاصيل
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 gap-1"
                      disabled={downloadingId === a.id}
                      onClick={() => onDownloadBundle(a.id)}
                    >
                      <Download className="h-3.5 w-3.5" /> ZIP
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog تفاصيل التطبيق */}
      <Dialog open={detail !== null || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل التطبيق — GET /console/apps/{"{id}"}</DialogTitle>
            <DialogDescription>الرد الحرفي كاملاً بما فيه الـmanifest</DialogDescription>
          </DialogHeader>
          {detailLoading && <LoadingBox className="h-32" />}
          {detail?.err && <ErrorBox error={detail.err.error} errors={detail.err.errors} />}
          {detail?.app ? <JsonBlock value={detail.app} label="الرد الحرفي" maxHeight="max-h-[55vh]" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== T3 — الخزنة ============================== */

function VaultTab({ token, apps }: { token: string; apps: ConsoleAppRow[] }) {
  const [appId, setAppId] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [ksFile, setKsFile] = useState<File | null>(null);
  const [alias, setAlias] = useState("");
  const [storePw, setStorePw] = useState("");
  const [keyPw, setKeyPw] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<ErrState>(null);
  const [uploadResp, setUploadResp] = useState<unknown>(null);
  const [uploadedSha, setUploadedSha] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState<ErrState>(null);
  const [vaultData, setVaultData] = useState<unknown>(null);

  const selected = apps.find((a) => String(a.id) === appId) ?? null;

  /** تغيير التطبيق يُصفّر قسم التفاصيل فوراً — معالج حدث بدل تأثير */
  const selectApp = (v: string) => {
    setAppId(v);
    setDetailsOpen(false);
    setBackendWarning(null);
    setUnderstood(false);
    setVaultData(null);
    setConfirmErr(null);
  };

  const shaOf = (d: unknown): string | null => {
    if (!d || typeof d !== "object") return null;
    const o = d as Record<string, unknown>;
    if (typeof o.keystore_sha256 === "string") return o.keystore_sha256;
    if (typeof o.sha256 === "string") return o.sha256;
    return null;
  };

  const upload = async () => {
    if (!selected || !ksFile) return;
    setUploading(true);
    setUploadErr(null);
    setUploadResp(null);
    setUploadedSha(null);
    const r = await apiUploadKeystore(ksFile, String(selected.id), token, {
      key_alias: alias.trim(),
      store_password: storePw,
      key_password: keyPw,
    });
    setUploading(false);
    if (r.ok) {
      setUploadResp(r.data);
      setUploadedSha(shaOf(r.data));
      toast.success(`رُفعت الخزنة للتطبيق #${selected.id} — HTTP ${r.status}`);
      setStorePw("");
      setKeyPw("");
    } else {
      setUploadErr({ error: r.error, errors: r.errors, status: r.status });
      toast.error(`(${r.status}) ${r.error}`);
    }
  };

  /** الخطوة 1: فتح قسم التفاصيل يجلب نص التحذير من الباك بدون confirm (يُعرض حرفياً) */
  const openDetails = async () => {
    if (!selected) return;
    setDetailsOpen(true);
    setBackendWarning(null);
    setUnderstood(false);
    setVaultData(null);
    setConfirmErr(null);
    const r = await apiGet<unknown>(`/console/apps/${selected.id}/keystore`, undefined, token);
    if (r.ok) {
      /* إن أرجع الباك التفاصيل بلا confirm — اعرضها مباشرة */
      setVaultData(r.data);
    } else {
      setBackendWarning(r.error);
    }
  };

  const confirmShow = async () => {
    if (!selected) return;
    setConfirming(true);
    setConfirmErr(null);
    const r = await apiGet<unknown>(`/console/apps/${selected.id}/keystore`, { confirm: "true" }, token);
    setConfirming(false);
    if (r.ok) {
      setVaultData(r.data);
      toast.warning("كلمات المرور مفتوحة أمامك الآن — أغلق القسم عند الانتهاء");
    } else {
      setConfirmErr({ error: r.error, errors: r.errors, status: r.status });
      toast.error(`(${r.status}) ${r.error}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-amber-600" /> الخزنة — رفع واستعلام keystore
          </CardTitle>
          <CardDescription>
            POST /console/apps/{"{id}"}/keystore (multipart) ثم GET بنفس المسار — confirm=true يفك كلمات المرور
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
              لا تطبيقات مصدرة بعد — أصدر تطبيقاً من تاب «سجل التطبيقات» أولاً
            </p>
          ) : (
            <div className="max-w-sm space-y-2">
              <Label>التطبيق</Label>
              <Select value={appId} onValueChange={selectApp}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر تطبيقاً" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs" dir="ltr">
                          {a.package_id}
                        </span>
                        <span className="text-xs text-stone-500">#{a.id}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <Separator />
              {/* الرفع */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ملف التوقيع (.jks / .keystore)</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jks,.keystore"
                    className="hidden"
                    onChange={(e) => {
                      setKsFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="secondary" className="w-full gap-1.5" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" /> {ksFile ? "تغيير الملف" : "اختيار الملف"}
                  </Button>
                  {ksFile && (
                    <p className="font-mono text-xs text-stone-600" dir="ltr">
                      {ksFile.name} — {(ksFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ks-alias">key_alias</Label>
                  <Input id="ks-alias" dir="ltr" className="font-mono" placeholder="release-key" value={alias} onChange={(e) => setAlias(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ks-store">store_password</Label>
                  <SecretInput id="ks-store" value={storePw} onChange={setStorePw} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ks-key">key_password</Label>
                  <SecretInput id="ks-key" value={keyPw} onChange={setKeyPw} placeholder="••••••••" />
                </div>
              </div>
              <ErrorBox error={uploadErr?.error} errors={uploadErr?.errors} />
              <Button className="gap-1.5" disabled={uploading || !ksFile || !alias.trim() || !storePw || !keyPw} onClick={upload}>
                <Upload className="h-4 w-4" /> {uploading ? "جارٍ الرفع…" : "ارفع الخزنة"}
              </Button>

              {uploadedSha && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">sha256</Badge>
                  <code className="break-all font-mono text-xs text-stone-800" dir="ltr">
                    {uploadedSha}
                  </code>
                  <CopyBtn value={uploadedSha} label="sha256" />
                </div>
              )}
              {uploadResp !== null && <JsonBlock value={uploadResp} label="رد الرفع الحرفي" maxHeight="max-h-52" />}

              <Separator />

              {/* التفاصيل — تحذير مزدوج */}
              <div className="space-y-3">
                <Button variant="outline" className="gap-1.5" onClick={openDetails}>
                  <Eye className="h-4 w-4" /> تفاصيل الخزنة
                </Button>

                {detailsOpen && (
                  <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                    <Alert variant="destructive" className="border-rose-300 bg-rose-50 text-rose-900">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>تحذير — هذه الخطوة تفك كلمات المرور</AlertTitle>
                      <AlertDescription>
                        <p>{backendWarning ? `نص الخادم الحرفي: ${backendWarning}` : "لم يُرجع الخادم نص تحذير — هذا هو المتعارف عليه موثقاً:"}</p>
                        <p className="font-bold">فقدان ملف التوقيع لاحقاً = استحالة تحديث التطبيق على المتاجر للأبد.</p>
                      </AlertDescription>
                    </Alert>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-stone-800">
                      <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} id="ks-understand" />
                      أفهم أن عرض التفاصيل يفك كلمات المرور
                    </label>
                    <Button className="gap-1.5 bg-rose-700 hover:bg-rose-800" disabled={!understood || confirming} onClick={confirmShow}>
                      <KeyRound className="h-4 w-4" /> {confirming ? "جارٍ الفتح…" : "تأكيد وعرض"}
                    </Button>
                    <ErrorBox error={confirmErr?.error} errors={confirmErr?.errors} />
                    {vaultData !== null && (
                      <div className="rounded-lg border border-rose-300 bg-rose-100 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-800">
                          <AlertTriangle className="h-3.5 w-3.5" /> رد GET /console/apps/{"{id}"}/keystore?confirm=true — حرفي
                        </p>
                        <JsonBlock value={vaultData} tone="danger" maxHeight="max-h-72" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================== T4 — البناء ============================== */

function BuildTab({
  token,
  apps,
  onDownloadBundle,
  downloadingId,
}: {
  token: string;
  apps: ConsoleAppRow[];
  onDownloadBundle: (id: number) => void;
  downloadingId: number | null;
}) {
  const [appId, setAppId] = useState<string>("");
  const [driver, setDriver] = useState("capacitor_local");
  const [launching, setLaunching] = useState(false);
  const [launchErr, setLaunchErr] = useState<ErrState>(null);
  const [launchResp, setLaunchResp] = useState<unknown>(null);

  const [jobs, setJobs] = useState<ConsoleJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsErr, setJobsErr] = useState<ErrState>(null);

  const [ciOpen, setCiOpen] = useState(false);
  const [ciJobId, setCiJobId] = useState("");
  const [ciSucceeded, setCiSucceeded] = useState(false);
  const [ciError, setCiError] = useState("");
  const [ciArtifacts, setCiArtifacts] = useState("");
  const [ciBusy, setCiBusy] = useState(false);
  const [ciErr, setCiErr] = useState<ErrState>(null);
  const [ciResp, setCiResp] = useState<unknown>(null);

  const selected = apps.find((a) => String(a.id) === appId) ?? null;

  /* الجلب الأولي وعند تغيير التطبيق — setState داخل then (بعد الحدث) لا داخل جسم التأثير */
  useEffect(() => {
    let alive = true;
    const q = appId ? { build_id: appId } : undefined;
    apiGet<unknown>("/console/build-jobs", q, token).then((r) => {
      if (!alive) return;
      setJobs(r.ok ? asRows<ConsoleJobRow>(r.data) : []);
      setJobsErr(r.ok ? null : { error: r.error, errors: r.errors, status: r.status });
      setJobsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [appId, token]);

  const refreshJobs = () => {
    setJobsLoading(true);
    const q = appId ? { build_id: appId } : undefined;
    apiGet<unknown>("/console/build-jobs", q, token).then((r) => {
      setJobs(r.ok ? asRows<ConsoleJobRow>(r.data) : []);
      setJobsErr(r.ok ? null : { error: r.error, errors: r.errors, status: r.status });
      setJobsLoading(false);
    });
  };

  const launch = async () => {
    if (!selected) return;
    setLaunching(true);
    setLaunchErr(null);
    setLaunchResp(null);
    const r = await apiPost<unknown>(`/console/apps/${selected.id}/build-jobs`, { driver }, token);
    setLaunching(false);
    if (r.ok) {
      setLaunchResp(r.data);
      toast.success(`أُطلقت مهمة بناء (${driver}) — HTTP ${r.status}`);
      refreshJobs();
    } else {
      setLaunchErr({ error: r.error, errors: r.errors, status: r.status });
      toast.error(`(${r.status}) ${r.error}`);
    }
  };

  const submitCiResult = async () => {
    setCiErr(null);
    setCiResp(null);
    if (!ciJobId.trim()) {
      setCiErr({ error: "أدخل job_id للمهمة" });
      return;
    }
    let artifacts: Record<string, unknown> | null = null;
    if (ciArtifacts.trim()) {
      try {
        artifacts = JSON.parse(ciArtifacts) as Record<string, unknown>;
      } catch {
        setCiErr({ error: "حقل artifacts ليس JSON صالحاً — مثال: {\"aab\": \"url\", \"apk\": \"url\"}" });
        return;
      }
    }
    setCiBusy(true);
    const r = await apiPost<unknown>(
      `/console/build-jobs/${ciJobId.trim()}/result`,
      { succeeded: ciSucceeded, error: ciError.trim() || null, artifacts },
      token
    );
    setCiBusy(false);
    if (r.ok) {
      setCiResp(r.data);
      toast.success(`سُجّلت نتيجة CI للمهمة #${ciJobId.trim()} — HTTP ${r.status}`);
      refreshJobs();
    } else {
      setCiErr({ error: r.error, errors: r.errors, status: r.status });
      toast.error(`(${r.status}) ${r.error}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4 text-stone-800" /> البناء — POST /console/apps/{"{id}"}/build-jobs
          </CardTitle>
          <CardDescription>اختر التطبيق والقناة ثم أطلق المهمة — الرد كامل يُعرض حرفياً</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
              لا تطبيقات مصدرة بعد — أصدر تطبيقاً أولاً
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>التطبيق</Label>
                  <Select value={appId} onValueChange={setAppId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر تطبيقاً" />
                    </SelectTrigger>
                    <SelectContent>
                      {apps.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs" dir="ltr">
                              {a.package_id}
                            </span>
                            <span className="text-xs text-stone-500">#{a.id}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>قناة البناء (driver)</Label>
                  <RadioGroup value={driver} onValueChange={setDriver} className="gap-2">
                    <label
                      htmlFor="drv-local"
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                        driver === "capacitor_local" ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white hover:bg-stone-50"
                      )}
                    >
                      <RadioGroupItem id="drv-local" value="capacitor_local" className="mt-0.5" />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
                          <MonitorSmartphone className="h-3.5 w-3.5" /> capacitor_local
                        </span>
                        <span className="text-xs text-stone-500">بناء محلي عبر Capacitor — يُنفّذ على جهاز المصنع مباشرة</span>
                      </span>
                    </label>
                    <label
                      htmlFor="drv-ci"
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                        driver === "github_actions" ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white hover:bg-stone-50"
                      )}
                    >
                      <RadioGroupItem id="drv-ci" value="github_actions" className="mt-0.5" />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
                          <CloudCog className="h-3.5 w-3.5" /> github_actions
                        </span>
                        <span className="text-xs text-stone-500">بناء سحابي عبر CI — GitHub Actions workflow</span>
                      </span>
                    </label>
                  </RadioGroup>
                </div>
              </div>

              <ErrorBox error={launchErr?.error} errors={launchErr?.errors} />
              <Button disabled={!selected || launching} onClick={launch} className="gap-1.5">
                <Hammer className="h-4 w-4" /> {launching ? "جارٍ الإطلاق…" : "أطلق مهمة بناء"}
              </Button>
              {launchResp !== null && <JsonBlock value={launchResp} label="رد إطلاق المهمة — حرفي" maxHeight="max-h-56" />}
            </>
          )}
        </CardContent>
      </Card>

      {/* قائمة المهام */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            مهام البناء — GET /console/build-jobs
            {appId && <Badge variant="outline" className="font-mono text-[10px]">?build_id={appId}</Badge>}
            <Badge variant="outline">{jobs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={refreshJobs} disabled={jobsLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", jobsLoading && "animate-spin")} /> تحديث
          </Button>
          <ErrorBox error={jobsErr?.error} errors={jobsErr?.errors} />
          {jobsLoading && <LoadingBox className="h-24" />}
          {!jobsLoading && jobs.length === 0 && !jobsErr && (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
              لا مهام بناء بعد
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {jobs.map((j) => (
              <div key={j.id} className="space-y-2 rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-stone-800" dir="ltr">
                    job #{j.id}
                  </span>
                  <JobStatusBadge status={j.status} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {j.driver}
                  </Badge>
                  {j.app_build_id !== undefined && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      app #{j.app_build_id}
                    </Badge>
                  )}
                  {j.triggered_by && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {j.triggered_by}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  بدأ: {fmtDate(j.started_at)} — انتهى: {fmtDate(j.finished_at)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* تنزيل الحزمة */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileArchive className="h-4 w-4 text-teal-700" /> حزمة ZIP — GET /console/apps/{"{id}"}/bundle
          </CardTitle>
          <CardDescription>تنزيل مباشر بblob مع ترويسة التوكن — الاسم: tawfir-app-{"{id}"}-bundle.zip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-1.5" disabled={downloadingId === selected.id} onClick={() => onDownloadBundle(selected.id)}>
                <Download className="h-4 w-4" />
                {downloadingId === selected.id ? "جارٍ التنزيل…" : `تنزيل حزمة ZIP للتطبيق #${selected.id}`}
              </Button>
              <span className="font-mono text-xs text-stone-500" dir="ltr">
                {selected.package_id}
              </span>
            </div>
          ) : (
            <p className="text-sm text-stone-500">اختر تطبيقاً في الأعلى لتفعيل التنزيل (والزر ZIP متاح أيضاً في جدول سجل التطبيقات)</p>
          )}
          <div>
            <p className="mb-1.5 text-xs font-bold text-stone-600">الملفات السبعة المتوقعة داخل الحزمة:</p>
            <div className="flex flex-wrap gap-1.5">
              {BUNDLE_FILES.map((f) => (
                <Badge key={f} variant="outline" className="gap-1 bg-stone-50 font-mono text-[10px] text-stone-600">
                  <FileArchive className="h-3 w-3" />
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قسم CI المتقدم */}
      <Collapsible open={ciOpen} onOpenChange={setCiOpen}>
        <div className="rounded-xl border border-dashed border-stone-300">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex w-full items-center justify-between gap-2 p-4">
              <span className="flex items-center gap-2 text-sm font-bold text-stone-700">
                <CloudCog className="h-4 w-4" /> استلام نتيجة CI (يُستدعى من الـCI عادةً) — POST /console/build-jobs/{"{job_id}"}/result
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", ciOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 border-t border-dashed border-stone-200 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ci-job">job_id</Label>
                <Input id="ci-job" dir="ltr" className="font-mono" placeholder="1" value={ciJobId} onChange={(e) => setCiJobId(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm font-semibold text-stone-800">
                <Checkbox checked={ciSucceeded} onCheckedChange={(v) => setCiSucceeded(v === true)} id="ci-ok" />
                succeeded (نجحت المهمة)
              </label>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ci-error">error (اختياري — نص الفشل)</Label>
                <Input id="ci-error" dir="ltr" className="font-mono" value={ciError} onChange={(e) => setCiError(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ci-art">artifacts (JSON اختياري)</Label>
                <Textarea
                  id="ci-art"
                  dir="ltr"
                  className="font-mono text-xs"
                  rows={3}
                  placeholder={'{"aab": "url", "apk": "url", "ipa": "url"}'}
                  value={ciArtifacts}
                  onChange={(e) => setCiArtifacts(e.target.value)}
                />
              </div>
            </div>
            <ErrorBox error={ciErr?.error} errors={ciErr?.errors} />
            <Button variant="secondary" disabled={ciBusy} onClick={submitCiResult} className="gap-1.5">
              <CloudCog className="h-4 w-4" /> {ciBusy ? "جارٍ الإرسال…" : "أرسل نتيجة CI"}
            </Button>
            {ciResp !== null && <JsonBlock value={ciResp} label="رد الخادم الحرفي" maxHeight="max-h-52" />}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

/* ============================== T5 — السجل ============================== */

function RegistryTab({ token }: { token: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<ErrState>(null);
  const [downloading, setDownloading] = useState(false);

  const applyRegistry = useCallback((r: ApiResult<unknown>) => {
    if (r.ok) {
      setData((r.data ?? {}) as Record<string, unknown>);
      setErr(null);
    } else {
      setErr({ error: r.error, errors: r.errors, status: r.status });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    apiGet<unknown>("/console/registry", undefined, token).then((r) => {
      if (!alive) return;
      applyRegistry(r);
    });
    return () => {
      alive = false;
    };
  }, [token, applyRegistry]);

  const load = () => {
    setLoading(true);
    apiGet<unknown>("/console/registry", undefined, token).then(applyRegistry);
  };

  const rows = useMemo(() => asRows<Record<string, unknown>>(data, "apps"), [data]);
  const generatedAt = typeof data?.generated_at === "string" ? data.generated_at : null;
  const count = typeof data?.count === "number" ? data.count : rows.length;

  const downloadRegistry = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/console/registry`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          msg = extractError(j).error;
        } catch {
          /* نص غير JSON */
        }
        toast.error(`فشل تنزيل السجل (${res.status}) — ${msg}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fingerprints_registry.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("نُزّل fingerprints_registry.json");
    } catch {
      toast.error("فشل الاتصال أثناء تنزيل السجل");
    } finally {
      setDownloading(false);
    }
  };

  const str = (o: Record<string, unknown>, k: string): string => (typeof o[k] === "string" ? (o[k] as string) : typeof o[k] === "number" ? String(o[k]) : "—");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-stone-800" /> سجل البصمات — GET /console/registry
            <Badge variant="outline" className="font-mono text-[10px]">
              fingerprints_registry.json
            </Badge>
          </CardTitle>
          <CardDescription>سجل مركزي يمنع تكرار package_id نهائياً — يُولَّد من الخادم</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={downloadRegistry} disabled={downloading || loading}>
              <Download className="h-3.5 w-3.5" /> {downloading ? "جارٍ التنزيل…" : "تنزيل fingerprints_registry.json"}
            </Button>
          </div>

          <ErrorBox error={err?.error} errors={err?.errors} />
          {loading && <LoadingBox className="h-24" />}

          {!loading && data && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                <Badge className="bg-stone-800 text-stone-50 hover:bg-stone-800">count: {count}</Badge>
                {generatedAt && (
                  <span className="text-xs text-stone-600">
                    generated_at: <code className="font-mono" dir="ltr">{generatedAt}</code>
                  </span>
                )}
              </div>

              {rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">
                  السجل فارغ (count: 0) — سيُملأ تلقائياً مع كل إصدار تطبيق
                </p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-stone-50">
                          <TableHead>package_id</TableHead>
                          <TableHead>المنشأة</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>platform</TableHead>
                          <TableHead>الإصدار</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((o, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs" dir="ltr">
                              {str(o, "package_id")}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-stone-500">#{str(o, "facility_id")}</TableCell>
                            <TableCell className="text-sm">{str(o, "display_name")}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {str(o, "platform")}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-stone-600" dir="ltr">
                              {str(o, "version_name")}
                            </TableCell>
                            <TableCell>
                              <AppStatusBadge status={str(o, "status")} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 md:hidden">
                    {rows.map((o, i) => (
                      <div key={i} className="space-y-1.5 rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs text-stone-800" dir="ltr">
                            {str(o, "package_id")}
                          </p>
                          <AppStatusBadge status={str(o, "status")} />
                        </div>
                        <p className="text-sm font-semibold">{str(o, "display_name")}</p>
                        <p className="text-[11px] text-stone-500">
                          منشأة #{str(o, "facility_id")} — {str(o, "platform")} — <span dir="ltr">{str(o, "version_name")}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================== الشاشة الرئيسية ============================== */

export function ConsoleApp() {
  const token = useSession((s) => s.tokens.console);
  const [tab, setTab] = useState("readiness");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  const [brandRows, setBrandRows] = useState<ConsoleBrandFacility[]>([]);
  const [brandCount, setBrandCount] = useState<number | null>(null);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsErr, setBrandsErr] = useState<ErrState>(null);

  const [apps, setApps] = useState<ConsoleAppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsErr, setAppsErr] = useState<ErrState>(null);

  const [draft, setDraft] = useState<IssueDraft>({ facility_id: "", display_name: "" });
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadBrands = useCallback(async () => {
    if (!token) return;
    setBrandsLoading(true);
    setBrandsErr(null);
    const r = await apiGet<unknown>("/console/brands", undefined, token);
    if (r.ok) {
      const p = parseBrands(r.data);
      setBrandRows(p.rows);
      setBrandCount(p.count);
    } else {
      setBrandsErr({ error: r.error, errors: r.errors, status: r.status });
    }
    setBrandsLoading(false);
  }, [token]);

  const loadApps = useCallback(
    async (status?: string) => {
      if (!token) return;
      setAppsLoading(true);
      setAppsErr(null);
      const r = await apiGet<unknown>("/console/apps", status ? { status } : undefined, token);
      if (r.ok) setApps(asRows<ConsoleAppRow>(r.data));
      else setAppsErr({ error: r.error, errors: r.errors, status: r.status });
      setAppsLoading(false);
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    let alive = true;
    /* الجلب الأولي: كل setState داخل then (بعد اكتمال الطلب) لا داخل جسم التأثير */
    apiGet<unknown>("/console/brands", undefined, token).then((r) => {
      if (!alive) return;
      if (r.ok) {
        const p = parseBrands(r.data);
        setBrandRows(p.rows);
        setBrandCount(p.count);
      } else {
        setBrandsErr({ error: r.error, errors: r.errors, status: r.status });
      }
      setBrandsLoading(false);
    });
    apiGet<unknown>("/console/apps", undefined, token).then((r) => {
      if (!alive) return;
      if (r.ok) setApps(asRows<ConsoleAppRow>(r.data));
      else setAppsErr({ error: r.error, errors: r.errors, status: r.status });
      setAppsLoading(false);
    });
    apiGet<{ username?: string; role?: string }>("/console/auth/me", undefined, token).then((r) => {
      if (alive && r.ok && r.data) {
        setMe({
          username: typeof r.data.username === "string" ? r.data.username : "—",
          role: typeof r.data.role === "string" ? r.data.role : "console",
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const handleLoggedIn = useCallback((data: Record<string, unknown>) => {
    const m = typeof data.expires_in_minutes === "number" ? data.expires_in_minutes : null;
    if (m) setExpiresAt(Date.now() + m * 60_000);
    toast.success("دخول الكونسول ناجح", {
      description: m ? `الجلسة صالحة ~${m} دقيقة — وGET /console/auth/me سيُجلب فوراً` : "جُلب التوكن",
    });
  }, []);

  /** «أصدر تطبيقاً» من T1 → يفتح تاب سجل التطبيقات معبأً */
  const startIssue = useCallback((facilityId: number, displayName: string | null) => {
    setDraft({ facility_id: String(facilityId), display_name: displayName ?? "" });
    setTab("apps");
    toast.info("نُقلت إلى نموذج الإصدار — أكمل package_id ثم أصدر");
  }, []);

  const downloadBundle = useCallback(
    async (appId: number) => {
      if (!token) return;
      setDownloadingId(appId);
      try {
        const res = await fetch(`${API_BASE}/console/apps/${appId}/bundle`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = await res.json();
            msg = extractError(j).error;
          } catch {
            /* نص غير JSON */
          }
          toast.error(`فشل تنزيل الحزمة (${res.status}) — ${msg}`);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tawfir-app-${appId}-bundle.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success(`نُزّلت حزمة التطبيق #${appId}`);
      } catch {
        toast.error("فشل الاتصال أثناء تنزيل الحزمة");
      } finally {
        setDownloadingId(null);
      }
    },
    [token]
  );

  return (
    <div className="space-y-5" dir="rtl">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">الكونسول المنفصل — مصنع التطبيقات</h1>
        <p className="mt-1 text-sm text-stone-600">
          تطبيق مستقل منطقياً: إصدار التطبيقات من الهويات المكتملة، خزنة التوقيع، البناء، وحزمة ZIP — عبر توكن كونسول فقط
        </p>
      </header>

      {/* البانر البارز */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-50 shadow-sm">
        <ShieldAlert className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-sm font-semibold leading-relaxed">
          <span dir="ltr" className="font-mono text-emerald-300">console.tawfir.giize.com</span>
          {" — "}توكن الكونسول لا يفتح أي مسار إداري أو مالك والعكس (مُثبت 401)
        </p>
        <Badge variant="outline" className="ms-auto border-stone-600 bg-stone-800 text-stone-200">
          console-only
        </Badge>
      </div>

      <LoginGate
        role="console"
        title="الكونسول"
        description="دخول مصنع التطبيقات — POST /console/auth/login (username/password)"
        endpoint="/console/auth/login"
        mode="username"
        placeholder="factory_admin"
        hint="الرد يرجع access_token + expires_in_minutes — يُعرض عدّاد انتهاء الجلسة بعد الدخول"
        onLoggedIn={handleLoggedIn}
      >
        {(consoleToken) => (
          <div className="space-y-5">
            {me && <SessionBar username={me.username} role={me.role} expiresAt={expiresAt} />}

            <IsolationProofCard consoleToken={consoleToken} />

            <Tabs value={tab} onValueChange={setTab} className="gap-4">
              <TabsList className="h-auto flex-wrap justify-start gap-1 bg-stone-100 p-1">
                <TabsTrigger value="readiness" className="gap-1.5">
                  <Store className="h-3.5 w-3.5" /> جاهزية الهوية
                </TabsTrigger>
                <TabsTrigger value="apps" className="gap-1.5">
                  <Package className="h-3.5 w-3.5" /> سجل التطبيقات
                </TabsTrigger>
                <TabsTrigger value="vault" className="gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> الخزنة
                </TabsTrigger>
                <TabsTrigger value="build" className="gap-1.5">
                  <Hammer className="h-3.5 w-3.5" /> البناء
                </TabsTrigger>
                <TabsTrigger value="registry" className="gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" /> السجل
                </TabsTrigger>
              </TabsList>

              <TabsContent value="readiness">
                <ReadinessTab
                  rows={brandRows}
                  count={brandCount}
                  loading={brandsLoading}
                  err={brandsErr}
                  onReload={loadBrands}
                  onIssue={startIssue}
                />
              </TabsContent>

              <TabsContent value="apps">
                <AppsTab
                  token={consoleToken}
                  brandRows={brandRows}
                  brandsLoading={brandsLoading}
                  apps={apps}
                  appsLoading={appsLoading}
                  appsErr={appsErr}
                  onReloadApps={loadApps}
                  draft={draft}
                  setDraft={setDraft}
                  onDownloadBundle={downloadBundle}
                  downloadingId={downloadingId}
                />
              </TabsContent>

              <TabsContent value="vault">
                <VaultTab token={consoleToken} apps={apps} />
              </TabsContent>

              <TabsContent value="build">
                <BuildTab
                  token={consoleToken}
                  apps={apps}
                  onDownloadBundle={downloadBundle}
                  downloadingId={downloadingId}
                />
              </TabsContent>

              <TabsContent value="registry">
                <RegistryTab token={consoleToken} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </LoginGate>
    </div>
  );
}
