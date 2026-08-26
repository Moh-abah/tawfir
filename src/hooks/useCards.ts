"use client";

import { useQuery } from "@tanstack/react-query";
import { cardService } from "@/services/card.service";
import { useRegionStore } from "@/store/region.store";

export function useCards() {
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);

  return useQuery({
    queryKey: ["cards", selectedRegionId],
    queryFn: () => cardService.getPublicCards(selectedRegionId!),
    enabled: !!selectedRegionId, // fire only when a region is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
