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

/**
 * GET /admin/orders/{id} — تفاصيل طلب واحد للمشرف.
 * الجولة 5: كان الحوار يستدعي بوابة العميل (GET /orders/{id} بلا توكن
 * مشرف → 401) — استُبدلت ببوابة المشرف الصحيحة.
 */
export function useAdminOrderDetail(id: number | null) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => adminService.getOrder(id as number),
    enabled: id != null && id > 0,
    staleTime: 30 * 1000,
  });
}
