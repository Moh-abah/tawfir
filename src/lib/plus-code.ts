/**
 * فك رموز Plus Code (Open Location Code) من روابط خرائط قوقل — توفير
 * ═══════════════════════════════════════════════════════════════════════
 * طلب المالك: لصق رابط متجره من خرائط قوقل يستخرج الموقع كاملاً.
 * الروابط المشارَكة من «صفحة مكان» لا تحمل إحداثيات صراحة (!3d!4d/‏@lat,lng)
 * بل تحمل **رمز Plus Code** في بداية اسم المكان، مثل:
 *   https://www.google.com/maps/place/PJCW+PJV+Vibe+coffee+house,.../data=...
 * الرمز القصير (7 أرقام مثل PJCW+PJV) يحتاج نقطة مرجعية قريبة لاسترجاعه —
 * نأخذها من اسم المدينة الظاهر في الرابط نفسه (جدول مدن السوقين أدناه).
 *
 * نقل مطابق لخوارزمية Google الرسمية (open-location-code، Apache-2.0):
 * زوجي أحرف base-20 (دقة 20°→1°→0.05°→0.0025°→0.000125°) + شبكة تنقيح 4×5.
 * مؤكدة بمقارنة مع المكتبة الرسمية على رمز المالك ورموز مرجعية.
 */

/* ─── ثوابت OLC (مطابقة للمكتبة الرسمية) ──────────────────────────── */
const CODE_ALPHABET = "23456789CFGHJMPQRVWX";
const ENCODING_BASE = CODE_ALPHABET.length; // 20
const SEPARATOR = "+";
const SEPARATOR_POSITION = 8;
const PADDING_CHARACTER = "0";
const PAIR_CODE_LENGTH = 10;
const PAIR_RESOLUTIONS = [20.0, 1.0, 0.05, 0.0025, 0.000125];
const GRID_COLUMNS = 4;
const GRID_ROWS = 5;
const GRID_SIZE_DEGREES = 0.000125;
const LATITUDE_MAX = 90;
const LONGITUDE_MAX = 180;

const clipLatitude = (v: number): number => Math.min(90, Math.max(-90, v));

const normalizeLongitude = (v: number): number => {
  while (v < -180) v += 360;
  while (v >= 180) v -= 360;
  return v;
};

interface CodeArea {
  latitudeLo: number;
  longitudeLo: number;
  latitudeHi: number;
  longitudeHi: number;
  codeLength: number;
  latitudeCenter: number;
  longitudeCenter: number;
}

const makeCodeArea = (
  latitudeLo: number,
  longitudeLo: number,
  latitudeHi: number,
  longitudeHi: number,
  codeLength: number,
): CodeArea => ({
  latitudeLo,
  longitudeLo,
  latitudeHi,
  longitudeHi,
  codeLength,
  latitudeCenter: Math.min(latitudeLo + (latitudeHi - latitudeLo) / 2, LATITUDE_MAX),
  longitudeCenter: Math.min(longitudeLo + (longitudeHi - longitudeLo) / 2, LONGITUDE_MAX),
});

/** شريط الأحرف الصالح فقط (يرفض 0/1/A/Z…) */
function stripInvalid(code: string): string | null {
  const upper = code.toUpperCase().replace(/\s+/g, "");
  let out = "";
  for (const ch of upper) {
    if (ch === SEPARATOR || ch === PADDING_CHARACTER) out += ch;
    else if (CODE_ALPHABET.includes(ch)) out += ch;
    else return null; // حرف خارج الأبجدية → ليس رمز OLC
  }
  return out;
}

/** هل الرمز كامل (الفاصل في الموضع 8)؟ */
function isFullCode(code: string): boolean {
  const idx = code.indexOf(SEPARATOR);
  return idx === SEPARATOR_POSITION;
}

/** فك الأزواج (10 أحرف أولى) — مطابق لـdecodePairsSequence الرسمية */
function decodePairsSequence(code: string, offset: 0 | 1): [number, number] {
  let i = 0;
  let value = 0;
  while (i * 2 + offset < code.length) {
    value +=
      CODE_ALPHABET.indexOf(code.charAt(i * 2 + offset)) * PAIR_RESOLUTIONS[i];
    i += 1;
  }
  return [value, value + PAIR_RESOLUTIONS[i - 1]];
}

function decodePairs(code: string): CodeArea {
  const latitude = decodePairsSequence(code, 0);
  const longitude = decodePairsSequence(code, 1);
  return makeCodeArea(
    latitude[0] - LATITUDE_MAX,
    longitude[0] - LONGITUDE_MAX,
    latitude[1] - LATITUDE_MAX,
    longitude[1] - LONGITUDE_MAX,
    code.length,
  );
}

