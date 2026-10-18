/**
 * POST /api/utils/resolve-map-link — حل روابط خرائط قوقل المختصرة
 * ═══════════════════════════════════════════════════════════════
 * طلب المالك: لصق رابط متجره من خرائط قوقل واستخراج الموقع منه
 * (الجولة 48: «مفروض الحساب يعمل ويعرض بيانات متجري في قوقل ماب»).
 *
 * استراتيجيات الحل (بالترتيب):
 *
 *  1) إحداثيات الرابط النهائي صراحة (!3d!4d / @lat,lng / q=lat,lng)
 *     — روابط «المشاركة من تطبيق الجوال» الغنية.
 *  2) رمز Plus Code في اسم المكان داخل الرابط — نفكه بخوارزمية OLC
 *     الرسمية (src/lib/plus-code.ts) بمرجع المدينة من الرابط.
 *  3) **FTID → CID → embed** (الجديدة — الجولة 48): روابط «صفحة مكان»
 *     التي تنتهي بمعرّف المكان FTID (data=…!1s0x…:0x…) بلا إحداثيات.
 *     الجزء الثاني من FTID هو معرّف المحتوى CID، وقوقل يخدمه في
 *     https://maps.google.com/maps?cid=<CID>&output=embed — صفحة صغيرة
 *     (~4KB) تحمل بيانات المكان كاملة: الإحداثيات [lat,lng]، الاسم،
 *     العنوان، الهاتف، التقييم، التصنيف، الموقع الإلكتروني، Plus Code،
 *     وPlace ID — مع تحقق سلامة أن FTID الصفحة يطابق FTID الرابط.
 *  4) إن فشل كل شيء: نُرجع الرابط النهائي + الاسم إن استُخرج (partial).
 *
 * أمان:
 *  - http/https فقط، بلا مضيفات داخلية (SSRF guard)
 *  - مهلة 8 ثوانٍ لكل طلب + سقف حجم القراءة الضمني عبر text()
 *  - نُتبع حتى 5 قفزات يدوياً لنلتقط الرابط النهائي حتماً
 */

import { extractPlaceName, extractPlusCodeCoords } from "@/lib/plus-code";

export const runtime = "nodejs";

const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|\[?::1\]?$|.*\.local$)/i;

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** حروف التحكم الاتجاهية تفسد العرض — تُنظف من كل النصوص المعادة */
const BIDI_RE = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

function clean(s: string): string {
  return s.replace(BIDI_RE, "").trim();
}

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

/* ─── الاستراتيجية 3: FTID → CID → صفحة embed ──────────────────────── */

/** FTID من الرابط النهائي (data=…!1s0x…:0x…) */
const FTID_RE = /1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/;

/** بيانات المكان الغنية كما ترد من صفحة embed */
interface GooglePlace {
  ftid: string;
  lat: number;
  lng: number;
  name: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  category: string | null;
  plusCode: string | null;
  placeId: string | null;
  cidUrl: string;
}

/** فك سلسلة JSON داخل HTML (\u… / \" …) */
function unescapeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
}

