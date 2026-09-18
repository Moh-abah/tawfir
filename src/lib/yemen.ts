/**
 * yemen — مكتبة البيانات اليمنية الموحّدة (توفير — 2-a)
 * ═══════════════════════════════════════════════════════════════════
 * مصدر واحد للحقيقة لكل ما يخصّ اليمن في الواجهة:
 *   • لوحة المركبة اليمنية: فواصل المحافظات (22 محافظة) + الحروف
 *     الشائعة + بناء/تفكيك/عرض اللوحة بصيغة "الكود-الرقم-الحرف".
 *   • جوال اليمن: تطبيع رقم الجوال (يتحمّل المسافات/الشرطات/رمز
 *     الدولة +967/0967/الأرقام العربية-الهندية) + تحقق عربي كامل
 *     + تنسيق عرض جميل 3-3-3.
 *
 * كل الدوال نقية (pure) وآمنة على SSR — لا تلمس navigator/document.
 */

/* ─── لوحة المركبة اليمنية ──────────────────────────────────────── */

/** فواصل المدن على اللوحات اليمنية — 22 محافظة بالترتيب الرسمي. */
export const YEMEN_PLATE_CITY_CODES: ReadonlyArray<{ code: number; name: string }> = [
  { code: 1, name: "أمانة العاصمة" },
  { code: 2, name: "محافظة صنعاء" },
  { code: 3, name: "محافظة عدن" },
  { code: 4, name: "محافظة تعز" },
  { code: 5, name: "محافظة حضرموت" },
  { code: 6, name: "محافظة الحديدة" },
  { code: 7, name: "محافظة إب" },
  { code: 8, name: "محافظة حجة" },
  { code: 9, name: "محافظة ذمار" },
  { code: 10, name: "محافظة صعدة" },
  { code: 11, name: "محافظة أبين" },
  { code: 12, name: "محافظة لحج" },
  { code: 13, name: "محافظة البيضاء" },
  { code: 14, name: "محافظة المحويت" },
  { code: 15, name: "محافظة الجوف" },
  { code: 16, name: "محافظة مأرب" },
  { code: 17, name: "محافظة شبوة" },
  { code: 18, name: "محافظة المهرة" },
  { code: 19, name: "محافظة عمران" },
  { code: 20, name: "محافظة الضالع" },
  { code: 21, name: "محافظة ريمة" },
  { code: 22, name: "محافظة سقطرى" },
];

/** الحروف اليمنية الشائعة على لوحات المركبات. */
export const YEMEN_PLATE_LETTERS = [
  "أ", "ب", "ج", "د", "ر", "س", "ص", "ط", "ع", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي",
] as const;

/** نوع حرف اللوحة (اتحاد حرفي من YEMEN_PLATE_LETTERS). */
export type YemenPlateLetter = (typeof YEMEN_PLATE_LETTERS)[number];

/** نتيجة تفكيك لوحة يمنية — null = الجزء غير موجود/غير مفهوم. */
export interface YemenPlateParts {
  cityCode: number | null;
  digits: string | null;
  letter: string | null;
}

/* ─── تحويل الأرقام العربية-الهندية إلى إنجليزية ───────────────── */

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * تحويل الأرقام العربية-الهندية (٠١٢…) والفارسية (۰۱۲…) إلى إنجليزية.
 * يُستخدم قبل أي معالجة رقمية لحقول يكتب فيها المستخدم بيديه.
 */
export function toEnglishDigits(input: string): string {
  if (!input) return "";
  return input.replace(/[٠-٩۰-۹]/g, (ch) => {
    const arabic = ARABIC_INDIC_DIGITS.indexOf(ch);
    if (arabic !== -1) return String(arabic);
    const persian = PERSIAN_DIGITS.indexOf(ch);
    if (persian !== -1) return String(persian);
    return ch;
  });
}

/**
 * بناء نص اللوحة الكاملة بصيغة "الكود-الرقم-الحرف" (مثل "1-222156-أ").
 * يُنظّف الرقم من غير الأرقام تلقائياً (مسافات/شرطات/أرقام هندية).
 */
export function buildYemenPlate(cityCode: number, digits: string, letter: string): string {
  const cleanDigits = toEnglishDigits(digits ?? "").replace(/\D/g, "");
  const cleanLetter = (letter ?? "").trim();
  return `${cityCode}-${cleanDigits}-${cleanLetter}`;
}

/**
 * تفكيك لوحة يمنية إلى أجزائها — متسامح مع المسافات والشرطات
 * المتنوعة وصيغة العرض "1-222156 أ" (يرجعها إلى الأجزاء نفسها).
 */
