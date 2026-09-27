/**
 * الجولة 28 — حارس الأصول: يمنع تكرار «الصور لا تظهر على النشر».
 * ═══════════════════════════════════════════════════════════════
 * المشكلة التي حصلت: دمج جزئي — كود يشير إلى أصول public غير موجودة
 * (og:image محذوف ← معاينة واتساب/فيرسل بلا صورة، favicon غائب).
 *
 * ماذا يفعل؟ يمسح كل ملفات src/ + قوالب public عن مراجع أصول محلية
 * (/identity/…، /icons/…، /screenshots/…، /fonts/…، /favicon.ico…)
 * ويتأكد أن كل مسار مذكور يوجد فعلًا داخل public/ — وإلا يفشل
 * بالخطأ 1 مع قائمة المفقودات، فلا يصل الكسر إلى النشر أبدًا.
 *
 * التشغيل:  bun run check:assets   (يعمل تلقائيًا قبل كل build)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "src");
const PUBLIC = join(root, "public");

/* مجلدات public التي نعتبر محتواها «أصولًا محلية قابلة للمرجعة» */
const ASSET_DIRS = ["identity", "icons", "screenshots", "fonts", "widgets", "sounds"];
/* ملفات على الجذر تُفحص أيضًا */
const ROOT_FILES = ["favicon.ico", "logo.svg", "logo-mark.svg", "icon.svg", "native-offline.html"];

/* 1) اجمع الأصول الموجودة فعلًا في public */
const existing = new Set();
for (const dir of ASSET_DIRS) {
  const dirPath = join(PUBLIC, dir);
  if (!existsSync(dirPath)) continue;
  const walk = (p) => {
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      if (statSync(full).isDirectory()) walk(full);
      else existing.add(`/${dir}/${full.slice(dirPath.length + 1).split("\\").join("/")}`);
    }
  };
  walk(dirPath);
}
for (const f of ROOT_FILES) if (existsSync(join(PUBLIC, f))) existing.add(`/${f}`);

/* 2) امسح src + ملفات public النصية (html/js) عن مراجع المسارات */
const refs = new Map(); // path -> [ملفات]
const scan = (dir, exts) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { scan(full, exts); continue; }
    if (!exts.some((e) => name.endsWith(e))) continue;
    const text = readFileSync(full, "utf8");
    // كل دلالة "/identity/xxx.png" أو "/icons/…" داخل النص
    const re = new RegExp(
      `["'(\`]((?:/${ASSET_DIRS.join("|")})/[A-Za-z0-9._\\-/]+\\.(?:png|jpg|jpeg|svg|webp|ico|html|mp3|wav|json))["'\\))]`,
      "g",
    );
    for (const m of text.matchAll(re)) {
      const p = m[1].split("?")[0];
      if (!refs.has(p)) refs.set(p, []);
      refs.get(p).push(full.slice(root.length + 1));
    }
    // ملفات الجذر: favicon.ico / logo.svg … (داخل اقتباسات فقط —
    // لا نصيد إشاراتها في التعليقات التوثيقية)
    for (const f of ROOT_FILES) {
      const esc = f.replace(/\./g, "\\.");
      const quoted = new RegExp(`["'\`\\(]/${esc}["'\`\\)]`);
      if (quoted.test(text)) {
        if (!refs.has(`/${f}`)) refs.set(`/${f}`, []);
        refs.get(`/${f}`).push(full.slice(root.length + 1));
      }
    }
  }
};
scan(SRC, [".ts", ".tsx", ".css", ".mjs"]);
scan(PUBLIC, [".html", ".js"]);

/* 3) قارن */
const missing = [...refs.keys()].filter((p) => !existing.has(p));
if (missing.length) {
  console.error("\n❌ حارس الأصول — مراجع لأصول غير موجودة في public/:\n");
  for (const p of missing) {
    console.error(`   ${p}`);
    for (const f of refs.get(p).slice(0, 3)) console.error(`      ↳ مستخدم في: ${f}`);
  }
  console.error("\n   الحل: انسخ الأصل من الحزمة، أو أزل المرجع، أو ضعه في public.\n");
  process.exit(1);
}
console.log(`✓ حارس الأصول: ${refs.size} مرجعًا محليًا — كلها موجودة في public/ (لا 404 محتمل)`);
