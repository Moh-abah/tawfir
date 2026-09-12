"use client";

/**
 * OwnerDeliveryWidgets — عناصر واجهة التوصيل لمالك المتجر.
 * ═══════════════════════════════════════════════════════════════════
 * • OwnerRadarCard — رادار المناديب حول المتجر (عدّاد فقط — الخادم
 *   لا يرسل أسماء/هواتف أصلاً: عدسة خصوصية من المصدر).
 * • RequestCourierButton — الزر الذهبي «طلب مندوب توصيل»:
 *   - إن وُجدت مهمة محفوظة محلياً لهذا الطلب → زر «بطاقة المهمة».
 *   - وإلا → POST /owner/orders/{oid}/request-courier ثم الانتقال
 *     لبطاقة المهمة الحية.
 *   الطلب مسموح حصراً للطلبات «مؤكد/قيد التحضير» (قيد الخادم).
 */

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bike, Loader2, PackageOpen, Radar, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useOwnerRadar,
  useRequestCourier,
  getOrderTask,
} from "@/hooks/useOwnerDelivery";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

/* ─── رادار المناديب ─────────────────────────────────── */

export function OwnerRadarCard({ facilityId }: { facilityId: number }) {
  const { data, isLoading } = useOwnerRadar(facilityId);

  if (isLoading && !data) {
    return (
      <div
        role="status"
        aria-label="جارٍ تحميل رادار المناديب"
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">جارٍ فحص المناديب حول متجرك…</p>
      </div>
    );
  }

  if (!data) return null;

  const hasCouriers = data.available_count > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4",
        hasCouriers
          ? "border-success/30 bg-success/[0.05]"
          : "border-border/60 bg-card",
      )}
    >
      <span
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          hasCouriers ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Radar className="h-5.5 w-5.5" aria-hidden="true" />
        {hasCouriers && (
          <span
            className="absolute inset-0 rounded-2xl bg-success/20 animate-ping"
            aria-hidden="true"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-foreground">{data.message}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          رادار المناديب — يُحدَّث تلقائياً كل ٣٠ ثانية حول موقع متجرك
        </p>
      </div>
      {hasCouriers && (
        <span className="flex items-center gap-1 rounded-full bg-success/15 px-3 py-1.5 text-xs font-black text-success">
          <Bike className="h-3.5 w-3.5" aria-hidden="true" />
          {data.available_count}
        </span>
      )}
    </div>
  );
}

/* ─── الزر الذهبي ────────────────────────────────────── */

const noopSubscribe = () => () => {};

export function RequestCourierButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const request = useRequestCourier();

  /* مهمة محفوظة محلياً لهذا الطلب؟ (SSR: null — بلا انعدام تطابق) */
  const knownTask = useSyncExternalStore(
    noopSubscribe,
    () => getOrderTask(orderId),
    () => null,
  );

  /* بطاقة مهمة موجودة → زر انتقال مباشر */
  if (knownTask != null) {
    return (
      <Button
        asChild
        size="lg"
        className="h-12 w-full gap-2 rounded-2xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 native-tap"
        aria-label={`فتح بطاقة مهمة التوصيل للطلب رقم ${orderId}`}
      >
        <a
          href={`/owner/tasks/${knownTask}`}
          onClick={() => haptic("light")}
        >
          <Truck className="h-5 w-5" aria-hidden="true" />
          بطاقة مهمة التوصيل
        </a>
      </Button>
    );
  }

  const busy = request.isPending && request.variables === orderId;

  return (
    <Button
      size="lg"
      onClick={() => {
        haptic("success");
        request.mutate(orderId, {
          onSuccess: (task) => {
            router.push(`/owner/tasks/${task.task_id}`);
          },
        });
      }}
      disabled={request.isPending}
      className="h-12 w-full gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
      aria-label={`طلب مندوب توصيل للطلب رقم ${orderId}`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <PackageOpen className="h-5 w-5" aria-hidden="true" />
      )}
      {busy ? "جارٍ فتح النداء…" : "طلب مندوب توصيل"}
    </Button>
  );
}
