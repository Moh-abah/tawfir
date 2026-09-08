#!/usr/bin/env bun
/**
 * patch-android-identity.mjs — تفعيل هوية «توفير» في مشروع Android المولَّد
 * ══════════════════════════════════════════════════════════════════════════
 * يُشغَّل بعد:  npx cap add android  &&  npx capacitor-assets generate --android
 * (محلياً أو داخل GitHub Actions — انظر .github/workflows/build-android.yml)
 *
 * ماذا يفعل؟
 *   1) values/colors.xml     : colorPrimary   #005B82  (توفير الرسمي)
 *                              colorPrimaryDark #003B55  (شريط الحالة عند الإطلاق)
 *                              colorAccent    #10B981  (النعناعي — هوية الويب)
 *     ← ضروري: مكتبة Capacitor تُغرق القيم ببنفسجي #3F51B5 إن لم نتجاوزها.
 *   2) values/styles.xml     : خلفية إطلاق صلبة عبر @drawable/splash.
 *   3) drawable/splash.xml   : layer-list صلب #005B82 (بلا أي وميض أبيض)،
 *                              مع حذف كل splash.png المولَّدة (يوفر ~13MB
 *                              من حجم الـAPK — الصورة الفاخرة مسؤولية سبلاش
 *                              الويب ثنائي الثيم داخل الـWebView).
 *   4) app/build.gradle      : versionCode/versionName من متغيرات البيئة +
 *                              إدخال إعدادات التوقيع من Keystore الخاص
 *                              (tawfeer-release.keystore) عبر متغيرات سرّية.
 *
 * ═════════════════ الإصلاح الجوهري (الجولة 27) ═══════════════════════════
 * كانت النسخ السابقة تستخدم Regex على الملف كاملاً لإدراج سطر
 * «signingConfig signingConfigs.release» فيطابق أول «release {» في الملف —
 * وهو (بعد إدراج كتلة signingConfigs قبل buildTypes) الـ release الخاص
 * بـ signingConfigs نفسه! فيولد:
 *     signingConfigs { release { … signingConfig … } }   ← خطأ Gradle
 *     «Could not find method signingConfig() … on SigningConfig»
 * ──────────────────────────────────────────────────────────────────────────
 * المنهج الجديد: محرّر سطري يتتبّع الأقواس { } ويحدّد العمق الدقيق لكل سطر،
 * فيُدرج السطر حصراً داخل buildTypes → release (وليس أي release آخر)،
 * ثم يُعيد فحص الملف الناتج بماسح مستقل — وأي خلل بنيوي = خروج فوري برسالة
 * عربية واضحة (قبل أن يهدر Gradle 10 دقائق). السكربت أيضاً «idempotent»:
 * إعادة تشغيله لا تكرّر الكتل.
 *
 * متغيرات البيئة:
 *   VERSION_NAME   الاسم الظاهر   (افتراضي 1.2.0)
 *   VERSION_CODE   الرقم التصاعدي  (افتراضي 1)
 *   KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD — أسرار GitHub Actions
 *
 * خروج غير صفري برسالة واضحة عند: تناقض أسرار التوقيع / Keystore فارغ /
 * بنية ملفات غير متوقعة / فشل التحقق البنيوي النهائي. السكربت خالٍ من أي
 * قيم سرّية (يقرأها من البيئة)، ولا يطبعها أبداً (تظهر كـ *** في كل المخرجات).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RES_DIR = path.join(ROOT, "android", "app", "src", "main", "res");
const GRADLE_FILE = path.join(ROOT, "android", "app", "build.gradle");
const KEYSTORE_FILE = path.join(ROOT, "android", "tawfeer-release.keystore");

/** ألوان هوية «توفير» — مطابقة للويب و PWABuilder */
const BRAND = {
  colorPrimary: "#005B82",
  colorPrimaryDark: "#003B55",
  colorAccent: "#10B981",
  splashBackground: "#005B82",
};

