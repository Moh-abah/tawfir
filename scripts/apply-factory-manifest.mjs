#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  مصنع «توفير» — سكربت تعبئة قالب التطبيق (المهمة E)
 *  apply-factory-manifest.mjs — Node صافٍ (صفر تبعيات: fs/path/fetch المدمج في Node 20+)
 *
 * الاستخدام:
 *   node scripts/apply-factory-manifest.mjs <path/to/manifest.json> [--root <dir>] [--dry-run]
 *
 * مصدر الـmanifest: الحزمة الكونسولية (ZIP) الصادرة من POST /console/apps
 * — عقد الإصدار (openapi.json): AppIssue { facility_id, package_id, display_name, platform, build_channel }
 *
 * الهيكل المتوقع للـmanifest (موثّق من خطة المصنع):
 * {
 *   "facility_id": 28,                       // من عقد AppIssue
 *   "package_id": "com.wajh.demoapp",        // البصمة الانفرادية (إلزامي)
 *   "display_name": "مطعم واجهة التجريبي",     // من عقد AppIssue
 *   "platform": "android",                   // android | ios | both
 *   "build_channel": "github_actions",       // capacitor_local | github_actions
 *   "identity": { "app_name": "...", "tagline": "...", "primary_color": "#E23744", "secondary_color": "#2E7D32" },
 *   "brand":    { "colors": { "primary": "#E23744", "secondary": "#2E7D32" } },   // شكل بديل قديم
 *   "assets":   { "logo": {"url": "…"}, "app_icon": {"url": "…"}, "splash": {"url": "…"}, … },
 *                                            // كل قيمة: رابط نصي أو كائن BrandAsset فيه url
 *   "google_services": { "android": "google-services.json" },  // اسم ملف بجوار الـmanifest
 *                                              // أو كائن JSON كامل يُكتب كما هو
 *   "api":      { "base": "https://tawfir.giize.com", "v1": "/api/v1" },
 *   "market":   { "currency": "ريال يمني" },
 *   "build_job": { "secrets": ["TAWFIR_KEYSTORE_BASE", "TAWFIR_STORE_PASSWORD",
 *                              "TAWFIR_KEY_ALIAS", "TAWFIR_KEY_PASSWORD"], … }
 * }
 *
 * الهيكل أعلاه مطابق للحزمة الحقيقية (manifest.json من ZIP bundle) — وإن وُجد ملف
 * build-job.json بجوار الـmanifest فتُستخرج أسماء TAWFIR_* منه تلقائياً (حرفياً من الحزمة).
 *
 * ماذا يفعل (أ — و):
 *   a) capacitor.config.json في الجذر: {appId, appName} + webDir "out"
 *      (وثّق: قالب التطبيق القائم هو Next.js static export → مجلد out)
 *   b) src/config/brand.json: الهوية + الألوان + روابط الأصول المطلقة + apiBase + العملة
 *   c) تنزيل الأصول من assets.*.url إلى src/assets/brand/ (fetch مدمج — بلا تبعيات)
 *   d) أيقونات res الأساسية: mipmap-[mdpi..xxxhdpi]/ic_launcher.png + drawable(-port/-land)/splash.png
 *      (وثّق بصدق: التوليد الكامل متعدد الأحجام يتم بأداة res خارجية مثل @capacitor/assets
 *       — هذا السكربت يغطي النسخ الأساسي فقط بمصدر واحد لكل الكثافات)
 *   e) google-services.json → android/app/google-services.json
 *   f) طباعة خلاصة build_job: أسماء متغيرات TAWFIR_* فقط — القيم لا تُقرأ ولا تُكتب أبداً
 *   g) --dry-run: طباعة «خطة التنفيذ» سطراً سطراً بلا كتابة أي ملف، والخروج بكود 0
 *
 * اختبارات مدمجة: manifest بلا package_id → خطأ عربي واضح وexit 1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ───────────────────────── ثوابت المواقع ───────────────────────── */

