"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";

/** GET /owner/{facilityId}/orders — طلبات منشأتي (للمالك). */
export function useOwnerOrders(facilityId: number | null) {
  return useQuery({
    queryKey: ["owner-orders", facilityId],
    queryFn: () => ownerService.getOwnerOrders(facilityId as number),
    enabled: facilityId != null && facilityId > 0,
    staleTime: 20 * 1000,
  });
}
