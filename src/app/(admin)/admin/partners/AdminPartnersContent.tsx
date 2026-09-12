"use client";

/**
 * /admin/partners — إدارة روابط الشركاء (GET /admin/partners/requests).
 * ═══════════════════════════════════════════════════════════════════
 * القرارات: approve | reject | revoke | replace_key.
 * المفتاح الكامل (twp_…) يظهر في حوار خاص مرة واحدة حصراً — نسخ
 * بزر + تحذير «لن يظهر مجدداً» — بعد approve/replace_key.
 * الصحة (نجاح ٧ أيام · منتجات مزامة · خمول) لكل شريك.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Ban,
  Cable,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminPartners,
  useAdminPartnerDecision,
  useAdminPartnerHealth,
} from "@/hooks/useAdminDelivery";
import type { AdminPartnerRequest } from "@/services/admin.service";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const REQUEST_STATUS_TONE: Record<string, string> = {
  pending: "bg-accent/15 text-accent-foreground border-accent/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  revoked: "bg-destructive/10 text-destructive border-destructive/30",
};

const REQUEST_STATUS_AR: Record<string, string> = {
  pending: "بانتظار القرار",
  approved: "مربوط",
  rejected: "مرفوض",
  revoked: "موقوف",
};

export default function AdminPartnersContent() {
  const list = useAdminPartners();
  const decision = useAdminPartnerDecision();

  /* حوار القرار + حوار المفتاح */
  const [dialog, setDialog] = useState<{
    partner: AdminPartnerRequest;
    action: "approve" | "reject" | "revoke" | "replace_key";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [keyResult, setKeyResult] = useState<{ key: string; message?: string } | null>(
    null,
  );

  const runDecision = () => {
    if (!dialog) return;
    haptic("light");
    decision.mutate(
      {
        partnerId: dialog.partner.id,
        action: dialog.action,
        reason: reason.trim() || null,
      },
      {
        onSuccess: (res) => {
          setDialog(null);
          setReason("");
          if (res.api_key) {
            /* المفتاح يظهر هنا — مرة واحدة حصراً */
            setKeyResult({ key: res.api_key, message: res.message });
          } else {
            toast({ title: res.message ?? res.detail ?? "نُفّذ القرار" });
          }
        },
      }
    );
  };

  const copyKey = async () => {
    if (!keyResult) return;
    haptic("success");
    try {
      await navigator.clipboard.writeText(keyResult.key);
      toast({ title: "نُسخ المفتاح — احفظه في نظامك الآن" });
    } catch {
      toast({ title: "انسخ المفتاح يدوياً", description: keyResult.key });
    }
  };

  const items = list.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
          روابط الشركاء
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          طلبات ربط أنظمة خارجية بمتاجر المنصة · المفتاح يظهر مرة واحدة عند
          الموافقة أو التبديل
        </p>
      </div>

      {list.isLoading ? (
        <div className="space-y-3" role="status">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState
          title="تعذّر جلب روابط الشركاء"
          onRetry={() => void list.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
          <Cable className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-foreground">لا طلبات ربط حالياً</p>
          <p className="mt-1 text-xs text-muted-foreground">
            عندما يطلب أصحاب المتاجر ربط أنظمتهم ستظهر الطلبات هنا
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <PartnerCard
                  partner={p}
                  busy={decision.isPending}
                  onDecide={(action) => {
                    setReason("");
                    setDialog({ partner: p, action });
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ حوار القرار ═══ */}
      <Dialog open={dialog != null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black">
              {dialog?.action === "approve"
                ? "الموافقة على الربط"
                : dialog?.action === "reject"
                  ? "رفض طلب الربط"
                  : dialog?.action === "revoke"
                    ? "إيقاف ربط نشط"
                    : "تبديل مفتاح الشريك"}
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {dialog?.partner.system_name} · متجر #{dialog?.partner.facility_id}
              {dialog?.action === "approve" &&
                " — سيُولَّد مفتاح جديد يظهر مرة واحدة حصراً"}
              {dialog?.action === "replace_key" &&
                " — المفتاح القديم يُبطل فوراً والمفتاح الجديد يظهر مرة واحدة"}
              {dialog?.action === "revoke" &&
                " — تتوقف مزامنات هذا الشريك فوراً"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="partner-reason">السبب (اختياري)</Label>
            <Textarea
              id="partner-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="سبب موجز يوثّق القرار…"
              className="min-h-20 resize-none rounded-xl"
            />
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
              onClick={runDecision}
              disabled={decision.isPending}
              className={cn(
                "h-12 flex-1 gap-2 rounded-2xl font-black native-tap",
                dialog?.action === "approve" || dialog?.action === "replace_key"
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground",
              )}
            >
              {decision.isPending && (
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              )}
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار المفتاح — مرة واحدة حصراً ═══ */}
      <Dialog
        open={keyResult != null}
        onOpenChange={(o) => {
          if (!o) setKeyResult(null);
        }}
      >
        <DialogContent dir="rtl" className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-center text-base font-black">
              <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
              مفتاح الشريك — يظهر الآن فقط
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {keyResult?.message ??
                "احفظ المفتاح الآن — لن يظهر مجدداً بعد إغلاق هذه النافذة"}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={copyKey}
            dir="ltr"
            className="native-tap group flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.05] p-4 text-left"
            aria-label="نسخ مفتاح الشريك"
          >
            <code className="min-w-0 flex-1 break-all font-mono text-sm font-bold text-foreground">
              {keyResult?.key}
            </code>
            <Copy
              className="h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
          </button>
          <p
            role="alert"
            className="flex items-start gap-1.5 rounded-xl bg-destructive/10 p-3 text-[11px] font-bold leading-relaxed text-destructive"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            لن تتمكن من استرجاع هذا المفتاح لاحقاً — إن أغلقته دون نسخه
            استخدم «تبديل المفتاح» لتوليد مفتاح جديد
          </p>
          <DialogFooter>
            <Button
              onClick={() => setKeyResult(null)}
              className="h-12 w-full rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              حفظته — إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── بطاقة شريك ─────────────────────────────────────── */

function PartnerCard({
  partner,
  busy,
  onDecide,
}: {
  partner: AdminPartnerRequest;
  busy: boolean;
  onDecide: (
    action: "approve" | "reject" | "revoke" | "replace_key"
  ) => void;
}) {
  const health = useAdminPartnerHealth(
    partner.request_status === "approved" ? partner.id : null
  );

  return (
    <section
      aria-label={`شريك ${partner.system_name}`}
      className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Cable className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-foreground">
              {partner.system_name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
              {partner.contact_email}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              متجر #{partner.facility_id} ·{" "}
              {partner.link_mode === "internal_system"
                ? "نظام داخلي"
                : "خلفية تطبيق"}{" "}
              · {formatDate(partner.created_at)}
            </p>
          </div>
        </div>
        <Badge
          className={cn(
            "shrink-0 border text-[10px] font-black",
            REQUEST_STATUS_TONE[partner.request_status] ??
              "bg-muted text-muted-foreground border-border",
          )}
        >
          {REQUEST_STATUS_AR[partner.request_status] ?? partner.request_status}
        </Badge>
      </div>

      {/* صحة الشريك (للمربوطين) */}
      {health.data && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <HealthStat
            icon={Activity}
            label="استدعاءات ناجحة (٧ أيام)"
            value={String(health.data.success_count_7d)}
          />
          <HealthStat
            icon={PackageCheck}
            label="منتجات مزامة"
            value={String(health.data.synced_products_count)}
          />
          <HealthStat
            icon={Ban}
            label="الحالة"
            value={health.data.status}
            tone={health.data.status === "active" ? "text-success" : "text-muted-foreground"}
          />
        </div>
      )}

      {/* أزرار القرار حسب الحالة */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {partner.request_status === "pending" && (
          <>
            <Button
              size="lg"
              onClick={() => onDecide("approve")}
              disabled={busy}
              className="h-12 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              موافقة وتوليد مفتاح
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDecide("reject")}
              disabled={busy}
              className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
            >
              <ShieldX className="h-4.5 w-4.5" aria-hidden="true" />
              رفض
            </Button>
          </>
        )}
        {partner.request_status === "approved" && (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDecide("replace_key")}
              disabled={busy}
              className="h-12 gap-2 rounded-2xl font-bold native-tap"
            >
              <RefreshCw className="h-4.5 w-4.5" aria-hidden="true" />
              تبديل المفتاح
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onDecide("revoke")}
              disabled={busy}
              className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
            >
              <Ban className="h-4.5 w-4.5" aria-hidden="true" />
              إيقاف الربط
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  tone = "text-foreground",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <p className={cn("mt-1 text-sm font-black tabular-nums", tone)}>{value}</p>
      <p className="text-[9px] font-bold leading-tight text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
