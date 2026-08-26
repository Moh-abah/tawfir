/**
 * يحوّل روابط الصور النسبية القادمة من الباك إند إلى روابط مطلقة.
 * الباك إند يُرجع روابط مثل `/uploads/membership_receipts/abc.png` —
 * المتصفح لا يعرف أنها على api.tawfir.giize.com فيظهر صورة مكسورة.
 * أمثلة:
 *  - "/uploads/foo.png"         → "https://api.tawfir.giize.com/uploads/foo.png"
 *  - "https://cdn.x/a.png"      → "https://cdn.x/a.png" (تُرجع كما هي)
 *  - "http://local.test/x.png" → "http://local.test/x.png" (تُرجع كما هي)
 *  - null/undefined/""          → ""
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // ادفع شرطة مزدوجة فقط للروابط النسبية بال_protocol للإحاطة بالحالات
  if (url.startsWith("//")) return `https:${url}`;
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "https://api.tawfir.giize.com";
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
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
