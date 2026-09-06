"use client";

import { useEffect } from "react";
import { apiClient } from "@/services/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

/**
 * Hook لتسجيل زيارة صفحة متجر — الجولة 21 (webDevReview #11).
 *
 * يُرسل POST /facilities/{id}/view مرة واحدة عند فتح الصفحة.
 * Best-effort: لا يفشل الصفحة لو فشل التسجيل.
 * يُجلب user_id من auth (إن وُجد) لإحصائيات أدق.
 */
export function useFacilityView(facilityId: number | null) {
  const { accessToken, hydrated } = useCustomerAuth();

  useEffect(() => {
    if (facilityId == null || facilityId <= 0) return;
    // انتظر hydration قبل إرسال user_id
    if (!hydrated) return;

    let cancelled = false;
    const recordView = async () => {
      try {
        // استخراج user_id من JWT token (payload) إن وُجد
        let userId: number | undefined;
        if (accessToken) {
          try {
            const payload = JSON.parse(
              atob(accessToken.split(".")[1]),
            ) as { sub?: string };
            userId = payload.sub ? Number(payload.sub) : undefined;
          } catch {
            /* token غير صالح — تجاهل */
          }
        }
        await apiClient.post(`/facilities/${facilityId}/view`, {
          user_id: userId ?? null,
        });
      } catch {
        /* best-effort — لا يهم إن فشل */
      }
    };
    if (!cancelled) void recordView();
    return () => {
      cancelled = true;
    };
  }, [facilityId, hydrated, accessToken]);
}
