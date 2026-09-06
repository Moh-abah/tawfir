"use client";

import { useQuery } from "@tanstack/react-query";
import { kpisService, type AdminKpis } from "@/services/kpis.service";

/**
 * Hook لجلب KPIs للأدمن — الجولة 21.
 */
export function useAdminKpis() {
  return useQuery<AdminKpis>({
    queryKey: ["admin-kpis"],
    queryFn: () => kpisService.getKpis(),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
