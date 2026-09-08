#!/usr/bin/env bun
/**
 * patch-android-identity.mjs — تفعيل هوية «توفير» في مشروع Android المولَّد
 * ══════════════════════════════════════════════════════════════════════════
 * يُشغَّل بعد:  npx cap add android  &&  npx capacitor-assets generate --android
 * (محلياً أو داخل GitHub Actions — انظر .github/workflows/build-android.yml)
 *
 * ماذا يفعل؟ (بعد الإصلاح الشامل)
 *   1) values/colors.xml + values-night/ : هوية توفير ثنائية الوضع — فاتح
 *                              #F7F7F7 (statusBar/nav/splash) وداكن #0A1A2F
 *                              ← أندرويد يطبّق وضع النظام تلقائياً (كان #005B82
 *                              ثابتاً فيفرض أشرطة داكنة دائماً).
 *     ← ضروري: مكتبة Capacitor تُغرق القيم ببنفسجي #3F51B5 إن لم نتجاوزها.
 *   2) values/styles.xml + values-night/: سبلاش + أشرطة نظام بأيقونات
 *                              داكنة في الفاتح (windowLightStatusBar)
 *                              وفاتحة في الداكن.
 *   3) drawable/splash.xml   : layer-list صلب #005B82 (بلا أي وميض أبيض)،
 *                              مع حذف كل splash.png المولَّدة (يوفر ~13MB
 *                              من حجم الـAPK — الصورة الفاخرة مسؤولية سبلاش
 *                              الويب ثنائي الثيم داخل الـWebView).
 *   4) AndroidManifest.xml   : فلتر روابط أندرويد العميقة (autoVerify +
 *                              https://tawfir.giize.com) — بدونه لا يتحقق
 *                              أندرويد من assetlinks.json إطلاقاً! + أذونات:
 *                              POST_NOTIFICATIONS (جاهزية إشعارات Android 13+)
 *                              و ACCESS_NETWORK_STATE و VIBRATE و INTERNET.
 *                              + قفل الاتجاه portrait (تجربة نيتف أصيلة).
 *   5) FCM أصلي 100%         : إن وُجد google-services.json (جذر المستودع أو
 *                              upload/) يُفعَّل الإشعار الأصلي بالكامل: نسخ
 *                              الملف إلى android/app/ مع توطين
 *                              package_name = applicationId، إضافة اعتماد
 *                              firebase-messaging، وكتابة ملفات Java أصلية:
 *                              TawfirApp (5 قنوات إشعارات فور بدء أي عملية)،
 *                              TawfirFirebaseMessagingService (يعمل والتطبيق
 *                              مفتوح/بالخلفية/مُغلق + قنوات حسب
 *                              notification_type + روابط عميقة + أيقونة
 *                              شعار توفير المفرغ PNG بكل الكثافات بدل
 *                              جرس Vector عام + أيقونة كبيرة ملونة +
 *                              اهتزاز لكل نوع + حفظ التوكن للـWebView)،
 *                              TawfirNative (إضافة Capacitor تُولَّد دائماً:
 *                              setSystemBars — ثيم أشرطة النظام (شريط
 *                              الحالة + شريط التنقل: أيقونات داكنة في
 *                              الفاتح/فاتحة في الداكن + ألوان) من الـWebView
 *                              حسب ثيم المستخدم الفعّال، وgetSafeAreaInsets
 *                              — Safe-Area الحقيقية للـWebView كمتغيرات CSS
 *                              في وضع Edge-to-Edge (إصلاح تداخل الهيدر مع
 *                              أيقونات النظام)، وإن فُعّل FCM أيضاً توكن FCM
 *                              للـWebView الحي ليسجّله في الباك إند بمصادقة
 *                              المستخدم)، MainActivity (طلب إذن 13+ +
 *                              تسجيل الإضافة دائماً + توجيه الروابط العميقة +
 *                              ثيم أشرطة يتبع النظام).
 *   6) app/build.gradle      : versionCode/versionName من متغيرات البيئة +
 *                              إدخال إعدادات التوقيع من Keystore الخاص
 *                              (tawfeer-release.keystore) عبر متغيرات سرّية.
 *   ملاحظة AAB: workflow البناء ينفّذ bundleRelease أيضاً فينتج
 *   Android App Bundle للرفع على Google Play بجانب الـAPK الموقّع.
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
const ROOT_GRADLE_FILE = path.join(ROOT, "android", "build.gradle");
const KEYSTORE_FILE = path.join(ROOT, "android", "tawfeer-release.keystore");
const JAVA_ROOT = path.join(ROOT, "android", "app", "src", "main", "java");

/* إصدار firebase-messaging (متوافق مع compileSdk 36 + google-services 4.4.x) */
const FIREBASE_MESSAGING_VERSION = "24.1.0";

/* أماكن البحث عن google-services.json (الجولة 29 — الإشعارات الأصلية) */
const GS_CANDIDATES = [
  path.join(ROOT, "google-services.json"), // جذر المستودع (المسار المعتمد للسحابة)
  path.join(ROOT, "upload", "google-services.json"), // بيئة الاختبار المحلية
  path.join(ROOT, "android-config", "google-services.json"),
];

/** ألوان هوية «توفير» — مطابقة للويب تماماً (إصلاح الثيم):
 *  كان السكربت يستخدم #005B82/#003B55 (لوحة قديمة مختلفة عن كحلي
 *  الهوية #0A1A2F) + يفرضها بلا تمييز فاتح/داكن ← أشرطة نظام داكنة
 *  دائماً حتى في الوضع الفاتح (مشكلة «أزرار النظام الداكنة»).
 *  الآن: القيم الفاتحة في values/ والداكنة في values-night/ فيتبع
 *  أندرويد وضع النظام تلقائياً (السبلاش وشريط الحالة والتنقل). */
const BRAND = {
  colorPrimary: "#0A1A2F",
  colorAccent: "#10B981",
  /* فاتح (values/) */
  light: {
    statusBar: "#F7F7F7",
    navigationBar: "#F7F7F7",
    splash: "#F7F7F7",
  },
  /* داكن (values-night/) */
  dark: {
    statusBar: "#0A1A2F",
    navigationBar: "#0A1A2F",
    splash: "#071426",
  },
};

const VERSION_NAME = process.env.VERSION_NAME || "1.2.0";
const VERSION_CODE = process.env.VERSION_CODE || "1";

const log = (icon, msg) => console.log(`${icon}  ${msg}`);
const fail = (msg) => {
  console.error(`\n❌  ${msg}\n`);
  process.exit(1);
};

/* ─── فحوصات أولية ─────────────────────────────────────────────────── */
const MANIFEST_FILE = path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
if (!fs.existsSync(MANIFEST_FILE)) {
  fail(`لم أجد ${MANIFEST_FILE} — شغّل أولاً: npx cap add android`);
}
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

/* ─── كشف FCM مسبقاً (يجب أن يسبق تعديلات الـManifest) ───────────────── */
const RAW_GRADLE = fs.readFileSync(GRADLE_FILE, "utf8");
const APPLICATION_ID = RAW_GRADLE.match(/applicationId\s+"([^"]+)"/)?.[1] ?? null;
if (!APPLICATION_ID) {
  fail("لم أجد applicationId في app/build.gradle — بنية غير متوقعة.");
}

