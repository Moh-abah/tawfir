#!/usr/bin/env bun
/**
 * optimize-assets.mjs — ضغط أصول الهوية الثقيلة + توليد لقطات المتجر
 * ═══════════════════════════════════════════════════════════════════
 * المشكلة: public/identity فيه ~39MB من صور PNG ضخمة (حتى 4.6MB للوحة).
 * الشعار المعروض بارتفاع 34-84px لا يحتاج صورة 4000px — كان يبطئ
 * شاشات الدخول ويجعل «الأيقونة لا تظهر» بسرعة.
 *
 * ما يفعل:
 *  1) يضغط صور الواجهة (lockups/mark/arabic/latin) إلى أحجام ويب مناسبة
 *     (ارتفاع ≤560px مع دعم ريتينا 2x) — بلا فقدان جودة ملحوظ.
 *  2) يضغط الأعمال الفنية الكبيرة (covers/arts) إلى عرض ≤1600px.
 *  3) يولّد لقطات المتجر الست public/screenshots/*.png (1080x1920)
 *     المطلوبة في manifest — كانت مفقودة فتُفشل فحوصات PWABuilder.
 *
 * التشغيل: bun scripts/optimize-assets.mjs   (idempotent)
 */
import sharp from "sharp";
import { mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ID = resolve(ROOT, "public/identity");
const SHOTS = resolve(ROOT, "public/screenshots");

const NAVY = "#0A1A2F";
const NAVY_DEEP = "#071426";
const NAVY_TEAL = "#0C2C36";
const GOLD = "#D4AF37";
const EMERALD = "#0E7D62";

async function optimize(path, maxDim, quality = 90) {
  const buf = await sharp(path)
    .resize({
      width: maxDim,
      height: maxDim,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ quality, compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
  const before = statSync(path).size;
  await sharp(buf).toFile(path);
  const after = statSync(path).size;
  return { before, after };
}

/* ─── 1) ضغط صور الواجهة ─── */
const UI_IMAGES = [
  ["lockup-full.png", 560],
  ["lockup-fulltra.png", 560],
  ["lockup-horizontal.png", 900],
  ["mark.png", 640],
  ["arabic.png", 640],
  ["latin.png", 640],
];

/* ─── 2) ضغط الأعمال الفنية ─── */
const ART_IMAGES = [
  ["tawfir-membership-card-art.png", 1600],
  ["tawfir-wave-background.png", 1600],
  ["tawfir-social-cover.png", 1600],
  ["tawfir-splash-screen.png", 1080],
  ["tawfir-empty-state.png", 1080],
  ["tawfir-success-state.png", 1080],
  ["tawfir-facility-cover.png", 1080],
  ["tawfir-app-icon.png", 512],
  ["tawfir-identity-master-reference.png", 1080],
];

console.log("[optimize-assets] ضغط أصول الهوية…");
let totalBefore = 0;
let totalAfter = 0;
for (const [name, dim] of [...UI_IMAGES, ...ART_IMAGES]) {
  const p = join(ID, name);
  if (!existsSync(p)) continue;
  try {
    const { before, after } = await optimize(p, dim);
    totalBefore += before;
    totalAfter += after;
    console.log(
      `  ${name}: ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024 / 1024).toFixed(2)}MB`
    );
  } catch (err) {
    console.warn(`  ⚠ ${name}: ${err.message}`);
  }
}
console.log(
  `[optimize-assets] الإجمالي: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
);

/* ─── 3) توليد لقطات المتجر (manifest screenshots) ─── */
console.log("[optimize-assets] توليد لقطات المتجر…");
mkdirSync(SHOTS, { recursive: true });

/* خلفية كحلية متدرجة بنفس هوية الدخول + هالتا زمرد/ذهب */
async function brandBackground(w, h) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${NAVY_DEEP}"/>
        <stop offset="32%" stop-color="${NAVY}"/>
        <stop offset="55%" stop-color="${NAVY_TEAL}"/>
        <stop offset="78%" stop-color="${NAVY}"/>
        <stop offset="100%" stop-color="${NAVY_DEEP}"/>
      </linearGradient>
      <radialGradient id="em" cx="85%" cy="10%" r="45%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gold" cx="10%" cy="90%" r="45%">
        <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#em)"/>
    <rect width="100%" height="100%" fill="url(#gold)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* شعار + اسم عربي في الأعلى */
async function brandHeader(w) {
  const mark = await sharp(join(ID, "mark.png")).resize({ height: 220 }).png().toBuffer();
  const arabic = await sharp(join(ID, "arabic.png")).resize({ height: 120 }).png().toBuffer();
  const markMeta = await sharp(mark).metadata();
  const arabicMeta = await sharp(arabic).metadata();
  const svg = Buffer.from(
    `<svg width="${w}" height="${(markMeta.height ?? 220) + (arabicMeta.height ?? 120) + 60}" xmlns="http://www.w3.org/2000/svg"></svg>`
  );
  return sharp(svg)
    .composite([
      { input: mark, top: 0, left: Math.round((w - (markMeta.width ?? 220)) / 2) },
      {
        input: arabic,
        top: (markMeta.height ?? 220) + 40,
        left: Math.round((w - (arabicMeta.width ?? 120)) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/* إطار هاتف أنيق بمحتوى مبسط (بطاقات ملونة بلمسات الهوية) */
function phoneMockup(w, h, content) {
  const pw = Math.min(760, Math.round(w * 0.7));
  const ph = Math.min(1150, Math.round(h * 0.62));
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${(w - pw) / 2}" y="${(h - ph) / 2}" width="${pw}" height="${ph}" rx="56"
      fill="#0F2238" fill-opacity="0.88" stroke="${GOLD}" stroke-opacity="0.35" stroke-width="4"/>
    ${content}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* بطاقات محتوى وهمية داخل الإطار — حسب نوع اللقطة */
function mockCards(kind) {
  switch (kind) {
    case "home":
      return `
        <rect x="90" y="150" width="290" height="60" rx="30" fill="${GOLD}" fill-opacity="0.9"/>
        <rect x="420" y="150" width="250" height="60" rx="30" fill="${EMERALD}" fill-opacity="0.85"/>
        <rect x="90" y="260" width="580" height="300" rx="28" fill="#123350" fill-opacity="0.9"/>
        <circle cx="170" cy="360" r="52" fill="${GOLD}" fill-opacity="0.7"/>
        <rect x="260" y="320" width="330" height="26" rx="13" fill="#ffffff" fill-opacity="0.85"/>
        <rect x="260" y="366" width="220" height="20" rx="10" fill="#ffffff" fill-opacity="0.45"/>
        <rect x="90" y="600" width="280" height="220" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="390" y="600" width="280" height="220" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="110" y="700" width="150" height="18" rx="9" fill="${GOLD}" fill-opacity="0.8"/>
        <rect x="410" y="700" width="150" height="18" rx="9" fill="${EMERALD}" fill-opacity="0.8"/>`;
    case "card":
      return `
        <rect x="90" y="200" width="580" height="360" rx="32" fill="${NAVY}" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="3"/>
        <circle cx="700" cy="260" r="130" fill="${GOLD}" fill-opacity="0.25"/>
        <rect x="130" y="250" width="180" height="30" rx="15" fill="#ffffff" fill-opacity="0.9"/>
        <rect x="130" y="320" width="420" height="44" rx="22" fill="${GOLD}" fill-opacity="0.9"/>
        <rect x="130" y="420" width="240" height="24" rx="12" fill="#ffffff" fill-opacity="0.5"/>
        <rect x="130" y="470" width="300" height="24" rx="12" fill="#ffffff" fill-opacity="0.35"/>`;
    case "facility":
      return `
        <rect x="90" y="160" width="580" height="240" rx="28" fill="#123350" fill-opacity="0.95"/>
        <circle cx="380" cy="280" r="80" fill="${EMERALD}" fill-opacity="0.5"/>
        <rect x="90" y="440" width="280" height="140" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="390" y="440" width="280" height="140" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="90" y="620" width="580" height="180" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="130" y="680" width="200" height="22" rx="11" fill="${GOLD}" fill-opacity="0.8"/>`;
    case "login":
      return `
        <rect x="140" y="200" width="480" height="420" rx="32" fill="#10233a" stroke="#ffffff" stroke-opacity="0.15" stroke-width="3"/>
        <rect x="190" y="270" width="380" height="64" rx="32" fill="#ffffff" fill-opacity="0.12"/>
        <rect x="190" y="370" width="380" height="64" rx="32" fill="#ffffff" fill-opacity="0.12"/>
        <rect x="190" y="480" width="380" height="72" rx="36" fill="${EMERALD}"/>
        <circle cx="380" cy="240" r="44" fill="${GOLD}" fill-opacity="0.9"/>`;
    case "products":
      return `
        <rect x="90" y="170" width="580" height="120" rx="24" fill="#123350" fill-opacity="0.95"/>
        <rect x="130" y="220" width="200" height="24" rx="12" fill="#ffffff" fill-opacity="0.8"/>
        <rect x="90" y="330" width="580" height="140" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="90" y="500" width="580" height="140" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="90" y="670" width="580" height="140" rx="24" fill="#123350" fill-opacity="0.9"/>
        <rect x="560" y="440" width="90" height="40" rx="20" fill="${GOLD}" fill-opacity="0.85"/>
        <rect x="560" y="610" width="90" height="40" rx="20" fill="${GOLD}" fill-opacity="0.85"/>`;
    case "import":
      return `
        <rect x="140" y="220" width="480" height="380" rx="32" fill="#10233a" stroke="${EMERALD}" stroke-opacity="0.45" stroke-width="3" stroke-dasharray="14 10"/>
        <rect x="330" y="330" width="100" height="80" rx="16" fill="${EMERALD}" fill-opacity="0.85"/>
        <rect x="210" y="450" width="340" height="56" rx="28" fill="${GOLD}" fill-opacity="0.9"/>
        <rect x="250" y="360" width="60" height="20" rx="10" fill="#ffffff" fill-opacity="0.5"/>`;
    default:
      return "";
  }
}

/* شريط سفلي ذهبي (لمسة هوية) */
function goldBar(w, h) {
  const svg = `<svg width="${w}" height="26" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${EMERALD}"/>
      <stop offset="50%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${EMERALD}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" rx="13" fill="url(#g)" fill-opacity="0.85"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const W = 1080;
const H = 1920;
const SPECS = [
  ["customer-home.png", "home"],
  ["customer-card.png", "card"],
  ["customer-facility.png", "facility"],
  ["owner-login.png", "login"],
  ["owner-products.png", "products"],
  ["owner-import.png", "import"],
];

for (const [name, kind] of SPECS) {
  const out = join(SHOTS, name);
  if (existsSync(out)) {
    console.log(`  ${name}: موجود — تخطّي`);
    continue;
  }
  try {
    const bg = await brandBackground(W, H);
    const header = await brandHeader(W);
    const headerMeta = await sharp(header).metadata();
    const headerH = headerMeta.height ?? 400;
    const mock = await phoneMockup(W, H - headerH - 180, mockCards(kind));
    const mockMeta = await sharp(mock).metadata();
    const bar = await goldBar(Math.round(W * 0.35), 26);

    await sharp(bg)
      .composite([
        { input: header, top: 120, left: 0 },
        {
          input: mock,
          top: headerH + 170,
          left: 0,
        },
        {
          input: bar,
          top: H - 90,
          left: Math.round((W - Math.round(W * 0.35)) / 2),
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  ${name}: وُلّد (${(statSync(out).size / 1024).toFixed(0)}KB)`);
  } catch (err) {
    console.warn(`  ⚠ ${name}: ${err.message}`);
  }
}

/* ─── 4) شعار شاشة الإقلاع — BOOT LOGO data URI (الجولة 23) ─── */
/* شاشة السبلاش (layout.tsx) تحتاج الشعار المفرغ الرسمي mark.png
   فور رسم HTML الأولي — قبل أي طلب شبكة (سلوك Native حقيقي).
   نولّد نسخة 256px مضغوطة (palette) ~16KB كـ data URI داخل
   src/lib/pwa/boot-logo.ts ليستوردها layout مباشرة. */
console.log("[optimize-assets] توليد شعار الإقلاع (boot-logo)…");
try {
  const bootBuf = await sharp(join(ID, "mark.png"))
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, quality: 85 })
    .toBuffer();
  const dataUri = `data:image/png;base64,${bootBuf.toString("base64")}`;
  const outLogo = join(ROOT, "src/lib/pwa/boot-logo.ts");
  const header = `/**
 * ⚠️ ملف مولّد آلياً بواسطة scripts/optimize-assets.mjs — لا تعدّل يدوياً.
 * شعار توفير المفرغ الرسمي (public/identity/mark.png) بحجم 256px
 * مضغوط (~${Math.round(bootBuf.length / 1024)}KB) كـ data URI —
 * يُستخدم في شاشة الإقلاع (#tawfir-boot) ليُرسم فوراً مع HTML الأولي
 * بلا أي طلب شبكة (إحساس Native حقيقي + يعمل أوفلاين من أول لحظة).
 * يعاد توليده بتشغيل: bun scripts/optimize-assets.mjs
 */
`;
  const body = `export const BOOT_LOGO_SRC = ${JSON.stringify(dataUri)};

/** الأبعاد الأصلية للصورة (بكسل) — الحجم المعروض يتحكم به CSS */
export const BOOT_LOGO_WIDTH = 256;
export const BOOT_LOGO_HEIGHT = 256;
`;
  await (await import("node:fs/promises")).writeFile(outLogo, header + body, "utf8");
  console.log(`  boot-logo.ts: ${Math.round((dataUri.length) / 1024)}KB base64 (شعار mark 256px مفرغ)`);
} catch (err) {
  console.warn(`  ⚠ boot-logo: ${err.message}`);
}

console.log("[optimize-assets] ✓ اكتمل");