/** نطاق خادم «توفير» — تُمطلَق عليه روابط الأصول النسبية (/uploads/…) */
const SERVER_ORIGIN = "https://api.tawfir.giize.com";
/** الـAPI الافتراضي إن لم يحدده الـmanifest */
const DEFAULT_API_BASE = `${SERVER_ORIGIN}/api/v1`;
/** مجلد الأصول داخل قالب التطبيق */
const BRAND_ASSETS_DIR = join("src", "assets", "brand");
/** webDir الثابت للقالب — القالب Next.js static export */
const WEB_DIR = "out";

/** أسماء متغيرات التوقيع القياسية (مطابقة لـbuild-job.json في الحزمة الحقيقية — أسماء فقط لا قيم) */
const TAWFIR_SECRET_NAMES = [
  "TAWFIR_KEYSTORE_BASE",
  "TAWFIR_STORE_PASSWORD",
  "TAWFIR_KEY_ALIAS",
  "TAWFIR_KEY_PASSWORD",
];

/* ───────────────────────── أدوات مساعدة ───────────────────────── */

const esc = (s) => JSON.stringify(s ?? null, null, 2);

/** فاصل بصري في الطباعة */
function line(ch = "─", n = 66) {
  console.log(ch.repeat(n));
}

/** أصل متاح للتنزيل من الـmanifest: يقبل رابطاً نصياً أو كائن BrandAsset فيه url */
function extractAssetUrl(v) {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object" && typeof v.url === "string" && v.url.trim()) return v.url.trim();
  return null;
}

