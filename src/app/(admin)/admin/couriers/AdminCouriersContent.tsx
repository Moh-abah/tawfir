"use client";

/**
 * /admin/couriers — إدارة أسطول المناديب (الجولة الرابعة).
 * ═══════════════════════════════════════════════════════════════════
 * 1. طلبات التوثيق (تبويب حسب الحالة — الفلتر إلزامي: خلل 500 معروف
 *    من الخادم عند الحالات ذات العناصر — نتعامل معه برسالة رشيقة
 *    ووضع انتظار قابل لإعادة المحاولة).
 * 2. بطاقة المعاينة: 4 مستندات (صور قابلة للفتح في تبويب جديد) +
 *    بيانات المندوب + أزرار القرار الحرفية:
 *    verify | reject (سبب إلزامي) | request_completion.
 * 3. الإيقاف/التنشيط (قائمة أسباب قياسية) من تبويب الموثقين.
 * 4. الرصد الحي (15ث): الاسم العام + التوفر + آخر نبض + البطارية +
 *    المهمة الجارية (موقع نصي — لا خريطة داخلية؛ زر خارجي يفتح
 *    إحداثيات النبض في تطبيق الخرائط).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  BatteryFull,
  Bike,
  Ban,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileImage,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/ErrorState";
import { OpenInMapsButton } from "@/components/shared/OpenInMapsButton";
import {
  useAdminCourierVerifications,
  useAdminCourierDecision,
  useAdminCourierSuspend,
  useAdminCouriersMonitor,
  type CourierVerificationStatus,
} from "@/hooks/useAdminDelivery";
import type { AdminCourierVerification } from "@/services/admin.service";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { formatDate } from "@/lib/format";
import { resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS: { key: CourierVerificationStatus; label: string }[] = [
  { key: "pending", label: "بانتظار التوثيق" },
  { key: "awaiting_completion", label: "بانتظار استكمال" },
  { key: "verified", label: "موثّقون" },
  { key: "rejected", label: "مرفوضون" },
  { key: "suspended", label: "موقوفون" },
];

const SUSPEND_REASONS = [
  { v: "تقييم متدنٍ", l: "تقييم متدنٍ" },
  { v: "شكوى مؤكدة", l: "شكوى مؤكدة" },
  { v: "انتهاء مستند", l: "انتهاء مستند" },
  { v: "مخالفة سلوك", l: "مخالفة سلوك" },
  { v: "أخرى", l: "أخرى" },
];

export default function AdminCouriersContent() {
  const [tab, setTab] = useState<CourierVerificationStatus>("pending");
  const list = useAdminCourierVerifications(tab);
  const monitor = useAdminCouriersMonitor();

  /* حوار القرار */
  const decision = useAdminCourierDecision();
  const suspend = useAdminCourierSuspend();
  const [dialog, setDialog] = useState<{
    courier: AdminCourierVerification;
    kind: "verify" | "reject" | "request_completion" | "suspend" | "activate";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [suspendReason, setSuspendReason] = useState("تقييم متدنٍ");

  const runDialog = () => {
    if (!dialog) return;
    const { courier, kind } = dialog;
    haptic("light");
    if (kind === "verify" || kind === "request_completion") {
      decision.mutate(
        { courierId: courier.courier_id, action: kind, notes: notes.trim() || null },
        {
          onSuccess: () => {
            setDialog(null);
            setNotes("");
            toast({
              title:
                kind === "verify"
                  ? "تم توثيق المندوب — يمكنه استقبال النداءات"
                  : "طُلب من المندوب استكمال مستنداته",
            });
          },
        }
      );
    } else if (kind === "reject") {
      decision.mutate(
        { courierId: courier.courier_id, action: "reject", reason: reason.trim() },
        {
          onSuccess: () => {
            setDialog(null);
            setReason("");
            toast({ title: "رُفض توثيق المندوب" });
          },
        }
      );
    } else if (kind === "suspend") {
      suspend.mutate(
        { courierId: courier.courier_id, action: "suspend", reason: suspendReason },
        {
          onSuccess: () => {
            setDialog(null);
            toast({ title: "أُوقف المندوب" });
          },
        }
      );
    } else if (kind === "activate") {
      suspend.mutate(
        { courierId: courier.courier_id, action: "activate" },
        {
          onSuccess: () => {
            setDialog(null);
            toast({ title: "نُشّط المندوب" });
          },
        }
      );
    }
  };

  const busy = decision.isPending || suspend.isPending;

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      {/* رأس الصفحة */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
            أسطول المناديب
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            توثيق المستندات · الإيقاف والتنشيط · الرصد الحي
          </p>
        </div>
      </div>

      {/* الرصد الحي */}
      <MonitorSection monitor={monitor} />

      {/* تبويبات حالة التوثيق */}
      <div
        className="mt-5 flex gap-1.5 overflow-x-auto no-mobile-scrollbar pb-1"
        role="tablist"
        aria-label="حالة التوثيق"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              haptic("tick");
              setTab(t.key);
            }}
            className={cn(
              "native-tap shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors",
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* القائمة */}
      <div className="mt-4 space-y-3">
        {list.isLoading ? (
          <div className="space-y-3" role="status" aria-label="جارٍ التحميل">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))}
          </div>
        ) : list.isError ? (
          /* وضع الانتظار الرشيق — خلل الخادم 500 المعروف على الحالات ذات
             العناصر يظهر هنا برسالة واضحة وإعادة محاولة */
          <ErrorState
            title="تعذّر جلب طلبات التوثيق"
            message="الخادم أرجأ خطأً داخلياً في هذه الحالة (خلل معروف عند توفر عناصر). أعد المحاولة أو راسل الدعم الفني إن تكرر."
            onRetry={() => void list.refetch()}
          />
        ) : (list.data?.items ?? []).length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-foreground">
              لا طلبات في «{TABS.find((t) => t.key === tab)?.label}»
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              عند تقديم مناديب جدد للتوثيق ستظهر طلباتهم هنا بمستنداتهم الأربعة
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {(list.data?.items ?? []).map((c) => (
              <motion.div
                key={c.courier_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CourierCard
                  courier={c}
                  busy={busy}
                  onDecision={(kind) => {
                    setReason("");
                    setNotes("");
                    setSuspendReason("تقييم متدنٍ");
                    setDialog({ courier: c, kind });
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ═══ حوار القرار ═══ */}
      <Dialog open={dialog != null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black">
              {dialog?.kind === "verify"
                ? "توثيق المندوب"
                : dialog?.kind === "reject"
                  ? "رفض التوثيق"
                  : dialog?.kind === "request_completion"
                    ? "طلب استكمال المستندات"
                    : dialog?.kind === "suspend"
                      ? "إيقاف المندوب"
                      : "تنشيط المندوب"}
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {dialog?.courier.full_name ?? "مندوب"} ·{" "}
              {dialog?.courier.phone ?? dialog?.courier.email ?? ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {dialog?.kind === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="vreason" className="text-xs font-bold">
                  سبب الرفض <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="vreason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  placeholder="سبب واضح يصل للمندوب مع الرفض…"
                  className="min-h-20 resize-none rounded-xl"
                  aria-required="true"
                />
              </div>
            )}
            {dialog?.kind === "suspend" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">سبب الإيقاف</Label>
                <Select value={suspendReason} onValueChange={setSuspendReason} dir="rtl">
                  <SelectTrigger className="h-12 rounded-xl" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {SUSPEND_REASONS.map((r) => (
                      <SelectItem key={r.v} value={r.v}>
                        {r.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(dialog?.kind === "verify" || dialog?.kind === "request_completion") && (
              <div className="space-y-2">
                <Label htmlFor="vnotes" className="text-xs font-bold">
                  ملاحظات إدارية داخلية (اختياري)
                </Label>
                <Textarea
                  id="vnotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                  placeholder="توثيق داخلي للقرار…"
                  className="min-h-20 resize-none rounded-xl"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              className="h-12 flex-1 rounded-2xl native-tap"
            >
              تراجع
            </Button>
            <Button
              onClick={runDialog}
              disabled={busy || (dialog?.kind === "reject" && !reason.trim())}
              className={cn(
                "h-12 flex-1 gap-2 rounded-2xl font-black native-tap",
                dialog?.kind === "verify" || dialog?.kind === "activate"
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground",
              )}
            >
              {busy && <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />}
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── بطاقة مندوب (توثيق) ─────────────────────────────── */

function CourierCard({
  courier,
  busy,
  onDecision,
}: {
  courier: AdminCourierVerification;
  busy: boolean;
  onDecision: (
    kind: "verify" | "reject" | "request_completion" | "suspend" | "activate"
  ) => void;
}) {
  const [docsOpen, setDocsOpen] = useState(false);
  const docs = courier.documents ?? [];
  const approvedDocs = docs.filter((d) => d.status === "approved").length;

  return (
    <section
      aria-label={`طلب توثيق ${courier.full_name ?? courier.courier_id}`}
      className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
            {(courier.full_name ?? "م").charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-foreground">
              {courier.full_name ?? "مندوب"}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
              {courier.phone ?? courier.email ?? "—"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
              {VEHICLE_LABEL[courier.vehicle_type ?? ""] ?? courier.vehicle_type ?? "غير محدد"}
              {courier.submitted_at && (
                <>
                  <ChevronLeft className="h-3 w-3 rtl:rotate-0" aria-hidden="true" />
                  {formatDate(courier.submitted_at)}
                </>
              )}
            </p>
          </div>
        </div>
        <Badge className="shrink-0 border-transparent bg-muted text-[10px] font-bold text-muted-foreground">
          {docs.length > 0 ? `${approvedDocs}/${docs.length} مستند موافق` : "بلا مستندات"}
        </Badge>
      </div>

      {/* أزرار القرار — حسب التبويب */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button
          size="lg"
          onClick={() => onDecision("verify")}
          disabled={busy}
          className="h-12 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
          aria-label={`توثيق ${courier.full_name ?? "المندوب"}`}
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          توثيق
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onDecision("request_completion")}
          disabled={busy}
          className="h-12 gap-2 rounded-2xl font-bold native-tap"
        >
          <RotateCcw className="h-4.5 w-4.5" aria-hidden="true" />
          طلب استكمال
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onDecision("reject")}
          disabled={busy}
          className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
        >
          <XCircle className="h-4.5 w-4.5" aria-hidden="true" />
          رفض
        </Button>
      </div>

      {/* مستندات + إدارة الموثقين */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            haptic("tick");
            setDocsOpen((v) => !v);
          }}
          className="h-10 gap-1.5 rounded-full px-3 text-xs font-bold text-primary"
          aria-expanded={docsOpen}
          aria-controls={`docs-${courier.courier_id}`}
        >
          <FileImage className="h-4 w-4" aria-hidden="true" />
          {docsOpen ? "إخفاء المستندات" : `عرض المستندات (${docs.length})`}
        </Button>
      </div>

      {docsOpen && (
        <div
          id={`docs-${courier.courier_id}`}
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {docs.map((doc, i) => (
            <a
              key={i}
              href={doc.url ? resolveImageUrl(doc.url) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "native-tap-card group flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors",
                doc.url
                  ? "border-border/60 bg-muted/40 hover:border-primary/40"
                  : "cursor-not-allowed border-dashed border-border/50 opacity-60",
              )}
              aria-label={
                doc.url
                  ? `فتح ${doc.doc_type_ar ?? doc.doc_type} في تبويب جديد`
                  : `${doc.doc_type_ar ?? doc.doc_type} — غير مرفوع`
              }
            >
              <FileImage
                className="h-7 w-7 text-primary/70"
                aria-hidden="true"
              />
              <span className="text-[11px] font-bold leading-tight text-foreground">
                {doc.doc_type_ar ?? doc.doc_type}
              </span>
              {doc.status_ar && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {doc.status_ar}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

const VEHICLE_LABEL: Record<string, string> = {
  motorcycle: "دراجة نارية",
  bicycle: "دراجة هوائية",
  car: "سيارة",
  van: "فان",
};

/* ─── الرصد الحي ─────────────────────────────────────── */

function MonitorSection({
  monitor,
}: {
  monitor: ReturnType<typeof useAdminCouriersMonitor>;
}) {
  const items = monitor.data?.items ?? [];

  return (
    <section
      aria-label="الرصد الحي للأسطول"
      className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Activity className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          الرصد الحي
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          {monitor.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
          يُحدَّث كل ١٥ ثانية · {monitor.data?.count ?? 0} مندوب
        </span>
      </div>

      {monitor.isLoading ? (
        <Skeleton className="mt-3 h-24 rounded-2xl" />
      ) : items.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-muted/50 px-4 py-5 text-center text-xs text-muted-foreground">
          لا مناديب نشطون حالياً — يتحدّث الرصد فور تسجيل نبضاتهم
        </p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto scroll-area-thin">
          {items.map((m) => (
            <li
              key={m.courier_id}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  m.availability === "available"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.public_name ?? `مندوب #${m.courier_id}`}
                  <span className="ms-2 text-[10px] font-bold text-muted-foreground">
                    {m.availability_ar ?? m.availability}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {m.battery_level != null && (
                    <span className="flex items-center gap-0.5">
                      <BatteryFull className="h-3 w-3" aria-hidden="true" />
                      {m.battery_level}%
                    </span>
                  )}
                  {m.last_pulse_at && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatDate(m.last_pulse_at)}
                    </span>
                  )}
                  {m.active_task_id != null && (
                    <span className="flex items-center gap-0.5 font-bold text-primary">
                      <Package className="h-3 w-3" aria-hidden="true" />
                      مهمة #{m.active_task_id}
                    </span>
                  )}
                </p>
              </div>
              {m.last_lat != null && m.last_lng != null && (
                <OpenInMapsButton
                  lat={m.last_lat}
                  lng={m.last_lng}
                  label={m.public_name ?? `مندوب #${m.courier_id}`}
                  mode="view"
                  variant="ghost"
                  size="sm"
                  className="h-10 shrink-0 rounded-xl gap-1 px-3 text-[11px] font-bold"
                  ariaLabel="عرض موقع المندوب في تطبيق الخرائط"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  الموقع
                </OpenInMapsButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
