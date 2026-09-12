"use client";

/**
 * /owner/tasks/[taskId] — بطاقة مهمة التوصيل لمالك المتجر.
 * ═══════════════════════════════════════════════════════════════════
 * مصدر الحقيقة: GET /owner/tasks/{tid} (استطلاع 10ث للمهمة النشطة).
 * كل النصوص الحرفية من الخادم (status_ar / breakdown / message).
 *
 * المسارات:
 *  • ملف المندوب العام (public_name + مستوى + تقييم + مهام مكتملة)
 *  • التسعير: أجرة + سطر الحساب الحرفي + المسافة
 *  • التسليم اليدوي (handover) عند وصول المندوب للمتجر — الزر الذهبي
 *  • قرارات المشاكل (problem-decision): انتظار | إلغاء من طرف العميل |
 *    إلغاء بتعويض المندوب | تسليم تجاوزي
 *  • إجراءات المهمة (action): إلغاء قبل/بعد الإسناد | إعادة نداء | توصيل ذاتي
 *  • تقييم المندوب عند الإتمام (نجوم + التزام + سلامة + تعامل + تعليق)
 *  • owner_actions من الخادم تحدد الأزرار حرفياً — لا اجتهاد.
 */

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Banknote,
  Bike,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Handshake,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Package,
  Phone,
  RefreshCw,
  Star,
  Timer,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/shared/ErrorState";
import { OpenInMapsButton } from "@/components/shared/OpenInMapsButton";
import {
  useOwnerTask,
  useOwnerOrderCustomerView,
  useOwnerHandover,
  useOwnerProblemDecision,
  useOwnerTaskAction,
  useOwnerCourierRating,
} from "@/hooks/useOwnerDelivery";
import type { OwnerTaskCard } from "@/services/owner.service";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* نبرة الحالة (المفتاح من الخادم — النص حرفي status_ar) */
const STATUS_TONE: Record<string, string> = {
  calling: "bg-accent/15 text-accent-foreground border-accent/30",
  reserved: "bg-primary/10 text-primary border-primary/30",
  at_store: "bg-accent/20 text-accent-foreground border-accent/40",
  picked_up: "bg-primary/10 text-primary border-primary/30",
  at_customer: "bg-primary/15 text-primary border-primary/40",
  problem: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-success/10 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

/* ─── شاشة كاملة ─────────────────────────────────────── */

export default function OwnerTaskContent() {
  const params = useParams<{ taskId: string }>();
  const taskId = Number(params.taskId);
  const router = useRouter();

  const { data: task, isLoading, isError, error, refetch, isRefetching } =
    useOwnerTask(Number.isFinite(taskId) && taskId > 0 ? taskId : null);

  const isActive =
    task != null && !["completed", "cancelled"].includes(task.status);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      {/* رأس الصفحة */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
            بطاقة مهمة التوصيل
          </h1>
          {task && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              مهمة #{task.task_id} · طلب #{task.order_id}
            </p>
          )}
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label="العودة إلى لوحة المتجر"
        >
          <Link href="/owner">
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <TaskSkeleton />
      ) : isError || !task ? (
        <ErrorState
          title="تعذّر تحميل بطاقة المهمة"
          message={
            error instanceof Error
              ? error.message
              : "قد تكون المهمة أُغلقت أو حدث خلل في الاتصال"
          }
          onRetry={() => void refetch()}
        />
      ) : (
        <TaskBody
          task={task}
          isActive={isActive}
        />
      )}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="جارٍ تحميل بطاقة المهمة">
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}

/* ─── موقع العميل — لقرار التوصيل الذاتي ────────────────
   قبل حجز مندوب يقرر المالك: نداء؟ أم توصيل ذاتي بيده؟ هنا
   يرى موقع العميل وعنوانه وهاتفه (GET /orders/{id} — يُسمح
   للمالك حرفياً) ليختار الطريق المناسب قبل الانطلاق. بعد
   حجز المندوب تختفي البطاقة — الملاحة حينها مسؤولية المندوب
   من شاشته (مبدأ المصدر الواحد — لا ازدواج خصوصية). */

