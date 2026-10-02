"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiGet, apiPost, apiPatch, formatMoney, isValidPhone } from "@/lib/factory/api";
import type { MerchantCourier, BrandFacilityRow } from "@/lib/factory/types";
import { useSession } from "@/store/session";
import { LoginGate } from "@/components/factory/shared/LoginGate";
import { ErrorBox } from "@/components/factory/shared/Bits";
import {
  Ban,
  BellRing,
  Bike,
  ChevronDown,
  ClipboardPen,
  HandCoins,
  Phone,
  Plus,
  RefreshCw,
  Repeat,
  Send,
  Store,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

/* ================= أدوات مساعدة — تعامل مرن مع أسماء الحقول كما تأتي ================= */

type Rec = Record<string, unknown>;

const asNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const asStr = (v: unknown): string => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));

type DeliveryTaskRef = { taskId: number; status: string; statusAr?: string };

/** البحث عن مهمة توصيل داخل بطاقة الطلب — أي كائن توصيل/مندوب/نداء بأي اسم حقل */
function extractDeliveryTask(order: Rec): DeliveryTaskRef | null {
  const directId = asNum(order.task_id) ?? asNum(order.delivery_task_id) ?? asNum(order.courier_task_id);
  const directStatus = asStr(order.task_status ?? order.delivery_task_status ?? "");
  if (directId) return { taskId: directId, status: directStatus, statusAr: asStr(order.task_status_ar ?? "") || undefined };

  const candidates = ["delivery_task", "courier_task", "task", "current_task", "latest_task", "assigned_task", "courier_call", "call", "delivery"];
  for (const key of candidates) {
    const v = order[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const t = v as Rec;
      const id = asNum(t.task_id) ?? asNum(t.id);
      if (id) return { taskId: id, status: asStr(t.status), statusAr: asStr(t.status_ar) || undefined };
    }
  }
  // مسح عام: أي مفتاح اسمه يتضمن task/delivery/courier/call وقيمته كائن فيه معرف
  for (const [key, v] of Object.entries(order)) {
    if (!/task|deliver|courier|call/i.test(key)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const t = v as Rec;
      const id = asNum(t.task_id) ?? asNum(t.id);
      if (id) return { taskId: id, status: asStr(t.status), statusAr: asStr(t.status_ar) || undefined };
    }
  }
  return null;
}

const isCallingTask = (t: DeliveryTaskRef | null): boolean =>
  !!t && (/call|ring/i.test(t.status) || (t.statusAr ?? "").includes("نداء"));

function couriersFromResponse(data: unknown): MerchantCourier[] {
  if (Array.isArray(data)) return data as MerchantCourier[];
  const d = data as Rec | null;
  if (d && Array.isArray(d.items)) return d.items as MerchantCourier[];
  return [];
}

/* شارات الحالة — ألوان اللوحة: emerald/amber/rose/teal/stone فقط */
function VerificationBadge({ status, statusAr }: { status: string; statusAr?: string }) {
  const label = statusAr || status;
  const tone = /susp|موقوف/i.test(status) || /موقوف/i.test(label)
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : /verif|موث/i.test(status) || /موث/i.test(label)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-stone-200 bg-stone-50 text-stone-600";
  return <Badge variant="outline" className={tone}>{label}</Badge>;
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const a = availability.toLowerCase();
  const tone = a === "online"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : a === "on_task" || a === "on-task" || a === "busy"
      ? "border-teal-200 bg-teal-50 text-teal-700"
      : a === "suspended"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-stone-200 bg-stone-50 text-stone-600";
  const label = a === "online" ? "متصل" : a === "on_task" || a === "on-task" ? "على مهمة" : a === "suspended" ? "موقوف" : a === "offline" ? "غير متصل" : availability;
  return (
    <Badge variant="outline" className={`gap-1.5 ${tone}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${a === "online" ? "bg-emerald-500" : a === "on_task" || a === "on-task" ? "bg-teal-500" : a === "suspended" ? "bg-rose-500" : "bg-stone-400"}`} />
      {label}
    </Badge>
  );
}