/** يعثر على MainActivity.java داخل شجرة java (الحزمة تختلف حسب appId) */
function findMainActivityFile() {
  const found = [];
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name === "MainActivity.java") found.push(p);
    }
  })(JAVA_ROOT);
  return found[0] ?? null;
}
const MAIN_ACTIVITY_FILE = findMainActivityFile();
if (!MAIN_ACTIVITY_FILE) {
  fail(`لم أجد MainActivity.java داخل ${JAVA_ROOT} — بنية غير متوقعة.`);
}
const APP_PACKAGE = fs
  .readFileSync(MAIN_ACTIVITY_FILE, "utf8")
  .match(/^package\s+([\w.]+);/m)?.[1];
if (!APP_PACKAGE) {
  fail("تعذر قراءة الحزمة (package) من MainActivity.java — بنية غير متوقعة.");
}
const JAVA_PKG_DIR = path.dirname(MAIN_ACTIVITY_FILE);

const GS_SOURCE =
  GS_CANDIDATES.find((p) => fs.existsSync(p) && fs.statSync(p).size > 0) ?? null;
const FCM_ENABLED = Boolean(GS_SOURCE);
if (FCM_ENABLED) {
  log("🔥", `google-services.json مكتشف (${path.relative(ROOT, GS_SOURCE)}) → الإشعارات الأصلية ستُفعَّل`);
}

/* ─── 1) colors.xml — فاتح + values-night داكن (إصلاح الثيم) ───── */
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- هوية «توفير» — تجاوز القيم البنفسجية الافتراضية في مكتبة Capacitor
         + تتبّع وضع النظام: هذه القيم الفاتحة، والدكنة في values-night/ -->
    <color name="colorPrimary">${BRAND.colorPrimary}</color>
    <color name="colorPrimaryDark">${BRAND.dark.statusBar}</color>
    <color name="colorAccent">${BRAND.colorAccent}</color>
    <color name="splash_background">${BRAND.light.splash}</color>
    <color name="status_bar_color">${BRAND.light.statusBar}</color>
    <color name="navigation_bar_color">${BRAND.light.navigationBar}</color>
</resources>
`;
fs.writeFileSync(path.join(RES_DIR, "values", "colors.xml"), colorsXml);

/* القيم الليلية — يطبّقها أندرويد 10+ تلقائياً حسب وضع النظام */
const colorsNightXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimaryDark">${BRAND.dark.statusBar}</color>
    <color name="splash_background">${BRAND.dark.splash}</color>
    <color name="status_bar_color">${BRAND.dark.statusBar}</color>
    <color name="navigation_bar_color">${BRAND.dark.navigationBar}</color>
</resources>
`;
const valuesNightDir = path.join(RES_DIR, "values-night");
if (!fs.existsSync(valuesNightDir)) fs.mkdirSync(valuesNightDir, { recursive: true });
fs.writeFileSync(path.join(valuesNightDir, "colors.xml"), colorsNightXml);
log("🎨", `values/colors.xml ← فاتح ${BRAND.light.statusBar} + values-night/colors.xml ← داكن ${BRAND.dark.statusBar} (يتّبع وضع النظام)`);

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

  // ألوان أشرطة النظام (الحالة/التنقل) — موارد متغيّرة حسب وضع النظام
  // (إصلاح الثيم): values/ فاتح بأيقونات داكنة + values-night/ داكن.
  {
    const naBlock = styles.match(/<style[^>]+name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?<\/style>/);
    if (!naBlock) fail("تعذر عزل كتلة AppTheme.NoActionBar في styles.xml.");
    let patchedNa = naBlock[0];
    if (!patchedNa.includes("statusBarColor")) {
      patchedNa = patchedNa.replace(
        /<\/style>/,
        '    <item name="android:statusBarColor">@color/status_bar_color</item>\n    </style>',
      );
    }
    if (!patchedNa.includes("navigationBarColor")) {
      patchedNa = patchedNa.replace(
        /<\/style>/,
        '    <item name="android:navigationBarColor">@color/navigation_bar_color</item>\n    </style>',
      );
    }
    /* أيقونات شريط الحالة/التنقل داكنة في الوضع الفاتح (Android 6+/8.1+) */
    if (!patchedNa.includes("windowLightStatusBar")) {
      patchedNa = patchedNa.replace(
        /<\/style>/,
        '    <item name="android:windowLightStatusBar">true</item>\n    <item name="android:windowLightNavigationBar" tools:targetApi="o_mr1">true</item>\n    </style>',
      );
    }
    styles = styles.replace(naBlock[0], patchedNa);
    /* xmlns:tools مطلوب لـ tools:targetApi في windowLightNavigationBar */
    if (!styles.includes("xmlns:tools")) {
      styles = styles.replace(/<resources>/, '<resources xmlns:tools="http://schemas.android.com/tools">');
    }
  }
  fs.writeFileSync(stylesPath, styles);

  /* نسخة values-night من styles — نفس الثيم بأيقونات فاتحة (إصلاح الثيم) */
  {
    const nightStylesPath = path.join(RES_DIR, "values-night", "styles.xml");
    const baseStyles = fs.readFileSync(stylesPath, "utf8");
    /* استبدال windowLight* بـ false للوضع الداكن (أيقونات بيضاء) */
    const nightStyles = baseStyles
      .replace(/<style[^>]+name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?<\/style>/, (m) =>
        m
          .replace(/<item name="android:windowLightStatusBar">true<\/item>/,
            '<item name="android:windowLightStatusBar">false</item>')
          .replace(/<item name="android:windowLightNavigationBar" tools:targetApi="o_mr1">true<\/item>/,
            '<item name="android:windowLightNavigationBar" tools:targetApi="o_mr1">false</item>'),
      )
      /* تعريف xmlns:tools إن لم يوجد (مطلوب لـ tools:targetApi) */
      .replace(/<resources>/,
        '<resources xmlns:tools="http://schemas.android.com/tools">');
    fs.writeFileSync(nightStylesPath, nightStyles);
  }
  log("🖼️", "values/styles.xml + values-night/styles.xml ← سبلاش + أشرطة نظام ثنائية الوضع (تتبع وضع النظام)");
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
log("✨", `drawable/splash.xml ← @color/splash_background ثنائي الوضع (فاتح ${BRAND.light.splash} / داكن ${BRAND.dark.splash})`);

/* ─── 4) AndroidManifest.xml — الأذونات + روابط أندرويد العميقة ─────── */
const DEEP_LINK_HOST = "tawfir.giize.com";
let manifest = fs.readFileSync(MANIFEST_FILE, "utf8");

/* 4-أ) فلتر Deep Links: هذه هي القطعة الناقصة التي تجعل assetlinks.json
 *      فعّالاً — أندرويد لا يتحقق إلا من النطاقات المُصرّح بها في الـManifest.
 *      (قوالب Capacitor لا تضيفه أبداً — بدون ذلك يبقى كل تجهيز البصمة معطلاً) */
if (!/android:autoVerify/.test(manifest)) {
  const activityOpen = manifest.indexOf('android:name=".MainActivity"');
  const activityClose = manifest.indexOf("</activity>");
  if (activityOpen === -1 || activityClose === -1) {
    fail("لم أجد MainActivity أو قوسها المغلق في AndroidManifest.xml — بنية غير متوقعة.");
  }
  const deepLinkFilter = `
            <!-- توفير — روابط أندرويد العميقة (App Links): التحقق الآلي عبر assetlinks.json -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${DEEP_LINK_HOST}" />
            </intent-filter>`;
  // إدراج قبل قوس MainActivity المغلق (القالب يحوي نشاطاً واحداً فقط)
  manifest =
    manifest.slice(0, activityClose) + deepLinkFilter + manifest.slice(activityClose);
  log("🔗", `AndroidManifest ← فلتر Deep Links: https://${DEEP_LINK_HOST} (autoVerify — التحقق عبر assetlinks.json سيعمل)`);
} else {
  log("♻️", "فلتر Deep Links موجود مسبقاً (إعادة تشغيل)");
}

