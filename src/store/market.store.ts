"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MarketKey } from "@/services/locale.service";
import { useRegionStore } from "@/store/region.store";
import { toEnglishDigits } from "@/lib/yemen";

/** مفتاح السوق — يُصدَّر من هنا ليكون المصدر الموحد للمكوّنات. */
export type { MarketKey };

/**
 * مخزن السوق الوطني — جولة v6.1 (اكتشاف تلقائي كامل — صفر أعلام)
 * ═══════════════════════════════════════════════════════════════════
 * لا مبدّل أعلام ولا شاشات اختيار ولا أسئلة إطلاقاً — النظام يتعرف
 * على المستخدم ومكانه تلقائياً:
 *
 *   1. جلسة عميل (مسجّل) → GET /locale/me بياناته هي الحاسمة الكاملة
 *      — والخادم v3.1 يفرض سوق التوكن على كل القوائم إجباراً.
 *   2. زائر → استنباط صامت من إشارات بيئته الآن (inferGuestMarket:
 *      منطقة التوقيت/اللغة) ثم تنقية جغرافية صامتة إذا كان إذن الموقع
 *      ممنوحاً سابقاً (refineGuestMarketByGeo — بلا أي طلب إذن).
 *   3. التسجيل → بادئة رقم الجوال نفسها إشارة الحسم (5… سعودي /
 *      7… يمني — detectMarketFromPhone) فتتبنّاها النماذج صامتة.
 *   4. رأس الاستجابة X-Market (v3.1) → الحقيقة المفروضة فعلياً؛ إن
 *      خالفت حالة الواجهة تُتبنَّى فوراً (noteServerMarket).
 *
 * skipHydration: تُعاد الترطبة يدوياً بعد التركيب (نمط region.store)
 * حتى لا يختلف أول عرض عميل عن الـ HTML المولَّد في الخادم.
 */

/** السوق الافتراضي عند غياب كل المصادر — يمني (الافتراضي الخادمي 967)
 *  إلا إذا ضُبطت بيئة البناء لسوق سعودي (تطبيقات التجار المولّدة). */
export const DEFAULT_MARKET: MarketKey =
  process.env.NEXT_PUBLIC_DEFAULT_MARKET === "saudi" ? "saudi" : "yemen";

/** مفتاح البلد لكل سوق (صيغة locale/countries ورأس X-Market). */
export const MARKET_COUNTRY: Record<MarketKey, "966" | "967"> = {
  saudi: "966",
  yemen: "967",
};

/** عملة كل سوق. */
export const MARKET_CURRENCY: Record<MarketKey, "SAR" | "YER"> = {
  saudi: "SAR",
  yemen: "YER",
};

/** بيانات عرض السوق — الأسماء العربية الرسمية (v6.1: بلا أعلام). */
export const MARKET_META: Record<
  MarketKey,
  { name: string; currencyLabel: string }
> = {
  saudi: { name: "السعودية", currencyLabel: "ر.س" },
  yemen: { name: "اليمن", currencyLabel: "ر.ي" },
};