function OrderStatusBadge({ status, statusAr }: { status: string; statusAr?: string }) {
  const s = status.toLowerCase();
  const tone = /cancel/i.test(s)
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : /deliver|complet/i.test(s)
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : /call|out_for/i.test(s)
        ? "border-teal-200 bg-teal-50 text-teal-700"
        : /confirm|prepar|ready/i.test(s)
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-stone-200 bg-stone-50 text-stone-600";
  return <Badge variant="outline" className={`font-mono ${tone}`}>{statusAr || status}</Badge>;
}

/* ================= شرائح مشتركة ================= */

function ScenarioExplainer() {
  const steps = [
    "أنشئ مندوباً من تبويب «مناديبي» — التوثيق فوري (verified)",
    "المندوب يفتح تطبيق المندوب القائم نفسه بنفس الجوال وكلمة المرور — بلا أي كود جديد",
    "عميل يطلب من متجرك مع تفعيل النداء (calling)",
    "المهمة تظهر تلقائياً في تبويب «مهام النداء»",
    "اضغط «كلّف مندوبي» واختر مندوباً من قائمتك",
    "سلسلة التسليم تسير عند المندوب (قبول → استلام → تسليم بكود)",
    "الإحصاءات تتراكم في بطاقة المندوب (completed_tasks والمستوى)",
  ];
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-stone-700">
        <ClipboardPen className="h-3.5 w-3.5 text-emerald-700" /> السيناريو الكامل — من الإنشاء حتى الإحصاءات
      </p>
      <ol className="list-inside list-decimal space-y-0.5 text-[11px] leading-relaxed text-stone-600 sm:text-xs">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-tight text-stone-900">{value}</p>
        <p className="truncate text-[11px] text-stone-500">{label}</p>
      </div>
    </div>
  );
}

/* ================= تبويب: مناديبي ================= */

const VEHICLE_PLACEHOLDER = "motorcycle / car / bicycle / van / electric_bike …";

