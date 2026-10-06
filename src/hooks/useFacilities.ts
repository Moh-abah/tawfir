"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Facility } from "@/types/api.generated";
import { useRegionStore } from "@/store/region.store";
import { useMarketStore, effectiveCountryCode } from "@/store/market.store";

/**
 * متاجر المنطقة المختارة.
 * v5 — الفصل الحقيقي للسوقين: country_code إلزامي في الاستعلام من سوق
 * الجلسة الفعال — لا قائمة متاجر بلا فلتر سوق (القاعدة البرونزية).
 * قبل معرفة السوق (أول تشغيل خلف البوابة) الاستعلام معطَّل كلياً.
 */
export function useFacilities() {
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const market = useMarketStore((s) => s.market);
  const countryCode = effectiveCountryCode(market);

  return useQuery({
    queryKey: ["facilities", selectedRegionId, countryCode],
    queryFn: () => {
      const base = `/facilities?region_id=${selectedRegionId}`;
      const url = countryCode ? `${base}&country_code=${countryCode}` : base;
      return apiClient.get<Facility[]>(url);
    },
    enabled: !!selectedRegionId && countryCode != null,
    staleTime: 60 * 1000,
  });
}
