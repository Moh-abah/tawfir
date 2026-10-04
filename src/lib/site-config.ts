export const SITE_NAME = 'توفير' as const;

export const PUBLIC_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tawfir.giize.com';

export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.tawfir.giize.com';

export const OWNER_URL =
  process.env.NEXT_PUBLIC_OWNER_URL ?? 'https://facility.tawfir.giize.com';

/** مبلغ اشتراك العضوية السنوي بالريال اليمني. */
export const MEMBERSHIP_AMOUNT = 3000 as const;

/**
 * إصلاح 404 بوابة المالك: أصول الهوية (شعار/رسمات/أيقونات إشعار)
 * تعيش في public/ لنطاق بوابة العميل حصراً — نطاق facility. لا يملك
 * هذه الملفات فتظهر الشعارات مكسورة (404) في كل صفحات التاجر.
 * هذه الدالة تُطلق مسار /identity/... على أصل بوابة العميل دائماً:
 *  - على tawfir.giize.com: نفس الأصل (بلا أي فرق سلوك).
 *  - على facility./admin.: رابط مطلق للنطاق الرئيسي (صحيح).
 *
 * ═══ تحصين نهائي (الإصلاح الأخير) ═══
 * الأصل الآن مستقل كلياً عن NEXT_PUBLIC_SITE_URL عبر متغير مخصص
 * NEXT_PUBLIC_BRAND_URL: لو نُشرت بوابة المالك مشروعاً منفصلاً
 * ضُبط فيه NEXT_PUBLIC_SITE_URL على رابط facility نفسه (لصحة
 * metadataBase مثلاً) فلا تنكسر روابط الهوية — تبقى تشير دائماً
 * إلى أصل العميل الذي يملك الملفات فعلاً.
 * مع هذا + استثناء identity/ من إعادة الكتابة في proxy.ts تعمل
 * الشعارات على كل النطاقات مهما اختلفت بيئة النشر.
 */
export const BRAND_ORIGIN =
  process.env.NEXT_PUBLIC_BRAND_URL ?? "https://tawfir.giize.com";

export function identityUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = BRAND_ORIGIN.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
