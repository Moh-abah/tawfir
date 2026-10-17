/**
 * POST /api/utils/resolve-map-link — حل روابط خرائط قوقل المختصرة
 * ═══════════════════════════════════════════════════════════════
 * طلب المالك: لصق رابط متجره من خرائط قوقل واستخراج الموقع منه.
 * الروابط المختصرة (maps.app.goo.gl/…) لا تحمل إحداثيات — يجب
 * متابعة التحويلات، والمتصفح لا يستطيع (CORS) — لذلك نتبعها هنا
 * خادمياً ونعيد الرابط النهائي الذي يحمل @lat,lng أو !3d!4d.
 *
 * روابط «صفحة مكان» (مثل مشاركة مطعم) تنتهي برابط لا يحمل إحداثيات صراحة
 * بل يحمل **رمز Plus Code** في اسم المكان (مثل PJCW+PJV) — نفكّه محلياً
 * بخوارزمية OLC الرسمية (src/lib/plus-code.ts) مع مرجع المدينة من الرابط،
 * ونعيد الإحداثيات + اسم المكان مع الرابط النهائي.
 *
 * أمان:
 *  - http/https فقط، بلا مضيفات داخلية (SSRF guard)
 *  - مهلة 8 ثوانٍ + سقف حجم القراءة
 *  - نُتبع حتى 5 قفزات يدوياً لنلتقط الرابط النهائي حتماً
 */

import { extractPlaceName, extractPlusCodeCoords } from "@/lib/plus-code";

export const runtime = "nodejs";

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[?::1\]?$|.*\.local$)/i;

function safeUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (PRIVATE_HOST_RE.test(u.hostname)) return null;
  return u;
}

/** قراءة أول redirect Location من رد 3xx (بلا متابعة) */
function locationOf(res: Response): string | null {
  const loc = res.headers.get("location");
  return loc && loc.trim() ? loc.trim() : null;
}

/** التقاط meta refresh من HTML قصير (بعض الراوطة تعيد صفحة قفزة) */
function metaRefreshUrl(html: string): string | null {
  const m = html
    .slice(0, 4096)
    .match(/http-equiv=["']?refresh["']?[^>]*url=([^"'>\s]+)/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  let body: { url?: unknown } = {};
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return Response.json(
      { detail: "طلب غير صالح" },
      { status: 400 },
    );
  }
  const start = safeUrl(body.url);
  if (!start) {
    return Response.json(
      { detail: "أدخل رابط خرائط صحيحاً يبدأ بـ http" },
      { status: 422 },
    );
  }

  let current = start;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(current, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            /* وكيل متصفح: بعض مختصرات قوقل تفرق بين طلبات الأجهزة */
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36",
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          },
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = locationOf(res);
        if (!loc) break;
        const next = safeUrl(
          loc.startsWith("http") ? loc : new URL(loc, current).toString(),
        );
        if (!next) break;
        current = next;
        continue;
      }

      /* رد نهائي: لو HTML قد يحمل meta refresh قفزة أخيرة */
      const ctype = res.headers.get("content-type") ?? "";
      if (ctype.includes("text/html")) {
        const text = await res.text();
        const meta = metaRefreshUrl(text);
        const next = meta
          ? safeUrl(meta.startsWith("http") ? meta : new URL(meta, current).toString())
          : null;
        if (next && next.toString() !== current.toString()) {
          current = next;
          continue;
        }
      }
      break;
    }
  } catch {
    /* مهلة/شبكة: نُرجع ما وصلنا إليه — قد يكون كافياً للتحليل */
  }

  const finalUrl = current.toString();

  /* استخراج الإحداثيات من الرابط النهائي نفسه (!3d!4d / @lat,lng / q=)
     ثم Plus Code إن لم توجد (روابط صفحات الأماكن المشاركة) */
  let lat: number | undefined;
  let lng: number | undefined;
  const m34 = finalUrl.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  const mAt = finalUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (m34) {
    lat = Number.parseFloat(m34[1]);
    lng = Number.parseFloat(m34[2]);
  } else if (mAt) {
    lat = Number.parseFloat(mAt[1]);
    lng = Number.parseFloat(mAt[2]);
  }
  if (
    (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng))
  ) {
    const fromPlusCode = extractPlusCodeCoords(finalUrl);
    if (fromPlusCode) {
      lat = fromPlusCode.lat;
      lng = fromPlusCode.lng;
    }
  }
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ finalUrl });
  }

  return Response.json({ finalUrl, lat, lng, name: extractPlaceName(finalUrl) });
}
