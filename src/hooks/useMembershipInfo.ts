"use client";

import { useQuery } from "@tanstack/react-query";
import { membershipService } from "@/services/membership.service";

/** GET /membership/info — بيانات التحويل الثابتة قبل الاشتراك. */
export function useMembershipInfo() {
  return useQuery({
    queryKey: ["membership-info"],
    queryFn: () => membershipService.getInfo(),
    staleTime: 10 * 60 * 1000,
  });
}
