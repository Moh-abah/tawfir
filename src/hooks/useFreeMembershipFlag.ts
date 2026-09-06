"use client";

import { useQuery } from "@tanstack/react-query";
import { adminSettingsService } from "@/services/settings.service";

/**
 * GET /admin/settings/free-membership — قراءة علم العضوية المجانية.
 *
 * مفتاح الاستعلام: ["admin", "settings", "free-membership"].
 * مُفعّل فقط عند وجود توكن مشرف (يُمرَّر عبر `enabled`).
 * لا يُعاد المحاولة عند 401/403.
 */
export function useFreeMembershipFlag(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "settings", "free-membership"],
    queryFn: () => adminSettingsService.getFreeMembershipFlag(),
    enabled,
    staleTime: 30 * 1000,
    retry: (failureCount, error) => {
      const status =
        (error as { status?: number } | undefined)?.status ?? 0;
      if (status === 401 || status === 403) return false;
      return failureCount < 1;
    },
  });
}
