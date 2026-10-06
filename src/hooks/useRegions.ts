"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { regionService } from "@/services/region.service";
import { useRegionStore } from "@/store/region.store";
import { useMarketStore, effectiveCountryCode } from "@/store/market.store";

/**
 * Public regions list (header dropdown). Auto-selects the first region
 * when none is chosen, so the cards/facilities queries can fire.
 *
 * v5 — الفصل الحقيقي للسوقين: القائمة إلزامية الفلترة بمفتاح بلد السوق
 * الفعال (966/967) — لا استعلام مناطق بلا فلتر سوق في الواجهة العامة
 * (القاعدة البرونزية). قبل معرفة السوق (أول تشغيل خلف البوابة) الاستعلام
 * معطَّل كلياً. الإدارة (isAdmin) الاستثناء الوحيد — ترى كل الأسواق.
 */
export function useRegions(isAdmin = false) {
  const setSelectedRegion = useRegionStore((s) => s.setSelectedRegion);
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const market = useMarketStore((s) => s.market);
  // الإدارة ترى كل المناطق دائماً — الفلترة للواجهة العامة فقط.
  const countryCode = isAdmin ? null : effectiveCountryCode(market);

  const query = useQuery({
    queryKey: ["regions", { isAdmin, countryCode }],
    queryFn: () => regionService.getRegions(isAdmin, countryCode),
    enabled: isAdmin || countryCode != null,
    staleTime: 10 * 60 * 1000, // 10 minutes — quasi-static
  });

  // Auto-select first region (public list only, once data arrives).
  // الجولة 10 — تحصين دفاعي: لو صار selectedRegionId قيمة غير صالحة
  // (0/undefined/معرّف منطقة محذوفة من الخادم) نُصحّحه تلقائياً لأول
  // منطقة بدل البقاء على قيمة تُفشل كل استعلامات المتاجر/البطاقات.
  useEffect(() => {
    if (!isAdmin && query.data && query.data.length > 0) {
      const isInvalid =
        selectedRegionId == null ||
        !query.data.some((r) => r.id === selectedRegionId);
      if (isInvalid) {
        setSelectedRegion(query.data[0].id);
      }
    }
  }, [query.data, selectedRegionId, setSelectedRegion, isAdmin]);

  return query;
}
