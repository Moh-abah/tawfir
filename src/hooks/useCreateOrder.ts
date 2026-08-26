"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import type { OrderCreate, OrderOut } from "@/types/api.generated";
import type { CustomerApiError } from "@/services/customer-api-client";

/**
 * POST /orders — إنشاء طلب جديد.
 * الخصم يُطبّق آلياً في الخادم إن كان العميل عضواً مفعّلاً.
 * مسار المحفظة (payment_method=wallet) يُرجع 422 برسالة عربية.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation<OrderOut, CustomerApiError, OrderCreate>({
    mutationFn: (data) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}
