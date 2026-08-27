"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";

/**
 * GET /owner/{facilityId}/orders — طلبات منشأتي (للمالك).
 * الجولة 5: فلترة الحالة تتم من الباك إند (كانت محلية على أول 20 طلباً).
 * status=null → كل الطلبات (تُستخدم للإحصائيات وشارات العدّادات).
 */
export function useOwnerOrders(
  facilityId: number | null,
  status?: string | null
) {
  return useQuery({
    queryKey: ["owner-orders", facilityId, status ?? "all"],
    queryFn: () =>
      ownerService.getOwnerOrders(facilityId as number, {
        status: status ?? null,
      }),
    enabled: facilityId != null && facilityId > 0,
    staleTime: 20 * 1000,
    placeholderData: (prev) => prev,
  });
}
