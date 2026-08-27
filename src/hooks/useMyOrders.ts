"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import type { OrderStatus } from "@/types/api.generated";

/** GET /orders — طلباتي (قائمة أخف، الأحدث أولاً).
 *  @param status فلترة اختيارية بالحالة
 *  @param search بحث من الخادم برقم الطلب (debounce من المستدعي)
 *  @param enabled تفعيل الاستعلام (افتراضي true — للتوافق الرجعي)؛
 *                 يُعطَّل للزوار في شريط التنقل السفلي لتفادي 401 عديم الفائدة */
export function useMyOrders(status?: OrderStatus, enabled = true, search?: string) {
  const hydrate = useCustomerAuthStore((s) => s.hydrate);
  const hydrated = useCustomerAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return useQuery({
    queryKey: ["my-orders", status ?? "all", search?.trim() ?? ""],
    queryFn: () => orderService.getMyOrders(status, search),
    enabled: enabled && hydrated,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
