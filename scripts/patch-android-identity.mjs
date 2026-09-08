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
 *                              TawfirApp (قنوات الإشعارات فور بدء أي عملية)،
 *                              TawfirFirebaseMessagingService (يعمل والتطبيق
 *                              مفتوح/بالخلفية/مُغلق + موضوع tawfir_all)،
 *                              MainActivity (طلب إذن 13+ + ألوان أشرطة
 *                              النظام) + أيقونة إشعار Vector نيتفة.
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

  // ألوان أشرطة النظام (الحالة/التنقل) على ثيم التشغيل — هوية توفير
  {
    const naBlock = styles.match(/<style[^>]+name="AppTheme\.NoActionBar"[^>]*>[\s\S]*?<\/style>/);
    if (!naBlock) fail("تعذر عزل كتلة AppTheme.NoActionBar في styles.xml.");
    let patchedNa = naBlock[0];
    if (!patchedNa.includes("statusBarColor")) {
      patchedNa = patchedNa.replace(
        /<\/style>/,
        '    <item name="android:statusBarColor">@color/colorPrimary</item>\n    </style>',
      );
    }
    if (!patchedNa.includes("navigationBarColor")) {
      patchedNa = patchedNa.replace(
        /<\/style>/,
        '    <item name="android:navigationBarColor">@color/colorPrimaryDark</item>\n    </style>',
      );
    }
    styles = styles.replace(naBlock[0], patchedNa);
  }
  fs.writeFileSync(stylesPath, styles);
  log("🖼️", "values/styles.xml ← سبلاش صلب + شريط الحالة #005B82 + شريط التنقل #003B55");
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
 *   • drawable/ic_stat_tawfir.xml — أيقونة إشعار Vector (جرس — أبيض)
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

