"use client";

import { useQuery } from "@tanstack/react-query";
import { savingsService, type SavingsSummary } from "@/services/savings.service";

/**
 * Hook لسجل التوفير — الجولة 21.
 * يُجلب ملخص توفير المستخدم (شهري/سنوياً/إجمالي + ROI + قيمة العضوية).
 */
export function useSavingsSummary() {
  return useQuery<SavingsSummary>({
    queryKey: ["savings-summary"],
    queryFn: () => savingsService.getSummary(),
    staleTime: 60 * 1000,
  });
}
