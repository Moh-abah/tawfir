"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { OrderStatus } from "@/types/api.generated";

/** GET /admin/orders — كل الطلبات مع فلترة اختيارية. */
export function useAdminOrders(params: {
  status?: OrderStatus | null;
  customer_id?: number | null;
  facility_id?: number | null;
  page?: number;
  page_size?: number;
} = {}) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => adminService.getOrders(params),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
