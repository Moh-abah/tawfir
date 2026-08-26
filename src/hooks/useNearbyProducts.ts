"use client";

import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/product.service";

/**
 * GET /products/nearby — الوجبات القريبة مرتبة بالمسافة.
 * مفعّل فقط عند توفّر إحداثيات صالحة.
 */
export function useNearbyProducts(
  lat: number | null,
  lng: number | null,
  radiusKm = 10,
  enabled = true
) {
  return useQuery({
    queryKey: ["products-nearby", lat, lng, radiusKm],
    queryFn: () => productService.getNearby(lat as number, lng as number, radiusKm),
    enabled: enabled && lat != null && lng != null,
    staleTime: 60 * 1000,
  });
}