/** تحليل بيانات المكان من HTML صفحة embed مع تحقق FTID */
function parseEmbedPlace(html: string, ftid: string, cidUrl: string): GooglePlace | null {
  /* السجل الرئيسي: ["0x…:0x…","الاسم الكامل مع العنوان",[lat,lng],"CID"]
     — النمط ثابت في بداية كائن المكان داخل initEmbed(...) */
  const main = html.match(
    /\["(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)","((?:[^"\\]|\\.)*)",\[(-?\d+\.\d+),(-?\d+\.\d+)\],"(\d+)"/,
  );
  if (!main) return null;
  if (main[1].toLowerCase() !== ftid.toLowerCase()) return null; /* تحقق السلامة */
  const lat = Number.parseFloat(main[3]);
  const lng = Number.parseFloat(main[4]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  /* ما يلي مباشرة: قد يسبق قوس إغلاق للسجل الخارجي — الاسم للعرض ثم مصفوفة عنوان */
  const tailStart = (main.index ?? 0) + main[0].length;
  const tail = html.slice(tailStart, tailStart + 1600);
  const afterCid = tail.match(
    /^[\]\s]*,"((?:[^"\\]|\\.)*)",\[((?:"(?:[^"\\]|\\.)*"(?:,|\]))+)/,
  );

  let name: string | null = null;
  let address: string | null = null;
  if (afterCid) {
    const display = clean(unescapeJsonString(afterCid[1]));
    name = display.length > 2 ? display : null;
    const parts = [...afterCid[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => clean(unescapeJsonString(m[1])))
      .filter(Boolean);
    if (parts.length) address = parts.join("، ");
  }

  /* بقية الحقول — أفضل جهد (decorative، فشلها لا يمنع النجاح) */
  const ratingM = tail.match(
    /,\s*(\d(?:\.\d+)?)\s*,\s*"عدد التعليقات:\s*([\d٠-٩٬,]+)"/,
  );
  const ratingRaw = ratingM ? Number.parseFloat(ratingM[1]) : null;
  const rating =
    ratingRaw !== null && Number.isFinite(ratingRaw)
      ? Math.round(ratingRaw * 10) / 10
      : null;
  const reviewCount = ratingM ? Number.parseInt(ratingM[2].replace(/[^\d]/g, ""), 10) : null;

  const websiteM = tail.match(/\["(https:\/\/[^"]+)","((?:[^"\\]|\\.)*)"/);
  const website =
    websiteM && !websiteM[1].includes("search.google.com") ? websiteM[1] : null;

  /* التصنيف: يلي مصفوفة الموقع مباشرة (],"سوبرماركت") — البديل الموثوق:
     التصنيف يلي العنوان الكامل ("مطعم","…، المملكة العربية السعودية").
     رفض الأرقام في المرشح يستبعد قطع العنوان (أحياء/أكواد بريدية) */
  let category: string | null = null;
  const tailBase = websiteM
    ? tail.slice(
      (websiteM.index ?? 0) + websiteM[0].length,
      (websiteM.index ?? 0) + websiteM[0].length + 300,
    )
    : null;
  const catCandidates: Array<string | null> = [];
  if (tailBase) {
    catCandidates.push(tailBase.match(/\],"((?:[^"\\]|\\.)*)"/)?.[1] ?? null);
  }
  /* العنوان الكامل بعد التصنيف ("مطعم","WJ43+HR5، طريق …، المملكة…")
     — أغنى من مصفوفة القطع (يشمل Plus Code) — نفضّله عند توفره.
     التصنيف نفسه يُبحث في الجزء بعد رابط المراجعات فقط — قبلها
     مصفوفة العنوان وأزواجها تخدع النمط (طريق…، العارض، الرياض…، المملكة) */
  const afterReviewsIdx = tail.indexOf("https://search.google.com/local/reviews");
  const afterReviews = afterReviewsIdx >= 0 ? tail.slice(afterReviewsIdx) : null;
  if (afterReviews) {
    catCandidates.push(
      afterReviews.match(
        /"([^"\d\\]{1,40})","((?:[^"\\]|\\.)+، (?:المملكة العربية السعودية|اليمن))"/,
      )?.[1] ?? null,
    );
  }
  for (const cand of catCandidates) {
    if (cand) {
      const txt = clean(unescapeJsonString(cand));
      /* استبعد التوقيعات والروابط — التصنيف نص قصير بلا روابط/مفاتيح */
      if (
        txt.length > 1 &&
        txt.length < 60 &&
        !txt.startsWith(",") &&
        !txt.includes("http") &&
        !txt.includes("AOvVaw")
      ) {
        category = txt;
        break;
      }
    }
  }
  const fullAddressM = afterReviews?.match(
    /"((?:[^"\\]|\\.)+، (?:المملكة العربية السعودية|اليمن))"/,
  );
  if (fullAddressM) {
    const fullAddress = clean(unescapeJsonString(fullAddressM[1]));
    if (!address || fullAddress.length > address.length) address = fullAddress;
  }

  const phone = html.match(/"tel:(\+?\d{7,15})"/)?.[1] ?? null;
  /* Plus Code العالمي: ["7HP8VJFG+W5"] — الرموز النصية المختلطة لا تطابق */
  const plusCode =
    html.match(/\["([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3})"\]/)?.[1] ??
    null;
  const placeId = html.match(/"ChIJ[0-9A-Za-z_-]{10,}"/)?.[0].replace(/"/g, "") ?? null;

  return {
    ftid,
    lat,
    lng,
    name,
    address,
    phone,
    rating,
    reviewCount: reviewCount !== null && Number.isFinite(reviewCount) ? reviewCount : null,
    website,
    category,
    plusCode,
    placeId,
    cidUrl,
  };
}