function CustomerLocationCard({
  orderId,
  distanceDisplay,
}: {
  orderId: number;
  distanceDisplay: string | null;
}) {
  const { data: order, isLoading, isError } = useOwnerOrderCustomerView(orderId);

  const copyAddress = async () => {
    if (!order?.delivery_address) return;
    haptic("light");
    try {
      await navigator.clipboard.writeText(order.delivery_address);
      toast({ title: "تم نسخ عنوان العميل" });
    } catch {
      toast({
        title: "انسخ العنوان يدوياً",
        description: order.delivery_address,
      });
    }
  };

  if (isLoading) {
    return (
      <section
        aria-label="جارٍ جلب موقع العميل"
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
      >
        <Skeleton className="h-6 w-40 rounded-xl" />
        <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
        <Skeleton className="mt-2 h-11 w-full rounded-2xl" />
      </section>
    );
  }

  /* بطاقة تحسينية — فشلها لا يعطّل الصفحة (شريط الحالة الأساسي كافٍ) */
  if (isError || !order) return null;

  const hasCoords = order.delivery_lat != null && order.delivery_lng != null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-label="موقع العميل للتوصيل الذاتي"
      className="rounded-3xl border-2 border-accent/35 bg-accent/[0.04] p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent-ink">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-foreground">
              موقع العميل — إن اخترت التوصيل الذاتي
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {order.customer_name ?? "عميل"} ·{" "}
              {distanceDisplay ?? "المسافة ضمن سطر التسعير"}
            </p>
          </div>
        </div>
      </div>

      {/* هاتف العميل — نقر كبير = اتصال مباشر */}
      {order.customer_phone && (
        <Button
          asChild
          size="lg"
          variant="outline"
          className="mt-4 h-14 w-full gap-3 rounded-2xl font-black native-tap"
        >
          <a
            href={`tel:${order.customer_phone}`}
            dir="ltr"
            onClick={() => haptic("light")}
            aria-label={`اتصال بالعميل ${order.customer_phone}`}
          >
            <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
            {order.customer_phone}
          </a>
        </Button>
      )}

      {/* العنوان النصي */}
      {order.delivery_address && (
        <div className="mt-3 rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground">
            عنوان التوصيل
          </p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-foreground">
            {order.delivery_address}
          </p>
          {order.address_imprecise && (
            <p
              role="note"
              className="mt-2 flex items-start gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-accent-ink"
            >
              <MessageSquareWarning
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              العميل وصف عنوانه تقريبياً — اتصل به قبل الانطلاق لضبط
              الاتجاه
            </p>
          )}
          {order.notes && (
            <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
              ملاحظة العميل: {order.notes}
            </p>
          )}
        </div>
      )}

      {/* الملاحة الخارجية (توجيه المالك — لا خريطة داخل المنصة) */}
      {hasCoords ? (
        <OpenInMapsButton
          lat={order.delivery_lat!}
          lng={order.delivery_lng!}
          label={order.delivery_address ?? order.customer_name ?? "العميل"}
          mode="navigate"
          className="mt-3 h-12 w-full gap-2 rounded-2xl font-black"
          aria-label="فتح الملاحة نحو موقع العميل في تطبيق الخرائط"
        >
          <MapPin className="h-4.5 w-4.5" aria-hidden="true" />
          الملاحة إلى موقع العميل
        </OpenInMapsButton>
      ) : (
        order.delivery_address && (
          <Button
            variant="outline"
            onClick={copyAddress}
            className="mt-3 h-12 w-full gap-2 rounded-2xl font-bold native-tap"
          >
            <Copy className="h-4.5 w-4.5" aria-hidden="true" />
            نسخ عنوان العميل
          </Button>
        )
      )}

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        تظهر هذه البطاقة قبل حجز المندوب فقط — بعد الحجز يتولى المندوب
        الملاحة من شاشته
      </p>
    </motion.section>
  );
}

