"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/services/api-client";
import { ownerApiClient } from "@/services/owner-api-client";
import type { MeOut } from "@/types/api.generated";

/**
 * GET /me — بيانات الحساب الحقيقية لبوابات المشرف/المالك — الجولة 5.
 *
 * البوابة تحدّد العميل المستخدم (وبالتالي التوكن):
 *  - "admin": apiClient (tawfir_admin_token)
 *  - "owner": ownerApiClient (tawfir_owner_token)
 *
 * لا يُعاد المحاولة عند 401/403 (الجلسة تُدار في حارس البوابة).
 */
export function useAccountMe(gateway: "admin" | "owner", enabled: boolean) {
  return useQuery<MeOut>({
    queryKey: ["account-me", gateway],
    queryFn: () =>
      gateway === "admin"
        ? apiClient.get<MeOut>("/me")
        : ownerApiClient.get<MeOut>("/me"),
    enabled,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      const status = error instanceof ApiError ? error.status : null;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
  });
}