const VERSION_NAME = process.env.VERSION_NAME || "1.2.0";
const VERSION_CODE = process.env.VERSION_CODE || "1";

const log = (icon, msg) => console.log(`${icon}  ${msg}`);
const fail = (msg) => {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
};

/* ─── فحوصات أولية ─────────────────────────────────────────────────── */
if (!fs.existsSync(RES_DIR)) {
  fail(`لم أجد ${RES_DIR} — شغّل أولاً: npx cap add android`);
}
if (!fs.existsSync(GRADLE_FILE)) {
  fail(`لم أجد ${GRADLE_FILE} — تأكد أن منصة android أُضيفت بنجاح.`);
}
if (!/^\d+$/.test(VERSION_CODE)) {
  fail(`VERSION_CODE يجب أن يكون رقماً صحيحاً (وصل: «${VERSION_CODE}»).`);
}
if (!/^\d+(\.\d+){0,3}$/.test(VERSION_NAME)) {
  fail(`VERSION_NAME يجب أن يكون بصيغة x.y.z (وصل: «${VERSION_NAME}»).`);
}

/* ─── 1) colors.xml ────────────────────────────────────────────────── */
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- هوية «توفير» — تجاوز القيم البنفسجية الافتراضية في مكتبة Capacitor -->
    <color name="colorPrimary">${BRAND.colorPrimary}</color>
    <color name="colorPrimaryDark">${BRAND.colorPrimaryDark}</color>
    <color name="colorAccent">${BRAND.colorAccent}</color>
    <color name="splash_background">${BRAND.splashBackground}</color>
</resources>
`;
fs.writeFileSync(path.join(RES_DIR, "values", "colors.xml"), colorsXml);
log("🎨", `values/colors.xml ← colorPrimary ${BRAND.colorPrimary} / Dark ${BRAND.colorPrimaryDark} / Accent ${BRAND.colorAccent}`);

/* ─── 2) styles.xml — خلفية إطلاق صلبة ─────────────────────────────── */
const stylesPath = path.join(RES_DIR, "values", "styles.xml");
let styles = fs.readFileSync(stylesPath, "utf8");
if (!/<style[^>]+name="AppTheme\.NoActionBarLaunch"/.test(styles)) {
  fail("styles.xml لا يحتوي AppTheme.NoActionBarLaunch — بنية غير متوقعة.");
}
const bgItem = /<item name="android:background">[^<]*<\/item>/;
const target = '    <item name="android:background">@drawable/splash</item>';
{
  const block = styles.match(/<style[^>]+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/);
  if (!block) fail("تعذر عزل كتلة AppTheme.NoActionBarLaunch في styles.xml.");
  let patchedBlock = block[0];
  if (bgItem.test(patchedBlock)) {
    patchedBlock = patchedBlock.replace(bgItem, target.trim());
  } else {
    patchedBlock = patchedBlock.replace(
      /(<style[^>]+name="AppTheme\.NoActionBarLaunch"[^>]*>)/,
      `$1\n${target}`,
    );
  }
  // Android 12+ (API 31+): خلفية شاشة السبلاش النظامية بنفس اللون
  const sysItem = '<item name="android:windowSplashScreenBackground">@color/splash_background</item>';
  if (!patchedBlock.includes("windowSplashScreenBackground")) {
    patchedBlock = patchedBlock.replace(/<\/style>/, `    ${sysItem}\n    </style>`);
  }
  styles = styles.replace(block[0], patchedBlock);
  fs.writeFileSync(stylesPath, styles);
  log("🖼️", "values/styles.xml ← خلفية السبلاش صلبة (windowBackground + API31+)");
}

/* ─── 3) splash.xml صلب + حذف splash.png المولّدة ───────────────────── */
let removedCount = 0;
let freedBytes = 0;
for (const entry of fs.readdirSync(RES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith("drawable")) continue;
  const dir = path.join(RES_DIR, entry.name);
  const splashPng = path.join(dir, "splash.png");
  if (fs.existsSync(splashPng)) {
    freedBytes += fs.statSync(splashPng).size;
    fs.rmSync(splashPng);
    removedCount++;
  }
}
if (removedCount > 0) {
  log("🧹", `حذف ${removedCount} ملف splash.png (${(freedBytes / 1048576).toFixed(1)}MB) — الخلفية الصلبة بديلاً`);
}
const splashXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- خلفية إطلاق صلبة — هوية «توفير» (لا وميض أبيض على أي جهاز/اتجاه) -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android"
    android:opacity="opaque">
    <item android:drawable="@color/splash_background" />
</layer-list>
`;
fs.writeFileSync(path.join(RES_DIR, "drawable", "splash.xml"), splashXml);
log("✨", `drawable/splash.xml ← خلفية صلبة ${BRAND.splashBackground} (نهارية/ليلية/أفقية/رأسية)`);

