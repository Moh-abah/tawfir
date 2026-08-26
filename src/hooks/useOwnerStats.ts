"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerStatsService } from "@/services/owner-stats.service";

/** GET /owner/{fid}/stats — إحصائيات المالك (عدّادات + رسم + recent + top). */
export function useOwnerStats(facilityId: number | null) {
  return useQuery({
    queryKey: ["owner-stats", facilityId],
    queryFn: () => ownerStatsService.getStats(facilityId as number),
    enabled: facilityId != null,
    // تحديث دوري كل 60s للحفاظ على نبض الإحصائيات حياً
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
}
