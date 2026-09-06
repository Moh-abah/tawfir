"use client";

import { useQuery } from "@tanstack/react-query";
import { ratingService } from "@/services/rating.service";

/**
 * Hook لجلب متوسط التقييم لمنتج/متجر (public, no auth).
 * يُستخدم لعرض النجوم على البطاقات.
 */
export function useRatingAggregate(
  type: "product" | "facility",
  id: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["rating-aggregate", type, id],
    queryFn: () => ratingService.getAggregate(type, id),
    staleTime: 5 * 60 * 1000, // 5 دقائق — التقييمات لا تتغير بسرعة
    enabled,
  });
}

/** Hook لجلب قائمة التقييمات لمنتج/متجر. */
export function useRatings(
  type: "product" | "facility",
  id: number,
  page = 1,
) {
  return useQuery({
    queryKey: ["ratings", type, id, page],
    queryFn: () => ratingService.list(type, id, page),
    staleTime: 60 * 1000,
  });
}
