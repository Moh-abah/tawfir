"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarketStore,
  effectiveMarket,
  effectiveCountryCode,
  inferGuestMarket,
} from "@/store/market.store";
import { setActiveCurrency, FIRST_PAINT_CURRENCY } from "@/lib/format";
import { localeService, type LocaleMe } from "@/services/locale.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";

/**
 * MarketProvider — بوابة السوق الوطني (جولة v5.1: الخادم يفرض السوق)
 * ═════════════════════════════════════════════════════════════════════════
 * يوحّد السوق المعروض في كل شاشات العميل (ضيوف ومسجلون) — بذكاء صامت:
 *
 *   1. ترطيب المخزن المثبت (آخر سوق معروف) — بلا اختلاف ترطيب SSR.
 *   2. جلسة عميل → GET /locale/me هو المصدر الأعلى ويحسم السوق
 *      (والخادم v3.1 يفرض سوق التوكن على كل القوائم إجباراً).
 *   3. زائر → آخر سوق معروف، وإلا استنباط صامت من إشارات المتصفح
 *      (inferGuestMarket) — لا شاشات اختيار ولا أسئلة إطلاقاً.
 *   4. عملة العرض الفعالة (setActiveCurrency) تُقرأ في كل المبالغ.
 *   5. عند تغيّر العملة: إبطال كاش react-query + إعادة تركيب الشجرة
 *      مرة واحدة (key) — ضمانة ضد structural sharing.
 *   6. اشتراك لحظي: كل تبديل/تبنٍّ للسوق (مبدّل العلم، تبنّي X-Market
 *      من الاستجابة، تسجيل جديد) يُطبَّق فوراً بلا إعادة تحميل.
 *
 * آمن على الترطيب: لا يضبط شيئاً إلا بعد التركيب (useEffect).
 */

/** آخر عملة طُبّقت فعلياً — تبدأ بأول رسم (الافتراضي) ليُطبَّق التغيير
 *  فوراً على أول تحميل حين يخالف الحسمُ الافتراضي المعروض. */
let LAST_APPLIED_CURRENCY: "SAR" | "YER" = FIRST_PAINT_CURRENCY;

function currencyOf(market: "saudi" | "yemen"): "SAR" | "YER" {
  return market === "saudi" ? "SAR" : "YER";
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  /** مفتاح إعادة التركيب — يرتفع مرة واحدة عند كل تغيير فعلي للعملة. */
  const [renderKey, setRenderKey] = useState(0);

  function applyCurrency(currency: "SAR" | "YER"): void {
    setActiveCurrency(currency);
    if (LAST_APPLIED_CURRENCY !== currency) {
      /* إبطال الكاش + إعادة تركيب الشجرة — الضمانة المزدوجة ضد
         «البيانات بنفس الهوية لا تعيد الرسم» */
      void queryClient.invalidateQueries();
      setRenderKey((k) => k + 1);
      LAST_APPLIED_CURRENCY = currency;
    }
  }

  /* الحسم الأولي بعد التركيب — locale/me للمسجل، وإلا آخر سوق معروف */
  useEffect(() => {
    let cancelled = false;

    async function reconcile(): Promise<void> {
      await useMarketStore.persist.rehydrate();
      const persisted = useMarketStore.getState().market;

      const hasCustomerSession =
        !!useCustomerAuthStore.getState().accessToken;
      let country: string | null = null;
      if (hasCustomerSession) {
        try {
          const me: LocaleMe = await localeService.getMe();
          country = me.country_code ?? null;
        } catch {
          /* جلسة منتهية/زائر فعلياً — نُكمل بآخر سوق معروف */
        }
      }
      if (cancelled) return;

      const resolved =
        country != null
          ? country === "966"
            ? ("saudi" as const)
            : ("yemen" as const)
          : /* زائر — استنباط صامت: آخر سوق معروف، وإلا إشارات المتصفح */
            effectiveMarket(persisted ?? inferGuestMarket());

      if (country != null && persisted !== resolved) {
        useMarketStore.getState().setMarket(resolved);
      }
      applyCurrency(currencyOf(resolved));
    }

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  /* اشتراك لحظي — تغيير السوق أثناء الجلسة (مبدّل/بوابة/حارس/تسجيل) */
  useEffect(() => {
    const unsub = useMarketStore.subscribe((state) => {
      if (state.market != null) {
        applyCurrency(currencyOf(state.market));
      }
    });
    return unsub;
  }, [queryClient]);

  return <FragmentKeyProvider key={renderKey}>{children}</FragmentKeyProvider>;
}

/**
 * غلاف إعادة التركيب — مفتاح متغير يعيد بناء الشجرة مرة واحدة عند تغيّر
 * العملة الفعلية (ر.ي ← → ر.س) فتُقرأ العملة الصحيحة في كل المبالغ.
 */
function FragmentKeyProvider({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

/** مفتاح البلد الفعلي للسوق الحالي — يُستهلك في فلترة المناطق/المتاجر. */
export function useMarketCountryCode(): "966" | "967" | null {
  const market = useMarketStore((s) => s.market);
  return effectiveCountryCode(market);
}
