/**
 * /api/utils/place-page — سجل «صفحة المتجر ذاتها» (ذاكرة الخادم)
 * ═══════════════════════════════════════════════════════════════════
 * طلب المالك (الجولة 50): زر «افتح في الخرائط» في صفحة العميل يجب أن
 * يفتح **صفحة المطعم نفسها** في قوقل ماب — لا نتائج بحث كثيرة.
 *
 * طبقتا الحقيقة:
 *  1) **الدائمة**: `location_source` الخادمي بصيغة `map|https://maps.google.com/?cid=…`
 *     — يُلتقط من رابط التاجر عند التسجيل (حقل نصّي حر يقبله OwnerRegister).
 *     يقرؤه صفحة العميل مباشرة بلا هذا المسار.
 *  2) **ذاكرة هذا المسار**: للمتاجر الأقدم (سُجّلت قبل الجولة 50 وحدّث
 *     PUT للملك يسقط الحقل — أُثبت حياً 200 مع إسقاط). التاجر يعيد حل
 *     رابطه من شاشة تعديل المتجر فتُبذر الصفحة هنا، وتخدم لكل العملاء
 *     7 أيام (قابلة لإعادة البذر التلقائي عند أي تحديث لاحق للموقع).
 *
 * GET  ?facility_id=<id>            → { placeUrl } | 404 (عام — الرابط
 *                                      معلومة عمومية تُعرض في الزر أصلاً)
 * POST { facility_id, place_url }   → بذر/تحديث — يتطلب توكن مالك حي
 *                                      مُثبت الملكية عبر الباك اند قبل
 *                                      أي كتابة (لا بذر مجهول).
 *
 * أمان البذر: place_url فقط بصيغة قوقل ماب القانونية (?cid= أو /place/)،
 * وملكية المتجر تتحقق بتمرير توكن المالك إلى GET /owner/facility/{id}
 * في الباك اند — إن رفض أو المعرّف مختلف → 403.
 */

export const runtime = "nodejs";

/** صفحات مكان قوقل القانونية فقط — لا فتح روابط أجنبية من الحقل */
function canonicalPlaceUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (url.length === 0 || url.length > 512) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    const okHost =
      host === "maps.google.com" ||
      host === "www.google.com" ||
      host === "google.com" ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl";
    if (!okHost) return null;
    const isCid = u.searchParams.has("cid");
    const isPlace = u.pathname.startsWith("/maps/place/");
    if (!isCid && !isPlace) return null;
    return url;
  } catch {
    return null;
  }
}

interface Entry {
  placeUrl: string;
  seededAt: number;
}

const REGISTRY = new Map<number, Entry>();
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // أسبوع — ثم يعيد التاجر البذر

function remember(facilityId: number, placeUrl: string): void {
  if (REGISTRY.size >= 5000) {
    const oldest = REGISTRY.keys().next().value;
    if (oldest !== undefined) REGISTRY.delete(oldest);
  }
  REGISTRY.set(facilityId, { placeUrl, seededAt: Date.now() });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("facility_id"));
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ detail: "معرّف متجر غير صالح" }, { status: 422 });
  }
  const entry = REGISTRY.get(id);
  if (!entry || entry.seededAt + TTL_MS < Date.now()) {
    return Response.json(
      { detail: "لا توجد صفحة مخزّنة لهذا المتجر" },
      { status: 404 },
    );
  }
  return Response.json({
    facility_id: id,
    placeUrl: entry.placeUrl,
    source: "merchant-seeded",
  });
}

const BACKEND_BASE = `${
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com"
}/api/v1`;

export async function POST(req: Request) {
  let body: { facility_id?: unknown; place_url?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ detail: "طلب غير صالح" }, { status: 400 });
  }

  const facilityId = Number(body.facility_id);
  if (!Number.isInteger(facilityId) || facilityId <= 0) {
    return Response.json({ detail: "معرّف متجر غير صالح" }, { status: 422 });
  }
  const placeUrl = canonicalPlaceUrl(body.place_url);
  if (!placeUrl) {
    return Response.json(
      { detail: "الرابط يجب أن يكون صفحة مكان قوقل ماب قانونية (?cid= أو /maps/place/)" },
      { status: 422 },
    );
  }

  /* تحقق الملكية: توكن المالك الحي + المتجر يعود له فعلاً */
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer\s+.+/i.test(auth)) {
    return Response.json(
      { detail: "يجب الدخول بحساب مالك المتجر" },
      { status: 401 },
    );
  }
  try {
    const res = await fetch(`${BACKEND_BASE}/owner/facility/${facilityId}`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return Response.json(
        { detail: "تعذّر التحقق من ملكية المتجر" },
        { status: res.status === 401 ? 401 : 403 },
      );
    }
    const facility = (await res.json()) as { id?: unknown };
    if (facility?.id !== facilityId) {
      return Response.json(
        { detail: "هذا المتجر ليس في حسابك" },
        { status: 403 },
      );
    }
  } catch {
    return Response.json(
      { detail: "تعذّر التحقق من ملكية المتجر — أعد المحاولة" },
      { status: 502 },
    );
  }

  remember(facilityId, placeUrl);
  return Response.json({
    facility_id: facilityId,
    placeUrl,
    source: "merchant-seeded",
  });
}
