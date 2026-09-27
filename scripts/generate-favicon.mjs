/**
 * الجولة 28 — توليد favicon.ico متعدد الأحجام من أيقونة التطبيق.
 * ═══════════════════════════════════════════════════════════
 * المصدر: public/identity/tawfir-app-icon-512.png (أيقونة توفير الرسمية)
 * الناتج: public/favicon.ico (أحجام 16/32/48 مغلّفة في حاوية ICO)
 *
 * لماذا؟ المتصفح يطلب /favicon.ico افتراضيًا — غيابه كان سبب
 * «الأيقونة القديمة/الافتراضية» عند فتح الموقع من فيرسل أو الكاش.
 *
 * التشغيل:  bun scripts/generate-favicon.mjs   (يحتاج sharp — مثبت)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "public/identity/tawfir-app-icon-512.png");
const OUT = join(root, "public/favicon.ico");
const SIZES = [16, 32, 48];

const pngs = [];
for (const size of SIZES) {
  const buf = await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  pngs.push({ size, buf });
}

/* حاوية ICO يدوية: ICONDIR (6B) + ICONDIRENTRY (16B لكل صورة) + بيانات PNG.
   ICO الحديث يقبل إدخالات PNG مباشرة (مدعوم منذ Windows Vista / كل المتصفحات). */
const count = pngs.length;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(count, 4); // عدد الصور

let offset = 6 + 16 * count;
const entries = [];
for (const { size, buf } of pngs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  e.writeUInt8(size >= 256 ? 0 : size, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bpp
  e.writeUInt32LE(buf.length, 8); // حجم البيانات
  e.writeUInt32LE(offset, 12); // الإزاحة
  entries.push(e);
  offset += buf.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
writeFileSync(OUT, ico);
const kb = (statSync(OUT).size / 1024).toFixed(1);
console.log(`✓ favicon.ico (${SIZES.join("/")}px) — ${kb}KB → public/favicon.ico`);
