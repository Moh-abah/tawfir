"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Facility, Region } from "@/types/api.generated";
import {
  useMarketStore,
  effectiveCountryCode,
} from "@/store/market.store";

/**
 * هوكات البحث الجغرافي المفلترة بالسوق — جولة v5 (الفصل الحقيقي)
 * ═════════════════════════════════════════════════════════════════
 * قاعدة برونزية: كل استعلام جغرافي يمر بفلتر country_code — لا
 * استدعاء لقوائم المناطق/المنشآت دونه، في أي كود جديد.
 *
 *  - useMarketFacility: جلب متجر عبر قائمة سوق الجلسة المفلترة
 *    (يُصلح الروابط المباشرة لمتاجر خارج المنطقة المختارة).
 *  - useCrossMarketFacility: إن لم يكن بسوق الجلسة → نبحث في قائمة
 *    السوق الآخر (مفلترة هي الأخرى) لنعرّف اسم المتجر وسوقه الحقيقي
 *    ونعرض حارس الواجهة بدل «غير موجود».
 *  - useMarketRegionsByCode: مناطق سوق صريح (966/967) — للنماذج
 *    التي تختار سوقاً مستقلاً عن جلسة التصفح (تسجيل المالك).
 *  - useAllMarketRegions: منطقتا السوقين معاً (كلاهما بفلتر) — لوسوم
 *    سوق المنشأة (علم + منطقة) في لوحات المالك/الأدمن.
 */

export type CountryCode = "966" | "967";

/** السوق الآخر لمفتاح بلد معطى. */
export function otherCountry(code: CountryCode): CountryCode {
  return code === "966" ? "967" : "966";
}

/** قائمة منشآت سوق الجلسة (بفلتر country_code إلزامي). */
export function useMarketFacility(facilityId: number | null) {
  const market = useMarketStore((s) => s.market);
  const countryCode = effectiveCountryCode(market);

  return useQuery({
    queryKey: ["facilities", "market-lookup", countryCode],
    queryFn: () =>
      apiClient.get<Facility[]>(`/facilities?country_code=${countryCode}`),
    enabled: facilityId != null && facilityId > 0 && countryCode != null,
    staleTime: 60 * 1000,
    select: (data) => data.find((f) => f.id === facilityId) ?? null,
  });
}

/** المتجر في السوق الآخر (يُفعَّل فقط عند عدم العثور في سوق الجلسة). */
export function useCrossMarketFacility(
  facilityId: number | null,
  enabled: boolean
) {
  const market = useMarketStore((s) => s.market);
  const countryCode = effectiveCountryCode(market);
  const other = countryCode != null ? otherCountry(countryCode) : null;

  return useQuery({
    queryKey: ["facilities", "cross-market-lookup", other],
    queryFn: () => apiClient.get<Facility[]>(`/facilities?country_code=${other}`),
    enabled: enabled && facilityId != null && facilityId > 0 && other != null,
    staleTime: 60 * 1000,
    select: (data) => data.find((f) => f.id === facilityId) ?? null,
  });
}

/** مناطق سوق صريح بمفتاح بلد (لنماذج تختار سوقاً بمعزل عن جلسة التصفح). */
export function useMarketRegionsByCode(
  countryCode: CountryCode | null | undefined
) {
  return useQuery({
    queryKey: ["regions", { explicit: countryCode }],
    queryFn: () =>
      apiClient.get<Region[]>(
        `/regions?country_code=${countryCode as string}`
      ),
    enabled: countryCode != null,
    staleTime: 10 * 60 * 1000,
  });
}

/** منطقتا السوقين معاً (كل استدعاء مفلتر بسوقه) — لوسوم سوق المنشأة. */
export function useAllMarketRegions() {
  const saudi = useMarketRegionsByCode("966");
  const yemen = useMarketRegionsByCode("967");
  return {
    /** خريطة معرف المنطقة → مفتاح بلدها (966/967). */
    countryCodeByRegionId: (() => {
      const map = new Map<number, CountryCode>();
      for (const r of saudi.data ?? []) map.set(r.id, "966");
      for (const r of yemen.data ?? []) map.set(r.id, "967");
      return map;
    })(),
    isLoading: saudi.isLoading || yemen.isLoading,
    regions: { saudi: saudi.data ?? [], yemen: yemen.data ?? [] },
  };
}

/** علم سوق منطقة معطاة (من الخريطة المحمّلة) — للوسوم السريعة. */
export function marketFlagForRegion(
  map: Map<number, CountryCode>,
  regionId: number | null | undefined
): string | null {
  if (regionId == null) return null;
  const cc = map.get(regionId);
  if (cc == null) return null;
  return cc === "966" ? "🇸🇦" : "🇾🇪";
}

/** اسم سوق منطقة معطاة — للوسوم النصية. */
export function marketNameForRegion(
  map: Map<number, CountryCode>,
  regionId: number | null | undefined
): string | null {
  if (regionId == null) return null;
  const cc = map.get(regionId);
  if (cc == null) return null;
  return cc === "966" ? "السعودية" : "اليمن";
}
