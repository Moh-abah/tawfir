"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membershipService } from "@/services/membership.service";
import type { MembershipSubscribeOut } from "@/types/api.generated";
import type { CustomerApiError } from "@/services/customer-api-client";
import { savePendingMembershipRequest } from "@/lib/membership-local";

/**
 * POST /membership/subscribe (multipart) — رفع صورة التحويل.
 * استجابة 201: {detail, id, status:"pending"}.
 * تُخزَّن حالة الانتظار محلياً (انظر العملlog: العميل لا يستطيع استعلام حالته).
 */
export interface SubscribeInput {
  receiptImage: File;
  amount: number;
  transferAccountName: string;
  transferAccountNumber: string;
}

export function useSubscribeMembership() {
  const queryClient = useQueryClient();
  return useMutation<MembershipSubscribeOut, CustomerApiError, SubscribeInput>({
    mutationFn: (input) =>
      membershipService.subscribe(
        input.receiptImage,
        input.amount,
        input.transferAccountName,
        input.transferAccountNumber
      ),
    onSuccess: (data, input) => {
      savePendingMembershipRequest({
        id: data.id,
        amount: input.amount,
        created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
    },
  });
}