function CreateCourierDialog({
  facilityId,
  onCreated,
}: {
  facilityId: number;
  onCreated: () => void;
}) {
  const token = useSession((s) => s.tokens.owner)!;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    password: "",
    vehicle_type: "motorcycle",
    vehicle_plate: "",
    email: "",
  });

  const phoneOk = isValidPhone(form.phone);
  const nameOk = form.full_name.trim().length >= 3;
  const passOk = form.password.length >= 8; // عقد الخادم: minLength 8 (مُثبت 422 حياً)

  const reset = () => {
    setForm({ full_name: "", phone: "", password: "", vehicle_type: "motorcycle", vehicle_plate: "", email: "" });
    setErr(null);
    setSuccess(false);
    setCreatedPassword(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body: Rec = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      password: form.password,
      facility_id: facilityId,
      vehicle_type: form.vehicle_type.trim() || "motorcycle",
    };
    if (form.vehicle_plate.trim()) body.vehicle_plate = form.vehicle_plate.trim();
    if (form.email.trim()) body.email = form.email.trim();
    const r = await apiPost<MerchantCourier>("/owner/couriers", body, token);
    setBusy(false);
    if (r.ok) {
      setSuccess(true);
      setCreatedPassword(form.password);
      setForm((f) => ({ ...f, password: "" })); // مسح كلمة المرور من النموذج بعد النجاح
      toast.success(`تم إنشاء المندوب #${r.data.id} — موثّق فوراً`, {
        description: `${r.data.full_name} · ${r.data.phone}`,
      });
      onCreated();
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }} className="gap-1.5">
        <Plus className="h-4 w-4" /> إنشاء مندوب
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-emerald-700" /> إنشاء مندوب تاجر — POST /owner/couriers
            </DialogTitle>
            <DialogDescription>
              منشأته: #{facilityId} — التوثيق فوري (verification_status = verified) بلا رفع مستندات
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-full-name">الاسم الكامل</Label>
              <Input
                id="c-full-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="مثال: فهد العيني"
                required
                minLength={3}
              />
              {form.full_name.trim() !== "" && !nameOk && (
                <p className="text-xs text-rose-600">3 أحرف على الأقل حسب العقد</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-phone">جوال المندوب</Label>
              <Input
                id="c-phone"
                dir="ltr"
                inputMode="tel"
                className="text-left font-mono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="7XXXXXXXX أو 05XXXXXXXX"
                required
              />
              <p className="text-[11px] text-stone-500">
                7XXXXXXXX أو 05XXXXXXXX — التطبيع خادمي ثنائي الأسواق
              </p>
              {form.phone.trim() !== "" && !phoneOk && (
                <p className="text-xs text-rose-600">صيغة الجوال غير مكتملة — راجع التلميح أعلاه</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-password">كلمة مرور دخول المندوب</Label>
              <Input
                id="c-password"
                type="text"
                dir="ltr"
                autoComplete="off"
                className="text-left font-mono"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="8 أحرف على الأقل"
                required
                minLength={8}
              />
              <p className="text-[11px] text-stone-500">
                ستكون بيانات دخوله من بوابة المندوبين — احفظها وافصله بها (الخادم يشترط 8 أحرف: 422 حي)
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-vehicle">نوع المركبة (نص حر)</Label>
                <Input
                  id="c-vehicle"
                  dir="ltr"
                  className="text-left font-mono"
                  value={form.vehicle_type}
                  onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                  placeholder={VEHICLE_PLACEHOLDER}
                />
                <p className="text-[11px] text-stone-500">العقد نص حر — أمثلة: motorcycle، car، bicycle، van</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-plate">لوحة المركبة (اختياري)</Label>
                <Input
                  id="c-plate"
                  value={form.vehicle_plate}
                  onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
                  placeholder="مثال: ص ح 1234"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-email">بريد المندوب (اختياري)</Label>
              <Input
                id="c-email"
                dir="ltr"
                type="email"
                className="text-left"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="courier@example.com"
              />
              <p className="text-[11px] text-stone-500">يُولَّد داخلياً إن غاب — كما في العقد</p>
            </div>

            <ErrorBox error={err?.error} errors={err?.errors} />

            {success && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>توثيق فوري:</strong> <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs" dir="ltr">verification_status = verified</code> — المندوب جاهز للعمل مباشرة
                  </span>
                </div>
                <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-3 text-sm text-amber-900" role="alert">
                  <p className="font-bold">⚠️ كلمة المرور التي أدخلتها هي بيانات دخول المندوب من بوابة المندوبين — المندوب يفتح تطبيق المندوب القائم نفسه بلا أي كود جديد</p>
                  {createdPassword && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      احفظها الآن:
                      <code className="rounded bg-amber-100 px-2 py-1 font-mono text-sm font-bold" dir="ltr">{createdPassword}</code>
                      <span className="text-amber-700">— لن تُعرض مرة أخرى</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {success ? (
                <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  تم — إغلاق
                </Button>
              ) : (
                <Button type="submit" disabled={busy || !phoneOk || !nameOk || !passOk}>
                  {busy ? "جارٍ الإنشاء…" : "إنشاء المندوب"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CourierCard({ courier, onChanged }: { courier: MerchantCourier; onChanged: (c: MerchantCourier) => void }) {
  const token = useSession((s) => s.tokens.owner)!;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suspended = courier.verification_status === "suspended" || courier.availability === "suspended";

  const act = async () => {
    setBusy(true);
    setErr(null);
    const r = await apiPatch<MerchantCourier>(
      `/owner/couriers/${courier.id}`,
      { action: suspended ? "reactivate" : "suspend" },
      token
    );
    setBusy(false);
    setConfirmOpen(false);
    if (r.ok) {
      onChanged(r.data);
      toast.success(suspended ? "تم تفعيل المندوب من جديد" : "تم إيقاف المندوب", {
        description: `${r.data.full_name} — verification_status_ar: ${r.data.verification_status_ar ?? r.data.verification_status}`,
      });
    } else {
      setErr(r.error);
      toast.error(r.error);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-stone-900">
            {courier.full_name}
            {courier.public_name && courier.public_name !== courier.full_name && (
              <span className="ms-1.5 text-xs font-normal text-stone-500">({courier.public_name})</span>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-stone-600" dir="ltr">
            <Phone className="h-3 w-3" /> {courier.phone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <VerificationBadge status={courier.verification_status} statusAr={courier.verification_status_ar} />
          <AvailabilityBadge availability={courier.availability} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <Bike className="h-3.5 w-3.5 text-stone-400" />
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono" dir="ltr">{courier.vehicle_type}</code>
          {courier.vehicle_plate && <span className="text-stone-500">· لوحة: {courier.vehicle_plate}</span>}
        </span>
        <span className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          مهام مكتملة: <strong className="text-stone-800">{courier.completed_tasks}</strong>
        </span>
        {courier.level_ar && <span className="text-stone-500">المستوى: {courier.level_ar}</span>}
        <span className="font-mono text-[10px] text-stone-400" dir="ltr">#{courier.id}</span>
      </div>

      {err && <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">{err}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        {suspended ? (
          <Button size="sm" variant="outline" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={busy} onClick={() => setConfirmOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> تفعيل
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busy} onClick={() => setConfirmOpen(true)}>
            <Ban className="h-3.5 w-3.5" /> إيقاف
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{suspended ? "تفعيل المندوب من جديد؟" : "إيقاف المندوب؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {suspended
                ? `سيُعاد ${courier.full_name} للعمل ويستطيع تسجيل الدخول واستقبال المهام.`
                : `سيُمنع ${courier.full_name} من تسجيل الدخول واستقبال مهام جديدة حتى تفعيله.`}
              الإجراء عبر PATCH /owner/couriers/{courier.id} بقيمة action: {suspended ? "reactivate" : "suspend"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                act();
              }}
              className={suspended ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-rose-700 text-white hover:bg-rose-800"}
            >
              {busy ? "جارٍ التنفيذ…" : suspended ? "نعم — تفعيل" : "نعم — إيقاف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CouriersTab({
  couriers: couriersOrNull,
  loading,
  error,
  facilityId,
  reload,
  onCourierUpdated,
}: {
  couriers: MerchantCourier[] | null;
  loading: boolean;
  error: string | null;
  facilityId: number;
  reload: () => void;
  onCourierUpdated: (c: MerchantCourier) => void;
}) {
  const couriers = couriersOrNull ?? [];
  const stats = useMemo(() => {
    const online = couriers.filter((c) => c.availability === "online").length;
    const done = couriers.reduce((acc, c) => acc + (Number(c.completed_tasks) || 0), 0);
    return { total: couriers.length, online, done };
  }, [couriers]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Users className="h-4 w-4 text-emerald-700" />} label="عدد المناديب" value={stats.total} tone="bg-emerald-50" />
        <StatCard icon={<Zap className="h-4 w-4 text-teal-700" />} label="المتاحون الآن (online)" value={stats.online} tone="bg-teal-50" />
        <StatCard icon={<Trophy className="h-4 w-4 text-amber-600" />} label="إجمالي المهام المكتملة" value={stats.done} tone="bg-amber-50" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CreateCourierDialog facilityId={facilityId} onCreated={reload} />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث القائمة
        </Button>
      </div>

      {error && <ErrorBox error={error} />}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-32 animate-pulse rounded-xl bg-stone-200" />
        </div>
      ) : couriers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="h-8 w-8 text-stone-300" />
            <p className="text-sm font-bold text-stone-700">لا مناديب بعد</p>
            <p className="max-w-md text-xs leading-relaxed text-stone-500">
              أنشئ أول مندوب لمنشأتك #{facilityId} — سيُوثَّق فوراً (verified) ويستطيع دخول تطبيق المندوب بنفس الجوال وكلمة المرور التي تحددها.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pe-1">
          {couriers.map((c) => (
            <CourierCard key={c.id} courier={c} onChanged={onCourierUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= تبويب: مهام النداء ================= */

type OrderCard = Rec & { id: number };

function ordersFromResponse(data: unknown): { items: OrderCard[]; currency?: string } {
  if (Array.isArray(data)) return { items: data as OrderCard[] };
  const d = data as Rec | null;
  if (!d) return { items: [] };
  const items = (Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : []) as OrderCard[];
  const currency = typeof d.currency === "string" ? d.currency : undefined;
  return { items, currency };
}

function AssignCourierDialog({
  task,
  couriers,
  orderId,
  onAssigned,
}: {
  task: DeliveryTaskRef;
  couriers: MerchantCourier[];
  orderId: number;
  onAssigned: (message: string) => void;
}) {
  const token = useSession((s) => s.tokens.owner)!;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string>("");
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);

  const assign = async () => {
    const courierId = Number(picked);
    if (!courierId) return;
    setBusy(true);
    setErr(null);
    const r = await apiPost<{ message?: string }>(`/owner/tasks/${task.taskId}/assign-courier`, { courier_id: courierId }, token);
    setBusy(false);
    if (r.ok) {
      const msg = r.data?.message ?? `تم إسناد المهمة ${task.taskId} إلى المندوب #${courierId}`;
      setOpen(false);
      setPicked("");
      toast.success("تمت التكليف", { description: msg });
      onAssigned(msg);
    } else {
      setErr({ error: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <>
      <Button size="sm" className="gap-1.5 bg-teal-700 text-white hover:bg-teal-800" onClick={() => setOpen(true)}>
        <HandCoins className="h-3.5 w-3.5" /> كلّف مندوبي
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setErr(null); setPicked(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-teal-700" /> تكليف مندوب بالمهمة
            </DialogTitle>
            <DialogDescription>
              طلب #{orderId} — مهمة نداء حية <code className="font-mono" dir="ltr">task_id={task.taskId}</code> — الإسناد عبر POST /owner/tasks/{task.taskId}/assign-courier
            </DialogDescription>
          </DialogHeader>

          {couriers.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              لا مناديب في قائمتك — أنشئ مندوباً أولاً من تبويب «مناديبي»
            </p>
          ) : (
            <RadioGroup value={picked} onValueChange={setPicked} className="max-h-64 gap-2 overflow-y-auto pe-1">
              {couriers.map((c) => {
                const isSuspended = c.verification_status === "suspended" || c.availability === "suspended";
                return (
                  <Label
                    key={c.id}
                    htmlFor={`courier-${c.id}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      picked === String(c.id) ? "border-teal-300 bg-teal-50" : "border-stone-200 bg-white hover:bg-stone-50"
                    } ${isSuspended ? "opacity-50" : ""}`}
                  >
                    <RadioGroupItem id={`courier-${c.id}`} value={String(c.id)} disabled={isSuspended} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-stone-800">{c.full_name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500">
                        <span className="font-mono" dir="ltr">{c.phone}</span>
                        <span>· {c.vehicle_type}</span>
                        <span>· مهام: {c.completed_tasks}</span>
                        {isSuspended && <span className="font-bold text-rose-600">موقوف</span>}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          )}

          <ErrorBox error={err?.error} errors={err?.errors} />

          <DialogFooter>
            <Button onClick={assign} disabled={busy || !picked || couriers.length === 0}>
              {busy ? "جارٍ الإسناد…" : "تأكيد التكليف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ManualAssignTool({ couriers, onAssigned }: { couriers: MerchantCourier[]; onAssigned: () => void }) {
  const token = useSession((s) => s.tokens.owner)!;
  const [taskId, setTaskId] = useState("");
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; errors?: string[] } | null>(null);

  const assign = async () => {
    const id = Number(taskId);
    const courierId = Number(picked);
    if (!Number.isFinite(id) || id <= 0 || !courierId) {
      setResult({ ok: false, message: "أدخل task_id رقماً صحيحاً واختر مندوباً" });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await apiPost<{ message?: string }>(`/owner/tasks/${id}/assign-courier`, { courier_id: courierId }, token);
    setBusy(false);
    if (r.ok) {
      const msg = r.data?.message ?? `تم إسناد المهمة ${id} إلى المندوب #${courierId}`;
      setResult({ ok: true, message: msg });
      toast.success("تم الإسناد اليدوي بنجاح", { description: msg });
      onAssigned();
    } else {
      setResult({ ok: false, message: r.error, errors: r.errors });
      toast.error(r.error);
    }
  };

  return (
    <Collapsible className="rounded-xl border border-stone-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-sm font-bold text-stone-700 hover:bg-stone-50">
        <span className="flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5 text-emerald-700" /> إسناد يدوي بمعرّف المهمة (task_id) — نفس endpoint الحقيقي
        </span>
        <ChevronDown className="h-4 w-4 text-stone-400" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-stone-100 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-stone-500">
          للاختبار المباشر: أدخل معرّف مهمة حقيقية واختر مندوباً — رسالة الخادم تُعرض حرفياً (مثل 404 «المهمة غير موجودة» إن كانت المهمة غير موجودة — عقد حقيقي).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="m-task-id">معرّف المهمة (task_id)</Label>
            <Input
              id="m-task-id"
              dir="ltr"
              inputMode="numeric"
              className="text-left font-mono"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="مثال: 99999"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-courier">المندوب</Label>
            <Select value={picked} onValueChange={setPicked} disabled={couriers.length === 0}>
              <SelectTrigger id="m-courier" className="w-full">
                <SelectValue placeholder={couriers.length === 0 ? "لا مناديب — أنشئ مندوباً أولاً" : "اختر مندوباً من قائمتك"} />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.full_name} — <span className="font-mono" dir="ltr">{c.phone}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={assign} disabled={busy || !taskId || !picked} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> {busy ? "جارٍ الإسناد…" : "إسناد المهمة"}
          </Button>
        </div>
        {result && (
          result.ok ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
              {result.message}
            </div>
          ) : (
            <ErrorBox error={result.message} errors={result.errors} />
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CallsTab({
  facilityId,
  couriers,
  reloadCouriers,
}: {
  facilityId: number;
  couriers: MerchantCourier[];
  reloadCouriers: () => void;
}) {
  const token = useSession((s) => s.tokens.owner)!;
  const [orders, setOrders] = useState<OrderCard[] | null>(null);
  const [currency, setCurrency] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<{ error: string; errors?: string[] } | null>(null);
  const [assignedMessages, setAssignedMessages] = useState<Record<number, string>>({});
  const seq = useRef(0);

  const load = useCallback(async () => {
    const my = ++seq.current;
    const r = await apiGet<unknown>(`/owner/${facilityId}/orders`, { page_size: 20 }, token);
    if (my !== seq.current) return; // رد أقدم من طلب أحدث — يُهمَل
    if (r.ok) {
      const { items, currency: cur } = ordersFromResponse(r.data);
      setOrders(items);
      setCurrency(cur ?? (items.find((o) => typeof o.currency === "string")?.currency as string | undefined));
      setErr(null);
    } else {
      setErr({ error: r.error, errors: r.errors });
      setOrders([]);
    }
    setRefreshing(false);
  }, [facilityId, token]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const my = ++seq.current;
      const r = await apiGet<unknown>(`/owner/${facilityId}/orders`, { page_size: 20 }, token);
      if (!alive || my !== seq.current) return; // إلغاء أو رد أقدم — يُهمَل
      if (r.ok) {
        const { items, currency: cur } = ordersFromResponse(r.data);
        setOrders(items);
        setCurrency(cur ?? (items.find((o) => typeof o.currency === "string")?.currency as string | undefined));
        setErr(null);
      } else {
        setErr({ error: r.error, errors: r.errors });
        setOrders([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [facilityId, token]);

  const loading = orders === null || refreshing;

  const withTasks = useMemo(
    () =>
      (orders ?? [])
        .map((o) => ({ order: o, task: extractDeliveryTask(o) }))
        .filter((x) => x.task !== null),
    [orders]
  );
  const callingCount = withTasks.filter((x) => isCallingTask(x.task)).length;
  const ordersList = orders ?? [];

  return (
    <div className="space-y-4">
      <ScenarioExplainer />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          GET /owner/{facilityId}/orders — {loading ? "جارٍ الجلب…" : `${ordersList.length} طلب · مهام نداء حية: ${callingCount}`}
          {!currency && !loading && ordersList.length > 0 && " — العملة تُعرض من الرد إن وردت (لا عملة مصمتة)"}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {err && <ErrorBox error={err.error} errors={err.errors} />}

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
        </div>
      ) : ordersList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <BellRing className="h-8 w-8 text-stone-300" />
            <p className="text-sm font-bold text-stone-700">لا مهام نداء حالياً</p>
            <p className="max-w-md text-xs leading-relaxed text-stone-500">
              لا مهام نداء حالياً — تظهر هنا تلقائياً عندما يطلب عميل مع تفعيل النداء. يمكنك تجربة الإسناد اليدوي أدناه بمعرّف مهمة حقيقي.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pe-1">
          {ordersList.map((o) => {
            const task = extractDeliveryTask(o);
            const calling = isCallingTask(task);
            const amount = asNum(o.total) ?? asNum(o.total_amount) ?? asNum(o.grand_total) ?? asNum(o.subtotal);
            const amountStr = formatMoney(amount, currency ?? (typeof o.currency === "string" ? o.currency : null));
            const assignedMsg = task ? assignedMessages[task.taskId] : undefined;
            return (
              <div
                key={o.id}
                className={`rounded-xl border p-4 ${calling ? "border-teal-300 bg-teal-50/60" : "border-stone-200 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-900">
                      <span className="font-mono" dir="ltr">#{o.id}</span>
                      <OrderStatusBadge status={asStr(o.status)} statusAr={asStr(o.status_ar) || undefined} />
                      {calling && (
                        <Badge variant="outline" className="gap-1.5 border-teal-200 bg-teal-50 text-teal-700">
                          <BellRing className="h-3 w-3" /> نداء حي
                        </Badge>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {typeof o.customer_name === "string" && o.customer_name ? `العميل: ${o.customer_name}` : `عميل #${asStr(o.customer_id)}`}
                      {typeof o.created_at === "string" && o.created_at ? ` · ${new Date(o.created_at).toLocaleString("ar")}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-stone-900">{amountStr}</p>
                </div>

                {task && (
                  <p className="mt-2 font-mono text-[11px] text-stone-500" dir="ltr">
                    task_id={task.taskId}
                    {task.status ? ` · status=${task.status}` : ""}
                    {task.statusAr ? ` · ${task.statusAr}` : ""}
                  </p>
                )}

                {assignedMsg && (
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" role="status">
                    {assignedMsg}
                  </div>
                )}

                {calling && task && (
                  <div className="mt-3">
                    <AssignCourierDialog
                      task={task}
                      couriers={couriers}
                      orderId={o.id}
                      onAssigned={(msg) => {
                        setAssignedMessages((m) => ({ ...m, [task.taskId]: msg }));
                        refresh();
                        reloadCouriers();
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ManualAssignTool couriers={couriers} onAssigned={() => { refresh(); reloadCouriers(); }} />
    </div>
  );
}

/* ================= بوابة المنشأة ================= */

function FacilityPicker({ onSelect }: { onSelect: (id: number, name: string) => void }) {
  const token = useSession((s) => s.tokens.owner)!;
  const [rows, setRows] = useState<BrandFacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await apiGet<BrandFacilityRow[]>("/owner/brand/facilities", undefined, token);
      if (r.ok) setRows(Array.isArray(r.data) ? r.data : []);
      else setErr(r.error);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-stone-200" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4 text-emerald-700" /> اختر المنشأة لإدارة مناديبها
        </CardTitle>
        <CardDescription>GET /owner/brand/facilities — فهرس منشآتك المسجلة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {err && <ErrorBox error={err} />}
        {rows.map((f) => (
          <button
            key={f.facility_id}
            onClick={() => onSelect(f.facility_id, f.name)}
            className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-start transition-colors hover:border-emerald-300 hover:bg-emerald-50"
          >
            <span className="text-sm font-bold text-stone-800">
              {f.name} <span className="font-mono text-[10px] text-stone-400">#{f.facility_id}</span>
            </span>
            <span className="text-xs text-stone-500">{f.is_complete ? "هوية مكتملة" : `اكتمال ${f.completeness_percent}%`}</span>
          </button>
        ))}
        {rows.length === 0 && !err && <p className="text-sm text-stone-500">لا منشآت — سجّل منشأتك أولاً من بوابة المالك</p>}
      </CardContent>
    </Card>
  );
}

/* ================= اللوحة الرئيسية ================= */

export function OwnerCouriersPanel() {
  const token = useSession((s) => s.tokens.owner);
  const ownerFacilityId = useSession((s) => s.ownerFacilityId);
  const ownerFacilityName = useSession((s) => s.ownerFacilityName);
  const setOwnerFacility = useSession((s) => s.setOwnerFacility);

  const [couriers, setCouriers] = useState<MerchantCourier[] | null>(null);
  const [refreshingCouriers, setRefreshingCouriers] = useState(false);
  const [couriersErr, setCouriersErr] = useState<string | null>(null);
  const seq = useRef(0);

  const loadCouriers = useCallback(async () => {
    if (!token) return;
    const my = ++seq.current;
    const r = await apiGet<unknown>("/owner/couriers", undefined, token);
    if (my !== seq.current) return; // رد أقدم من طلب أحدث — يُهمَل
    if (r.ok) {
      setCouriers(couriersFromResponse(r.data));
      setCouriersErr(null);
    } else {
      setCouriersErr(r.error);
      setCouriers([]);
    }
    setRefreshingCouriers(false);
  }, [token]);

  const refreshCouriers = useCallback(() => {
    setRefreshingCouriers(true);
    void loadCouriers();
  }, [loadCouriers]);

  useEffect(() => {
    if (!token || !ownerFacilityId) return;
    let alive = true;
    (async () => {
      const my = ++seq.current;
      const r = await apiGet<unknown>("/owner/couriers", undefined, token);
      if (!alive || my !== seq.current) return; // إلغاء أو رد أقدم — يُهمَل
      if (r.ok) {
        setCouriers(couriersFromResponse(r.data));
        setCouriersErr(null);
      } else {
        setCouriersErr(r.error);
        setCouriers([]);
      }
      setRefreshingCouriers(false);
    })();
    return () => {
      alive = false;
    };
  }, [token, ownerFacilityId]);

  const loadingCouriers = couriers === null || refreshingCouriers;

  const changeFacility = useCallback(() => {
    setOwnerFacility(null, null);
    setCouriers(null); // إعادة التحميل عند اختيار المنشأة الجديدة
    setCouriersErr(null);
  }, [setOwnerFacility]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-stone-900 sm:text-2xl">مناديب التاجر — لوحة المنشآت</h1>
        <p className="mt-1 text-sm text-stone-600">
          إنشاء مناديب موثّقين فورياً وإسناد مهام النداء — كل شيء عبر عقود /owner/couriers و /owner/tasks الحية
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
          {() => (
            <div className="space-y-4">
              {ownerFacilityId ? (
                <p className="text-sm text-stone-600">
                  منشأتك الحالية: <strong>{ownerFacilityName ?? `#${ownerFacilityId}`}</strong>
                </p>
              ) : (
                <FacilityPicker onSelect={setOwnerFacility} />
              )}
            </div>
          )}
        </LoginGate>
      ) : ownerFacilityId === null ? (
        <FacilityPicker onSelect={setOwnerFacility} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-emerald-900">
              <Store className="me-1.5 inline h-4 w-4 text-emerald-700" />
              منشأة العمل: <strong>{ownerFacilityName ?? `#${ownerFacilityId}`}</strong>
              <span className="ms-1.5 font-mono text-xs text-emerald-700" dir="ltr">#{ownerFacilityId}</span>
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={changeFacility}>
              <Repeat className="h-3.5 w-3.5" /> تغيير المنشأة
            </Button>
          </div>

          <Tabs defaultValue="couriers" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="couriers" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> مناديبي
              </TabsTrigger>
              <TabsTrigger value="calls" className="gap-1.5">
                <BellRing className="h-3.5 w-3.5" /> مهام النداء
              </TabsTrigger>
            </TabsList>
            <TabsContent value="couriers" className="mt-4">
              <CouriersTab
                couriers={couriers}
                loading={loadingCouriers}
                error={couriersErr}
                facilityId={ownerFacilityId}
                reload={refreshCouriers}
                onCourierUpdated={(updated) =>
                  setCouriers((list) =>
                    list ? list.map((c) => (c.id === updated.id ? updated : c)) : [updated]
                  )
                }
              />
            </TabsContent>
            <TabsContent value="calls" className="mt-4">
              <CallsTab facilityId={ownerFacilityId} couriers={couriers ?? []} reloadCouriers={refreshCouriers} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
