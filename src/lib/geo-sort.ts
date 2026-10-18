/**
 * فرز جغرافي بطبقات — «حولي ← منطقتي ← مدينتي» (الجولة 46).
 *
 * طلب المالك: قسم «الكل» والمتاجر والوفر يجب أن يعرض كل ما حوله وفي
 * منطقته وفي مدينته — الأولوية للأقرب ثم المنطقة ثم المدينة — **بدون أي
 * تغيير بنيوي**: نفس المكوّنات ونفس الاستعلامات، فرز العرض فقط.
 *
 * الأساس التقني:
 * - ProductWithFacilityOut.facility (FacilitySummaryOut) يحمل
 *   latitude/longitude/region_id → فرز عميلي حتمي للوجبات.
 * - FacilityOut يحمل latitude/longitude/region_id → فرز المتاجر.
 * - العروض الخاصة (SpecialOfferFacilityBrief) بلا إحداثيات → تُربط
 *   facility_id بمتاجر السوق (useMarketFacilities) قبل الفرز.
 *
 * مصدر الإحداثيات: جيو صامت — لا يطلب إذناً أبداً؛ يعمل فقط إذا كان
 * إذن الموقع ممنوحاً مسبقاً للمتصفح/التطبيق (نمط refineGuestMarketByGeo
 * في market.store) مع كاش جلسة قصير. بلا إحداثيات → فرز منطقة ثم سوق.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** مرجع المتجر الأدنى اللازم للفرز — يكفي في كل مصادر البيانات الثلاثة. */
export interface FacilityRef {
  latitude?: number | null;
  longitude?: number | null;
  region_id?: number | null;
}

/** نصف قطر طبقة «حولي» بالكيلومتر. */
export const NEAR_KM = 5;

const COORDS_CACHE_KEY = "tawfir_last_coords";
const COORDS_TTL_MS = 15 * 60 * 1000;

/** مسافة هافرساين بالكيلومتر بين نقطتين. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** قراءة إحداثيات كاش الجلسة (صالحة فقط داخل TTL). آمنة على SSR. */
export function readCachedCoords(): GeoPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COORDS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown; ts?: unknown };
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number" ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng)
    ) {
      return null;
    }
    if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > COORDS_TTL_MS) {
      return null;
    }
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

/**
 * جلب إحداثيات صامت — بلا أي طلب إذن أو نافذة منبثقة:
 * يعمل فقط عندما يكون إذن الموقع ممنوحاً مسبقاً (permissions state
 * === "granted")؛ وإلا ينسحب بصمت بـ null. النتيجة تُكاش في sessionStorage
 * حتى لا يتكرر الطلب داخل الجلسة.
 */
export async function fetchSilentCoords(): Promise<GeoPoint | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation ||
    !navigator.permissions?.query
  ) {
    return null;
  }
  try {
    const perm = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (perm.state !== "granted") return null;
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
        enableHighAccuracy: false,
      });
    });
    const pt: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    try {
      sessionStorage.setItem(
        COORDS_CACHE_KEY,
        JSON.stringify({ lat: pt.lat, lng: pt.lng, ts: Date.now() })
      );
    } catch {
      /* كاش ممتلئ/محجوب — الفرز يعمل بالمرة الحالية فقط */
    }
    return pt;
  } catch {
    /* رفض/انتهاء مهلة — صمت تام، الفرز يعمل بطبقة المنطقة */
    return null;
  }
}

/**
 * الفرز البطبقي:
 *
 * مع إحداثيات:
 *   tier 0 «حولي»     — المسافة ≤ NEAR_KM (أي منطقة) — فرز بالمسافة
 *   tier 1 «منطقتي»   — facility.region_id === المنطقة المختارة — بالمسافة
 *   tier 2 «مدينتي»   — باقي ذوي الإحداثيات في السوق — بالمسافة
 *   tier 3            — بلا إحداثيات (يُثبتون آخراً بترتيبهم الأصلي)
 *
 * بلا إحداثيات:
 *   tier 0 «منطقتي» ثم tier 1 باقي السوق — بترتيب الخادم الأصلي داخل الطبقة.
 *
 * الاستقرار: Array.sort مستقر في JS الحديثة، ونضيف الفهرس كسد أخير
 * لضمان نفس الترتيب بين المتساويين (لا رفرفة بين الرندرات).
 */
export function geoTierSort<T>(
  items: readonly T[],
  getFacility: (item: T) => FacilityRef | null | undefined,
  coords: GeoPoint | null,
  selectedRegionId: number | null | undefined
): T[] {
  const scored = items.map((item, index) => {
    const fac = getFacility(item);
    let distance: number | null = null;
    if (
      coords &&
      fac &&
      typeof fac.latitude === "number" &&
      typeof fac.longitude === "number"
    ) {
      distance = haversineKm(coords.lat, coords.lng, fac.latitude, fac.longitude);
    }
    const regionMatch =
      selectedRegionId != null && fac?.region_id === selectedRegionId;

    let tier: number;
    if (coords) {
      tier =
        distance != null && distance <= NEAR_KM
          ? 0 /* حولي */
          : regionMatch
            ? 1 /* منطقتي */
            : distance != null
              ? 2 /* مدينتي/السوق */
              : 3; /* بلا إحداثيات */
    } else {
      tier = regionMatch ? 0 : 1;
    }

    return { item, tier, distance, index };
  });

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const da = a.distance ?? Number.POSITIVE_INFINITY;
    const db = b.distance ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.index - b.index;
  });

  return scored.map((s) => s.item);
}
