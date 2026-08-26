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
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "تم", description: "تم تحديث طلب العضوية" });
    },
    onError: (err) => {
      toast({
        title: "خطأ",
        description: err.message || "تعذّر تحديث الطلب",
        variant: "destructive",
      });
    },
  });
}