/** جلب بيانات المكان عبر صفحة embed الرسمية بمفتاح CID */
async function resolveFtidPlace(ftid: string): Promise<GooglePlace | null> {
  const h2 = ftid.split(":")[1];
  if (!h2?.startsWith("0x")) return null;
  let cid: string;
  try {
    cid = BigInt(h2).toString(); /* الجزء الثاني من FTID = CID عشري */
  } catch {
    return null;
  }
  const cidUrl = `https://maps.google.com/?cid=${cid}`;
  const url = `https://maps.google.com/maps?cid=${cid}&hl=ar&output=embed`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html: string;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DESKTOP_UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ar, en;q=0.5",
      },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  return parseEmbedPlace(html, ftid, cidUrl);
}

/* ─── المعالج الرئيسي ─────────────────────────────────────────────── */

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

  /* ── استراتيجية 1+2: الإحداثيات من الرابط النهائي نفسه ── */
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

  /* ── بيانات المتجر الغنية: كل رابط يحمل FTID يستحق جلبها من embed ──
     (الروابط الغنية تحمل الإحداثيات و FTID معاً — ندمج: إحداثيات الرابط
     الأدق + اسم/عنوان/هاتف/تقييم embed — الجولة 48: «يعرض بيانات متجري») */
  const ftidM = finalUrl.match(FTID_RE);
  const place = ftidM ? await resolveFtidPlace(ftidM[1]) : null;

  if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (place) {
      return Response.json({
        finalUrl: place.cidUrl,
        lat,
        lng,
        name: place.name ?? extractPlaceName(finalUrl),
        address: place.address,
        phone: place.phone,
        rating: place.rating,
        reviewCount: place.reviewCount,
        website: place.website,
        category: place.category,
        plusCode: place.plusCode,
        placeId: place.placeId,
        source: "google-link-plus-embed",
      });
    }
    return Response.json({ finalUrl, lat, lng, name: extractPlaceName(finalUrl) });
  }

  /* ── استراتيجية 3: FTID → CID → embed (روابط صفحات الأماكن الفقيرة) ── */
  if (place) {
    return Response.json({
      finalUrl: place.cidUrl /* رابط قوقل القانوني — يفتح نفس المتجر حتماً */,
      lat: place.lat,
      lng: place.lng,
      name: place.name ?? extractPlaceName(finalUrl),
      address: place.address,
      phone: place.phone,
      rating: place.rating,
      reviewCount: place.reviewCount,
      website: place.website,
      category: place.category,
      plusCode: place.plusCode,
      placeId: place.placeId,
      source: "google-cid-embed",
    });
  }

  /* ── استراتيجية 4: كل شيء فشل — نُرجع ما لدينا (الواجهة ترشد المستخدم) ── */
  return Response.json({ finalUrl, name: extractPlaceName(finalUrl) });
}
