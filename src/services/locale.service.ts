"use client";

/**
 * locale.service.ts — التكييف الوطني (جولة التوسعة المالية v2)
 * ═══════════════════════════════════════════════════════════════
 * مصدر حقيقة السوق: «GET /locale/me» يعيد بلد المستخدم وعلمه وعملته.
 *   - السوق السعودي (966 / SAR): الدفع الإلكتروني مفعّل (Moyasar).
 *   - السوق اليمني (967 / YER): كاش + إشعارات تسديد — لا بوابة دفع.
 * «GET /locale/countries» عام (بلا توكن) لبناء منتقي الدولة بالعلم.
 */

import { customerApiClient } from "@/services/customer-api-client";

/** مستخدم في السوق السعودي vs اليمني */
export type MarketCountryCode = "966" | "967";
export type MarketCurrency = "SAR" | "YER";
export type MarketKey = "saudi" | "yemen";

export interface LocaleMe {
  country_code: MarketCountryCode | string;
  flag?: string | null;
  currency?: MarketCurrency | string | null;
  national_id?: string | null;
  commercial_registration?: string | null;
  iban?: string | null;
}

export interface LocaleCountry {
  country_code: string;
  name: string;
  flag?: string | null;
  currency?: string | null;
  phone_example?: string | null;
  market?: string | null;
}

export interface LocaleSetInput {
  country_code: MarketCountryCode | string;
  national_id?: string | null;
  commercial_registration?: string | null;
  iban?: string | null;
}

export const localeService = {
  /** بلد المستخدم وعملته (بعد الدخول). */
  async getMe(): Promise<LocaleMe> {
    return customerApiClient.get<LocaleMe>("/locale/me");
  },

  /** ضبط بلد المستخدم + بياناته الوطنية الاختيارية (السعودية). */
  async setMe(data: LocaleSetInput): Promise<LocaleMe> {
    return customerApiClient.put<LocaleMe>("/locale/me", data);
  },

  /** دليل الدول مع الأعلام — عام. */
  async getCountries(): Promise<LocaleCountry[]> {
    const json = await customerApiClient.get<unknown>("/locale/countries");
    if (Array.isArray(json)) return json as LocaleCountry[];
    const obj = json as { countries?: LocaleCountry[] };
    return obj?.countries ?? [];
  },
};

/** هل هذا البلد هو السوق السعودي؟ */
export function isSaudiCountry(countryCode: string | null | undefined): boolean {
  return String(countryCode ?? "") === "966";
}

/** عملة السوق انطلاقاً من مفتاح البلد. */
export function currencyFromCountry(
  countryCode: string | null | undefined
): MarketCurrency {
  return isSaudiCountry(countryCode) ? "SAR" : "YER";
}
