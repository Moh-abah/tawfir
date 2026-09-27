/**
 * أصل الـAPI لخدمة الوسائط — يُحسب مرة واحدة:
 *  - يتجاهل القيم الفارغة/المسافات (env فارغ = غير مضبوط).
 *  - يقبل فقط القيم المطلقة http(s) — أي قيمة نسبية (مثل "/api") تُهمل
 *    لأن روابط الوسائط تحتاج أصلاً مطلقاً يعمل من كل البوابات.
 */
const MEDIA_API_ORIGIN: string = (() => {
  const FALLBACK = "https://api.tawfir.giize.com";
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return FALLBACK;
  try {
    return new URL(raw).origin;
  } catch {
    return FALLBACK;
  }
})();

/** مسارات الوسائط التي يخدمها الـAPI حصراً — تُصحَّح لو وصلت بنطاق خاطئ */
const MEDIA_PATH_PREFIXES = ["/uploads/", "/media/"];

/**
 * يحوّل روابط الصور النسبية القادمة من الباك إند إلى روابط مطلقة.
 * الباك إند يُرجع روابط مثل `/uploads/membership_receipts/abc.png` —
 * المتصفح لا يعرف أنها على api.tawfir.giize.com فيظهر صورة مكسورة.
 *
 * إصلاح «الشعار لا يظهر في لوحات الأدمن/التاجر/المندوب»: عندما يعيد
 * الباك إند رابطاً مطلقاً مبنیاً على نطاق البوابة الطالبة (مثل
 * https://admin.tawfir.giize.com/uploads/x.png) — أو عندما يكون env
 * فارغاً فيحل نطاق البوابة محل الـAPI — تُعاد الروابط إلى أصل الـAPI
 * دائماً لأن الوسائط تُخدم من هناك حصراً.
 * أمثلة:
 *  - "/uploads/foo.png"              → "https://api.tawfir.giize.com/uploads/foo.png"
 *  - "https://admin.tawfir.giize.com/uploads/x.png"
 *                                    → "https://api.tawfir.giize.com/uploads/x.png"
 *  - "https://cdn.x/a.png"           → "https://cdn.x/a.png" (تُرجع كما هي)
 *  - null/undefined/""               → ""
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  // روابط بروتوكول-نسبي //host/path
  if (trimmed.startsWith("//")) {
    return resolveImageUrl(`https:${trimmed}`);
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    // رابط مطلق: إن كان يشير لوسائط على نطاق غير نطاق الـAPI فأعده لأصل الـAPI
    try {
      const parsed = new URL(trimmed);
      const isMediaPath = MEDIA_PATH_PREFIXES.some((p) =>
        parsed.pathname.startsWith(p)
      );
      if (isMediaPath && parsed.origin !== MEDIA_API_ORIGIN) {
        return `${MEDIA_API_ORIGIN}${parsed.pathname}${parsed.search}`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }
  // رابط نسبي — يُلحق بأصل الـAPI دائماً (نسبة أو وسائط)
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${MEDIA_API_ORIGIN}${path}`;
}

/** صياغة مبلغ بالريال اليمني (ر.ي) بالعربية. */
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "—";
  const formatted = new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
  return `${formatted} ر.ي`;
}

/** تاريخ ISO بالعربية. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** تقسيم رقم العضوية (16 خانة) إلى مجموعات 4×4 */
export function formatMembershipNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** صيغة MM/YY من تاريخ ISO (YYYY-MM-DD أو ISO full) */
export function formatExpiry(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const [y, m] = iso.split("-");
    if (!y || !m) return "";
    return `${m}/${y.slice(2)}`;
  }
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}/${yy}`;
}
