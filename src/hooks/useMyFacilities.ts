"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type { Facility } from "@/types/api.generated";

export function useMyFacilities() {
  return useQuery<Facility[]>({
    queryKey: ["my-facilities"],
    queryFn: () => ownerService.getMyFacilities(),
    staleTime: 30_000,
  });
}
