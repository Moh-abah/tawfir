"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { MembershipRequestStatus } from "@/types/api.generated";

/**
 * GET /admin/membership-requests — قائمة طلبات العضوية مع فلترة بالحالة.
 * @param status  فلترة اختيارية بالحالة (pending/approved/rejected)
 * @param page    رقم الصفحة (افتراضي 1)
 * @param pageSize  حجم الصفحة (افتراضي 20)
 */
export function useAdminMembershipRequests(
  status?: MembershipRequestStatus | null,
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: ["admin-membership-requests", status ?? "all", page, pageSize],
    queryFn: () => adminService.getMembershipRequests(status, page, pageSize),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}
