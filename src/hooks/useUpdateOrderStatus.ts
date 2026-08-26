"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type { OrderOut } from "@/types/api.generated";
import type { OwnerApiError } from "@/services/owner-api-client";
import { toast } from "@/hooks/use-toast";

/**
 * PATCH /orders/{id}/status — تحديث حالة طلب (مالك/مشرف).
 * التسلسل المسموح: pending → confirmed → preparing → out_for_delivery → delivered
 * أو pending → cancelled.
 */
export function useUpdateOrderStatus(facilityId?: number) {
  const queryClient = useQueryClient();
  return useMutation<
    OrderOut,
    OwnerApiError,
    { orderId: number; status: string }
  >({
    mutationFn: ({ orderId, status }) =>
      ownerService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders", facilityId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast({ title: "تم", description: "تم تحديث حالة الطلب" });
    },
    onError: (err) => {
      toast({
        title: "خطأ",
        description: err.message || "تعذّر تحديث الحالة",
        variant: "destructive",
      });
    },
  });
}
