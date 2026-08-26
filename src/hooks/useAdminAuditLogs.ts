"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { AuditLog, Paginated } from "@/types/api.generated";

export function useAdminAuditLogs(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["admin", "audit", page, pageSize],
    queryFn: () => adminService.getAuditLogs(page, pageSize),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
