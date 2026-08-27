"use client";

import { useState } from "react";
import {
  Hourglass,
  Store,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  UserRound,
  Mail,
  Phone,
  CalendarClock,
  PartyPopper,
  Loader2,
  BadgePercent,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminPendingFacilities,
  useApproveFacility,
  useRejectFacility,
  type PendingFacility,
} from "@/hooks/useAdminPendingFacilities";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FacilityType } from "@/types/api.generated";

/* ─── أنماط شارات النوع (نفس توكنات فئات الرئيسية) ─── */
const TYPE_BADGE: Record<FacilityType, string> = {
  restaurant: "bg-cat-restaurant-soft text-cat-restaurant",
  cafe: "bg-cat-cafe-soft text-cat-cafe",
};

/* ─── سطر معلومة داخل البطاقة ─── */
function InfoRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p
          dir={dir}
          className={cn(
            "truncate text-sm font-medium text-foreground",
            dir === "ltr" && "text-left"
          )}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── بطاقة طلب معلّق ─── */
function PendingFacilityCard({
  facility,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  facility: PendingFacility;
  onApprove: (id: number) => void;
  onReject: (facility: PendingFacility) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const TypeIcon = TYPE_ICON[facility.type];
  const busy = isApproving || isRejecting;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      {/* الرأس: الاسم + النوع */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
            <div className="min-w-0">
            <h3 className="truncate text-base font-bold leading-snug text-foreground">
              {facility.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5">
              <TypeIcon
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <Badge
                className={cn("border-transparent text-xs", TYPE_BADGE[facility.type])}
              >
                {TYPE_LABEL[facility.type]}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <BadgePercent className="h-3 w-3" aria-hidden="true" />
                طلب خصم {facility.discount_rate ?? 30}%
              </span>
            </div>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <Hourglass className="h-4 w-4 text-accent" aria-hidden="true" />
        </span>
      </div>

      {/* بيانات المالك */}
      <div className="grid gap-2.5 rounded-xl bg-muted/40 p-3.5">
        <InfoRow
          icon={UserRound}
          label="اسم المالك"
          value={facility.owner_name ?? "—"}
        />
        <InfoRow
          icon={Mail}
          label="البريد الإلكتروني"
          value={facility.owner_email ?? "—"}
          dir="ltr"
        />
        <InfoRow
          icon={Phone}
          label="رقم الجوال"
          value={facility.owner_phone ?? "—"}
          dir="ltr"
        />
        <InfoRow
          icon={CalendarClock}
          label="تاريخ الطلب"
          value={formatDate(facility.created_at)}
        />
      </div>

      {/* الإجراءات */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => onApprove(facility.id)}
          disabled={busy}
          className="min-h-[44px] flex-1 gap-2 rounded-full bg-success text-white hover:bg-success/90"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {isApproving ? "جارٍ القبول..." : "موافقة"}
        </Button>
        <Button
          variant="outline"
          onClick={() => onReject(facility)}
          disabled={busy}
          className="min-h-[44px] flex-1 gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          رفض
        </Button>
      </div>
    </div>
  );
}

/* ─── هيكل تحميل البطاقات ─── */
function PendingCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-full" />
            <Skeleton className="h-11 flex-1 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── الصفحة ─── */
export default function AdminPendingFacilitiesPage() {
  const { data, isLoading, isError, error, refetch } =
    useAdminPendingFacilities();
  const approveMutation = useApproveFacility();
  const rejectMutation = useRejectFacility();

  /* مودال الرفض: المنشأة قيد الرفض + السبب */
  const [rejectTarget, setRejectTarget] = useState<PendingFacility | null>(
    null
  );
  const [reason, setReason] = useState("");

  const items = data?.items ?? [];

  function openRejectDialog(facility: PendingFacility) {
    setRejectTarget(facility);
    setReason("");
  }

  function submitRejection() {
    if (!rejectTarget || !reason.trim()) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setReason("");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <Hourglass className="h-5 w-5 text-accent" aria-hidden="true" />
            </span>
            طلبات المنشآت المعلّقة
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            طلبات تسجيل المنشآت الجديدة بانتظار مراجعتك وموافقتك قبل ظهورها
            للعملاء.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="min-h-[44px] gap-2 rounded-full"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          تحديث
        </Button>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <PendingCardsSkeleton />
      ) : isError ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center"
          role="alert"
        >
          <XCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              تعذّر تحميل الطلبات المعلّقة
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            className="min-h-[44px] gap-2 rounded-full"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            إعادة المحاولة
          </Button>
        </div>
      ) : items.length === 0 ? (
        /* حالة الفراغ */
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-card py-16 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <PartyPopper
              className="h-10 w-10 text-success"
              aria-hidden="true"
            />
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">
              🎉 لا توجد طلبات منشآت معلّقة حالياً
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              ستظهر هنا طلبات التسجيل الجديدة فور تقديمها من أصحاب المنشآت.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.total === 1
              ? "طلب واحد معلّق"
              : `${data?.total ?? items.length} طلبات معلّقة`}
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((facility) => (
              <PendingFacilityCard
                key={facility.id}
                facility={facility}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={openRejectDialog}
                isApproving={
                  approveMutation.isPending &&
                  approveMutation.variables === facility.id
                }
                isRejecting={
                  rejectMutation.isPending &&
                  rejectMutation.variables?.id === facility.id
                }
              />
            ))}
          </div>
        </>
      )}

      {/* مودال الرفض مع السبب */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
              رفض طلب «{rejectTarget?.name ?? ""}»
            </DialogTitle>
            <DialogDescription>
              اكتب سبب الرفض — سيظهر لصاحب المنشأة في بوابة المالك ليعرف ما
              يجب تعديله.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">سبب الرفض</Label>
            <Textarea
              id="rejection-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: بيانات المنشأة غير مكتملة — أضف وصفاً وصورة أوضح"
              disabled={rejectMutation.isPending}
              className="min-h-[44px]"
              aria-invalid={reason.trim().length === 0}
            />
            {reason.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                السبب مطلوب لتنفيذ الرفض
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setReason("");
              }}
              disabled={rejectMutation.isPending}
              className="min-h-[44px] w-full rounded-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={submitRejection}
              disabled={rejectMutation.isPending || !reason.trim()}
              className="min-h-[44px] w-full gap-2 rounded-full sm:w-auto"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {rejectMutation.isPending ? "جارٍ الرفض..." : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
