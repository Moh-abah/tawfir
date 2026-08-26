"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";

export function useProductCategories(facilityId: number) {
  return useQuery({
    queryKey: ["product-categories", facilityId],
    queryFn: () =>
      apiClient.get<string[]>(`/facilities/${facilityId}/products/categories`),
    enabled: !!facilityId,
    staleTime: 60 * 1000,
  });
}
