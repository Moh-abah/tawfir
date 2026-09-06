"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSettingsService } from "@/services/settings.service";
import type { AdminFreeMembershipOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";
import { useToast } from "@/hooks/use-toast";

/**
 * PATCH /admin/settings/free-membership — تفعيل/تعطيل العضوية المجانية.
 *
 * عند النجاح: تُبطل كاش ["admin","settings","free-membership"] و
 * ["membership-info"] (لأن العملاء يحتاجون رؤية العلم المُحدَّث).
 * تُطلق toast نجاح/فشل تلقائياً.
 */
export function useSetFreeMembershipFlag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<AdminFreeMembershipOut, ApiError, boolean>({
    mutationFn: (enabled) => adminSettingsService.setFreeMembershipFlag(enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["admin", "settings", "free-membership"],
        data
      );
      queryClient.invalidateQueries({ queryKey: ["membership-info"] });
      toast({
        title: data.is_free_membership_enabled
          ? "تم تفعيل العضوية المجانية"
          : "تم تعطيل العضوية المجانية",
        description: data.is_free_membership_enabled
          ? "العملاء الجدد سيحصلون على عضوية مجانية فور تسجيلهم"
          : "العملاء الجدد سيدفعون رسوم الاشتراك العادية",
      });
    },
    onError: (error) => {
      toast({
        title: "تعذّر تحديث الإعداد",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