/* ══════════════════════════════════════════════════════════════════════
 * 4) build.gradle — الإصدار + التوقيع (محرّر سطري متتبّع الأقواس)
 * ══════════════════════════════════════════════════════════════════════
 * لماذا سطري؟ لأن Regex على الملف كاملاً يلتقط أول «release {» أينما كان —
 * وهذه بالضبط كانت ثغرة النسخ السابقة. هنا نعرف «أين نحن» من سلسلة الكتل
 * المفتوحة (android → buildTypes → release) قبل أي إدراج.
 */

/** يهرب علامات الاقتباس المفردة والشرطات المائلة لكلمات المرور (Groovy) */
const groovyQuote = (v) => `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/**
 * ماسح بنيوي: يمر على أسطر build.gradle سطراً سطراً ويتتبّع أعماق الأقواس.
 * يعيد مصفوفة { line, indent, label, path } — path = سلسلة الكتل المفتوحة
 * قبل هذا السطر (مثل ["android","buildTypes","release"]).
 * ملاحظة: أسطر التعليقات الكاملة تتجاهل، وقوالب Capacitor لا تحوي أقواساً
 * داخل النصوص (تم التحقق من قالب 8.5 الرسمي).
 */
function scanGradle(text) {
  const out = [];
  const stack = [];
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
    const indent = raw.match(/^[ \t]*/)[0];
    const path = [...stack];
    const labelMatch = trimmed.match(/^([A-Za-z_][\w.]*)\s*(?:=)?\s*\{/);
    const label = labelMatch ? labelMatch[1] : null;
    out.push({ line: raw, indent, label, path });
    if (isComment) continue;
    const opens = (raw.match(/\{/g) || []).length;
    const closes = (raw.match(/\}/g) || []).length;
    if (opens > closes) {
      for (let i = 0; i < opens - closes; i++) stack.push(label ?? `?${out.length}`);
    } else if (closes > opens) {
      stack.length = Math.max(0, stack.length - (closes - opens));
    }
  }
  return out;
}

/** يبعد أسطر كتلة كاملة (من سطر فتح label حتى قوسها المغلق المطابق) */
function removeBlock(scanned, label, pathSuffix) {
  const openIdx = scanned.findIndex(
    (e) => e.label === label && e.path.join("→").endsWith(pathSuffix),
  );
  if (openIdx === -1) return null;
  // اعثر على القوس المغلق المطابق بتتبّع الأعماق من بعد سطر الفتح
  let depth = 0;
  let closeIdx = openIdx;
  for (let i = openIdx; i < scanned.length; i++) {
    const raw = scanned[i].line;
    const trimmed = raw.trim();
    if (trimmed.startsWith("//")) continue;
    const opens = (raw.match(/\{/g) || []).length;
    const closes = (raw.match(/\}/g) || []).length;
    depth += opens - closes;
    if (i > openIdx && depth <= 0) { closeIdx = i; break; }
    if (i === openIdx && opens === 0) { closeIdx = i; break; }
  }
  return [openIdx, closeIdx];
}

let gradle = fs.readFileSync(GRADLE_FILE, "utf8");

/* ─── التوقيع: قيم من البيئة ───────────────────────────────────────── */
const signEnv = {
  pass: process.env.KEYSTORE_PASSWORD,
  alias: process.env.KEY_ALIAS,
  key: process.env.KEY_PASSWORD,
};
const signRequested = Boolean(signEnv.pass || signEnv.alias || signEnv.key);
const hasKeystoreFile =
  fs.existsSync(KEYSTORE_FILE) && fs.statSync(KEYSTORE_FILE).size > 0;

let signingNote = "⏭️  التوقيع متخطى (لا أسرار) — سينتج APK غير موقّع";

if (signRequested) {
  if (!signEnv.pass || !signEnv.alias || !signEnv.key) {
    fail("أسرار التوقيع ناقصة: يجب ضبط KEYSTORE_PASSWORD و KEY_ALIAS و KEY_PASSWORD معاً.");
  }
  if (!hasKeystoreFile) {
    fail(`${KEYSTORE_FILE} غير موجود أو فارغ — فُكَّ ANDROID_KEYSTORE_BASE64 بشكل خاطئ؟`);
  }

  /* 4-أ) تنظيف أي إدراج سابق (idempotency — آمن لإعادة التشغيل) */
  {
    let scanned = scanGradle(gradle);
    // احذف أي سطر signingConfig جوهرياً (أينما كان)
    const signLines = scanned
      .map((e, i) => (/^\s*signingConfig\s+\S/.test(e.line) ? i : -1))
      .filter((i) => i !== -1);
    if (signLines.length > 0) log("♻️", `إزالة ${signLines.length} سطر signingConfig قديم (إعادة تشغيل)`);
    for (const i of signLines.reverse()) scanned.splice(i, 1);
    gradle = scanned.map((e) => e.line).join("\n");

    // احذف أي كتلة signingConfigs كاملة
    scanned = scanGradle(gradle);
    const range = removeBlock(scanned, "signingConfigs", "");
    if (range) {
      scanned.splice(range[0], range[1] - range[0] + 1);
      log("♻️", "إزالة كتلة signingConfigs قديمة (إعادة تشغيل)");
      gradle = scanned.map((e) => e.line).join("\n");
    }
  }

  /* 4-ب) حدّث الإصدار (سطر بسطر داخل defaultConfig) */
  {
    const scanned = scanGradle(gradle);
    let codeDone = false, nameDone = false;
    const lines = scanned.map((e) => e.line);
    for (let i = 0; i < lines.length; i++) {
      if (!codeDone && /^\s*versionCode\s+\d+\s*$/.test(lines[i]) && scanned[i].path.includes("defaultConfig")) {
        lines[i] = lines[i].replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
        codeDone = true;
      }
      if (!nameDone && /^\s*versionName\s+"[^"]*"\s*$/.test(lines[i]) && scanned[i].path.includes("defaultConfig")) {
        lines[i] = lines[i].replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);
        nameDone = true;
      }
    }
    if (!codeDone || !nameDone) {
      fail("لم أجد versionCode/versionName داخل defaultConfig — بنية القالب غير متوقعة.");
    }
    gradle = lines.join("\n");
  }
  log("🔢", `build.gradle ← versionName ${VERSION_NAME} / versionCode ${VERSION_CODE}`);

  /* 4-ج) أدخل كتلة signingConfigs قبل buildTypes (على نفس المسار البادئ) */
  {
    const scanned = scanGradle(gradle);
    // أول buildTypes يكون مساره المباشر هو android (وليس أي buildTypes متداخل آخر)
    const btEntry =
      scanned.find((e) => e.label === "buildTypes" && e.path[e.path.length - 1] === "android") ??
      scanned.find((e) => e.label === "buildTypes");
    if (!btEntry) fail("لم أجد كتلة buildTypes داخل android { — بنية القالب غير متوقعة.");
    const idx = scanned.indexOf(btEntry);
    const baseIndent = btEntry.indent;
    const block = [
      "",
      `${baseIndent}signingConfigs {`,
      `${baseIndent}    release {`,
      `${baseIndent}        // tawfeer-release.keystore — بصمة SHA-256 مطابقة لـ assetlinks.json`,
      `${baseIndent}        storeFile rootProject.file('${path.basename(KEYSTORE_FILE)}')`,
      `${baseIndent}        storePassword ${groovyQuote(signEnv.pass)}`,
      `${baseIndent}        keyAlias ${groovyQuote(signEnv.alias)}`,
      `${baseIndent}        keyPassword ${groovyQuote(signEnv.key)}`,
      `${baseIndent}    }`,
      `${baseIndent}}`,
    ];
    scanned.splice(idx, 0, ...block.map((line) => ({ line, indent: line.match(/^[ \t]*/)[0], label: null, path: [] })));
    gradle = scanned.map((e) => e.line).join("\n");
  }

  /* 4-د) أدخل «signingConfig signingConfigs.release» داخل buildTypes → release
   *      حصراً (وليس داخل signingConfigs — هذا كان الخطأ القديم!) */
  {
    const scanned = scanGradle(gradle);
    const target = scanned.find(
      (e) =>
        e.label === "release" &&
        e.path[e.path.length - 1] === "buildTypes" &&
        e.path.includes("android"),
    );
    if (!target) fail("لم أجد release داخل buildTypes — بنية القالب غير متوقعة.");
    const idx = scanned.indexOf(target);
    const indent = target.indent + "    ";
    scanned.splice(idx + 1, 0, {
      line: `${indent}signingConfig signingConfigs.release`,
      indent,
      label: null,
      path: [...target.path, "release"],
    });
    gradle = scanned.map((e) => e.line).join("\n");
  }
  signingNote = "🔐 build.gradle ← signingConfig release مع Keystore السرّي";
} else {
  /* بدون أسرار: حدّث الإصدار فقط */
  const scanned = scanGradle(gradle);
  const lines = scanned.map((e) => e.line);
  let codeDone = false, nameDone = false;
  for (let i = 0; i < lines.length; i++) {
    if (!codeDone && /^\s*versionCode\s+\d+\s*$/.test(lines[i])) {
      lines[i] = lines[i].replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
      codeDone = true;
    }
    if (!nameDone && /^\s*versionName\s+"[^"]*"\s*$/.test(lines[i])) {
      lines[i] = lines[i].replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);
      nameDone = true;
    }
  }
  if (!codeDone || !nameDone) fail("لم أجد versionCode/versionName — بنية القالب غير متوقعة.");
  gradle = lines.join("\n");
  log("🔢", `build.gradle ← versionName ${VERSION_NAME} / versionCode ${VERSION_CODE}`);
}

