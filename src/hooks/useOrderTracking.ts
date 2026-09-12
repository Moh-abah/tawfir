"use client";

/**
 * useOrderTracking — تتبع طلب العميل المنقَّح (GET /orders/{id}/tracking).
 * استطلاع 12ث للطلبات النشطة (delivered/cancelled = توقف) — بطاقة الحالة
 * المنقحة بلا أي بيان مندوب (الخصوصية من المصدر §6-1).
 */

import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";

const ACTIVE_STATUSES = new Set([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

export function useOrderTracking(
  orderId: number | null | undefined,
  baseStatus?: string,
) {
  const hydrated = useCustomerAuthStore((s) => s.hydrated);
  const hasToken = useCustomerAuthStore((s) => Boolean(s.accessToken));

  const status = baseStatus ?? "";
  const active = ACTIVE_STATUSES.has(status);

  return useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => orderService.trackOrder(orderId!),
    enabled: orderId != null && orderId > 0 && hydrated && hasToken,
    refetchInterval: active ? 12 * 1000 : false,
    staleTime: 0,
    retry: 1,
  });
}
