/**
 * خدمة إحصائيات المالك — الجولة 3.
 *
 * GET /owner/{facility_id}/stats → OwnerStatsOut (عدّادات + رسم 7 أيام + آخر الطلبات + top products)
 */
import { ownerApiClient } from "./owner-api-client";
import type { OwnerStatsOut } from "@/types/api.generated";

export const ownerStatsService = {
  getStats: (facilityId: number) =>
    ownerApiClient.get<OwnerStatsOut>(`/owner/${facilityId}/stats`),
};