fs.writeFileSync(GRADLE_FILE, gradle);

/* ══════════════════════════════════════════════════════════════════════
 * 5) التحقق البنيوي النهائي (ماسح مستقل — خط الدفاع الأخير قبل Gradle)
 * ══════════════════════════════════════════════════════════════════════
 * إن فشل أي فحص: خروج فوري برسالة عربية — لا نترك Gradle يفشل بعد 10 دقائق.
 */
{
  const scanned = scanGradle(gradle);
  const problems = [];

  // التوازن العام للأقواس
  let depth = 0;
  for (const e of scanned) {
    if (e.line.trim().startsWith("//")) continue;
    depth += (e.line.match(/\{/g) || []).length - (e.line.match(/\}/g) || []).length;
  }
  if (depth !== 0) problems.push(`أقواس غير متوازنة (فرق ${depth}) — الملف تالف!`);

  if (signRequested) {
    // 1) كتلة signingConfigs واحدة على مستوى android مباشرة
    const scBlocks = scanned.filter(
      (e) => e.label === "signingConfigs" && e.path[e.path.length - 1] === "android",
    );
    if (scBlocks.length !== 1) {
      problems.push(`كتل signingConfigs على مستوى android = ${scBlocks.length} (المطلوب 1)`);
    }

    // 2) سطر signingConfig واحد فقط، وموقعه داخل buildTypes → release حصراً
    const signLines = scanned.filter((e) => /^\s*signingConfig\s+\S/.test(e.line));
    if (signLines.length !== 1) {
      problems.push(`أسطر signingConfig = ${signLines.length} (المطلوب 1)`);
    }
    for (const e of signLines) {
      const p = e.path;
      const okPath =
        p.length >= 3 &&
        p[p.length - 1] === "release" &&
        p[p.length - 2] === "buildTypes" &&
        p.includes("android");
      if (!okPath) {
        problems.push(
          `سطر signingConfig في المسار الخاطئ: ${p.join("→") || "(الجذر)"} — المطلوب android→buildTypes→release`,
        );
      }
    }

    // 3) storeFile يشير للـ Keystore الصحيح
    const storeLine = scanned.find((e) => /storeFile\s+rootProject\.file\(/.test(e.line));
    if (!storeLine || !storeLine.line.includes(path.basename(KEYSTORE_FILE))) {
      problems.push("storeFile لا يشير إلى tawfeer-release.keystore");
    }

    // 4) سرّية كلمات المرور موجودة (بلا طباعتها!)
    const hasCreds =
      /storePassword\s+'[^']+'/.test(gradle) &&
      /keyAlias\s+'[^']+'/.test(gradle) &&
      /keyPassword\s+'[^']+'/.test(gradle);
    if (!hasCreds) problems.push("حقول storePassword/keyAlias/keyPassword ناقصة");
  }

  // 5) الإصدارات داخل defaultConfig
  const vc = scanned.find((e) => new RegExp(`^\\s*versionCode\\s+${VERSION_CODE}\\s*$`).test(e.line) && e.path.includes("defaultConfig"));
  const vn = scanned.find((e) => new RegExp(`^\\s*versionName\\s+"${VERSION_NAME.replace(/\./g, "\\.")}"\\s*$`).test(e.line) && e.path.includes("defaultConfig"));
  if (!vc) problems.push(`versionCode ${VERSION_CODE} غير موجود داخل defaultConfig`);
  if (!vn) problems.push(`versionName "${VERSION_NAME}" غير موجود داخل defaultConfig`);

  if (problems.length > 0) {
    fail(
      "فشل التحقق البنيوي من build.gradle (لن أُمرّر ملفاً تالفاً لـ Gradle):\n" +
      problems.map((p) => `   • ${p}`).join("\n"),
    );
  }
  log("🛡️", "التحقق البنيوي النهائي ✓ — signingConfigs على مستوى android، وsigningConfig داخل buildTypes→release");
}

/* ─── ملخص ─────────────────────────────────────────────────────────── */
const appId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1] ?? "com.tawfir.ye.app";
console.log(
  [
    "",
    "════════════════════════════════════════════════════",
    "✅ اكتمل تفعيل هوية «توفير» في مشروع Android",
    `   • التطبيق        : ${appId} (${appId.includes("owner") ? "توفير مالك" : "توفير"})`,
    `   • الألوان        : Primary ${BRAND.colorPrimary} · Dark ${BRAND.colorPrimaryDark} · Accent ${BRAND.colorAccent}`,
    `   • السبلاش        : خلفية صلبة ${BRAND.splashBackground} (${removedCount} صورة حُذفت)`,
    `   • الإصدار        : ${VERSION_NAME} (${VERSION_CODE})`,
    `   • التوقيع        : ${signRequested ? "مفعَّل (assembleRelease يوقّع تلقائياً)" : "غير مفعَّل"}`,
    `   • البنية         : تحققت آلياً ✓ (signingConfig في android→buildTypes→release)`,
    "════════════════════════════════════════════════════",
    "",
  ].join("\n"),
);
