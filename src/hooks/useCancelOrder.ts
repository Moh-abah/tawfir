"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services/order.service";
import { useToast } from "@/hooks/use-toast";
import type { OrderOut } from "@/types/api.generated";

/**
 * إلغاء طلبي — POST /orders/{id}/cancel (pending فقط).
 * أخطاء الخادم تصل كما هي (عربية):
 * - 409 «لا يمكن إلغاء طلب بدأ تحضيره»
 * - 403 «لا تملك صلاحية إلغاء هذا الطلب»
 */
export function useCancelOrder(orderId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => orderService.cancelOrder(orderId),
    onSuccess: (order: OrderOut) => {
      // تحديث كاش التفاصيل فوراً — شريط التتبّع يعاد رسمه بحالة «ملغى»
      queryClient.setQueryData(["order-detail", orderId], order);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      toast({
        title: "تم إلغاء الطلب",
        description: `أُلغي الطلب #${order.id} واستُرجعت الكميات للمخزون`,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "تعذّر إلغاء الطلب",
        description: e.message,
        variant: "destructive",
      });
    },
  });
}