interface MarketState {
  /** null = لم يُستنبط بعد (قبل الترطيب فقط — يُحسم صامتاً بعدها). */
  market: MarketKey | null;
  setMarket: (m: MarketKey) => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      market: null,
      setMarket: (m) => set({ market: m }),
    }),
    {
      name: "tawfir-market",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

/** المفتاح الفعلي المستخدم في العرض (المخزّن أو الافتراضي). */
export function effectiveMarket(
  market: MarketKey | null | undefined
): MarketKey {
  return market ?? DEFAULT_MARKET;
}

/** مفتاح البلد الفعلي (966/967) — null قبل الاستنباط = بلا إعلان سوق. */
export function effectiveCountryCode(
  market: MarketKey | null | undefined
): "966" | "967" | null {
  return market == null ? null : MARKET_COUNTRY[market];
}

/**
 * استنباط صامت ذكي لسوق الزائر — بلا أي سؤال أو شاشة أو علم:
 *   - منطقة التوقيت Asia/Riyadh → السعودية، Asia/Aden → اليمن.
 *   - لغة المتصفح ar-SA → السعودية.
 *   - غير ذلك → اليمن (الافتراضي الخادمي 967) إلا في تطبيق مولّد
 *     بسوق سعودي (NEXT_PUBLIC_DEFAULT_MARKET=saudi).
 * متزامنة ونقية وآمنة على SSR (تُستدعى بعد التركيب حصراً) —
 * والتنقية الجغرافية الأدق تليها لاحقاً عبر refineGuestMarketByGeo.
 */
export function inferGuestMarket(): MarketKey {
  try {
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Asia/Riyadh") return "saudi";
    if (tz === "Asia/Aden") return "yemen";
    const lang =
      (typeof navigator !== "undefined" ? navigator.language : "") || "";
    if (/^ar-SA/i.test(lang)) return "saudi";
  } catch {
    /* بيئة بلا Intl — الافتراضي */
  }
  return DEFAULT_MARKET;
}

/* ─── اكتشاف تلقائي من رقم الجوال — إشارة الحسم الأقوى ───────── */

/**
 * اكتشاف السوق صامتاً من صيغة رقم الجوال نفسها — بلا أي علم أو سؤال:
 *   - يبدأ بـ 966/00966 (أو 5 بعد التطبيع) → سعودي.
 *   - يبدأ بـ 967/00967 (أو 7 بعد التطبيع) → يمني.
 *   - غير حاسم (أرقام غير مميزة بعد) → null بلا أي فعل.
 * يقبل الخام (مسافات/رموز/أرقام هندية) والمطبّع مسبقاً على حد سواء.
 */
export function detectMarketFromPhone(
  raw: string | null | undefined
): MarketKey | null {
  if (!raw) return null;
  let s = toEnglishDigits(raw).replace(/[^\d+]/g, "").replace(/\+/g, "");
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("966")) return "saudi";
  if (s.startsWith("967")) return "yemen";
  if (s.startsWith("0")) s = s.slice(1);
  if (s.startsWith("5")) return "saudi";
  if (s.startsWith("7")) return "yemen";
  return null;
}

/* ─── التنقية الجغرافية الصامتة — بإذن ممنوح سابقاً حصراً ─────── */

/** مرة واحدة لكل جلسة — لا إعادة فحص جغرافي بعد أول حسم. */
let geoRefineDone = false;

/** المسافة بالكيلومتر بين إحداثيتين (haversine). */
function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** مركز العاصمتين للتصنيف «الأقرب». */
const RIYADH: [number, number] = [24.7136, 46.6753];
const SANAA: [number, number] = [15.3694, 44.191];
/** خارج هذا النطاق من العاصمتين معاً → بلا حكم (خارج البلدين). */
const MAX_CLASSIFY_KM = 700;

/**
 * تنقية جغرافية صامتة لسوق الزائر — بلا أي طلب إذن إطلاقاً:
 * تعمل فقط إذا كان إذن الموقع ممنوحاً للموقع مسبقاً (permissions
 * state === "granted")؛ وإلا تنصرف بصمت وتُرجع null.
 * الحسم: الأقرب بين الرياض وصنعاء، وخارج 700كم من كلتيهما → null.
 * مرة واحدة لكل جلسة، وآمنة على SSR (تُستدعى بعد التركيب حصراً).
 */
export async function refineGuestMarketByGeo(): Promise<MarketKey | null> {
  if (geoRefineDone) return null;
  geoRefineDone = true;
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.permissions ||
      !navigator.geolocation
    ) {
      return null;
    }
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
    const { latitude: lat, longitude: lon } = pos.coords;
    const dRiyadh = haversineKm(lat, lon, RIYADH[0], RIYADH[1]);
    const dSanaa = haversineKm(lat, lon, SANAA[0], SANAA[1]);
    if (Math.min(dRiyadh, dSanaa) > MAX_CLASSIFY_KM) return null;
    return dRiyadh <= dSanaa ? "saudi" : "yemen";
  } catch {
    /* رفض/فشل/بيئة بلا واجهات — صمت تام والاستنباط المتزامن يكفي */
    return null;
  }
}

/**
 * تبنّي الحقيقة الخادمية — رأس استجابة X-Market (v3.1) هو السوق المفروض
 * فعلياً على القائمة المستلمة. إن خالف حالة الواجهة تُتبنَّى فوراً،
 * واشتراك MarketProvider يتكفل بعملة العرض وإبطال بقية الكاش.
 * حلقة آمنة: بعد التبني يطابق الرأس الحالة فلا يتكرر الفعل.
 */
export function noteServerMarket(code: string | null | undefined): void {
  if (code !== "966" && code !== "967") return;
  const asMarket: MarketKey = code === "966" ? "saudi" : "yemen";
  const current = useMarketStore.getState().market;
  if (current !== asMarket) {
    useMarketStore.getState().setMarket(asMarket);
    /* المنطقة المختارة تعود للسوق القديم — تصفير يسمح بالاختيار التلقائي */
    useRegionStore.getState().setSelectedRegion(null);
  }
}

