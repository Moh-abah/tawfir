/**
 * saudi — مكتبة البيانات السعودية الموحّدة (جولة الفصل الحقيقي بين السوقين v7)
 * ═══════════════════════════════════════════════════════════════════════════
 * المرآة الرسمية لـ yemen.ts لكل ما يخصّ السوق السعودي في الواجهة:
 *   • جوال السعودية: تطبيع رقم الجوال (يتحمّل المسافات/الشرطات/رمز
 *     الدولة +966/00966/الصفر المحلي 05/الأرقام العربية-الهندية) + تحقق
 *     عربي كامل + تنسيق عرض جميل.
 *   • عملة السوق السعودي: ريال سعودي (SAR) — دفع إلكتروني مويسر.
 *
 * كل الدوال نقية (pure) وآمنة على SSR — لا تلمس navigator/document.
 */

import { toEnglishDigits } from "@/lib/yemen";

/* ─── ثوابت السوق السعودي ───────────────────────────────────────── */

/** مفتاح الدولة السعودي (بصيغة locale/countries). */
export const SAUDI_COUNTRY_CODE = "966";

/** عملة السوق السعودي. */
export const SAUDI_CURRENCY = "SAR";

/** رمز العملة بالعربية. */
export const SAUDI_CURRENCY_SYMBOL = "ر.س";

/* ─── رقم الجوال السعودي ────────────────────────────────────────── */

/**
 * تطبيع رقم الجوال السعودي إلى 9 خانات تبدأ بـ 5 (مثل "501234567").
 *
 * يتقبّل:
 *   "501 234 567"        (مسافات)
 *   "+966 50 123 4567"   (رمز الدولة مع مسافات)
 *   "00966-501-234-567"  (شرطات وصفر مزدوج)
 *   "966501234567"       (رمز الدولة بلا +)
 *   "0501234567"         (الصفر المحلي — الصيغة الشائعة داخل السعودية)
 *   "٥٠١٢٣٤٥٦٧"          (أرقام عربية-هندية)
 *
 * لا يتحقق من الصحة — للتحقق استخدم validateSaudiPhone.
 */
export function normalizeSaudiPhone(raw: string): string {
  if (!raw) return "";
  /* أرقاماً فقط (مع تحويل الهندية) ثم إسقاط كل رمز + */
  let s = toEnglishDigits(raw).replace(/[^\d+]/g, "").replace(/\+/g, "");

  /* رمز الدولة: 00966… أو 966… */
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("966") && s.length > 9) s = s.slice(3);

  /* الصفر المحلي: 05… */
  if (s.startsWith("0") && s.length > 9) s = s.slice(1);

  s = s.replace(/\D/g, "");

  return s;
}

/**
 * الصيغة المحلية الشائعة داخل السعودية — 10 خانات تبدأ بـ 05.
 * تُستخدم عند إرسال الجوال للخادم (OTP/تسجيل/دخول) ولمعرفّه لاحقاً.
 */
export function toSaudiLocalNumber(raw: string): string {
  const n = normalizeSaudiPhone(raw);
  return n ? `0${n}` : "";
}

/**
 * تحقق كامل من رقم الجوال السعودي — يُرجع رسالة خطأ عربية أو null.
 * مثال الاستخدام مع zod:
 *   z.string().refine((v) => !validateSaudiPhone(v), { message: "…" })
 */
export function validateSaudiPhone(raw: string): string | null {
  const normalized = normalizeSaudiPhone(raw);
  if (!normalized) return "أدخل رقم الجوال";
  if (normalized.length !== 9) {
    const count = normalized.length;
    return `رقم الجوال يجب أن يكون 9 خانات تبدأ بالرقم 5 — أدخلته بـ ${count} ${count === 1 ? "خانة" : count === 2 ? "خانتين" : "خانات"}`;
  }
  if (!normalized.startsWith("5")) {
    return "رقم الجوال السعودي يبدأ بالرقم 5 — مثال: 501234567";
  }
  return null;
}

/** فحص سريع (بدون رسالة) — مناسب لـ zod refinement. */
export function isValidSaudiPhone(raw: string): boolean {
  return validateSaudiPhone(raw) === null;
}

/**
 * تنسيق عرض جميل بالتجزئة 3-3-4: "501234567" → "501 234 567".
 * متسامح مع القيم الجزئية أثناء الكتابة ("5012" → "501 2")
 * ومع اللصق غير المطبوّع (يطبّعه أولاً).
 */
export function formatSaudiPhoneDisplay(normalized: string): string {
  const digits = normalizeSaudiPhone(normalized).replace(/\D/g, "");
  if (!digits) return "";
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
  ].filter((g) => g.length > 0);
  return groups.join(" ");
}
