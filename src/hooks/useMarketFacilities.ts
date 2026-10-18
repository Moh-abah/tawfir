"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Facility } from "@/types/api.generated";
import { useMarketStore, effectiveCountryCode } from "@/store/market.store";

/**
 * متاجر السوق الفعال كاملة — بلا فلتر منطقة (الجولة 46).
 *
 * خلفية: useFacilities تُقيّد القائمة بالمنطقة المختارة حصراً، فكانت
 * الرئيسية تخفي متاجر/وجبات مدينة المستخدم إن كانت «المنطقة» المختارة
 * (تُختار تلقائياً = أول منطقة) غير مدينته. الباك إند يجعل region_id
 * اختيارياً في GET /facilities (OpenAPI) — فنجلب السوق كاملاً ونترك
 * الترتيب لفرز geoTierSort: حولي ← منطقتي ← مدينتي.
 *
 * الاستعلام مشترك (react-query) بين قسمي المتاجر والوفر في الرئيسية —
 * طلب واحد للسوق مهما استُخدم في عدة أقسام. باقي الصفحات (بحث/قائمة
 * المتاجر) ما زالت على useFacilities المنطقة-المحددة كما هي.
 */
export function useMarketFacilities() {
  const market = useMarketStore((s) => s.market);
  const countryCode = effectiveCountryCode(market);

  return useQuery({
    queryKey: ["facilities-market", countryCode],
    queryFn: () => {
      const url = countryCode
        ? `/facilities?country_code=${countryCode}`
        : "/facilities";
      return apiClient.get<Facility[]>(url);
    },
    enabled: countryCode != null,
    staleTime: 60 * 1000,
  });
}
