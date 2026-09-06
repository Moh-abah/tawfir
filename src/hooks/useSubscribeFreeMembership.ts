"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membershipService } from "@/services/membership.service";
import type { FreeMembershipSubscribeOut } from "@/types/api.generated";
import type { CustomerApiError } from "@/services/customer-api-client";

/**
 * POST /membership/subscribe-free — الحصول على عضوية مجانية فورية.
 *
 * يُستدعى من شاشة الاشتراك عند تفعيل المشرف للعلم
 * `is_free_membership_enabled`. لا يُرفع أي ملف ولا يُدفع أي مبلغ —
 * مجرد ضغطة زر تمنح العميل عضوية approved (is_free=true).
 *
 * بعد النجاح: نُبطل كاش ["me"] + ["membership-info"] ليظهر
 * رقم العضوية الجديد فوراً في البطاقة.
 *
 * أخطاء محتملة:
 *  - 409 «لديك عضوية نشطة بالفعل» (العميل عضو بالفعل)
 *  - 403 «العضوية المجانية غير مفعّلة» (المشرف أوقف العلم بعد آخر GET)
 *  - 401 «انتهت الجلسة» (يُدار تلقائياً في العميل)
 */
export function useSubscribeFreeMembership() {
  const queryClient = useQueryClient();
  return useMutation<FreeMembershipSubscribeOut, CustomerApiError, void>({
    mutationFn: () => membershipService.subscribeFree(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
    },
  });
}