/** فك شبكة التنقيح (ما بعد 10 أحرف) */
function decodeGrid(code: string): CodeArea {
  let latitudeLo = 0.0;
  let longitudeLo = 0.0;
  let latPlaceValue = GRID_SIZE_DEGREES;
  let lngPlaceValue = GRID_SIZE_DEGREES;
  let i = 0;
  while (i < code.length) {
    const codeIndex = CODE_ALPHABET.indexOf(code.charAt(i));
    const row = Math.floor(codeIndex / GRID_COLUMNS);
    const col = codeIndex % GRID_COLUMNS;
    latPlaceValue /= GRID_ROWS;
    lngPlaceValue /= GRID_COLUMNS;
    latitudeLo += row * latPlaceValue;
    longitudeLo += col * lngPlaceValue;
    i += 1;
  }
  return makeCodeArea(
    latitudeLo,
    longitudeLo,
    latitudeLo + latPlaceValue,
    longitudeLo + lngPlaceValue,
    code.length,
  );
}

/** فك رمز كامل → منطقة مركزها الإحداثية */
function decodeFullCode(code: string): CodeArea | null {
  const cleaned = code.replace(SEPARATOR, "").replace(/0+/g, "").toUpperCase();
  const pairs = decodePairs(cleaned.substring(0, PAIR_CODE_LENGTH));
  if (cleaned.length <= PAIR_CODE_LENGTH) return pairs;
  const grid = decodeGrid(cleaned.substring(PAIR_CODE_LENGTH));
  return makeCodeArea(
    pairs.latitudeLo + grid.latitudeLo,
    pairs.longitudeLo + grid.longitudeLo,
    pairs.latitudeLo + grid.latitudeHi,
    pairs.longitudeLo + grid.longitudeHi,
    pairs.codeLength + grid.codeLength,
  );
}

/** ترميز نقطة → رمز كامل (10 أرقام) — مطابق لـencodePairs الرسمية */
function encodeFullCode(latitude: number, longitude: number): string {
  let adjustedLatitude = clipLatitude(latitude) + LATITUDE_MAX;
  let adjustedLongitude = normalizeLongitude(longitude) + LONGITUDE_MAX;
  let code = "";
  let digitCount = 0;
  while (digitCount < PAIR_CODE_LENGTH) {
    const placeValue = PAIR_RESOLUTIONS[Math.floor(digitCount / 2)];
    let digitValue = Math.floor(adjustedLatitude / placeValue);
    adjustedLatitude -= digitValue * placeValue;
    code += CODE_ALPHABET.charAt(digitValue);
    digitCount += 1;
    digitValue = Math.floor(adjustedLongitude / placeValue);
    adjustedLongitude -= digitValue * placeValue;
    code += CODE_ALPHABET.charAt(digitValue);
    digitCount += 1;
    if (digitCount === SEPARATOR_POSITION && digitCount < PAIR_CODE_LENGTH) {
      code += SEPARATOR;
    }
  }
  return code;
}

/** استرجاع الرمز القصير بأقرب مرجع — مطابق لـrecoverNearest الرسمية */
function recoverNearest(
  shortCode: string,
  referenceLatitude: number,
  referenceLongitude: number,
): CodeArea | null {
  const paddingLength = SEPARATOR_POSITION - shortCode.indexOf(SEPARATOR);
  const resolution = Math.pow(20, 2 - paddingLength / 2);
  const areaToEdge = resolution / 2.0;

  const refLat = clipLatitude(referenceLatitude);
  const refLng = normalizeLongitude(referenceLongitude);
  const roundedLatitude = Math.floor(refLat / resolution) * resolution;
  const roundedLongitude = Math.floor(refLng / resolution) * resolution;

  const padded =
    encodeFullCode(roundedLatitude, roundedLongitude).substring(0, paddingLength) +
    shortCode;
  const area = decodeFullCode(padded);
  if (!area) return null;

  let latCenter = area.latitudeCenter;
  let lngCenter = area.longitudeCenter;
  const latDiff = latCenter - refLat;
  if (latDiff > areaToEdge) latCenter -= resolution;
  else if (latDiff < -areaToEdge) latCenter += resolution;
  const lngDiff = lngCenter - refLng;
  if (lngDiff > areaToEdge) lngCenter -= resolution;
  else if (lngDiff < -areaToEdge) lngCenter += resolution;

  const recovered = decodeFullCode(
    encodeFullCode(latCenter, lngCenter).substring(0, area.codeLength + 1) /* مع الفاصل */,
  );
  if (recovered && recovered.codeLength >= area.codeLength) return recovered;
  return { ...area, latitudeCenter: latCenter, longitudeCenter: lngCenter };
}

