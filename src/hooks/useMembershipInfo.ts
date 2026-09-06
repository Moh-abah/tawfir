"use client";

import { useQuery } from "@tanstack/react-query";
import { membershipService } from "@/services/membership.service";

/**
 * GET /membership/info — بيانات التحويل الثابتة قبل الاشتراك + علم العضوية
 * المجانية `is_free_membership_enabled` (الجولة 20).
 *
 * مفتاح الاستعلام: ["membership-info"]. عند تفعيل المشرف للعلم، تعرض
 * صفحة /membership/subscribe زر «احصل على عضويتك مجاناً» بدلاً من شاشة
 * الدفع + رفع الإيصال. يُبطل هذا المفتاح بعد PATCH /admin/settings/free-membership
 * (في useSetFreeMembershipFlag) ليرى العملاء الحالة المُحدّثة.
 */
export function useMembershipInfo() {
  return useQuery({
    queryKey: ["membership-info"],
    queryFn: () => membershipService.getInfo(),
    staleTime: 10 * 60 * 1000,
  });
}
