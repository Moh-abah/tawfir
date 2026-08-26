"use client";

import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";

/** GET /orders/{id} — تفاصيل طلب مع الأصناف. */
export function useOrderDetail(id: number | null) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => orderService.getOrder(id as number),
    enabled: id != null && id > 0,
    staleTime: 30 * 1000,
  });
}