/* ─── جدول مراجع مدن السوقين (السعودية + اليمن) ──────────────────── */
/** الاسترجاع يصح ما دام المرجع داخل نصف درجة من المكان — المراكز أدناه تكفي مدن السوقين */
const CITY_REFERENCES: ReadonlyArray<{ name: string; lat: number; lng: number }> = [
  { name: "الرياض", lat: 24.7136, lng: 46.6753 },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { name: "جدة", lat: 21.4858, lng: 39.1925 },
  { name: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { name: "مكة", lat: 21.3891, lng: 39.8579 },
  { name: "المكة", lat: 21.3891, lng: 39.8579 },
  { name: "Mecca", lat: 21.3891, lng: 39.8579 },
  { name: "المدينة", lat: 24.5247, lng: 39.5692 },
  { name: "Medina", lat: 24.5247, lng: 39.5692 },
  { name: "الدمام", lat: 26.4207, lng: 50.0888 },
  { name: "Dammam", lat: 26.4207, lng: 50.0888 },
  { name: "الخبر", lat: 26.2794, lng: 50.208 },
  { name: "الظهران", lat: 26.2361, lng: 50.0393 },
  { name: "الأحساء", lat: 25.3833, lng: 49.5867 },
  { name: "الهفوف", lat: 25.3833, lng: 49.5867 },
  { name: "الطائف", lat: 21.2854, lng: 40.4184 },
  { name: "أبها", lat: 18.2465, lng: 42.5117 },
  { name: "خميس مشيط", lat: 18.3, lng: 42.7333 },
  { name: "تبوك", lat: 28.3835, lng: 36.5662 },
  { name: "بريدة", lat: 26.326, lng: 43.975 },
  { name: "حائل", lat: 27.5114, lng: 41.7208 },
  { name: "نجران", lat: 17.4917, lng: 44.1322 },
  { name: "جيزان", lat: 16.8892, lng: 42.5511 },
  { name: "ينبع", lat: 24.0895, lng: 38.0618 },
  { name: "صنعاء", lat: 15.3694, lng: 44.191 },
  { name: "Sanaa", lat: 15.3694, lng: 44.191 },
  { name: "عدن", lat: 12.7855, lng: 45.0187 },
  { name: "Aden", lat: 12.7855, lng: 45.0187 },
  { name: "تعز", lat: 13.5789, lng: 44.0219 },
  { name: "الحديدة", lat: 14.7978, lng: 42.9545 },
  { name: "المكلا", lat: 14.5425, lng: 49.1242 },
  { name: "إب", lat: 13.9631, lng: 44.1847 },
  { name: "مأرب", lat: 15.4625, lng: 45.3266 },
  { name: "سيئون", lat: 15.9354, lng: 48.7819 },
];

/**
 * نمط رمز Plus Code داخل نص/رابط: 2-8 أحرف قبل الفاصل + 2-3 بعده.
 * مثال: PJCW+PJV · 7HP8+PJV · 7HP8PJCW+PJV
 */
const PLUS_CODE_RE =
  /\b([23456789CFGHJMPQRVWX]{2})([23456789CFGHJMPQRVWX]{2,6})(?:\+|%2B)([23456789CFGHJMPQRVWX]{2,3})\b/i;

export interface PlusCodeResult {
  lat: number;
  lng: number;
  /** الرمز كما وُجد (للعرض) */
  code: string;
}

/**
 * استخراج إحداثيات Plus Code من نص رابط خرائط قوقل.
 * يدعم: رموزاً كاملة (فاصل في الموضع 8) وقصيرة (استرجاع بمرجع المدينة).
 */
export function extractPlusCodeCoords(urlText: string): PlusCodeResult | null {
  /* فك الترميز أولاً كي يظهر %2B كـ + وأسماء المدن العربية ظاهرة */
  let decoded = urlText;
  try {
    decoded = decodeURIComponent(urlText);
  } catch {
    /* نص غير مفكوك — نكمل كما هو */
  }
  const m = decoded.match(PLUS_CODE_RE);
  if (!m) return null;
  const code = `${m[1]}${m[2]}${SEPARATOR}${m[3]}`;
  const cleaned = stripInvalid(code);
  if (!cleaned || !cleaned.includes(SEPARATOR)) return null;

  if (isFullCode(cleaned)) {
    const area = decodeFullCode(cleaned);
    if (!area) return null;
    return { lat: area.latitudeCenter, lng: area.longitudeCenter, code };
  }

  /* رمز قصير → نحتاج مدينة مرجعية من نص الرابط */
  const ref = CITY_REFERENCES.find((c) => decoded.includes(c.name));
  if (!ref) return null;
  const area = recoverNearest(cleaned, ref.lat, ref.lng);
  if (!area) return null;
  return { lat: area.latitudeCenter, lng: area.longitudeCenter, code };
}

/** اسم المكان من مسار /place/<اسم>/… (لعرضه للمستخدم) */
export function extractPlaceName(urlText: string): string | null {
  try {
    const u = new URL(urlText);
    const m = u.pathname.match(/\/place\/([^/]+)/);
    if (!m) return null;
    const name = decodeURIComponent(m[1])
      .replace(PLUS_CODE_RE, "")
      .replace(/\+/g, " ") /* المسافات المرمّزة في مسار قوقل */
      .replace(/\s+/g, " ")
      .trim();
    return name.length > 2 ? name : null;
  } catch {
    return null;
  }
}