/* 5-ب) أيقونة الإشعار Vector — جرس أبيض (المعيار الأصيل لشريط الحالة) */
if (FCM_ENABLED) {
  const notifIcon = `<?xml version="1.0" encoding="utf-8"?>
<!-- أيقونة إشعار توفير — جرس Vector أبيض (يُستخدم كقناع ألفا في شريط الحالة) -->
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
  const drawableDir = path.join(RES_DIR, "drawable");
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
  fs.writeFileSync(path.join(drawableDir, "ic_stat_tawfir.xml"), notifIcon);
  log("🔔", "drawable/ic_stat_tawfir.xml ← أيقونة إشعار Vector (جرس — تعمل من API 24)");
}

/* 5-ج) TawfirApp.java — يضمن وجود القنوات قبل أي إشعار (حتى لو وصل
 *      إشعار والتطبيق مُغلق: أندرويد يوقظ العملية → Application.onCreate
 *      → القنوات جاهزة → ثم يعرض SDK الإشعار التلقائي على القناة الصحيحة) */
if (FCM_ENABLED) {
  const tawfirApp = `package ${APP_PACKAGE};

import android.app.Application;

/**
 * توفير — فئة التطبيق: تهيئة قنوات الإشعارات فور بدء أي عملية (أصلية 100%).
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
  log("🧩", `TawfirApp.java ← تهيئة القنوات + الاشتراك بموضوع tawfir_all (${APP_PACKAGE})`);
}

/* 5-د) TawfirFirebaseMessagingService.java — قلب الإشعارات الأصلي */
if (FCM_ENABLED) {
  const fcmService = `package ${APP_PACKAGE};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * توفير — خدمة إشعارات FCM الأصلية.
 * تعمل في كل حالات التطبيق: مفتوح أمام المستخدم، بالخلفية، أو مُغلق تماماً.
 *
 * الإرسال من Firebase Console (بلا خادم): الموضوع «tawfir_all».
 * الرسائل بالبيانات (data): channel=orders → قناة «تحديثات الطلبات» العالية،
 * وإلا قناة «إشعارات عامة». مفاتيح اختيارية: title / body بالعربية.
 */
public class TawfirFirebaseMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_ORDERS = "tawfir_orders";
    public static final String CHANNEL_GENERAL = "tawfir_general";
    public static final String TOPIC_ALL = "tawfir_all";
    private static final String TAG = "TawfirFCM";
    private static final java.util.concurrent.atomic.AtomicInteger NEXT_ID =
            new java.util.concurrent.atomic.AtomicInteger(1000);

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.i(TAG, "FCM_TOKEN=" + token);
        subscribeToAllTopic();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        String channel = CHANNEL_GENERAL;
        String title = null;
        String body = null;

        RemoteMessage.Notification notification = message.getNotification();
        if (notification != null) {
            title = notification.getTitle();
            body = notification.getBody();
        }
        if (!message.getData().isEmpty()) {
            String ch = message.getData().get("channel");
            if ("orders".equals(ch)) channel = CHANNEL_ORDERS;
            if (message.getData().containsKey("title")) title = message.getData().get("title");
            if (message.getData().containsKey("body")) body = message.getData().get("body");
        }
        if (title == null || title.length() == 0) title = getString(R.string.app_name);
        if (body == null || body.length() == 0) body = "لديك تحديث جديد من توفير";
        showNotification(this, channel, title, body);
    }

    /** إنشاء قناتي الإشعارات — آمن للتكرار ويعمل من API 24 */
    public static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel orders = new NotificationChannel(
                CHANNEL_ORDERS, "تحديثات الطلبات", NotificationManager.IMPORTANCE_HIGH);
        orders.setDescription("إشعارات حالة طلباتك وعروض توفير");
        orders.enableVibration(true);
        orders.enableLights(true);
        orders.setLightColor(0xFF005B82);

        NotificationChannel general = new NotificationChannel(
                CHANNEL_GENERAL, "إشعارات عامة", NotificationManager.IMPORTANCE_DEFAULT);
        general.setDescription("أخبار توفير والعروض الجديدة");

        manager.createNotificationChannel(orders);
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

    /** عرض إشعار أصيل: نص عربي، لون توفير، اهتزاز/صوت، نقرة تفتح التطبيق */
    public static void showNotification(Context context, String channel, String title, String body) {
        int id = NEXT_ID.incrementAndGet();
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context, id, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
                .setSmallIcon(R.drawable.ic_stat_tawfir)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setColor(0xFF005B82)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setPriority(CHANNEL_ORDERS.equals(channel)
                        ? NotificationCompat.PRIORITY_HIGH
                        : NotificationCompat.PRIORITY_DEFAULT);

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
  log("🧩", "TawfirFirebaseMessagingService.java ← استقبال FCM في كل الحالات + قناتا الطلبات/العام");
}

/* 5-هـ) MainActivity.java — طلب إذن الإشعارات (13+) + ألوان أشرطة النظام */
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

import android.os.Build;
import android.os.Bundle;
import android.view.Window;
${FCM_ENABLED ? "import android.Manifest;\nimport android.content.pm.PackageManager;\n" : ""}
import com.getcapacitor.BridgeActivity;

/**
 * توفير — النشاط الرئيسي: تجربة أندرويد أصلية بالكامل.
 * ألوان أشرطة النظام بهوية توفير${FCM_ENABLED ? " + طلب إذن الإشعارات على 13+" : ""}.
 */
public class MainActivity extends BridgeActivity {

    private static final int REQUEST_POST_NOTIFICATIONS = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarColors();${fcmPermissionBlock}    }

    /** هوية توفير على أشرطة النظام: الحالة #005B82 والتنقل #003B55 */
    private void applySystemBarColors() {
        try {
            Window window = getWindow();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.setStatusBarColor(0xFF005B82);
                window.setNavigationBarColor(0xFF003B55);
            }
        } catch (Exception ignored) {
        }
    }
}
`;
  fs.writeFileSync(MAIN_ACTIVITY_FILE, mainActivity);
  log(
    "🧩",
    `MainActivity.java ← ألوان أشرطة النظام${FCM_ENABLED ? " + طلب إذن الإشعارات (13+)" : ""} (${APP_PACKAGE})`,
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

  // 6) عناصر FCM الأصلية (إن كانت مفعّلة)
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
    if (!fs.existsSync(path.join(RES_DIR, "drawable", "ic_stat_tawfir.xml"))) {
      problems.push("drawable/ic_stat_tawfir.xml (أيقونة الإشعار) غير موجودة!");
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
    `   • الألوان        : Primary ${BRAND.colorPrimary} · Dark ${BRAND.colorPrimaryDark} · Accent ${BRAND.colorAccent} · أشرطة النظام ✓`,
    `   • السبلاش        : خلفية صلبة ${BRAND.splashBackground} (${removedCount} صورة حُذفت)`,
    `   • الإصدار        : ${VERSION_NAME} (${VERSION_CODE})`,
    `   • التوقيع        : ${signRequested ? "مفعَّل (APK + AAB يُوقَّعان تلقائياً)" : "غير مفعَّل"}`,
    `   • الروابط         : Deep Links فلتر https://${DEEP_LINK_HOST} (autoVerify) ✓`,
    `   • الأذونات        : ${wantedPermissions.join(" · ").replace(/android\.permission\./g, "")}`,
    `   • الإشعارات      : ${FCM_ENABLED ? "FCM أصلي ✓ — قناتان (الطلبات/عام) + موضوع tawfir_all + أيقونة نيتفة + طلب إذن 13+" : "متخطاة (لا google-services.json)"}`,
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