/** تمطلق رابط أصل نسبي على نطاق الخادم (روابط /uploads/… من رد الرفع) */
function absolutize(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SERVER_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** امتداد ملف أصل من رابطه — الافتراضي png (كل أصول الرفع على الخادم png) */
function assetExtension(url) {
  const clean = url.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? `.${m[1].toLowerCase()}` : ".png";
}

/** تنزيل ملف واحد عبر fetch المدمج — يعيد Buffer أو يرمي خطأ عربي واضح */
async function downloadAsset(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`الخادم رد بكود ${res.status} أثناء تنزيل ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`ملف فارغ (0 بايت) من ${url}`);
  return buf;
}

/** نسخ عبر قراءة ثم كتابة — بعض بيئات الحاويات تفشل في copyfile النظامي (FICLONE)
 *  رغم أن الملف موجود؛ القراءة + الكتابة تعملان دائماً */
function copyViaReadWrite(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, readFileSync(src));
}

/** كتابة نصية تُنشئ المجلد الأب إن لم يوجد */
function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/* ───────────────────────── خطة التنفيذ ─────────────────────────
 * نجمع كل عملية كأمثلة { kind, path, note } ثم ننفذها أو نطبعها.
 * kinds: write-config | write-brand | download | icon-copy | splash-copy | gs-copy | gs-write
 */

function buildPlan(m, rootDir, manifestDir) {
  const plan = [];
  const appName = m.identity?.app_name ?? m.display_name ?? m.package_id;

  /* a) capacitor.config.json — قالب Next.js static export */
  plan.push({
    kind: "write-config",
    path: join(rootDir, "capacitor.config.json"),
    summary: `{ "appId": "${m.package_id}", "appName": "${appName}", "webDir": "${WEB_DIR}" }`,
    note: `webDir="${WEB_DIR}" — القالب Next.js static export (output:"export" → out/)`,
    write: () => {
      const cfg = {
        appId: m.package_id,
        appName,
        webDir: WEB_DIR,
      };
      writeText(plan[0].path, JSON.stringify(cfg, null, 2) + "\n");
    },
  });

  /* b) src/config/brand.json — مصدر الهوية الوحيد عند إقلاع التطبيق */
  const assetsIn = m.assets ?? {};
  const assetsOut = {};
  const downloads = [];
  for (const [key, val] of Object.entries(assetsIn)) {
    const url = extractAssetUrl(val);
    if (!url) continue;
    const abs = absolutize(url);
    const fileName = `${key}${assetExtension(abs)}`;
    assetsOut[key] = abs;
    downloads.push({ key, url: abs, localPath: join(rootDir, BRAND_ASSETS_DIR, fileName) });
  }
  const brandJson = {
    app_name: appName,
    tagline: m.identity?.tagline ?? null,
    colors: {
      primary: m.identity?.primary_color ?? m.brand?.colors?.primary ?? null,
      secondary: m.identity?.secondary_color ?? m.brand?.colors?.secondary ?? null,
    },
    assets: assetsOut,
    apiBase: m.api?.base ?? DEFAULT_API_BASE,
    currency: m.market?.currency ?? null,
  };
  plan.push({
    kind: "write-brand",
    path: join(rootDir, "src", "config", "brand.json"),
    summary: `{ app_name, tagline, colors{primary,secondary}, assets{…روابط مطلقة}, apiBase, currency }`,
    note: `العملة من manifest.market.currency: ${m.market?.currency ?? "— غير محددة في الـmanifest —"}`,
    write: () => writeText(join(rootDir, "src", "config", "brand.json"), JSON.stringify(brandJson, null, 2) + "\n"),
  });

  /* c) تنزيل الأصول إلى src/assets/brand/ */
  for (const d of downloads) {
    plan.push({
      kind: "download",
      path: d.localPath,
      summary: `[تنزيل] ${d.url} → ${d.key}`,
      note: "fetch مدمج (Node 20+) — إن فشل التنزيل يُستكمل الباقي ويُرصد الخطأ في النهاية",
      write: async () => {
        const buf = await downloadAsset(d.url);
        writeText(d.localPath, buf);
        return d.key;
      },
    });
  }

  /* d) أيقونات res — نسخة أساسية واحدة لكل الكثافات (بصدق: بلا تغيير حجم) */
  const iconDl = downloads.find((d) => d.key === "app_icon");
  const splashDl = downloads.find((d) => d.key === "splash");
  const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
  for (const den of densities) {
    plan.push({
      kind: "icon-copy",
      path: join(rootDir, "android", "app", "src", "main", "res", `mipmap-${den}`, "ic_launcher.png"),
      summary: "نسخة الأيقونة (نفس المصدر لكل الكثافات — التوليد متعدد الأحجام بأداة res خارجية)",
      note: "المصدر: src/assets/brand/app_icon.png بعد التنزيل — إن لم يُنزَّل يُخطَّر بدل النسخ",
      needsLocal: true,
      write: () => {
        const src = iconDl?.localPath;
        if (!src || !existsSync(src)) return "missing-source";
        copyViaReadWrite(src, join(rootDir, "android", "app", "src", "main", "res", `mipmap-${den}`, "ic_launcher.png"));
        return "ok";
      },
    });
  }
  for (const drawable of ["drawable", "drawable-port", "drawable-land"]) {
    plan.push({
      kind: "splash-copy",
      path: join(rootDir, "android", "app", "src", "main", "res", drawable, "splash.png"),
      summary: "نسخة شاشة البداية (نفس المصدر — التوليد النهائي بأداة res خارجية)",
      note: "المصدر: src/assets/brand/splash.png بعد التنزيل",
      needsLocal: true,
      write: () => {
        const src = splashDl?.localPath;
        if (!src || !existsSync(src)) return "missing-source";
        copyViaReadWrite(src, join(rootDir, "android", "app", "src", "main", "res", drawable, "splash.png"));
        return "ok";
      },
    });
  }

  /* e) google-services.json → android/app/google-services.json
   * المصدر بالأولوية: (1) كائن مدسوس في manifest.google_services.android
   *                  (2) ملف مُشار إليه بالاسم بجوار الـmanifest
   *                  (3) ملف google-services.json بجوار الـmanifest مباشرة        */
  const gsTarget = join(rootDir, "android", "app", "google-services.json");
  const gsInline = m.google_services?.android;
  const gsByName =
    typeof gsInline === "string" ? join(manifestDir, gsInline) : null;
  const gsBeside = join(manifestDir, "google-services.json");
  let gsSource = null; // { type, path? , obj? }
  if (gsInline && typeof gsInline === "object") {
    gsSource = { type: "inline", obj: gsInline };
  } else if (gsByName && existsSync(gsByName)) {
    gsSource = { type: "file", path: gsByName };
  } else if (existsSync(gsBeside)) {
    gsSource = { type: "file", path: gsBeside };
  }
  plan.push({
    kind: gsSource ? (gsSource.type === "inline" ? "gs-write" : "gs-copy") : "gs-absent",
    path: gsTarget,
    summary: gsSource
      ? gsSource.type === "inline"
        ? "كتابة كائن google_services.android كما هو من الـmanifest"
        : `نسخ من ${gsSource.path}`
      : "لم يُعثر على google-services.json (لا في manifest.google_services ولا بجوار الـmanifest) — سيُستكمل لاحقاً من الحزمة قبل بناء FCM",
    note: "إعداد FCM لتطبيق العميل المولَّد — غيابه لا يمنع تعبئة القالب",
    write: () => {
      if (!gsSource) return "absent";
      if (gsSource.type === "inline") writeText(gsTarget, JSON.stringify(gsSource.obj, null, 2) + "\n");
      else copyViaReadWrite(gsSource.path, gsTarget);
      return "ok";
    },
  });

  return { plan, downloads };
}

/* ───────────────────────── التنفيذ ───────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const positional = [];
  let rootDir = process.cwd();
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      rootDir = resolve(argv[++i] ?? "");
      if (!rootDir || rootDir === "undefined") fail("قيمة --root فارغة — مرّر مجلداً صحيحاً");
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("الاستخدام: node scripts/apply-factory-manifest.mjs <manifest.json> [--root <dir>] [--dry-run]");
      process.exit(0);
    } else {
      positional.push(argv[i]);
    }
  }

  const manifestPath = resolve(positional[0] ?? "");
  if (!positional[0]) {
    fail("لم يُمرَّر مسار manifest.json\nالاستخدام: node scripts/apply-factory-manifest.mjs <manifest.json> [--root <dir>] [--dry-run]");
  }
  if (!existsSync(manifestPath)) {
    fail(`ملف الـmanifest غير موجود: ${manifestPath}`);
  }

  /* قراءة الـmanifest + اختبار مدمج: package_id إلزامي */
  let m;
  try {
    m = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    fail(`تعذّر تحليل JSON: ${e.message}`);
  }
  if (!m || typeof m !== "object") fail("الـmanifest ليس كائن JSON صحيحاً");
  if (!m.package_id || typeof m.package_id !== "string") {
    fail("خطأ في الـmanifest: حقل «package_id» مفقود أو غير صالح — البصمة الانفرادية (مثل com.wajh.demoapp) إلزامية في عقد POST /console/apps");
  }
  if (process.version && /^v(\d+)\./.exec(process.version) && Number(/^v(\d+)\./.exec(process.version)[1]) < 18) {
    fail(`هذا السكربت يحتاج Node 18+ (يفضَّل 20+) لاستخدام fetch المدمج — النسخة الحالية: ${process.version}`);
  }

  const manifestDir = dirname(manifestPath);
  const { plan, downloads } = buildPlan(m, rootDir, manifestDir);

  /* الترويسة */
  line("═");
  console.log("🏭 مصنع «توفير» — سكربت تعبئة قالب التطبيق (المهمة E)");
  line("═");
  console.log(`📄 الـmanifest : ${manifestPath}`);
  console.log(`📁 الجذر      : ${rootDir}`);
  console.log(`🎯 الوضع      : ${dryRun ? "خطة تنفيذ (--dry-run — لن يُكتب أي ملف)" : "تنفيذ فعلي"}`);
  console.log(`📦 الحزمة     : ${m.package_id} — منشأة #${m.facility_id ?? "؟"} (${m.display_name ?? "بلا اسم"}، platform=${m.platform ?? "android"}, channel=${m.build_channel ?? "capacitor_local"})`);
  line();

  /* طباعة خطة الفروق سطراً سطراً */
  console.log("خطة التنفيذ:");
  let n = 0;
  for (const step of plan) {
    n++;
    const rel = step.path.startsWith(rootDir) ? step.path.slice(rootDir.length + 1) : step.path;
    console.log(`  ${String(n).padStart(2, "0")}. [${step.kind}] ${rel}`);
    console.log(`      ${step.summary}`);
    if (step.note) console.log(`      ↳ ${step.note}`);
  }
  line();

  /* f) خلاصة build_job — أسماء متغيرات TAWFIR_* فقط، القيم لا تُقرأ ولا تُكتب أبداً
   *     الأسماء تأتي بترتيب الأولوية: build-job.json بجوار الـmanifest (من الحزمة الحقيقية)
   *     ← مفتاح build_job.secrets داخل الـmanifest ← الأسماء القياسية أعلاه */
  let declared = null;
  try {
    const bjPath = join(manifestDir, "build-job.json");
    if (existsSync(bjPath)) {
      const bj = JSON.parse(readFileSync(bjPath, "utf8"));
      const names = [
        bj.secrets,
        bj.signing?.secrets,
        bj.env,
      ]
        .flatMap((x) => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.keys(x) : []))
        .filter((x) => typeof x === "string" && x.startsWith("TAWFIR_"));
      if (names.length) declared = [...new Set(names)];
    }
  } catch {
    /* build-job.json غير قابل للقراءة — نكمل بالأسماء القياسية */
  }
  if (!declared) declared = Array.isArray(m.build_job?.secrets) && m.build_job.secrets.length
    ? m.build_job.secrets
    : TAWFIR_SECRET_NAMES;
  console.log("خلاصة build_job.json — متغيرات توقيع Android (أسماء فقط):");
  for (const name of declared) {
    console.log(`  • ${name}`);
  }
  console.log("  ⚠️  القيم لا تُكتب في أي ملف أو تقرير — تُحقن من GitHub repo secrets فقط:");
  for (const name of declared) {
    console.log(`     gh secret set ${name} < ملف_القيمة   # (يُنفَّذ مرة واحدة من جهاز مُصرَّح به)`);
  }
  console.log("  ↳ القالب يستهلكها في خطوات فك keystore وتوقيع AAB/APK (deploy/github-actions/app-factory-build.yml)");
  line();

  /* dry-run: خرجنا هنا — لا كتابة إطلاقاً */
  if (dryRun) {
    console.log(`✅ انتهت «خطة التنفيذ» — ${plan.length} عملية مخططة (${downloads.length} تنزيل، الباقي كتابة/نسخ). لم يُكتب أي ملف. exit 0`);
    line("═");
    process.exit(0);
  }

  /* التنفيذ الفعلي */
  const failures = [];
  const written = [];
  let downloaded = 0;
  let missingSources = 0;
  for (const step of plan) {
    try {
      const r = await step.write();
      if (r === "missing-source") {
        missingSources++;
        console.log(`⚠️  [تخطٍّ] ${step.path} — المصدر المحلي غير متوفر (راجع خطة التنزيل)`);
      } else if (r === "absent") {
        console.log(`⚠️  [تخطٍّ] google-services.json غير متوفر في الحزمة — يعاد توريده قبل بناء FCM`);
      } else {
        if (step.kind === "download") downloaded++;
        written.push(step.path);
        console.log(`✔️  ${step.path}`);
      }
    } catch (e) {
      failures.push(`${step.path}: ${e.message}`);
      console.log(`✖️  ${step.path} — ${e.message}`);
    }
  }

  line("═");
  console.log("الخلاصة:");
  console.log(`  ملفات مكتوبة/منسوخة : ${written.length - downloaded + downloaded} (${downloaded} منها تنزيلات أصول)`);
  console.log(`  تخطٍّ مفهوم          : ${missingSources + (plan.some((s) => s.kind === "gs-absent") ? 1 : 0)}`);
  console.log(`  أخطاء               : ${failures.length}`);
  if (missingSources > 0) {
    console.log("  ↳ تنبيه بصدق: نسخ res الأساسية استُخدم فيها مصدر واحد لكل الكثافات — التوليد الكامل متعدد الأحجام بأداة res خارجية (مثل @capacitor/assets)");
  }
  if (failures.length > 0) {
    console.log("\nأخطاء مفصلة:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\n✅ تمت التعبئة — الخطوة التالية: فحص capacitor.config.json وbrand.json ثم تشغيل بناء القالب.");
  line("═");
}

function fail(msgArabic) {
  console.error(`❌ خطأ: ${msgArabic}`);
  process.exit(1);
}

/* منع التنفيذ عبر require (احتياط شكلي — الملف mjs أصلاً) */
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => fail(e?.message ?? String(e)));
}
