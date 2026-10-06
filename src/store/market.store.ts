"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MarketKey } from "@/services/locale.service";
import type { QueryClient } from "@tanstack/react-query";
import { useRegionStore } from "@/store/region.store";

/** مفتاح السوق — يُصدَّر من هنا ليكون المصدر الموحد للمكوّنات. */
export type { MarketKey };

/**
 * مخزن السوق الوطني — جولة v5.1 (الخادم يفرض السوق، الواجهة ذكية صامتة)
 * ═══════════════════════════════════════════════════════════════════════
 * لا شاشات اختيار إجبارية ولا بوابات تعليمية — السوق يُستنبط للمستخدم:
 *
 *   1. جلسة عميل → GET /locale/me (المصدر الأعلى) — والخادم v3.1 يفرض
 *      سوق التوكن على كل القوائم ويُتجاهل ما يخالفته.
 *   2. زائر عاد للزيارة → آخر سوق عرفه التطبيق (localStorage).
 *   3. زائر أول مرة → استنباط صامت من إشارات المتصفح (inferGuestMarket:
 *      منطقة التوقيت/اللغة) — الرياض → سعودي، وإلا اليمني (الافتراضي
 *      الخادمي 967) — بلا أي سؤال.
 *   4. رأس الاستجابة X-Market (v3.1) → الحقيقة المفروضة فعلياً؛ إن خالفت
 *      حالة الواجهة تُتبنَّى فوراً (noteServerMarket).
 *
 * مبدّل العلم في الهيدر يبقى متاحاً كأداة هادئة لمن أراد التغيير —
 * الاختيار إجراء استثنائي لا طقس إلزامي.
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

/** بيانات عرض السوق — الأعلام والأسماء العربية الرسمية. */
export const MARKET_META: Record<
  MarketKey,
  { flag: string; name: string; currencyLabel: string }
> = {
  saudi: { flag: "🇸🇦", name: "السعودية", currencyLabel: "ر.س" },
  yemen: { flag: "🇾🇪", name: "اليمن", currencyLabel: "ر.ي" },
};

/** كل الأسواق بترتيب العرض (اليمن أولاً — السوق التاريخي). */
export const ALL_MARKETS: readonly MarketKey[] = ["yemen", "saudi"];

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
 * استنباط صامت ذكي لسوق الزائر الأول — بلا أي سؤال أو شاشة:
 *   - منطقة التوقيت Asia/Riyadh → السعودية.
 *   - لغة المتصفح ar-SA → السعودية.
 *   - غير ذلك → اليمن (الافتراضي الخادمي 967).
 * نقية وآمنة على SSR (تُستدعى بعد التركيب حصراً).
 */
export function inferGuestMarket(): MarketKey {
  try {
    const tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz === "Asia/Riyadh") return "saudi";
    const lang =
      (typeof navigator !== "undefined" ? navigator.language : "") || "";
    if (/^ar-SA/i.test(lang)) return "saudi";
  } catch {
    /* بيئة بلا Intl — الافتراضي */
  }
  return DEFAULT_MARKET;
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

/**
 * التبديل الهادئ بين الأسواق — من مبدّل العلم أو الحارس.
 * يفرّغ قوائم الجيو (تصفير المنطقة + إبطال كاش react-query كله)
 * فتُعاد الجلب بفلتر السوق الجديد (ورأس X-Market للزائر).
 * عملة العرض وإبطال الرسم يتكفل بهما اشتراك MarketProvider.
 */
export function applyMarketSwitch(m: MarketKey, qc: QueryClient): void {
  useMarketStore.getState().setMarket(m);
  /* المنطقة المختارة تنتمي للسوق القديم — تصفيرها يسمح لـ useRegions
     باختيار أول منطقة من السوق الجديد تلقائياً. */
  useRegionStore.getState().setSelectedRegion(null);
  void qc.invalidateQueries();
}
