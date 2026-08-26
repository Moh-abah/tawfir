"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Facility } from "@/types/api.generated";
import { useRegionStore } from "@/store/region.store";

export function useFacilities() {
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);

  return useQuery({
    queryKey: ["facilities", selectedRegionId],
    queryFn: () =>
      apiClient.get<Facility[]>(`/facilities?region_id=${selectedRegionId}`),
    enabled: !!selectedRegionId,
    staleTime: 60 * 1000,
  });
}
