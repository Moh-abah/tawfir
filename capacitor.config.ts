import type { CapacitorConfig } from "@capacitor/cli";

/**
 * إعداد Capacitor لتطبيق «توفير» — المسار 2 (Live WebView)
 * ═══════════════════════════════════════════════════════════════
 * appId: com.tawfir.app — يطابق assetlinks.json (SHA-256 في المفتاح نفسه)
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
 * (SHA-256: 3F0759...6635). مفتاح مختلف = شريط عنوان أخضر يظهر في
 * أندرويد (يفقد إحساس Native) ← اقرأ دليل_الـCapacitor.md.
 */
const config: CapacitorConfig = {
  appId: "com.tawfir.app",
  appName: "توفير",
  webDir: "native-shell",
  server: {
    androidScheme: "https",
    url: "https://tawfir.giize.com",
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: "android/tawfir.keystore",
      keystoreAlias: "tawfir",
    },
    allowMixedContent: false,
    backgroundColor: "#005B82",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#005B82",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#005B82",
      overlaysWebView: true,
    },
  },
};

export default config;