/* 4-ب) الأذونات: كلها Normal — بلا أي مطالبات مخيفة عند التثبيت */
const wantedPermissions = [
  "android.permission.INTERNET", // أساسي — موجود في القالب عادة
  "android.permission.ACCESS_NETWORK_STATE", // حالة الشبكة (@capacitor/network)
  "android.permission.VIBRATE", // الاهتزاز (@capacitor/haptics)
  "android.permission.POST_NOTIFICATIONS", // Android 13+ — جاهزية الإشعارات
];
const addedPerms = [];
for (const perm of wantedPermissions) {
  if (!manifest.includes(`android:name="${perm}"`)) {
    manifest = manifest.replace(
      /<\/manifest>/,
      `    <uses-permission android:name="${perm}" />\n</manifest>`,
    );
    addedPerms.push(perm.split(".").pop());
  }
}
log("🔔", `الأذونات النهائية: ${wantedPermissions.length} (أُضيف الآن: ${addedPerms.length ? addedPerms.join("، ") : "لا شيء — كلها موجودة"})`);

/* 4-ج) قفل الاتجاه portrait — تجربة تطبيقات الطعام النيتفة القياسية */
if (!/android:screenOrientation/.test(manifest)) {
  const nameAttr = manifest.indexOf('android:name=".MainActivity"');
  if (nameAttr === -1) {
    fail(`لم أجد android:name=".MainActivity" لإضافة قفل الاتجاه — بنية غير متوقعة.`);
  }
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:screenOrientation="portrait"',
  );
  log("📱", "AndroidManifest ← قفل الاتجاه portrait (تجربة نيتف أصيلة — كتطبيقات الطعام)");
}

/* 4-د) عناصر FCM الأصلية: فئة Application + الخدمة + القناة الافتراضية */
if (FCM_ENABLED) {
  if (!/android:name="\.TawfirApp"/.test(manifest)) {
    manifest = manifest.replace(
      /<application\b/,
      '<application\n        android:name=".TawfirApp"',
    );
  }
  if (!manifest.includes(".TawfirFirebaseMessagingService")) {
    const fcmBlock = `
        <!-- توفير — خدمة إشعارات FCM الأصلية: تعمل والتطبيق مفتوح/بالخلفية/مُغلق -->
        <service
            android:name=".TawfirFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        <!-- القناة/الأيقونة/اللون الافتراضية للإشعارات التلقائية (التطبيق بالخلفية) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="tawfir_general" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_tawfir" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />`;
    manifest = manifest.replace(/<\/application>/, `${fcmBlock}\n    </application>`);
  }
  log("🔥", `AndroidManifest ← خدمة FCM + قناة افتراضية + أيقونة/لون الإشعار (الحزمة: ${APPLICATION_ID})`);
}

/* 4-هـ) تحقق بنيوي من الـManifest قبل الكتابة */
{
  const problems = [];
  const filterPos = manifest.indexOf('android:autoVerify="true"');
  const activityOpen = manifest.indexOf('android:name=".MainActivity"');
  const activityClose = manifest.indexOf("</activity>");
  if (filterPos === -1) problems.push("فلتر autoVerify غير موجود!");
  else if (!(activityOpen < filterPos && filterPos < activityClose))
    problems.push("فلتر Deep Links ليس داخل MainActivity!");
  if (!manifest.includes(`android:host="${DEEP_LINK_HOST}"`))
    problems.push(`نطاق ${DEEP_LINK_HOST} غير مصرّح به في الفلتر!`);
  if (
    !manifest.includes('android.intent.category.BROWSABLE') ||
    !manifest.includes('android.intent.category.DEFAULT') ||
    !manifest.includes('android.intent.action.VIEW')
  )
    problems.push("أركان الفلتر (VIEW/DEFAULT/BROWSABLE) ناقصة!");
  for (const perm of wantedPermissions) {
    if (!manifest.includes(`android:name="${perm}"`))
      problems.push(`الإذن ${perm} غير موجود!`);
  }
  if (!manifest.includes('android:screenOrientation="portrait"'))
    problems.push("قفل الاتجاه portrait غير موجود!");
  if (FCM_ENABLED) {
    const appOpen = manifest.indexOf("<application");
    const appClose = manifest.indexOf("</application>");
    const svcPos = manifest.indexOf(".TawfirFirebaseMessagingService");
    if (svcPos === -1) problems.push("خدمة FCM غير مصرّح بها في الـManifest!");
    else if (!(appOpen < svcPos && svcPos < appClose))
      problems.push("خدمة FCM ليست داخل <application>!");
    if (!manifest.includes('android:name=".TawfirApp"'))
      problems.push('فئة التطبيق android:name=".TawfirApp" غير مصرّح بها!');
    if (
      !manifest.includes(
        "com.google.firebase.messaging.default_notification_channel_id",
      )
    )
      problems.push("القناة الافتراضية للإشعارات غير معرّفة!");
  }
  const tagPairs = [
    ["<intent-filter", "</intent-filter>"],
    ["<activity", "</activity>"],
    ["<manifest", "</manifest>"],
    ["<application", "</application>"],
    ["<service", "</service>"],
  ];
  for (const [open, close] of tagPairs) {
    const opens = (manifest.match(new RegExp(open, "g")) || []).length;
    const closes = (manifest.match(new RegExp(close, "g")) || []).length;
    if (opens !== closes) problems.push(`وسوم ${open} غير متوازنة (${opens}/${closes})`);
  }
  if (problems.length > 0) {
    fail(
      "فشل التحقق البنيوي من AndroidManifest.xml:\n" +
      problems.map((p) => `   • ${p}`).join("\n"),
    );
  }
  log("🛡️", "تحقق الـManifest ✓ — الفلتر داخل MainActivity، الأذونات كاملة، الوسوم متوازنة");
}
fs.writeFileSync(MANIFEST_FILE, manifest);

/* ══════════════════════════════════════════════════════════════════════
 * 5) الإشعارات الأصلية FCM — «نيتف نيتف» (الجولة 29)
 * ══════════════════════════════════════════════════════════════════════
 * شروط العمل: وجود google-services.json. حينها:
 *   • نسخ الملف إلى android/app/ مع توطين package_name = applicationId
 *     (مهم جداً لنسخة «المالك»: حزمة مختلفة ← إعادة كتابة الاسم لتجنّب
 *     فشل google-services plugin عند البناء — التسجيل الفعلي للحزمة
 *     في Firebase Console مسؤولية المستخدم لاحقاً)
 *   • TawfirApp.java            — يهيّئ قنوات الإشعارات فور بدء أي عملية
 *   • TawfirFirebaseMessagingService.java — استقبال الرسائل في كل الحالات
 *   • MainActivity.java          — أذونات 13+ + ألوان أشرطة النظام
 *   • ic_stat_tawfir.png — أيقونة إشعار الشعار الأبيض بكل دلائل الكثافة
 *                              (Vector XML احتياطاً عند تعذّر sharp)
 * إن لم يوجد الملف: تخطٍّ رشيق — البناء ينجح بلا إشعارات.
 */
if (!FCM_ENABLED) {
  log("⏭️", "google-services.json غير موجود — الإشعارات متخطاة (البناء ينجح بلا FCM)");
}

