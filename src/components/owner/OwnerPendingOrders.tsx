"use client";

import Link from "next/link";
import { Check, Hourglass, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useOwnerOrders } from "@/hooks/useOwnerOrders";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { OrderListOut } from "@/types/api.generated";

/**
 * الطلبات الجديدة — آخر 3 طلبات pending — الجولة 9 (المهمة 8)
 *
 * - يستهلك useOwnerOrders(facilityId, "pending")
 * - يعرض آخر 3 طلبات معلّقة كروت سريعة
 * - زر «تأكيد» مباشر من الكارت (pending → confirmed)
 * - auto-refresh كل 30s عبر staleTime في useOwnerOrders (20s) — يكفي
 * - عند انعدام الطلبات: رسالة موجزة + لينك لكل الطلبات
 */
export interface OwnerPendingOrdersProps {
  facilityId: number;
  className?: string;
}

export function OwnerPendingOrders({ facilityId, className }: OwnerPendingOrdersProps) {
  const prefersReduced = useReducedMotion();
  const { data, isLoading, isError } = useOwnerOrders(facilityId, "pending");
  const statusMutation = useUpdateOrderStatus(facilityId);

  // الأحدث أولاً + آخر 3 فقط
  const pendingOrders: OrderListOut[] = (data?.items ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 3);

  const itemAnim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  const ordersHref = `/owner/facilities/${facilityId}/orders`;

  return (
    <section
      className={cn("space-y-3", className)}
      aria-labelledby="pending-orders-title"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <h2 id="pending-orders-title" className="text-sm font-bold">
            الطلبات الجديدة
          </h2>
        </div>
        <Link
          href={ordersHref}
          className="native-tap inline-flex h-9 min-h-[44px] items-center gap-1 rounded-full px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <span>كل الطلبات</span>
          <ChevronLeft
            className="h-3.5 w-3.5 rtl:rotate-180"
            aria-hidden="true"
          />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
          role="alert"
        >
          تعذّر تحميل الطلبات الجديدة.
        </div>
      ) : pendingOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-center">
          <p className="text-sm font-medium text-foreground">لا طلبات معلّقة</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ستظهر الطلبات الجديدة من العملاء هنا فور استلامها.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence mode="popLayout">
            {pendingOrders.map((order) => (
              <motion.li
                key={order.id}
                variants={itemAnim}
                initial="initial"
                animate="animate"
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                layout={!prefersReduced}
              >
                <PendingOrderCard
                  order={order}
                  facilityId={facilityId}
                  onConfirm={() =>
                    statusMutation.mutate({
                      orderId: order.id,
                      status: "confirmed",
                    })
                  }
                  isConfirming={
                    statusMutation.isPending &&
                    statusMutation.variables?.orderId === order.id
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

/** بطاقة طلب واحد مع زر تأكيد مباشر. */
interface PendingOrderCardProps {
  order: OrderListOut;
  facilityId: number;
  onConfirm: () => void;
  isConfirming: boolean;
}

function PendingOrderCard({
  order,
  facilityId,
  onConfirm,
  isConfirming,
}: PendingOrderCardProps) {
  // نُحوّل لقائمة الطلبات (صفحة تفاصيل الطلب على مستوى المالك قد تُضاف لاحقاً)
  const ordersHref = `/owner/facilities/${facilityId}/orders`;

  return (
    <div className="rounded-2xl border border-amber-300/40 bg-card p-3 dark:border-amber-500/30">
      <div className="flex items-start gap-3">
        {/* رقم الطلب في دائرة */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
          #{order.id}
        </span>

        {/* العميل + الإجمالي — ينتقل لقائمة الطلبات */}
        <Link
          href={ordersHref}
          className="native-tap-card min-w-0 flex-1"
          aria-label={`الانتقال إلى طلبات المتجر — طلب رقم ${order.id}`}
        >
          <p className="truncate text-sm font-semibold text-foreground">
            {order.customer_name ?? "عميل غير مسجّل"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary">
              {formatCurrency(order.total)}
            </span>
            <Badge
              className="border-transparent bg-amber-100 text-amber-800 text-[10px] dark:bg-amber-500/15 dark:text-amber-300"
            >
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </div>
        </Link>

        {/* زر التأكيد المباشر */}
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isConfirming}
          className="native-tap h-11 min-h-[44px] shrink-0 gap-1.5 rounded-full bg-emerald-500 px-4 text-xs font-semibold text-white hover:bg-emerald-600"
          aria-label={`تأكيد الطلب رقم ${order.id}`}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {isConfirming ? "..." : "تأكيد"}
        </Button>
      </div>
    </div>
  );
}

/** Skeleton مطابق. */
export function OwnerPendingOrdersSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
