"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { regionService } from "@/services/region.service";
import { useRegionStore } from "@/store/region.store";

/**
 * Public regions list (header dropdown). Auto-selects the first region
 * when none is chosen, so the cards/facilities queries can fire.
 */
export function useRegions(isAdmin = false) {
  const setSelectedRegion = useRegionStore((s) => s.setSelectedRegion);
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);

  const query = useQuery({
    queryKey: ["regions", { isAdmin }],
    queryFn: () => regionService.getRegions(isAdmin),
    staleTime: 10 * 60 * 1000, // 10 minutes — quasi-static
  });

  // Auto-select first region (public list only, once data arrives)
  useEffect(() => {
    if (
      !isAdmin &&
      selectedRegionId === null &&
      query.data &&
      query.data.length > 0
    ) {
      setSelectedRegion(query.data[0].id);
    }
  }, [query.data, selectedRegionId, setSelectedRegion, isAdmin]);

  return query;
}