export function parseYemenPlate(plate: string): YemenPlateParts {
  const text = toEnglishDigits((plate ?? "")).trim();
  if (!text) return { cityCode: null, digits: null, letter: null };

  /* وحّد كل الفواصل (شرطات بأنواعها ومسافات) إلى "-" ثم قسّم */
  const normalized = text
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/\s+/g, "-");
  const parts = normalized.split("-").filter((p) => p.length > 0);
  if (parts.length === 0) return { cityCode: null, digits: null, letter: null };

  /* المحافظة: أول جزء رقمي صحيح موجب */
  const cityCode = /^\d+$/.test(parts[0]) && Number(parts[0]) > 0
    ? Number(parts[0])
    : null;

  /* الرقم: أول جزء رقمي لاحق حتى 6 خانات */
  const digits =
    parts.find((p, i) => i > 0 && /^\d{1,6}$/.test(p)) ?? null;

  /* الحرف: أول جزء لاحق يحوي حروفاً عربية */
  const letter = parts.find((p, i) => i > 0 && /[\u0621-\u064A]/.test(p)) ?? null;

  return { cityCode, digits, letter };
}

/**
 * صيغة عرض بشرية للوحة: "1-222156-أ" → "1-222156 أ".
 * عند تعذّر التفكيك تُرجَع القيمة كما هي (مقصوصة الفراغات).
 */
export function formatYemenPlateHuman(plate: string): string {
  const { cityCode, digits, letter } = parseYemenPlate(plate);
  if (cityCode == null || !digits || !letter) return (plate ?? "").trim();
  return `${cityCode}-${digits} ${letter}`;
}

/* ─── رقم الجوال اليمني ─────────────────────────────────────────── */

/**
 * تطبيع رقم الجوال اليمني إلى 9 خانات تبدأ بـ 7 (مثل "777123456").
 *
 * يتقبّل:
 *   "777 123 456"        (مسافات — مشكلة المستخدم الحالية)
 *   "+967 777123456"     (رمز الدولة مع مسافات)
 *   "00967-777-123-456"  (شرطات وصفر مزدوج)
 *   "07771234567"        (صفر محلي + خانة زائدة)
 *   "٧٧٧١٢٣٤٥٦"          (أرقام عربية-هندية)
 *
 * لا يتحقق من الصحة — للتحقق استخدم validateYemeniPhone.
 */
export function normalizeYemeniPhone(raw: string): string {
  if (!raw) return "";
  /* أرقاماً فقط (مع تحويل الهندية) ثم إسقاط كل رمز + */
  let s = toEnglishDigits(raw).replace(/[^\d+]/g, "").replace(/\+/g, "");

  /* رمز الدولة: 00967… أو 967… */
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("967") && s.length > 9) s = s.slice(3);

  /* الصفر المحلي: 0777… (فقط حين يبقى أكثر من 9 خانات) */
  if (s.startsWith("0") && s.length > 9) s = s.slice(1);

  s = s.replace(/\D/g, "");

  /* خانة زائدة من استمرار الضغط (مثل 07771234567) → أول 9 خانات */
  if (s.length > 9 && s.startsWith("7")) s = s.slice(0, 9);

  return s;
}

/**
 * تحقق كامل من رقم الجوال اليمني — يُرجع رسالة خطأ عربية أو null.
 * مثال الاستخدام مع zod في الصفحات:
 *   z.string().refine((v) => !validateYemeniPhone(v), { message: "…" })
 */
export function validateYemeniPhone(raw: string): string | null {
  const normalized = normalizeYemeniPhone(raw);
  if (!normalized) return "أدخل رقم الجوال";
  if (normalized.length !== 9) {
    const count = normalized.length;
    return `رقم الجوال يجب أن يكون 9 خانات تبدأ بالرقم 7 — أدخلته بـ ${count} ${count === 1 ? "خانة" : count === 2 ? "خانتين" : "خانات"}`;
  }
  if (!normalized.startsWith("7")) {
    return "رقم الجوال اليمني يبدأ بالرقم 7 — مثال: 777123456";
  }
  return null;
}

/** فحص سريع (بدون رسالة) — مناسب لـ zod refinement. */
export function isValidYemeniPhone(raw: string): boolean {
  return validateYemeniPhone(raw) === null;
}

/**
 * تنسيق عرض جميل بالتجزئة 3-3-3: "777123456" → "777 123 456".
 * متسامح مع القيم الجزئية أثناء الكتابة ("7771" → "777 1")
 * ومع اللصق غير المطبوّع (يطبّعه أولاً).
 */
export function formatYemeniPhoneDisplay(normalized: string): string {
  const digits = normalizeYemeniPhone(normalized).replace(/\D/g, "");
  if (!digits) return "";
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    groups.push(digits.slice(i, i + 3));
  }
  return groups.join(" ");
}
