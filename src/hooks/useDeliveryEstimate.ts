"use client";

/**
 * useDeliveryEstimate — التسعير الحي عند طلب العميل (§6-3).
 * يستعلم GET /orders/delivery-estimate عند تحرك المسمار (debounce 700ms)
 * — سطر التسعير «يتحرك مع المسمار». التقدير استرشادي (§7-9): الرقم
 * النهائي يُقرأ من رد إنشاء الطلب.
 */

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { orderService } from "@/services/order.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";

export function useDeliveryEstimate(
  facilityId: number | null | undefined,
  lat: number | null,
  lng: number | null,
) {
  const hydrated = useCustomerAuthStore((s) => s.hydrated);
  const hasToken = useCustomerAuthStore((s) => Boolean(s.accessToken));

  const dLat = useDebounce(lat ?? 0, 700);
  const dLng = useDebounce(lng ?? 0, 700);
  const ready =
    facilityId != null && facilityId > 0 && lat != null && lng != null && hasToken;

  return useQuery({
    queryKey: ["delivery-estimate", facilityId, dLat.toFixed(5), dLng.toFixed(5)],
    queryFn: () => orderService.deliveryEstimate(facilityId!, lat!, lng!),
    enabled: ready && hydrated,
    staleTime: 30 * 1000,
    retry: 1,
    /* رد أول سريع عند تحريك المسمار — إبقاء القديم ظاهراً أثناء التحديث */
    placeholderData: (prev) => prev,
  });
}
