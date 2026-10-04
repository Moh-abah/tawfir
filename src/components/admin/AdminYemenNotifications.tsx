"use client";

/**
 * AdminYemenNotifications — تبويب «إشعارات اليمن» (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 * مراجعة إشعارات تسديد التحويل البنكي اليمني:
 *  - فلتر حالة بchips يمرر للـhook (الكل/submitted/approved/rejected).
 *  - الإيصال: thumbnail يفتح Dialog تكبير (<img> عادية — الروابط من المستخدمين بأي نطاق).
 *  - القبول/الرفض لإشعار submitted فقط عبر Dialog يطلب review_note —
 *    إلزامي للرفض (والسبب يظهر للتاجر — تنبيه حي)، اختياري للقبول.
 *  - البرونزية-4: idempotency_key يُولَّد داخل النداء (newIdempotencyKey)
 *    ويُمرر في body — الhook يبثه كما هو للخدمة.
 *  - polling كل 60 ثانية من useAdminYemenNotifications.
 */

import { useState } from "react";
import {
  BellRing,
  CircleCheck,
  CircleX,
  Info,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminYemenNotifications,
  useApproveYemenNotification,
  useRejectYemenNotification,
} from "@/hooks/useFinance";
import {
  FinanceStatusBadge,
  MoneyText,
  NOTIFICATION_STATUS_AR,
} from "@/components/finance/finance-ui";
import { formatDate, resolveImageUrl } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import type { FinanceNotification } from "@/services/finance.service";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "", label: "الكل" },
  { value: "submitted", label: "مقدَّمة" },
  { value: "approved", label: "مقبولة" },
  { value: "rejected", label: "مرفوضة" },
] as const;

type Decision = { id: number; kind: "approve" | "reject" } | null;

