import type { DictEntry } from "@/lib/i18n/index";

/**
 * onboardingDict — بوابة اختيار اللغة أول تشغيل (نصوص ثنائية معروضة معاً
 * داخل المكوّن نفسه — هذه المفاتيح لتوائم القارئ الشاشي والأدلة).
 */
export const onboardingDict: Record<string, DictEntry> = {
  "onboarding.gate.title": {
    ar: "اختر لغتك / Choose your language",
    en: "Choose your language / اختر لغتك",
  },
  "onboarding.arabic": { ar: "العربية", en: "Arabic" },
  "onboarding.english": { ar: "English", en: "English" },
  "onboarding.changeAnytime": {
    ar: "يمكنك تغيير اللغة في أي وقت من أيقونة الكرة الأرضية أو من ملفك.",
    en: "You can change the language anytime from the globe icon or your profile.",
  },
};