/* 5-أ) نسخ google-services.json + توطين package_name */
if (FCM_ENABLED) {
  let gsJson;
  try {
    gsJson = JSON.parse(fs.readFileSync(GS_SOURCE, "utf8"));
  } catch {
    fail(`${GS_SOURCE} غير صالح JSON — أعد تنزيله من Firebase Console (Project settings).`);
  }
  if (!gsJson.client || gsJson.client.length === 0) {
    fail("google-services.json لا يحوي أي client — أعد تنزيله من Firebase Console.");
  }
  let adjusted = 0;
  for (const client of gsJson.client) {
    const info = client?.client_info?.android_client_info;
    if (info && info.package_name !== APPLICATION_ID) {
      info.package_name = APPLICATION_ID;
      adjusted++;
    }
  }
  const GS_TARGET = path.join(ROOT, "android", "app", "google-services.json");
  fs.writeFileSync(GS_TARGET, JSON.stringify(gsJson, null, 2) + "\n");
  log(
    "🔥",
    `android/app/google-services.json ← المشروع ${gsJson.project_info?.project_id ?? "?"}${adjusted > 0 ? ` (وُطِّن package_name → ${APPLICATION_ID})` : " (الحزمة مطابقة)"}`,
  );
}

/* 5-ب) أيقونة الإشعار — شعار توفير المفرغ الأبيض على شفاف (إصلاح
 *      المربع الأبيض): معيار أندرويد API 21+ يتطلب Small Icon أحادية
 *      بيضاء بخلفية شفافة. نولّد ic_stat_tawfir.png بكل الكثافات من
 *      public/identity/notification_icon_white_96.png (شعار توفير
 *      الحقيقي — كان جرساً عاماً) + ic_tawfir_large.png الملونة من
 *      tawfir-app-icon-192.png للأيقونة الكبيرة في درج الإشعارات.
 *      احتياط: لو تعذّر sharp ← جرس Vector أبيض (كما كان سابقاً). */
