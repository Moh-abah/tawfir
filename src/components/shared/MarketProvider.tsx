"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarketStore,
  effectiveMarket,
  effectiveCountryCode,
  inferGuestMarket,
  refineGuestMarketByGeo,
  noteServerMarket,
  detectMarketFromPhone,
  MARKET_COUNTRY,
} from "@/store/market.store";
import { setActiveCurrency, FIRST_PAINT_CURRENCY } from "@/lib/format";
import { localeService, type LocaleMe } from "@/services/locale.service";
import { customerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";

/**
 * MarketProvider — بوابة السوق الوطني (جولة v6.1: اكتشاف تلقائي كامل)
 * ═════════════════════════════════════════════════════════════════
 * يوحّد السوق المعروض في كل شاشات العميل (ضيوف ومسجلون) — بذكاء صامت:
 *
 *   1. ترطيب المخزن المثبت — بلا اختلاف ترطيب SSR.
 *   2. جلسة عميل (مسجّل) → GET /locale/me ثم حسم الجوال: بادئة رقم
 *      الحساب نفسها هي الحاسمة (توجيه المالك: «رقم جواله يحدد من
 *      أين هو») — وإن خالفت بيانات الخادم (حساب قديم سابق للإصلاح)
 *      يُشاف ذاتياً: تبنٍّ فوري + PUT /locale/me مرة واحدة مزامنةً
 *      الخادم إلى بيانات الحساب الصحيحة.
 *      (والخادم v3.1 يفرض سوق التوكن على كل القوائم إجباراً).
 *   3. زائر → استنباط صامت من إشارات بيئته الآن (inferGuestMarket)،
 *      ثم تنقية جغرافية صامتة إذا كان إذن الموقع ممنوحاً سابقاً
 *      (refineGuestMarketByGeo) — لا أعلام ولا أسئلة ولا طلب إذن.
 *   4. عملة العرض الفعالة (setActiveCurrency) تُقرأ في كل المبالغ.
 *   5. عند تغيّر العملة: إبطال كاش react-query + إعادة تركيب الشجرة
 *      مرة واحدة (key) — ضمانة ضد structural sharing.
 *   6. اشتراك لحظي: كل تبنٍّ للسوق (locale/me، X-Market، الاستنباط
 *      الجغرافي، التسجيل) يُطبَّق فوراً بلا إعادة تحميل.
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

          /* v8.1.1 — حسم الجوال للمسجّل: بادئة رقم الحساب تحسم السوق
             مهما كان المخزّن خادمياً — وحسابات ما قبل الإصلاح تُشاف
             ذاتياً (تبنٍّ + مزامنة PUT واحدة بلا عرقلة للجلسة). */
          try {
            const profile = await customerAuthService.getMe();
            const byPhone = detectMarketFromPhone(profile.phone);
            const phoneCountry = byPhone ? MARKET_COUNTRY[byPhone] : null;
            if (phoneCountry && phoneCountry !== country) {
              country = phoneCountry;
              localeService
                .setMe({ country_code: phoneCountry })
                .catch(() => {});
            }
          } catch {
            /* بروفايل غير متاح الآن — locale/me يكفي ولا عرقلة */
          }
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
          : /* زائر — استنباط صامت من إشارات بيئته الآن */
            effectiveMarket(inferGuestMarket());

      /* الاعتماد الموحّد: عند انقلاب السوق عن المخزّن تُصفَّر المنطقة
         المختارة (تنتمي لسوق قديم) — نفس مسار تبنّي X-Market. */
      noteServerMarket(MARKET_COUNTRY[resolved]);
      applyCurrency(currencyOf(resolved));

      /* زائر — تنقية جغرافية صامتة (بإذن ممنوح سابقاً حصراً):
         إن حسمت الموقع وخالفت الاستنباط تُتبنّى فوراً عبر المسار
         الموحّد نفسه (تبنّي + تصفير المنطقة). */
      if (country == null) {
        const geo = await refineGuestMarketByGeo();
        if (!cancelled && geo) {
          noteServerMarket(MARKET_COUNTRY[geo]);
        }
      }
    }

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  /* اشتراك لحظي — تغيير السوق أثناء الجلسة (locale/me، X-Market،
     الاستنباط الجغرافي، التسجيل) */
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

/**
 * v8.1.1 — شفاء السوق من جوال الحساب (توجيه المالك: «رقم جواله يحدد
 * من أين هو»): تُستدعى فور نجاح تسجيل الدخول — بادئة جوال الحساب
 * نفسها تحسم السوق محلياً، وإن خالفت بيانات الخادم (حساب قديم سابق
 * للإصلاح) تُزامن الخادم بـ PUT /locale/me واحدة. بلا عرقلة للرحلة:
 * كل فشل صامت والملاحة تجري كما هي — والمسار نفسه يعمل عند إقلاع
 * التطبيق بجلسة قائمة (MarketProvider ← reconcile).
 */
export async function healMarketFromAccountPhone(): Promise<void> {
  try {
    const profile = await customerAuthService.getMe();
    const byPhone = detectMarketFromPhone(profile.phone);
    if (!byPhone) return;
    const country = MARKET_COUNTRY[byPhone];
    noteServerMarket(country);
    try {
      const me = await localeService.getMe();
      if ((me.country_code ?? null) !== country) {
        await localeService.setMe({ country_code: country });
      }
    } catch {
      /* locale/me غير متاح الآن — التبنّي المحلي يكفي */
    }
  } catch {
    /* بروفايل غير متاح — صمت تام */
  }
}