export default function AdminYemenNotifications() {
  const [status, setStatus] = useState<string>("");
  const query = useAdminYemenNotifications(status || null);
  const approve = useApproveYemenNotification();
  const reject = useRejectYemenNotification();

  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState("");
  const [imageTarget, setImageTarget] = useState<FinanceNotification | null>(null);

  const decisionMutation = decision?.kind === "reject" ? reject : approve;
  const decisionSaving =
    (decision?.kind === "approve" && approve.isPending) ||
    (decision?.kind === "reject" && reject.isPending);

  const openDecision = (id: number, kind: "approve" | "reject") => {
    setNote("");
    setDecision({ id, kind });
  };

  const closeDecision = () => {
    if (decisionSaving) return;
    setDecision(null);
    setNote("");
  };

  const submitDecision = () => {
    if (!decision) return;
    const kind = decision.kind;
    const trimmed = note.trim();
    if (kind === "reject" && !trimmed) return;
    const body = {
      review_note: trimmed || null,
      /* البرونزية-4: مفتاح جديد لكل محاولة POST — يُبث في body */
      idempotency_key: newIdempotencyKey(),
    };
    (kind === "approve" ? approve : reject).mutate(
      { id: decision.id, body },
      { onSuccess: () => setDecision(null) }
    );
  };

  const items = query.data ?? [];

  return (
    <div className="space-y-4">
      {/* ── فلتر الحالة ── */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatus(f.value)}
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-full border px-4 text-xs font-bold transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
        <span className="ms-auto hidden text-[11px] text-muted-foreground sm:inline">
          تحديث تلقائي كل دقيقة
        </span>
      </div>

      {/* ── الحالات الثلاث ── */}
      {query.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="تعذّر تحميل إشعارات اليمن"
          message={
            query.error instanceof Error
              ? query.error.message
              : "لم نتمكن من جلب الإشعارات. أعد المحاولة."
          }
          onRetry={() => query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="لا إشعارات في هذه الحالة"
          description="ستظهر هنا إشعارات تسديد التجار عبر التحويل البنكي اليمني."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((n) => (
            <Card key={n.id} className="rounded-2xl border-border/60 shadow-soft">
              <CardContent className="space-y-3 p-4">
                {/* الرأس: رقم + تاجر + شارة */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">إشعار #{n.id}</p>
                    <p className="text-xs text-muted-foreground">تاجر #{n.owner_id}</p>
                  </div>
                  <FinanceStatusBadge status={n.status} dictionary={NOTIFICATION_STATUS_AR} />
                </div>

                {/* المبلغ + التاريخ */}
                <div className="flex items-center justify-between gap-2">
                  <MoneyText
                    amount={n.amount}
                    currency={n.currency}
                    strong
                    className="text-base"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(n.created_at)}
                  </span>
                </div>

                {/* البنك/المرجع/التاريخ إن وجدت */}
                {(n.bank_name || n.reference_no || n.transfer_date) && (
                  <dl className="space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs">
                    {n.bank_name && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">البنك</dt>
                        <dd className="font-bold text-foreground">{n.bank_name}</dd>
                      </div>
                    )}
                    {n.reference_no && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">المرجع</dt>
                        <dd dir="ltr" className="font-bold tabular-nums text-foreground">
                          {n.reference_no}
                        </dd>
                      </div>
                    )}
                    {n.transfer_date && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">تاريخ التحويل</dt>
                        <dd className="font-bold text-foreground">
                          {formatDate(n.transfer_date)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                {/* صورة الإيصال — thumbnail يفتح تكبيراً */}
                {n.image_url ? (
                  <button
                    type="button"
                    onClick={() => setImageTarget(n)}
                    className="group relative block h-20 w-20 overflow-hidden rounded-xl border border-border/60 bg-muted transition-opacity hover:opacity-90"
                    aria-label={`تكبير إيصال الإشعار رقم ${n.id}`}
                  >
                    {/* <img> وليس next/image: روابط الإيصالات من المستخدمين
                        وقد تأتي من أي نطاق غير مُدرج في remotePatterns */}
                    <img
                      src={resolveImageUrl(n.image_url)}
                      alt={`إيصال التحويل — إشعار #${n.id}`}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </button>
                ) : (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                    لا صورة إيصال مرفقة.
                  </p>
                )}

                {n.review_note && (
                  <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-bold text-foreground">ملاحظة المراجعة: </span>
                    {n.review_note}
                  </p>
                )}

                {/* القرار لإشعار submitted فقط */}
                {n.status === "submitted" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openDecision(n.id, "approve")}
                      className="min-h-[44px] flex-1 gap-1.5 rounded-full bg-success text-white hover:bg-success/90"
                    >
                      <CircleCheck className="h-4 w-4" aria-hidden="true" />
                      قبول
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => openDecision(n.id, "reject")}
                      className="min-h-[44px] flex-1 gap-1.5 rounded-full"
                    >
                      <CircleX className="h-4 w-4" aria-hidden="true" />
                      رفض
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── حوار القبول/الرفض ── */}
      <Dialog open={!!decision} onOpenChange={(open) => !open && closeDecision()}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.kind === "approve"
                ? `قبول الإشعار #${decision?.id}`
                : `رفض الإشعار #${decision?.id}`}
            </DialogTitle>
            <DialogDescription>
              {decision?.kind === "approve"
                ? "القبول يخصم المبلغ من ذمة التاجر ويسوّي الإشعار."
                : "سيُعاد الإشعار للتاجر مع سبب الرفض — اكتب السبب بوضوح."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="review-note">
                {decision?.kind === "reject"
                  ? "سبب الرفض (إلزامي)"
                  : "ملاحظة المراجعة (اختياري)"}
              </Label>
              <Textarea
                id="review-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  decision?.kind === "reject"
                    ? "مثال: صورة الإيصال غير واضحة — أعد الرفع بصورة أوضح"
                    : "ملاحظة تحوّل للتاجر مع قبول الإشعار (اختياري)"
                }
                className="min-h-[44px]"
              />
              {decision?.kind === "reject" && (
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  سبب الرفض سيظهر للتاجر مباشرة.
                </p>
              )}
            </div>

            {decisionMutation.isError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-2.5 text-xs font-bold text-destructive"
              >
                {decisionMutation.error instanceof Error
                  ? decisionMutation.error.message
                  : "تعذّر تنفيذ الإجراء — أعد المحاولة"}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDecision}
              disabled={decisionSaving}
              className="min-h-[44px] rounded-full"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant={decision?.kind === "approve" ? "default" : "destructive"}
              disabled={
                decisionSaving || (decision?.kind === "reject" && !note.trim())
              }
              onClick={submitDecision}
              className={cn(
                "min-h-[44px] gap-1.5 rounded-full",
                decision?.kind === "approve" && "bg-success text-white hover:bg-success/90"
              )}
            >
              {decisionSaving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {decision?.kind === "approve" ? "تأكيد القبول" : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── حوار تكبير الإيصال ── */}
      <Dialog
        open={!!imageTarget}
        onOpenChange={(open) => !open && setImageTarget(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              إيصال التحويل — إشعار #{imageTarget?.id} · تاجر #{imageTarget?.owner_id}
            </DialogTitle>
            <DialogDescription>
              {imageTarget != null && (
                <MoneyText
                  amount={imageTarget.amount}
                  currency={imageTarget.currency}
                  strong
                />
              )}
            </DialogDescription>
          </DialogHeader>
          {imageTarget?.image_url && (
            <div className="relative h-80 w-full overflow-hidden rounded-xl border border-border/60 bg-muted">
              <img
                src={resolveImageUrl(imageTarget.image_url)}
                alt={`إيصال التحويل — إشعار #${imageTarget.id}`}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