if (FCM_ENABLED) {
  const drawableDir = path.join(RES_DIR, "drawable");
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

  /* كثافات أندرويد القياسية لأيقونة الحالة 24dp */
  const DENSITIES = [
    { dir: "drawable-mdpi", px: 24 },
    { dir: "drawable-hdpi", px: 36 },
    { dir: "drawable-xhdpi", px: 48 },
    { dir: "drawable-xxhdpi", px: 72 },
    { dir: "drawable-xxxhdpi", px: 96 },
  ];
  const SMALL_SRC = path.join(ROOT, "public", "identity", "notification_icon_white_512.png");
  const LARGE_SRC = path.join(ROOT, "public", "identity", "tawfir-app-icon-512.png");

  let smallIconGenerated = false;
  if (fs.existsSync(SMALL_SRC)) {
    try {
      const { default: sharp } = await import("sharp");
      for (const d of DENSITIES) {
        const dir = path.join(RES_DIR, d.dir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        /* Small icon: شعار مفرغ أبيض شفاف (resize من 512 لجودة أفضل) */
        await sharp(SMALL_SRC).resize(d.px, d.px).png().toFile(path.join(dir, "ic_stat_tawfir.png"));
        /* Large icon: أيقونة التطبيق الملونة (64dp نمطياً — 2× الأيقونة) */
        if (fs.existsSync(LARGE_SRC)) {
          await sharp(LARGE_SRC).resize(d.px * 2, d.px * 2).png().toFile(path.join(dir, "ic_tawfir_large.png"));
        }
      }
      smallIconGenerated = true;
      log("🔔", `ic_stat_tawfir.png (شعار توفير المفرغ الأبيض) + ic_tawfir_large.png (الملونة) بكل الكثافات — إصلاح مربع أندرويد الأبيض`);
    } catch (err) {
      log("⚠️", `تعذّر توليد أيقونات PNG عبر sharp (${err?.message ?? err}) — الرجوع لأيقونة Vector`);
    }
  }

  if (!smallIconGenerated) {
    /* احتياط: أيقونة Vector (جرس أبيض) — تعمل من API 24 */
    const notifIcon = `<?xml version="1.0" encoding="utf-8"?>
<!-- أيقونة إشعار توفير (احتياط) — Vector أبيض (قناع ألفا لشريط الحالة) -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.9,2 2,2zM18,16v-5c0,-3.07 -1.63,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z" />
</vector>
`;
    fs.writeFileSync(path.join(drawableDir, "ic_stat_tawfir.xml"), notifIcon);
    log("🔔", "drawable/ic_stat_tawfir.xml ← أيقونة إشعار Vector (احتياط)");
  }
}

/* 5-ج) TawfirApp.java — يضمن وجود القنوات قبل أي إشعار (حتى لو وصل
 *      إشعار والتطبيق مُغلق: أندرويد يوقظ العملية → Application.onCreate
 *      → القنوات جاهزة → ثم يعرض SDK الإشعار التلقائي على القناة الصحيحة) */
if (FCM_ENABLED) {
  const tawfirApp = `package ${APP_PACKAGE};

import android.app.Application;

/**
 * توفير — فئة التطبيق: تهيئة قنوات الإشعارات (5 قنوات حسب النوع)
 * فور بدء أي عملية (أصلية 100%).
 */
public class TawfirApp extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        TawfirFirebaseMessagingService.createChannels(this);
        TawfirFirebaseMessagingService.subscribeToAllTopic();
    }
}
`;
  fs.writeFileSync(path.join(JAVA_PKG_DIR, "TawfirApp.java"), tawfirApp);
  log("🧩", `TawfirApp.java ← تهيئة 5 قنوات + الاشتراك بموضوع tawfir_all (${APP_PACKAGE})`);
}

/* 5-د) TawfirFirebaseMessagingService.java — قلب الإشعارات الأصلي
 *      (الإصلاح الشامل: قنوات حسب notification_type + روابط عميقة +
 *      أيقونات الهوية + اهتزاز لكل نوع + حفظ التوكن للـWebView) */
if (FCM_ENABLED) {
  const fcmService = `package ${APP_PACKAGE};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * توفير — خدمة إشعارات FCM الأصلية.
 * تعمل في كل حالات التطبيق: مفتوح أمام المستخدم، بالخلفية، أو مُغلق تماماً.
 *
 * الإصلاح الشامل:
 *  • 5 قنوات حسب notification_type (طلبات/عضوية/متاجر/عروض/عام) —
 *    قناة الطلبات IMPORTANCE_HIGH (صوت + اهتزاز + أضواء).
 *  • أيقونة صغيرة = شعار توفير المفرغ الأبيض (ic_stat_tawfir) —
 *    معيار أندرويد API 21+ (أحادية/شفافة) بدل مربع أبيض.
 *  • أيقونة كبيرة ملونة (ic_tawfir_large) في درج الإشعارات.
 *  • رابط عميق من نوع الإشعار + order_id/product_id/facility_id —
 *    النقر يفتح الصفحة الصحيحة داخل WebView الحي.
 *  • اهتزاز مخصّص لكل نوع (نفس أنماط الويب).
 *  • onNewToken يحفظ التوكن في SharedPreferences ليقرأه الـWebView
 *    عبر إضافة TawfirNative ويسجّله في الباك إند بمصادقة المستخدم.
 */
public class TawfirFirebaseMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_ORDERS = "tawfir_orders";
    public static final String CHANNEL_MEMBERSHIP = "tawfir_membership";
    public static final String CHANNEL_STORES = "tawfir_stores";
    public static final String CHANNEL_OFFERS = "tawfir_offers";
    public static final String CHANNEL_GENERAL = "tawfir_general";
    public static final String TOPIC_ALL = "tawfir_all";
    public static final String PREFS_NAME = "tawfir_native";
    public static final String PREF_TOKEN = "fcm_token";
    public static final String EXTRA_DEEP_LINK = "tawfir_deep_link";
    private static final String TAG = "TawfirFCM";
    private static final int BRAND_NAVY = 0xFF0A1A2F;
    private static final java.util.concurrent.atomic.AtomicInteger NEXT_ID =
            new java.util.concurrent.atomic.AtomicInteger(1000);

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        /* حفظ التوكن — يقرأه الـWebView (TawfirNative) ويسجّله في
           الباك إند بوسم مصادقة المستخدم الحالي (POST /fcm/token) */
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String previous = prefs.getString(PREF_TOKEN, null);
        prefs.edit().putString(PREF_TOKEN, token).apply();
        Log.i(TAG, "FCM token stored for WebView registration"
                + (previous != null && !previous.equals(token) ? " (rotated)" : ""));
        subscribeToAllTopic();
    }

    /** التوكن المحفوظ (null إن لم يصل بعد) — تستخدمه إضافة TawfirNative */
    public static String getStoredToken(Context context) {
        if (context == null) return null;
        return context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString(PREF_TOKEN, null);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        Map<String, String> data = message.getData();

        String type = data.get("notification_type");
        if (type == null || type.length() == 0) type = data.get("type");
        if (type == null) type = "";

        String title = null;
        String body = null;
        RemoteMessage.Notification notification = message.getNotification();
        if (notification != null) {
            title = notification.getTitle();
            body = notification.getBody();
        }
        if (data.containsKey("title") && title == null) title = data.get("title");
        if (data.containsKey("body") && body == null) body = data.get("body");
        if (title == null || title.length() == 0) title = getString(R.string.app_name);
        if (body == null || body.length() == 0) body = "لديك تحديث جديد من توفير";

        String channel = channelForType(type);
        String deepLink = resolveDeepLink(type, data);
        long[] pattern = vibrationFor(type);

        showNotification(this, channel, title, body, deepLink, pattern, type);
    }

    /** اختيار القناة حسب نوع الإشعار (نفس تصنيف الواجهة) */
    public static String channelForType(String type) {
        if (type == null || type.length() == 0) return CHANNEL_GENERAL;
        if (type.startsWith("order_")) return CHANNEL_ORDERS;
        if (type.startsWith("membership_")) return CHANNEL_MEMBERSHIP;
        if (type.startsWith("facility_") || "owner_registered".equals(type)) return CHANNEL_STORES;
        if (type.startsWith("special_offer_")) return CHANNEL_OFFERS;
        return CHANNEL_GENERAL;
    }

    /** الرابط العميق — نفس منطق resolveClickUrl في الويب (مُوحّد) */
    public static String resolveDeepLink(String type, Map<String, String> data) {
        if (data == null) return "/";
        String url = data.get("url");
        if (url != null && url.startsWith("/")) return url;
        if ("order_new".equals(type)) {
            String fid = data.get("facility_id");
            if (fid != null && fid.length() > 0) return "/owner/facilities/" + fid + "/orders";
            String oid = data.get("order_id");
            if (oid != null && oid.length() > 0) return "/orders/" + oid;
            return "/orders";
        }
        String oid = data.get("order_id");
        if (oid != null && oid.length() > 0) return "/orders/" + oid;
        String pid = data.get("product_id");
        if (pid != null && pid.length() > 0) return "/products/" + pid;
        if (type == null || type.length() == 0) return "/";
        switch (type) {
            case "membership_new_request": return "/admin/membership-requests";
            case "membership_received":
            case "membership_approved":
            case "membership_rejected":
            case "membership_expiring": return "/account";
            case "facility_approved":
            case "facility_rejected":
            case "owner_registered": return "/owner";
            case "special_offer_new":
            case "special_offer_ending":
            case "special_offer_soldout": return "/offers";
            default: return "/";
        }
    }

    /** نمط الاهتزاز — نفس أنماط الويب (TYPE_META في sw-source.ts) */
    public static long[] vibrationFor(String type) {
        if (type == null || type.length() == 0) return new long[]{0, 180, 90, 180};
        switch (type) {
            case "order_new":
                return new long[]{0, 250, 120, 250, 120, 250, 120, 250};
            case "order_confirmed":
            case "order_preparing":
            case "membership_received":
            case "membership_new_request":
            case "owner_registered":
            case "special_offer_new":
                return new long[]{0, 180, 90, 180};
            case "order_out_for_delivery":
                return new long[]{0, 180, 90, 180, 250};
            case "order_delivered":
            case "membership_approved":
            case "facility_approved":
                return new long[]{0, 220, 110, 220, 110, 220};
            case "order_cancelled":
            case "membership_rejected":
            case "facility_rejected":
            case "special_offer_soldout":
                return new long[]{0, 350, 150, 350};
            case "membership_expiring":
            case "special_offer_ending":
                return new long[]{0, 280, 130, 280};
            default:
                return new long[]{0, 180, 90, 180};
        }
    }

    /** إنشاء قنوات الإشعارات الخمس — آمن للتكرار ويعمل من API 26+ */
    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        /* الطلبات: أهمية عالية (رأس الشاشة + صوت + اهتزاز + أضواء) */
        NotificationChannel orders = new NotificationChannel(
                CHANNEL_ORDERS, "تحديثات الطلبات", NotificationManager.IMPORTANCE_HIGH);
        orders.setDescription("طلبات جديدة وتأكيد وتجهيز وتوصيل وتسليم وإلغاء");
        orders.enableVibration(true);
        orders.setVibrationPattern(new long[]{0, 250, 120, 250, 120, 250, 120, 250});
        orders.enableLights(true);
        orders.setLightColor(BRAND_NAVY);

        NotificationChannel membership = new NotificationChannel(
                CHANNEL_MEMBERSHIP, "العضوية", NotificationManager.IMPORTANCE_DEFAULT);
        membership.setDescription("طلبات العضوية والموافقة والرفض والانتهاء");

        NotificationChannel stores = new NotificationChannel(
                CHANNEL_STORES, "المتاجر والملاك", NotificationManager.IMPORTANCE_DEFAULT);
        stores.setDescription("موافقات المتاجر وتسجيل الملاك");

        NotificationChannel offers = new NotificationChannel(
                CHANNEL_OFFERS, "العروض الخاصة", NotificationManager.IMPORTANCE_DEFAULT);
        offers.setDescription("عروض جديدة وقرب انتهاء ونفاد العرض");

        NotificationChannel general = new NotificationChannel(
                CHANNEL_GENERAL, "إشعارات عامة", NotificationManager.IMPORTANCE_DEFAULT);
        general.setDescription("أخبار توفير والإشعارات العامة");

        manager.createNotificationChannel(orders);
        manager.createNotificationChannel(membership);
        manager.createNotificationChannel(stores);
        manager.createNotificationChannel(offers);
        manager.createNotificationChannel(general);
    }

    /** الاشتراك بالموضوع العام — يمكّن الإرسال من Firebase Console مباشرة */
    public static void subscribeToAllTopic() {
        try {
            FirebaseMessaging.getInstance().subscribeToTopic(TOPIC_ALL)
                    .addOnCompleteListener(task ->
                            Log.i(TAG, "subscribe:" + TOPIC_ALL + "=" + task.isSuccessful()));
        } catch (Exception e) {
            Log.w(TAG, "subscribe failed", e);
        }
    }

    /** عرض إشعار أصيل: شعار توفير + رابط عميق + اهتزاز + لون الهوية */
    public static void showNotification(Context context, String channel, String title,
                                        String body, String deepLink, long[] pattern, String type) {
        int id = NEXT_ID.incrementAndGet();
        Intent launch = new Intent(context, MainActivity.class);
        if (deepLink != null && deepLink.length() > 0) {
            launch.putExtra(EXTRA_DEEP_LINK, deepLink);
        }
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context, id, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
                .setSmallIcon(R.drawable.ic_stat_tawfir)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(BRAND_NAVY)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                .setVibrate(pattern)
                .setPriority(CHANNEL_ORDERS.equals(channel)
                        ? NotificationCompat.PRIORITY_HIGH
                        : NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setShowWhen(true);

        /* طلب جديد للمالك: إشعار ثابت (requireInteraction في الويب) —
           يبقى في شاشة القفل/الدرج حتى ينقره المستخدم */
        if ("order_new".equals(type)) {
            builder.setOngoing(true);
        }

        /* الأيقونة الكبيرة الملونة (أيقونة التطبيق) إن وُجد المورد */
        try {
            int largeResId = context.getResources()
                    .getIdentifier("ic_tawfir_large", "drawable", context.getPackageName());
            if (largeResId != 0) {
                builder.setLargeIcon(BitmapFactory.decodeResource(context.getResources(), largeResId));
            }
        } catch (Exception ignored) {
        }

        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(id, builder.build());
    }
}
`;
  fs.writeFileSync(
    path.join(JAVA_PKG_DIR, "TawfirFirebaseMessagingService.java"),
    fcmService,
  );
  log("🧩", "TawfirFirebaseMessagingService.java ← 5 قنوات حسب النوع + روابط عميقة + أيقونات الهوية + اهتزاز لكل نوع");
}

/* 5-د2) TawfirNative.java — إضافة Capacitor أصيلة (تُولَّد دائماً):
 *        • setSystemBars: ثيم أشرطة النظام من الـWebView — أيقونات
 *          شريط الحالة وشريط التنقل (داكنة/فاتحة) + الألوان حسب
 *          ثيم التطبيق الفعّال (إصلاح ملاحظات المستخدم 2 و 3 —
 *          @capacitor/status-bar لا يغطي شريط التنقل إطلاقاً).
 *        • getSafeAreaInsets: WindowInsets الفعلية للـWebView (CSS px)
 *          — يضخّها الـWebView كمتغيرات CSS --cap-safe-top/bottom
 *          (إصلاح الملاحظة 1: تداخل الهيدر مع شريط الحالة في
 *          Edge-to-Edge؛ env() = 0 في WebView قبل Android 15).
 *        • getFcmToken / isNativePushAvailable: توكن FCM الأصلي
 *          (FCM فقط — لا يعمل web push داخل WebView بلا PushManager). */
{
  const fcmMethods = FCM_ENABLED
    ? `
    /** توكن FCM الأصلي المحفوظ (يحفظه onNewToken) — يسجّله الـWebView
     *  في الباك إند بمصادقة المستخدم الحالي (POST /fcm/token). */
    @PluginMethod
    public void getFcmToken(PluginCall call) {
        Context context = getContext();
        String token = TawfirFirebaseMessagingService.getStoredToken(context);
        JSObject ret = new JSObject();
        ret.put("token", token == null ? "" : token);
        ret.put("available", token != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void isNativePushAvailable(PluginCall call) {
        Context context = getContext();
        String token = TawfirFirebaseMessagingService.getStoredToken(context);
        JSObject ret = new JSObject();
        ret.put("available", token != null);
        call.resolve(ret);
    }
`
    : "";
  const tawfirNative = `package ${APP_PACKAGE};

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * توفير — الجسر الأصلي للـWebView الحي:
 *  • setSystemBars(dark, statusBarColor, navigationBarColor): يطبّق ثيم
 *    أشرطة النظام — أيقونات داكنة في الفاتح وفاتحة في الداكن لشريط
 *    الحالة وشريط التنقل معاً (WindowInsetsController — يعمل في كل
 *    الإصدارات بما فيها Android 15 Edge-to-Edge)، والألوان الصلبة
 *    قبل Android 15 فقط (في 15+ الأشرطة شفافة يتلوّن بها المحتوى).
 *  • getSafeAreaInsets(): WindowInsets الفعلية للـWebView بوحدة CSS px
 *    (بكسل CSS = dp في WebView كاباسيتور) — يستهلكها الـWebView عبر
 *    متغيرات CSS (--cap-safe-top/--cap-safe-bottom) لأن env() يُرجع 0
 *    لأشرطة النظام في WebView قبل Android 15.
 *  • مستمع Insets في load(): يضخّ المتغيرات تلقائياً في الصفحة كلما
 *    تغيّرت الأشرطة (إقلاع/تدوير/لوحة مفاتيح).
 *  • مظهر أولي عند load() حسب وضع النظام — ثم يصحّحه الـWebView حسب
 *    ثيم المستخدم الفعّال فور الترطيب (setupNativeStatusBar).
 */
@CapacitorPlugin(name = "TawfirNative")
public class TawfirNative extends Plugin {

    /** آخر Safe-Area معروفة (CSS px) — يحدّثها مستمع Insets؛ -1 = غير معروفة */
    private volatile float lastSafeTop = -1f;
    private volatile float lastSafeBottom = -1f;

    @Override
    public void load() {
        try {
            Activity activity = getActivity();
            if (activity == null || bridge == null || bridge.getWebView() == null) return;
            final Window window = activity.getWindow();
            final View webView = bridge.getWebView();

            /* المظهر الأولي لأشرطة النظام من وضع النظام (windowLight*
               في styles.xml يُتجاهَل في Android 15 Edge-to-Edge —
               WindowInsetsController هو المصدر الوحيد للحقيقة).
               الـWebView يصحّحه حسب ثيم المستخدم فور الترطيب. */
            applyBarsAppearance(window, isSystemDark());

            /* مستمع Insets على الـWebView نفسه: القيم التي «يرىها»
               الـWebView هي بالضبط ما يحتاج حشوه (قبل 15: الشريط
               السفلي مستهلك من الديكور = 0؛ 15+: كاملان Edge-to-Edge). */
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
                pushSafeAreaVars(webView, insets);
                return insets;
            });
        } catch (Exception ignored) {
        }
    }

    /* ═══ Safe Area (إصلاح الملاحظة 1 — تداخل الهيدر) ═══ */

    @PluginMethod
    public void getSafeAreaInsets(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || bridge == null || bridge.getWebView() == null) {
            JSObject ret = new JSObject();
            ret.put("top", 0);
            ret.put("bottom", 0);
            call.resolve(ret);
            return;
        }
        final View webView = bridge.getWebView();
        activity.runOnUiThread(() -> {
            JSObject ret = new JSObject();
            try {
                float top = lastSafeTop;
                float bottom = lastSafeBottom;
                if (top < 0f || bottom < 0f) {
                    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(webView);
                    if (insets != null) {
                        float d = cssPixelScale();
                        Insets st = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                        Insets nb = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
                        top = st.top / d;
                        bottom = nb.bottom / d;
                    }
                }
                ret.put("top", Math.max(0f, top < 0f ? 0f : top));
                ret.put("bottom", Math.max(0f, bottom < 0f ? 0f : bottom));
            } catch (Exception e) {
                ret.put("top", 0);
                ret.put("bottom", 0);
            }
            call.resolve(ret);
        });
    }

    /** يضخّ قيم Safe-Area كمتغيرات CSS في الصفحة الحية + يحدّث الكاش */
    private void pushSafeAreaVars(View webView, WindowInsetsCompat insets) {
        try {
            float d = cssPixelScale();
            Insets st = insets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets nb = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            float topCss = Math.max(0, st.top) / d;
            float bottomCss = Math.max(0, nb.bottom) / d;
            lastSafeTop = topCss;
            lastSafeBottom = bottomCss;
            final String js = "try{var r=document.documentElement.style;"
                    + "r.setProperty('--cap-safe-top','" + topCss + "px');"
                    + "r.setProperty('--cap-safe-bottom','" + bottomCss + "px');"
                    + "}catch(e){}";
            webView.post(() -> webView.evaluateJavascript(js, null));
        } catch (Exception ignored) {
        }
    }

    /** 1 CSS px في WebView كاباسيتور = 1 dp (كثافة الجهاز) */
    private float cssPixelScale() {
        float density = getContext().getResources().getDisplayMetrics().density;
        return density > 0f ? density : 1f;
    }

    /* ═══ ثيم أشرطة النظام (إصلاح الملاحظتين 2 و 3) ═══ */

    @PluginMethod
    public void setSystemBars(PluginCall call) {
        Boolean dark = call.getBoolean("dark", Boolean.TRUE);
        String statusBarColor = call.getString("statusBarColor");
        String navigationBarColor = call.getString("navigationBarColor");
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        final boolean darkBars = dark == null || dark;
        final String sbColor = statusBarColor;
        final String nbColor = navigationBarColor;
        activity.runOnUiThread(() -> {
            try {
                Window window = activity.getWindow();
                /* أيقونات شريط الحالة + شريط التنقل: داكنة في الفاتح
                   وفاتحة في الداكن — عبر WindowInsetsController (يعمل
                   في Android 15 Edge-to-Edge حيث windowLight* مهمل) */
                applyBarsAppearance(window, darkBars);

                /* الألوان الصلبة — قبل Android 15 فقط (15+ فرض
                   Edge-to-Edge: الأشرطة شفافة والمحتوى يلوّنها) */
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                    if (sbColor != null) {
                        window.setStatusBarColor(Color.parseColor(sbColor));
                    }
                    if (nbColor != null) {
                        window.setNavigationBarColor(Color.parseColor(nbColor));
                    }
                }
            } catch (Exception ignored) {
            }
            call.resolve();
        });
    }

    /** مظهر الأيقونات لكلا الشريطين: dark=true → أيقونات فاتحة */
    private void applyBarsAppearance(Window window, boolean dark) {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);
    }

    private boolean isSystemDark() {
        int nightMode = getContext().getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;
        return nightMode == Configuration.UI_MODE_NIGHT_YES;
    }
${fcmMethods}}
`;
  fs.writeFileSync(path.join(JAVA_PKG_DIR, "TawfirNative.java"), tawfirNative);
  log(
    "🧩",
    `TawfirNative.java ← ثيم أشرطة النظام (setSystemBars) + Safe-Area (getSafeAreaInsets + مستمع Insets)${FCM_ENABLED ? " + توكن FCM للـWebView" : " (بلا FCM — google-services.json غائب)"} (${APP_PACKAGE})`,
  );
}

/* 5-هـ) MainActivity.java — طلب إذن الإشعارات (13+) + تسجيل إضافة
 *      TawfirNative (دائماً — ثيم أشرطة النظام + Safe-Area + FCM)
 *      + توجيه الروابط العميقة من الإشعارات.
 *      (إصلاح الثيم): لا نفرض ألوان أشرطة النظام من الكود — تتولاها
 *      resources values/ + values-night/ (وضع النظام) + TawfirNative
 *      setSystemBars (ثيم المستخدم الفعّال من الـWebView). */
{
  const fcmPermissionBlock = FCM_ENABLED
    ? `
        // طلب إذن الإشعارات مرة واحدة (Android 13+) — بعد فتح التطبيق مباشرة
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    REQUEST_POST_NOTIFICATIONS);
        }
`
    : "";
  const mainActivity = `package ${APP_PACKAGE};

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
${FCM_ENABLED ? "import android.Manifest;\nimport android.content.pm.PackageManager;\n" : ""}
import com.getcapacitor.BridgeActivity;

/**
 * توفير — النشاط الرئيسي: تجربة أندرويد أصلية بالكامل.
 * ${FCM_ENABLED ? "طلب إذن الإشعارات على 13+ + توجيه الروابط العميقة من الإشعارات. " : ""}إضافة TawfirNative (ثيم أشرطة النظام setSystemBars + Safe-Area getSafeAreaInsets${FCM_ENABLED ? " + توكن FCM" : ""}) — ألوان الأشرطة الأولية من الثيم (values/values-night — تتبع وضع النظام) ثم يزامنها الـWebView مع ثيم المستخدم.
 */
public class MainActivity extends BridgeActivity {

    private static final int REQUEST_POST_NOTIFICATIONS = 1001;
    private static final String EXTRA_DEEP_LINK = "tawfir_deep_link";
    private boolean deepLinkConsumed = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(TawfirNative.class); // ثيم الأشرطة + Safe-Area (+ FCM إن مفعّل) للـWebView الحي
        ${fcmPermissionBlock.trim()}
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        routeDeepLink(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        /* الإطلاق البارد من إشعار: الجسر جاهز الآن — وجّه الرابط (مرة) */
        routeDeepLink(getIntent());
    }

    /**
     * توجيه رابط عميق من إشعار (extra tawfir_deep_link) إلى WebView الحي.
     * يعمل للإطلاق البارد (onResume بعد onCreate) وللتطبيق المفتوح
     * (onNewIntent). يُستهلك الرابط مرة واحدة (removeExtra).
     */
    private void routeDeepLink(Intent intent) {
        try {
            if (intent == null) return;
            String url = intent.getStringExtra(EXTRA_DEEP_LINK);
            if (url == null || url.length() == 0) return;
            if (deepLinkConsumed) {
                intent.removeExtra(EXTRA_DEEP_LINK);
                return;
            }
            deepLinkConsumed = true;
            intent.removeExtra(EXTRA_DEEP_LINK);
            if (bridge == null || bridge.getWebView() == null) return;
            final String target = url.startsWith("http")
                    ? url
                    : "https://tawfir.giize.com" + url;
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(target));
        } catch (Exception ignored) {
        }
    }
}
`;
  fs.writeFileSync(MAIN_ACTIVITY_FILE, mainActivity);
  log(
    "🧩",
    `MainActivity.java ← إذن الإشعارات${FCM_ENABLED ? " + روابط عميقة" : ""} + TawfirNative (ثيم أشرطة النظام + Safe-Area) (${APP_PACKAGE})`,
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * 5) build.gradle — الإصدار + التوقيع (محرّر سطري متتبّع الأقواس)
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

/* ─── 6-ب) FCM: اعتماد firebase-messaging داخل dependencies ─────────── */
if (FCM_ENABLED) {
  if (!gradle.includes("firebase-messaging")) {
    const scanned = scanGradle(gradle);
    const depsEntry = scanned.find(
      (e) => e.label === "dependencies" && e.path.length === 0,
    );
    if (!depsEntry) fail("لم أجد كتلة dependencies في app/build.gradle — بنية غير متوقعة.");
    const idx = scanned.indexOf(depsEntry);
    const indent = depsEntry.indent + "    ";
    const impl = (line) => ({ line, indent, label: null, path: [] });
    scanned.splice(
      idx + 1, 0,
      impl(`${indent}implementation "com.google.firebase:firebase-messaging:${FIREBASE_MESSAGING_VERSION}"`),
      impl(`${indent}implementation "androidx.core:core:\$androidxCoreVersion"`),
    );
    gradle = scanned.map((e) => e.line).join("\n");
    log("🔥", `app/build.gradle ← firebase-messaging ${FIREBASE_MESSAGING_VERSION} + androidx.core (NotificationCompat)`);
  } else {
    log("♻️", "اعتماد firebase-messaging موجود مسبقاً (إعادة تشغيل)");
  }
}

/* ─── 6-ج) FCM: ضمان classpath google-services في build.gradle الجذر ─── */
if (FCM_ENABLED) {
  const rootGradle = fs.readFileSync(ROOT_GRADLE_FILE, "utf8");
  if (!rootGradle.includes("com.google.gms:google-services")) {
    const scannedRoot = scanGradle(rootGradle);
    const agpIdx = scannedRoot.findIndex((e) =>
      /classpath\s+'com\.android\.tools\.build:gradle:/.test(e.line),
    );
    if (agpIdx === -1) fail("لم أجد classpath AGP في build.gradle الجذر — بنية غير متوقعة.");
    scannedRoot.splice(agpIdx + 1, 0, {
      line: `${scannedRoot[agpIdx].indent}classpath 'com.google.gms:google-services:4.4.4'`,
      indent: scannedRoot[agpIdx].indent,
      label: null,
      path: [],
    });
    fs.writeFileSync(ROOT_GRADLE_FILE, scannedRoot.map((e) => e.line).join("\n"));
    log("🔥", "android/build.gradle ← classpath google-services:4.4.4 (كان مفقوداً)");
  }
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

  // 6) TawfirNative — يجب أن يوجد دائماً (ثيم أشرطة النظام + Safe-Area)
  {
    const p = path.join(JAVA_PKG_DIR, "TawfirNative.java");
    if (!fs.existsSync(p)) {
      problems.push("TawfirNative.java غير موجود (مطلوب دائماً — setSystemBars/getSafeAreaInsets)!");
    } else {
      const content = fs.readFileSync(p, "utf8");
      for (const marker of ["setSystemBars", "getSafeAreaInsets", "setAppearanceLightNavigationBars"]) {
        if (!content.includes(marker)) {
          problems.push(`TawfirNative.java لا يحوي ${marker}!`);
        }
      }
    }
    const mainContent = fs.readFileSync(MAIN_ACTIVITY_FILE, "utf8");
    if (!mainContent.includes("registerPlugin(TawfirNative.class)")) {
      problems.push("MainActivity.java لا يسجّل TawfirNative!");
    }
  }

  // 7) عناصر FCM الأصلية (إن كانت مفعّلة)
  if (FCM_ENABLED) {
    const gsTarget = path.join(ROOT, "android", "app", "google-services.json");
    if (!fs.existsSync(gsTarget)) {
      problems.push("android/app/google-services.json غير موجود!");
    } else {
      try {
        const pkg = JSON.parse(fs.readFileSync(gsTarget, "utf8"))
          .client?.[0]?.client_info?.android_client_info?.package_name;
        if (pkg !== APPLICATION_ID) {
          problems.push(
            `package_name في google-services.json (${pkg}) ≠ applicationId (${APPLICATION_ID})`,
          );
        }
      } catch {
        problems.push("android/app/google-services.json غير صالح JSON!");
      }
    }
    if (!gradle.includes("firebase-messaging")) {
      problems.push("اعتماد firebase-messaging غير موجود في app/build.gradle!");
    }
    const javaFiles = [
      ["TawfirApp.java", "class TawfirApp"],
      ["TawfirFirebaseMessagingService.java", "class TawfirFirebaseMessagingService"],
      ["MainActivity.java", "class MainActivity"],
    ];
    for (const [name, marker] of javaFiles) {
      const p = path.join(JAVA_PKG_DIR, name);
      if (!fs.existsSync(p)) problems.push(`${name} غير موجود في ${JAVA_PKG_DIR}!`);
      else {
        const content = fs.readFileSync(p, "utf8");
        if (!content.includes(`package ${APP_PACKAGE};`))
          problems.push(`${name} بحزمة خاطئة!`);
        if (!content.includes(marker)) problems.push(`${name} لا يحوي ${marker}!`);
      }
    }
    /* أيقونة الإشعار ic_stat_tawfir — مساران صالحان للتوليد (5-ب):
       أ) PNG بكل الكثافات (المسار الأساسي عبر sharp — شعار توفير الأبيض)
       ب) Vector XML (الاحتياط عند تعذّر sharp أو غياب المصدر)
       كلاهما يُشبع @drawable/ic_stat_tawfir في الـManifest و
       R.drawable.ic_stat_tawfir في Java — أندرويد يحلّ المورد بالاسم
       عبر دلائل الكثافة ولا يشترط صيغة .xml (إصلاح الجولة 31:
       كان الفحص يقبل الـXML فقط فيفشل زيفاً عند نجاح مسار PNG). */
    const DENSITY_DIRS = [
      "drawable-mdpi",
      "drawable-hdpi",
      "drawable-xhdpi",
      "drawable-xxhdpi",
      "drawable-xxxhdpi",
    ];
    const pngHits = DENSITY_DIRS.filter((d) =>
      fs.existsSync(path.join(RES_DIR, d, "ic_stat_tawfir.png")),
    );
    const vectorHit = fs.existsSync(path.join(RES_DIR, "drawable", "ic_stat_tawfir.xml"));
    if (pngHits.length === 0 && !vectorHit) {
      problems.push(
        "أيقونة الإشعار ic_stat_tawfir غير موجودة (لا PNG بالكثافات ولا Vector XML)!",
      );
    }
  }

  if (problems.length > 0) {
    fail(
      "فشل التحقق البنيوي من build.gradle (لن أُمرّر ملفاً تالفاً لـ Gradle):\n" +
      problems.map((p) => `   • ${p}`).join("\n"),
    );
  }
  log("🛡️", "التحقق البنيوي النهائي ✓ — التوقيع + الإصدارات" + (FCM_ENABLED ? " + ملفات FCM" : ""));
}

/* ─── ملخص ─────────────────────────────────────────────────────────── */
console.log(
  [
    "",
    "════════════════════════════════════════════════════",
    "✅ اكتمل تفعيل هوية «توفير» في مشروع Android",
    `   • التطبيق        : ${APPLICATION_ID} (${APPLICATION_ID.includes("owner") ? "توفير مالك" : "توفير"})`,
    `   • الألوان        : Primary ${BRAND.colorPrimary} · داكن (values-night) ${BRAND.dark.statusBar} · Accent ${BRAND.colorAccent} · أشرطة النظام ✓`,
    `   • السبلاش        : @color/splash_background ثنائي الوضع (${removedCount} صورة حُذفت)`,
    `   • الإصدار        : ${VERSION_NAME} (${VERSION_CODE})`,
    `   • التوقيع        : ${signRequested ? "مفعَّل (APK + AAB يُوقَّعان تلقائياً)" : "غير مفعَّل"}`,
    `   • الروابط         : Deep Links فلتر https://${DEEP_LINK_HOST} (autoVerify) ✓`,
    `   • الأذونات        : ${wantedPermissions.join(" · ").replace(/android\.permission\./g, "")}`,
    `   • الإشعارات      : ${FCM_ENABLED ? "FCM أصلي ✓ — 5 قنوات (طلبات/عضوية/متاجر/عروض/عام) + موضوع tawfir_all + أيقونة نيتفة + طلب إذن 13+" : "متخطاة (لا google-services.json)"}`,
    `   • الاتجاه        : portrait (قفل رأسي — كتطبيقات الطعام)`,
    `   • البنية         : تحققت آلياً ✓ (Manifest + build.gradle + Java)`,
    "════════════════════════════════════════════════════",
    "",
    FCM_ENABLED
      ? "💡 الإرسال من Firebase Console → Messaging → حملة جديدة → Target: Topic = tawfir_all"
      : "💡 أضِف google-services.json في جذر المستودع لتفعيل الإشعارات الأصلية",
    "",
  ].join("\n"),
);
