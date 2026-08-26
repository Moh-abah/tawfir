"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import type { CustomerApiError } from "@/services/customer-api-client";

/**
 * GET /me — بيانات العميل الحقيقية وبطاقة عضويته.
 * مفتاح الاستعلام: ["me"] — مفعّل فقط عند وجود توكن عميل مُرطَّب.
 * لا يُعاد المحاولة عند 401 (انتهت الجلسة تُدار في العميل).
 */
export function useMe() {
  const hydrate = useCustomerAuthStore((s) => s.hydrate);
  const accessToken = useCustomerAuthStore((s) => s.accessToken);
  const hydrated = useCustomerAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return useQuery({
    queryKey: ["me"],
    queryFn: () => customerAuthService.getMe(),
    enabled: hydrated && !!accessToken,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      const apiErr = error as CustomerApiError;
      if (apiErr?.status === 401 || apiErr?.status === 403) return false;
      return failureCount < 1;
    },
  });
}

/** إبطال كاش بيانات العميل بعد التعديل */
export function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["me"] });
}
