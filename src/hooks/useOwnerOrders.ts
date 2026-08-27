"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";

/**
 * GET /owner/{facilityId}/orders — طلبات منشأتي (للمالك).
 * الجولة 5: فلترة الحالة تتم من الباك إند (كانت محلية على أول 20 طلباً).
 * الجولة الختامية: بحث من الخادم (search — رقم طلب أو اسم عميل، debounce من المستدعي).
 * status=null → كل الطلبات (تُستخدم للإحصائيات وشارات العدّادات).
 */
export function useOwnerOrders(
  facilityId: number | null,
  status?: string | null,
  search?: string
) {
  return useQuery({
    queryKey: ["owner-orders", facilityId, status ?? "all", search?.trim() ?? ""],
    queryFn: () =>
      ownerService.getOwnerOrders(facilityId as number, {
        status: status ?? null,
        search: search ?? null,
      }),
    enabled: facilityId != null && facilityId > 0,
    staleTime: 20 * 1000,
    placeholderData: (prev) => prev,
  });
}
