"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Product } from "@/types/api.generated";

interface FacilityProductsFilters {
  category?: string;
  search?: string;
}

export function useFacilityProducts(
  facilityId: number,
  filters: FacilityProductsFilters = {}
) {
  const params = new URLSearchParams();
  params.set("only_available", "true");
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["facility-products", facilityId, filters],
    queryFn: () =>
      apiClient.get<Product[]>(`/facilities/${facilityId}/products?${params.toString()}`),
    enabled: !!facilityId,
    staleTime: 30 * 1000,
  });
}

export function useAllFacilityProducts(facilityId: number) {
  return useQuery({
    queryKey: ["facility-products", facilityId, { only_available: false }],
    queryFn: () =>
      apiClient.get<Product[]>(`/facilities/${facilityId}/products`),
    enabled: !!facilityId,
    staleTime: 30 * 1000,
  });
}
