"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import type { OrderStatus } from "@/types/api.generated";

/** GET /orders — طلباتي (قائمة أخف، الأحدث أولاً).
 *  @param status فلترة اختيارية بالحالة
 *  @param enabled تفعيل الاستعلام (افتراضي true — للتوافق الرجعي)؛
 *                 يُعطَّل للزوار في شريط التنقل السفلي لتفادي 401 عديم الفائدة */
export function useMyOrders(status?: OrderStatus, enabled = true) {
  const hydrate = useCustomerAuthStore((s) => s.hydrate);
  const hydrated = useCustomerAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return useQuery({
    queryKey: ["my-orders", status ?? "all"],
    queryFn: () => orderService.getMyOrders(status),
    enabled: enabled && hydrated,
    staleTime: 30 * 1000,
  });
}
