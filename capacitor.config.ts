import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعداد Capacitor لتطبيق «توفير» — المسار 2 (Live WebView)
 * ═══════════════════════════════════════════════════════════════
 * appId: com.tawfir.ye.app — يطابق assetlinks.json حرفياً (الجولة 22:
 *   إصلاح تعارض package_name — كان com.tawfir.app هنا بينما
 *   assetlinks.json يصرّح بـ com.tawfir.ye.app و com.tawfir.ye.owner
 *   ← روابط أندرويد العميقة كانت ستفشل التحقق. المعتمد: com.tawfir.ye.*)
 * appName: توفير
 * webDir: native-shell — مجلد محلي صغير (12KB) يحوي index.html فقط،
 *   وهي صفحة «غير متصل» بهوية توفير تُحاول إعادة التحميل للموقع الحي
 *   كل 5 ثوانٍ. تُستخدم كأصول WebView محلي احتياطي عند تعذّر الوصول
 *   للموقع الحي (الإطلاق الأول بلا اتصال). بهذا يكون حجم الـAPK
 *   أصغري (~5MB) بدل نسخ 2MB من خطوط/أصوات/أيقونات الويب (هي
 *   أصلاً تُخزَّن في كاش الـSW على الموقع الحي).
 * server.url: https://tawfir.giize.com — يفتح التطبيق الموقع الحي داخل
 *   Native shell. أصل الـWebView = الموقع الحي ← يعمل الـService Worker
 *   100% (https حقيقي) فيخزّن الهيكل + البيانات + الصور + التنقلات.
 *   أول إطلاق يحتاج إنترنت (لمرة واحدة لتسجيل SW + كاش الهيكل)؛
 *   بعدها يعمل أوفلاين بالكامل ويعرض آخر بيانات شوهدت.
 * androidScheme: https — أصل ثابت (https://localhost) للأصول المحلية
 * server.androidScheme: 'https'
 *
 * تحذير التوقيع: يجب استخدام نفس keystore الذي أنشأ assetlinks.json
 * (SHA-256: EE:E5:C2...:72:1D — كما في assetlinks.json). مفتاح مختلف = شريط عنوان أخضر يظهر في
 * أندرويد (يفقد إحساس Native) ← اقرأ دليل_الـCapacitor.md.
 */
const config: CapacitorConfig = {
  appId: "com.tawfir.ye.app",
  appName: "توفير",
  webDir: "native-shell",
  server: {
    androidScheme: "https",
    url: "https://tawfir.giize.com",
    cleartext: false,
  },
  android: {
    buildOptions: {
      // يُستخدم فقط من npx cap run — البناء الفعلي عبر Gradle يقرأ
      // أسرار التوقيع في .github/workflows/build-android.yml
      keystorePath: "android/tawfeer-release.keystore",
      keystoreAlias: "tawfeer",
    },
    allowMixedContent: false,
    /* إصلاح الثيم: خلفية الـWebView قبل تحميل المحتوى — فاتحة
       (السبلاش الأصلي الآن ثنائي الوضع عبر values/values-night في
       patch-android-identity.mjs؛ NativeBridge يضبط شريط الحالة
       الفعلي فور جهوزية الثيم). */
    backgroundColor: "#F7F7F7",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      /* إصلاح الثيم: فاتح — يطابق خلفية شاشة إقلاع الويب الفاتحة
       (#F7F7F7). كان #005B82 (أزرق مختلف عن الهوية) يسبب وميض
       لونين متتاليين. الوضع الداكن يعالجه values-night في الباتش. */
      backgroundColor: "#F7F7F7",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      /* إصلاح الثيم: إعداد أولي فاتح (أيقونات داكنة على خلفية فاتحة) —
         NativeBridge يضبطه فوراً على الوضع الفعلي بعد الترطيب، ويُزامنه
         مع كل تبديل. كان ثابتاً DARK/#0A1A2F فيظهر شريط داكن على تطبيق
         فاتح وأزرار نظام داكنة لا تتبع ثيم الجهاز. */
      style: "LIGHT",
      backgroundColor: "#F7F7F7",
      overlaysWebView: true,
    },
  },
};

export default config;
