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
 * متغيرات البيئة (كلها اختيارية عدا أزواج التوقيع المتكاملة):
 *   VERSION_NAME   الاسم الظاهر   (افتراضي 1.2.0)
 *   VERSION_CODE   الرقم التصاعدي  (افتراضي 1)
 *   KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD — أسرار GitHub Actions
 *
 * خروج غير صفري برسالة واضحة عند: تناقض أسرار التوقيع / Keystore فارغ /
 * بنية ملفات غير متوقعة. السكربت خالٍ من أي قيم سرّية (يقرأها من البيئة).
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
// فرض الخلفية الصلبة عبر drawable/splash (بغض النظر عما ولّدته الأدوات)
const bgItem = /<item name="android:background">[^<]*<\/item>/;
const target = '    <item name="android:background">@drawable/splash</item>';
if (styles.includes('name="AppTheme.NoActionBarLaunch"')) {
  const block = styles.match(/<style[^>]+name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/);
  if (block) {
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
      patchedBlock = patchedBlock.replace(
        /<\/style>/,
        `    ${sysItem}\n    </style>`,
      );
    }
    styles = styles.replace(block[0], patchedBlock);
    fs.writeFileSync(stylesPath, styles);
    log("🖼️", "values/styles.xml ← خلفية السبلاش صلبة (windowBackground + API31+)");
  }
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
  const freedMsg = "حذف " + removedCount + " ملف splash.png (" + (freedBytes / 1048576).toFixed(1) + "MB) — الخلفية الصلبة بديلاً";
  log("🧹", freedMsg);
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

/* ─── 4) build.gradle — الإصدار + التوقيع ──────────────────────────── */
let gradle = fs.readFileSync(GRADLE_FILE, "utf8");

// الإصدار
if (!/versionCode\s+\d+/.test(gradle)) fail("build.gradle بلا versionCode — بنية غير متوقعة.");
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${VERSION_NAME}"`);
log("🔢", `build.gradle ← versionName ${VERSION_NAME} / versionCode ${VERSION_CODE}`);

// التوقيع
// ─── التوقيع ─────────────────────────────────────────────────────────
const signEnv = {
  pass: process.env.KEYSTORE_PASSWORD,
  alias: process.env.KEY_ALIAS,
  key: process.env.KEY_PASSWORD,
};
const signRequested = Boolean(signEnv.pass && signEnv.alias && signEnv.key);
const hasKeystoreFile =
  fs.existsSync(KEYSTORE_FILE) && fs.statSync(KEYSTORE_FILE).size > 0;

let signingNote = "⏭️  التوقيع متخطى (لا أسرار) — سينتج APK غير موقّع";
if (signRequested) {
  if (!hasKeystoreFile) {
    fail(`${KEYSTORE_FILE} غير موجود أو فارغ — فُكَّ ANDROID_KEYSTORE_BASE64 بشكل خاطئ؟`);
  }

  // كتابة الخصائص في gradle.properties
  const gradlePropsPath = path.join(ROOT, "android", "gradle.properties");
  let propsContent = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, "utf8") : "";
  // حذف أي إعدادات توقيع سابقة من gradle.properties
  propsContent = propsContent.replace(/^# توقيع التطبيق[\s\S]*?(?=\n[^#]|$)/, '');
  propsContent += `
# توقيع التطبيق
TAWFIR_STORE_FILE=${path.basename(KEYSTORE_FILE)}
TAWFIR_STORE_PASSWORD=${signEnv.pass}
TAWFIR_KEY_ALIAS=${signEnv.alias}
TAWFIR_KEY_PASSWORD=${signEnv.key}
`;
  fs.writeFileSync(gradlePropsPath, propsContent);

  // إزالة أي كتلة signingConfigs موجودة لتجنب التكرار
  gradle = gradle.replace(/\s*signingConfigs\s*\{[\s\S]*?\n\s*\}/g, '');

  // إضافة كتلة signingConfigs جديدة ولكن بطريقة صحيحة (نستخدم project.properties)
  const signingBlock = `
    signingConfigs {
        release {
            storeFile rootProject.file(project.properties['TAWFIR_STORE_FILE'])
            storePassword project.properties['TAWFIR_STORE_PASSWORD']
            keyAlias project.properties['TAWFIR_KEY_ALIAS']
            keyPassword project.properties['TAWFIR_KEY_PASSWORD']
        }
    }
`;

  // إدراج signingConfigs قبل buildTypes
  if (!gradle.includes('signingConfigs {')) {
    gradle = gradle.replace(
      /^(\s{4})buildTypes\s*\{/m,
      `${signingBlock}$1buildTypes {`
    );
  }

  // إضافة signingConfig إلى release داخل buildTypes (إن لم تكن موجودة)
  if (!gradle.includes('signingConfig signingConfigs.release')) {
    gradle = gradle.replace(
      /(release\s*\{[\s\S]*?)(\n\s*\})/,
      `$1\n            signingConfig signingConfigs.release$2`
    );
  }

  signingNote = "🔐 build.gradle ← signingConfig release عبر gradle.properties";
}
fs.writeFileSync(GRADLE_FILE, gradle);
log("📝", signingNote);

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
    "════════════════════════════════════════════════════",
    "",
  ].join("\n"),
);
