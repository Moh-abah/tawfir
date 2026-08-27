"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { MembershipRequestOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";
import { toast } from "@/hooks/use-toast";

/**
 * PATCH /admin/membership-requests/{id}/approve | reject
 * موافقة/رفض طلب اشتراك العضوية بموافقة يدوية.
 */
export function useModerateMembershipRequest() {
  const queryClient = useQueryClient();
  return useMutation<
    MembershipRequestOut,
    ApiError,
    { id: number; action: "approve" | "reject"; reason?: string }
  >({
    mutationFn: async ({ id, action, reason }) => {
      if (action === "approve") return adminService.approveMembershipRequest(id);
      return adminService.rejectMembershipRequest(id, reason ?? "");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-membership-requests"] });
      // الجولة 6: كان المفتاح ["admin-dashboard"] بينما اللوحة تستخدم
      // ["admin", "dashboard"] — الإبطال لم يكن يصل أبداً.
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "تم", description: "تم تحديث طلب العضوية" });
    },
    onError: (err) => {
      // الجولة 6: رسائل الخادم الإنجليزية (Internal server error) تُستبدل
      // بعربية مفهومة — التفاصيل التقنية تبقى في الكونسول.
      const raw = err.message || "";
      const friendly = /internal server error|server error|5\d{2}/i.test(raw)
        ? "خطأ في الخادم أثناء تنفيذ العملية — حاول مرة أخرى"
        : raw || "تعذّر تحديث الطلب";
      toast({
        title: "خطأ",
        description: friendly,
        variant: "destructive",
      });
    },
  });
}