/* ─── جسم البطاقة ───────────────────────────────────── */

function TaskBody({ task, isActive }: { task: OwnerTaskCard; isActive: boolean }) {
  const handover = useOwnerHandover();
  const problemDecision = useOwnerProblemDecision();
  const taskAction = useOwnerTaskAction();
  const rating = useOwnerCourierRating();

  /* حوارات الإجراءات */
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { kind: "handover" }
    | { kind: "action"; action: string; title: string; hint: string }
    | { kind: "decision"; decision: string; title: string }
  >(null);
  const [reason, setReason] = useState("");

  /* نموذج التقييم */
  const [ratingOpen, setRatingOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [care, setCare] = useState(0);
  const [conduct, setConduct] = useState(0);
  const [comment, setComment] = useState("");

  const isProblem = task.status === "problem";
  const isCompleted = task.status === "completed";
  const handoverPending = task.status === "at_store" && !task.picked_up_at;

  const busy =
    handover.isPending ||
    problemDecision.isPending ||
    taskAction.isPending ||
    rating.isPending;

  const runHandover = () => {
    haptic("success");
    handover.mutateHandover(
      { taskId: task.task_id, confirmed: true },
      {
        onSuccess: () => {
          setConfirmAction(null);
          toast({ title: "تم تأكيد تسليم الطلب للمندوب" });
        },
      },
    );
  };

  const runAction = (action: string) => {
    haptic("light");
    taskAction.mutate(
      {
        taskId: task.task_id,
        action: action as
          | "cancel_before_assignment"
          | "cancel_after_assignment"
          | "recall"
          | "self_delivery",
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setReason("");
          toast({ title: "نُفّذ الإجراء" });
        },
      },
    );
  };

  const runDecision = (decision: string) => {
    haptic("light");
    problemDecision.mutate(
      {
        taskId: task.task_id,
        decision: decision as
          | "wait"
          | "cancel_customer"
          | "cancel_compensate"
          | "force_complete",
        reason: reason.trim() || null,
      },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setReason("");
          toast({ title: "نُفّذ القرار على المشكلة" });
        },
      },
    );
  };

  const submitRating = () => {
    if (stars < 1) return;
    haptic("success");
    rating.mutate(
      {
        task_id: task.task_id,
        stars,
        timeliness: timeliness || null,
        care: care || null,
        conduct: conduct || null,
        comment: comment.trim() || null,
      },
      { onSuccess: () => setRatingOpen(false) },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* شريط الحالة الحرفي */}
      <section
        aria-label="حالة المهمة"
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "rounded-2xl border px-4 py-2 text-sm font-black",
              STATUS_TONE[task.status] ?? "bg-muted text-foreground border-border",
            )}
            aria-live="polite"
          >
            {isActive && (
              <Loader2
                className="me-1.5 inline h-4 w-4 animate-spin align-[-2px]"
                aria-hidden="true"
              />
            )}
            {task.status_ar}
          </span>
          <span className="text-xs font-bold text-muted-foreground" dir="ltr">
            #{task.task_id}
          </span>
        </div>

        {/* التسعير الحرفي */}
        <div className="mt-4 space-y-2">
          {task.fee != null && (
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Banknote className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                أجرة المندوب
              </span>
              <span className="text-lg font-black text-primary">
                {formatCurrency(task.fee)}
              </span>
            </div>
          )}
          {task.breakdown && (
            <p
              dir="rtl"
              className="rounded-xl bg-muted/60 px-3 py-2 text-center text-xs font-bold text-muted-foreground"
            >
              {task.breakdown}
              {task.distance_display ? ` · ${task.distance_display}` : ""}
            </p>
          )}
        </div>

        {/* الأزمنة */}
        {(task.reserved_at || task.picked_up_at || task.completed_at) && (
          <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-3">
            {task.reserved_at && (
              <li className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                حجز: {formatDate(task.reserved_at)}
              </li>
            )}
            {task.picked_up_at && (
              <li className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                استلام: {formatDate(task.picked_up_at)}
              </li>
            )}
            {task.completed_at && (
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                إتمام: {formatDate(task.completed_at)}
              </li>
            )}
          </ul>
        )}
        {task.delivery_duration_minutes != null && (
          <p
            role="status"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-success/10 px-3.5 py-1.5 text-xs font-bold text-success"
          >
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            مدة التوصيل: {task.delivery_duration_minutes} دقيقة
          </p>
        )}
      </section>

      {/* موقع العميل — قبل حجز المندوب حصراً (قرار التوصيل الذاتي) */}
      {isActive && task.courier == null && (
        <CustomerLocationCard
          orderId={task.order_id}
          distanceDisplay={task.distance_display}
        />
      )}

      {/* ملف المندوب العام */}
      {task.courier && (
        <section
          aria-label="ملف المندوب"
          className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
        >
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <UserRound className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            المندوب المكلّف
          </h2>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
              {(task.courier.public_name ?? "م").charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-base font-black text-foreground">
                {task.courier.public_name}
                {task.courier.verified_badge && (
                  <BadgeCheck
                    className="h-4.5 w-4.5 text-primary"
                    aria-label="مندوب موثّق"
                  />
                )}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                  {task.courier.level_ar}
                </span>
                <span>· {task.courier.completed_tasks} مهمة مكتملة</span>
                <span>· انضمّ {task.courier.joined_year}</span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-foreground">
                <Star className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
                {task.courier.avg_rating != null
                  ? `${task.courier.avg_rating.toFixed(1)} (${task.courier.rating_count} تقييم)`
                  : "أول مهامه — لا تقييمات بعد"}
              </p>
            </div>
          </div>
          {/* ملاحظة الخصوصية: لا رقم هاتف للمندوب — التواصل عبر المنصة */}
          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            بيانات المندوب عامة حصراً (الاسم المختصر + المستوى + التقييم) —
            لا يُعرض رقمه لأي طرف حفاظاً على الخصوصية
          </p>
        </section>
      )}

      {/* الزر الذهبي: تسليم الطلب للمندوب عند المتجر */}
      {handoverPending && (
        <section
          aria-label="تسليم الطلب للمندوب"
          className="rounded-3xl border-2 border-primary/35 bg-primary/[0.05] p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Handshake className="h-5 w-5 text-primary" aria-hidden="true" />
            المندوب عند متجرك — سلّمه الطلب
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            تأكيدك يفتح للمندوب خطوة «استلمت الطلب» — بدونه لا يمكنه
            استلام الطلب من المتجر (أو يرفع صورة وصل الاستلام بديلاً).
          </p>
          <Button
            size="lg"
            onClick={() => setConfirmAction({ kind: "handover" })}
            disabled={busy}
            className="mt-4 h-14 w-full gap-3 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
            aria-label="تأكيد تسليم الطلب للمندوب"
          >
            {handover.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <Handshake className="h-6 w-6" aria-hidden="true" />
            )}
            {handover.isPending ? "جارٍ التأكيد…" : "سلّمت الطلب للمندوب"}
          </Button>
        </section>
      )}

      {/* قرار المشكلة — المالك صاحب القرار */}
      {isProblem && (
        <section
          aria-label="قرار مشكلة التسليم"
          className="rounded-3xl border-2 border-destructive/30 bg-destructive/[0.04] p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <MessageSquareWarning className="h-5 w-5 text-destructive" aria-hidden="true" />
            مشكلة تسليم — القرار لك
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            أبلغ المندوب عن مشكلة في التسليم. اطّلع على تفاصيلها واتخذ
            القرار المناسب — الأزرار المتاحة من الخادم حصراً.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {task.owner_actions.includes("wait") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({ kind: "decision", decision: "wait", title: "انتظار" })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl font-bold native-tap"
              >
                <Clock className="h-4.5 w-4.5" aria-hidden="true" />
                انتظار — أمهل المندوب
              </Button>
            )}
            {task.owner_actions.includes("cancel_customer") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "decision",
                    decision: "cancel_customer",
                    title: "إلغاء من طرف العميل",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
              >
                <Ban className="h-4.5 w-4.5" aria-hidden="true" />
                إلغاء من طرف العميل
              </Button>
            )}
            {task.owner_actions.includes("cancel_compensate") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "decision",
                    decision: "cancel_compensate",
                    title: "إلغاء بتعويض المندوب",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
              >
                <Banknote className="h-4.5 w-4.5" aria-hidden="true" />
                إلغاء بتعويض المندوب
              </Button>
            )}
            {task.owner_actions.includes("force_complete") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "decision",
                    decision: "force_complete",
                    title: "تسليم تجاوزي",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl border-success/40 font-bold text-success native-tap"
              >
                <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
                تسليم تجاوزي
              </Button>
            )}
          </div>
        </section>
      )}

      {/* إجراءات المهمة العامة (حسب owner_actions حرفياً) */}
      {isActive && !isProblem && !handoverPending && task.owner_actions.length > 0 && (
        <section
          aria-label="إجراءات المهمة"
          className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
        >
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Wrench className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
            إجراءات متاحة
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {task.owner_actions.includes("recall") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "action",
                    action: "recall",
                    title: "إعادة نداء",
                    hint: "يُطلق موجة نداء جديدة للمناديب المتاحين حول متجرك",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl font-bold native-tap"
              >
                <RefreshCw className="h-4.5 w-4.5" aria-hidden="true" />
                إعادة النداء
              </Button>
            )}
            {task.owner_actions.includes("self_delivery") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "action",
                    action: "self_delivery",
                    title: "توصيل ذاتي",
                    hint: "تتكفل أنت بتوصيل الطلب وتُغلق مهمة المندوب",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl font-bold native-tap"
              >
                <Truck className="h-4.5 w-4.5" aria-hidden="true" />
                توصيل ذاتي
              </Button>
            )}
            {task.owner_actions.includes("cancel_before_assignment") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "action",
                    action: "cancel_before_assignment",
                    title: "إلغاء قبل الإسناد",
                    hint: "لم يُسند الطلب لمندوب بعد — الإلغاء بلا تعويض",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
              >
                <Ban className="h-4.5 w-4.5" aria-hidden="true" />
                إلغاء قبل الإسناد
              </Button>
            )}
            {task.owner_actions.includes("cancel_after_assignment") && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  setConfirmAction({
                    kind: "action",
                    action: "cancel_after_assignment",
                    title: "إلغاء بعد الحجز",
                    hint: "يخضع لتعويض المنشأة وفق قواعد الإلغاء بعد الحجز",
                  })
                }
                disabled={busy}
                className="h-12 gap-2 rounded-2xl border-destructive/40 font-bold text-destructive native-tap"
              >
                <Ban className="h-4.5 w-4.5" aria-hidden="true" />
                إلغاء بعد الحجز
              </Button>
            )}
          </div>
        </section>
      )}

      {/* المهمة مكتملة — تقييم المندوب */}
      {isCompleted && (
        <section
          aria-label="تقييم المندوب"
          className="rounded-3xl border border-success/30 bg-success/[0.04] p-5"
        >
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-2 text-sm font-black text-foreground">{task.status_ar}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              شارك تجربتك مع المندوب — تقييمك يرفع جودة أسطول توفير
            </p>
            <Button
              size="lg"
              onClick={() => {
                haptic("light");
                setRatingOpen(true);
              }}
              disabled={busy}
              className="mt-4 h-12 w-full gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap sm:w-auto sm:px-8"
              aria-label="فتح نموذج تقييم المندوب"
            >
              <Star className="h-5 w-5" aria-hidden="true" />
              قيّم المندوب
            </Button>
          </div>
        </section>
      )}

      {/* زر العودة عند إغلاق المهمة */}
      {!isActive && (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 w-full gap-2 rounded-2xl font-bold"
        >
          <Link href="/owner">
            <ArrowRight className="h-4.5 w-4.5 rtl:rotate-180" aria-hidden="true" />
            العودة إلى لوحة المتجر
          </Link>
        </Button>
      )}

      {/* ═══ حوار تأكيد الإجراءات ═══ */}
      <Dialog open={confirmAction != null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black">
              {confirmAction?.kind === "handover"
                ? "تأكيد تسليم الطلب"
                : confirmAction?.kind === "action"
                  ? confirmAction.title
                  : confirmAction?.kind === "decision"
                    ? confirmAction.title
                    : ""}
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {confirmAction?.kind === "handover"
                ? "أكّد فقط بعد وضع الطلب بيد المندوب فعلياً"
                : confirmAction?.kind === "action"
                  ? confirmAction.hint
                  : confirmAction?.kind === "decision"
                    ? "يمكنك إرفاق سبب يوثّق قرارك (اختياري — 300 حرفاً كحد أقصى)"
                    : ""}
            </DialogDescription>
          </DialogHeader>

          {confirmAction?.kind !== "handover" && (
            <div className="space-y-2">
              <Label htmlFor="task-reason">السبب (اختياري)</Label>
              <Textarea
                id="task-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 300))}
                placeholder="سبب موجز يوثّق القرار…"
                className="min-h-20 resize-none rounded-xl"
                rows={2}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className="h-12 flex-1 rounded-2xl native-tap"
            >
              تراجع
            </Button>
            <Button
              onClick={() => {
                if (confirmAction?.kind === "handover") runHandover();
                else if (confirmAction?.kind === "action") runAction(confirmAction.action);
                else if (confirmAction?.kind === "decision") runDecision(confirmAction.decision);
              }}
              disabled={busy}
              className={cn(
                "h-12 flex-1 gap-2 rounded-2xl font-black native-tap",
                confirmAction?.kind === "decision" ||
                  (confirmAction?.kind === "action" &&
                    confirmAction.action.startsWith("cancel"))
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {busy && <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />}
              تنفيذ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار تقييم المندوب ═══ */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base font-black">
              تقييم المندوب — {task.courier?.public_name ?? "المندوب"}
            </DialogTitle>
            <DialogDescription className="text-center">
              النجوم العامة إلزامية · المحاور الفرعية اختيارية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <StarRow label="التقييم العام" value={stars} onChange={setStars} required />
            <StarRow label="الالتزام بالوقت" value={timeliness} onChange={setTimeliness} />
            <StarRow label="سلامة الطلب" value={care} onChange={setCare} />
            <StarRow label="التعامل" value={conduct} onChange={setConduct} />
            <div className="space-y-2">
              <Label htmlFor="rating-comment">تعليق (اختياري)</Label>
              <Textarea
                id="rating-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 300))}
                placeholder="تجربتك مع المندوب في هذه المهمة…"
                className="min-h-20 resize-none rounded-xl"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRatingOpen(false)}
              className="h-12 flex-1 rounded-2xl native-tap"
            >
              لاحقاً
            </Button>
            <Button
              onClick={submitRating}
              disabled={stars < 1 || rating.isPending}
              className="h-12 flex-1 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              {rating.isPending && (
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              )}
              إرسال التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ─── صف نجوم قابل للنقر ─────────────────────────────── */

function StarRow({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="flex items-center gap-1 text-xs font-bold">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <div className="flex flex-row-reverse gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} من 5`}
            onClick={() => {
              haptic("tick");
              onChange(value === n ? 0 : n);
            }}
            className="native-tap p-1"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                n <= value ? "fill-accent-ink text-accent-ink" : "text-muted-foreground/40",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
