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

  // Auto-select first region (public list only, once data arrives).
  // الجولة 10 — تحصين دفاعي: لو صار selectedRegionId قيمة غير صالحة
  // (0/undefined/معرّف منطقة محذوفة من الخادم) نُصحّحه تلقائياً لأول
  // منطقة بدل البقاء على قيمة تُفشل كل استعلامات المتاجر/البطاقات.
  useEffect(() => {
    if (!isAdmin && query.data && query.data.length > 0) {
      const isInvalid =
        selectedRegionId == null ||
        !query.data.some((r) => r.id === selectedRegionId);
      if (isInvalid) {
        setSelectedRegion(query.data[0].id);
      }
    }
  }, [query.data, selectedRegionId, setSelectedRegion, isAdmin]);

  return query;
}
