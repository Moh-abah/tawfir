"use client";

import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import type { OrderOut, OrderStatus } from "@/types/api.generated";

/** الحالات النشطة — polling مستمر حتى تصل لحالة نهائية. */
const ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

/**
 * GET /orders/{id} — تفاصيل طلب مع الأصناف.
 *
 * الجولة 9 (المهمة 9.3) — تحديث لحظي ثلاثي:
 *  - staleTime = 0 → أي invalidate (من WS) يعكس التغيير فوراً على الشاشة
 *  - refetchInterval ديناميكي 15s للحالات النشطة فقط، يتوقف فوراً عند
 *    delivered/cancelled (لا استعلامات بلا داعٍ بعد اكتمال الطلب)
 *  - refetchOnReconnect + refetchOnMount صريحة — عند عودة الاتصال أو
 *    إعادة فتح الصفحة، يُجلب أحدث وضع من الخادم
 *
 * الاستخدام الفعلي:
 *  - WS يدفع إشعاراً (order_confirmed/preparing/...) → NotificationsProvider
 *    يلغي الاستعلام → تنعاش بيانات الطلب + يعاد رسم شريط التتبّع
 *  - polling احتياطي عند سكون WS أو انقطاع مؤقت
 *  - عند عودة الإنترنت (online) → window 'online' event listener في
 *    OrderDetailContent يستدعي refetch() فوراً
 */
export function useOrderDetail(id: number | null) {
  return useQuery({
    queryKey: ["order-detail", id],
    queryFn: () => orderService.getOrder(id as number),
    enabled: id != null && id > 0,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const data = query.state.data as OrderOut | undefined;
      const status = data?.status;
      if (status && ACTIVE_STATUSES.has(status)) {
        return 15_000; // 15 ثانية للحالات النشطة
      }
      return false; // توقف فوري بعد delivered/cancelled
    },
  });
}
