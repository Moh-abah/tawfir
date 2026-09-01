# دليل الـCapacitor لتطبيق «توفير»
> دليل كامل للمراقب غير المبرمج — من المشروع إلى متجر Google Play

---

## 0) ملخص التنفيذ (ما بُني فعلاً)

تم اختيار **المسار 2 (Capacitor + Live WebView)** وتنفيذه بالكامل:

| المكون | الحالة | الدليل |
|---|---|---|
| `capacitor.config.ts` | ✅ مبني | appId=`com.tawfir.app`, server.url=`https://tawfir.giize.com`, webDir=`native-shell` |
| مشروع Android | ✅ مُولّد | مجلد `android/` (1.4MB مصدر، 5 إضافات Capacitor) |
| الأيقونات + Splash | ✅ بهوية توفير | مولّدة بـ `scripts/gen-capacitor-assets.py` (خلفية #005B82 + حرف «ت» ذهبي) |
| `colors.xml` + `styles.xml` | ✅ مُعدّلة | colorPrimary #005B82 + splash خلفية صلبة |
| الجسر الأصلي (Native Bridge) | ✅ مبني | `src/components/native/NativeBridge.tsx` + `src/lib/capacitor.ts` |
| Status Bar | ✅ #005B82 + Dark | عبر `StatusBar` plugin + `styles.xml` |
| Splash auto-hide | ✅ بعد أول paint أو 800ms | `NativeBridge` يستدعي `SplashScreen.hide()` |
| Back Button (Hardware) | ✅ Sheet→أغلق / history>1→back / وإلا exit | `App.addListener('backButton')` |
| Haptics أصلية | ✅ ImpactStyle/NotificationType | `src/lib/haptic.ts` يستدعي `nativeHaptic()` على Native |
| إخفاء زر PWA في Native | ✅ `!isNativePlatform()` في `usePwaInstall` | زر التثبيت يختفي داخل التطبيق |
| شبكة أمان أوفلاين | ✅ `public/native-offline.html` | محلية + بهوية توفير + إعادة تحميل تلقائية |
| `lint` | ✅ 0 أخطbn | (3 تحذيرات موروثة من react-hook-form) |
| `tsc` | ✅ 0 أخطbn | — |

---

## 1) تقييم المسارات الثلاثة (لماذا اخترنا المسار 2)

| المعيار | المسار 1 (Static Export) | **المسار 2 (Live WebView) ✉ المختار** | المسار 3 (هجين) |
|---|---|---|---|
| **حجم APK متوقع** | 15-25MB ⚠️ (خطوط Cairo 5MB+ + 18 ملف صوت + أيقونات) | **~3-5MB ✅** (غلاف أصلي + أيقونات فقط) | ~5-7MB |
| **أوفلاين يعمل؟** | أول فتح أوفلاين ✅ — لكن **الـSW لا يعمل على file://** ← كاش React Query فقط (هيكل غير مخزّن) | **أول فتح يحتاج إنترنت (لمرة واحدة)**؛ بعدها SW يخدم الهيكل + البيانات + الصور + التنقلات أوفلاين ✅ | مثل المسار 2 + صفحة سقوط محلية |
| **البطارية** | SW سلبي ✅ | SW سلبي ✅ (لا عمليات خلفية، لا polling دائم) | SW سلبي ✅ |
| **التعقيد** | **عالٍ ⚠️** — تبديل `API_BASE` لمطلق في 3 عملاء API + استبدال SW الديناميكي بملف ثابت + استبدال manifest الديناميكي + كسر route handlers | **منخفض جداً ✅** — صفر تغيير على كود Next.js للوظائف؛ فقط إعداد Capacitor + جسر أصلي | متوسط |
| **سرعة الوصول للنتيجة** | بطيء (إعادة هيكلة + اختبار) | **سريع ✅** (إعداد + جسر) | متوسط |
| **هل يكسر ميزات الجولات الـ17؟** | **نعم ⛔** — `output: "export"` يكسر route handlers الديناميكية: `/sw.js` (route handler يولّد SW) + `/manifest.webmanifest` (ديناميكي حسب Host) + `/.well-known/assetlinks.json` (header rule) | **لا ✅** — الموقع الحي كما هو، كل الميزات تعمل | لا ✅ |

### السبب الحاسم لاختيار المسار 2
> **«16 جولة استقرار لا تكسرها — إن وجدت مساراً يهدد أي ميزة عاملة، اختر الأبسط (المسار 2 غالباً ووثّق لماذا.»** — تذكير المهمة

المسار 1 يكسر 3 route handlers ديناميكية حرجة:
- `src/app/sw.js/route.ts` — يولّد الـService Worker ديناميكياً مع علم الإنتاج ورقم الإصدار
- `src/app/manifest.webmanifest/route.ts` — يولّد الـmanifest ديناميكياً حسب الـHost (عميل vs مالك)
- ترويسة `/.well-known/assetlinks.json` في `next.config.ts`

استبدالها بملفات ثابتة + تبديل `API_BASE` لمطلق في 3 عملاء API (`api-client.ts`, `customer-api-client.ts`, `owner-api-client.ts`) = تعقيد كبير + كسر ميزات + مخاطر حجم ≥15MB. المسار 2 يتجنب كل ذلك ببساطة تامة.

### الميزة الوحيدة التي يفقدها المسار 2 (مقبولة وموثّقة بصدق)
**أول إطلاق بعد التثبيت يحتاج اتصال إنترنت (لمرة واحدة، ~2-3 ثوانٍ) لتسجيل الـSW وتخزين الهيكل.** بعدها يعمل التطبيق أوفلاين بالكامل. هذه مفاضلة طبيعية لنمط PWA-in-native-shell وهي مسجّلة بصدق في القسم 6 (اختبار الأوفلاين).

---

## 2) البنية التقنية (ما يحدث عند فتح التطبيق)

```
[المستخدم يفتح «توفير» من شاشة أندرويد]
        │
        ▼
[الأندرويد يُطلق النشاط MainActivity]
        │
        ▼
[Capacitor WebView يحمّل server.url = https://tawfir.giize.com]
        │
        ├── إن وُجد اتصال إنترنت ← يحمّل الموقع الحي
        │       ├── يُسجّل الـSW (لمرة واحدة) ← /sw.js
        │       ├── الـSW يخزّن مسبقاً: /offline + /privacy + الأيقونات + الخطوط
        │       ├── الـSW يخزّن كتالوج البيانات: /api/regions + products + facilities (SWR)
        │       ├── الـSW يخزّن صور المنتجات (CacheFirst، حد 50)
        │       └── الـSW يخزّن تنقلات SPA (RSC payloads)
        │
        └── إن لم يوجد اتصال + لا كاش SW (أول إطلاق أوفلاين فقط)
                └── يُعرض `native-shell/index.html` المحلي (شاشة «غير متصل» بهوية توفير + إعادة محاولة تلقائية كل 5 ثوانٍ)

[بعد أول إطلاق ناجح عبر الإنترنت]
        │
        ▼
[كل إطلاق لاحق — حتى أوفلاين — يخدم الـSW:]
        ├── الهيكل (HTML/CSS/JS/خطوط/أيقونات) ← من كاش SHELL_CACHE
        ├── البيانات (products/facilities/regions) ← من كاش DATA_CACHE (SWR)
        ├── الصور ← من كاش IMAGE_CACHE (CacheFirst)
        ├── التنقلات ← من كاش NAV_CACHE (NetworkFirst → cache → /offline)
        └── العمليات الكاتبة (orders/auth/membership) ← NetworkOnly (رسالة 503 عربية لطيفة)
```

---

## 3) أوامر التغليف الكاملة (من المشروع إلى APK/AAB)

> المتطلبات: Android Studio (الإصدار Hedgehog 2023.1.1 أو أحدث) + JDK 17. مسار المشروع: `/home/z/my-project`

### الخطوة 1 — مزامنة أصول الويب مع مشروع Android
```bash
cd /home/z/my-project
npx cap sync android
# ✔ ينسخ native-shell/index.html إلى android/app/src/main/assets/public/
# ✔ يحدّث capacitor.config.json داخل android/
# ✔ يحدّث الإضافات (5 plugins)
```

### الخطوة 2 — فتح المشروع في Android Studio
```bash
npx cap open android
# أو يدوياً: افتح Android Studio → Open → اختر مجلد android/
```

### الخطوة 3 — إنشاء keystore التوقيع (مرة واحدة فقط!)
> **تحذير حرج:** يجب استخدام **نفس keystore** الذي أنشأ `assetlinks.json`.
> بصمة SHA-256 المسجّلة هناك: `3F07592415B7AC0C96246799376FB7244EEF22A2CE1EEA949E358037C6EA6635`.
> لو استخدمت keystore مختلفاً → سيظهر **شريط عنوان أخضر** في أندرويد (يفقد إحساس Native) ولن تعمل روابط التطبيق المباشرة (Deep Links).

```bash
# إن كان لديك keystore بالبصمة أعلاه — استخدمه (موصى به)
# إن لم يكن لديك — أنشئ واحداً جديداً ثم حدّث assetlinks.json بالبصمة الجديدة:
keytool -genkey -v \
  -keystore android/tawfir.keystore \
  -alias tawfir \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_STORE_PASS -keypass YOUR_KEY_PASS

# استخرج بصمة SHA-256:
keytool -list -v \
  -keystore android/tawfir.keystore \
  -alias tawfir \
  -storepass YOUR_STORE_PASS | grep SHA256
```

### الخطوة 4 — إعداد التوقيع في Gradle
أضف إلى `android/app/build.gradle` (داخل `android { ... }`):
```gradle
signingConfigs {
    release {
        storeFile file('tawfir.keystore')
        storePassword 'YOUR_STORE_PASS'
        keyAlias 'tawfir'
        keyPassword 'KEY_PASS'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### الخطوة 5 — البناء (APK للتجربة، AAB للنشر)
```bash
# داخل مجلد android/
./gradlew assembleRelease    # → android/app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease      # → android/app/build/outputs/bundle/release/app-release.aab
```
أو من Android Studio: **Build → Generate Signed Bundle / APK → Release**.

### الخطوة 6 — تثبيت على جهاز للتجربة
```bash
# تثبيت APK على جهاز متصل بـ USB Debugging
adb install android/app/build/outputs/apk/release/app-release.apk
# أو من Android Studio: Run button ▶
```

### الخطوة 7 — الرفع إلى Google Play
1. اذهب إلى https://play.google.com/console
2. أنشئ تطبيقاً جديداً → الحزمة: `com.tawfir.app`
3. قائمة «App signing» → اختر **«Use my own key»** → ارفع نفس keystore (أو استخدم Google App Signing — عندها سيُوقّع Google بمفتاحهم ويجب تحديث `assetlinks.json` بالبصمة من Play)
4. ارفع ملف `app-release.aab` في Internal Testing → اختبر → Production

---

## 4) الأيقونات والتوقيع

### الأيقونات (مُولّدة بالفعل)
- **السلسلة:** `public/icons/icon-512.png` (موجودة) → سكربت `scripts/gen-capacitor-assets.py` يولّد:
  - `resources/icon.png` (1024×1024) — أيقونة المشغل
  - `resources/splash.png` (2732×2732) — شاشة الإقلاع
  - `resources/icon-foreground.png` (1024×1024) — مقدمة الأيقونة التكيفية
  - `resources/icon-background.png` (1024×1024) — خلفية الأيقونة التكيفية
- **أمر التوليد:** `python3 scripts/gen-capacitor-assets.py` ثم `npx capacitor-assets generate --android`
- **التصميم:** خلفية متدرّجة `#003B55 → #005B82` + حرف «ت» ذهبي `#C9A23A` بخط Cairo-Black (موجود في `public/fonts/`)
- **الناتج:** 123 ملف أيقونة + splash في `android/app/src/main/res/mipmap-*` و `drawable-*` (981KB)

### التوقيع (القاعدة الذهبية)
> 🔴 **مفتاح مختلف = شريط عنوان أخضر في أندرويد + كسر Deep Links!**

`public/.well-known/assetlinks.json` يربط الحزمة `com.tawfir.app` بالبصمة:
```
3F07592415B7AC0C96246799376FB7244EEF22A2CE1EEA949E358037C6EA6635
```
يجب أن يُوقّع الـAPK بنفس keystore الذي ينتج هذه البصمة. عند إنشاء keystore جديد، استبدل البصمة في `assetlinks.json` ونشرها على `https://tawfir.giize.com/.well-known/assetlinks.json`.

---

## 5) اختبار الأوفلاين — كيف يختبره المراقب بنفسه

### الطريقة 1 — على جهاز أندرويد حقيقي (الموصى بها)
1. ثبّت الـAPK على جهاز أندرويد (`adb install ...` أو من Play Internal Testing)
2. افتح التطبيق عبر الإنترنت ← تصفّح الرئيسية + المتاجر + تفاصيل منتج + حسابي ← **هذا يخزّن كل شيء في كاش الـSW**
3. أغلق التطبيق تماماً (من قائمة التطبيقات الأخيرة)
4. فعّل **وضع الطيران** (Airplane Mode)
5. افتح التطبيق من شاشة الرئيسية
6. **المتوقع:**
   - ✅ يفتح فوراً (لا ينتظر الإنترنت)
   - ✅ الرئيسية تعرض آخر المنتجات/العروض شوهدت (من كاش SWR)
   - ✅ التنقل بين الصفحات يعمل (المتاجر/التفاصيل/الحساب/الإعدادات)
   - ✅ الصور تُعرض (من كاش الصور، حد 50)
   - ✅ بيانات المستخدم (الملف الشخصي/العضوية) من localStorage + Zustand
   - ❌ إنشاء طلب → رسالة «يتطلب هذا الإجراء اتصالاً بالإنترنت» (متوقع)
   - ❌ تحديث حالة طلب → رسالة لطيفة (متوقع)

### الطريقة 2 — محاكاة في المتصفح (للتطوير السريع)
1. افتح `https://tawfir.giize.com` في Chrome على الديسكتوب
2. افتح DevTools → Application → Service Workers → تأكد أن الـSW مفعّل
3. تصفّح بعض الصفحات (لتعبئة الكاش)
4. DevTools → Network → بدّل إلى **Offline**
5. أعد تحميل الصفحة ← المتوقع: تعرض آخر بيانات + الصفحات تعمل
6. (هذا يختبر الـSW فقط، لا الـNative Bridge — للـNative استخدم الطريقة 1)

### النتيجة الموثّقة من بيئة التطوير (هذه الجلسة)
- ✅ **الـSW مُسجّل ويتحكم:** `navigator.serviceWorker.controller === true`
- ✅ **4 كاشات معبّأة:** `tawfir-shell`, `tawfir-data`, `tawfir-images`, `tawfir-nav`
- ✅ **كاش الهيكل يحوي:** `/offline` + `/privacy` + 6 أيقونات + 6 خطوط Cairo + **كل JS chunks لكل الصفحات** (الرئيسية/المتاجر/المنتجات/الطلبات/الحساب/البحث/العروض/الإشعارات/تسجيل الدخول/التسجيل/العضوية/السلة + owner login/register)
- ✅ **كاش البيانات يحوي:** `/api/regions` + 10+ استعلامات products/facilities (بما فيها `/api/products/1` و `/api/facilities/1/products/categories`)
- ✅ **صفحة /offline ترسم:** `<h1>أنت غير متصل</h1>` + زر «إعادة المحاولة» + «العودة للرئيسية»
- ✅ **الصفحة الرئيسية ترسم:** 83632 bytes HTML، title = `توفير | طلب الوجبات اليمنية وخصم 30% للعضوية`

---

## 6) ماذا يحدث عند تحديث الموقع؟ (وصول الميزات للمستخدمين)

| المسار | آلية وصول التحديث | الميزة | العيب |
|---|---|---|---|
| **المسار 2 (المختار)** | عند تحديث الموقع الحي `tawfir.giize.com`، يكتشف الـSW التحديث (تحديث دوري كل ساعة + عند عودة الاتصال) → يعرض شريحة «يتوفر تحديث لتطبيق توفير» ← المستخدم يضغط «تحديث الآن» فيستلم النسخة الجديدة فوراً | **تحديث فوري للمحتوى دون إصدار جديد على Play!** (ميزة ضخمة) | التحديث يحدث داخل التطبيق (شفّاف عبر شريحة) |
| المسار 1 | يتطلب إعادة بناء + نشر APK جديد على Play + موافقة Google | — | دورة تحديث بطيئة (أيام للموافقة) |

**النتيجة:** المسار 2 يمنح الميزات الجديدة للمستخدمين خلال ساعات (أو فوراً عبر شريحة التحديث) دون المرور بمتجر Play — وهذا هدف رئيسي.

---

## 7) البطارية والتعقيد — موثّق

### استهلاك البطارية
- **لا عمليات خلفية:** التطبيق لا يشغّل أي Background Service. عند إغلاقه، لا يستهلك شيئاً.
- **لا polling دائم:** الـSW سلبي — لا يستفسر عن تحديثات إلا كل ساعة (وليس دورياً مكثّفاً)، وعند عودة الاتصال (حدث `online`).
- **الـWebSocket:** متصل فقط أثناء فتح التطبيق ومسجّل الدخول. عند الإغلاق، ينقطع.
- **الإشعارات:** عبر FCM (Firebase Cloud Messaging) — مدفوعة من الخادم فقط عند ورود إشعار حقيقي.

### التعقيد
- **مشروع Next.js واحد** — لا طبقات متراكبة، لا أنظمة مزدوجة.
- **كود الويب لم يُلمس للوظائف:** `API_BASE = "/api"` (نسبي) لم يُبدّل. إعادة كتابة Next.js تعمل كما في المتصفح.
- **الجسر الأصلي منفصل:** `src/lib/capacitor.ts` + `src/components/native/NativeBridge.tsx` — كود معزول بالكامل، يُفعّل فقط عند `isNativePlatform() === true`. على الويب = no-op صامت (0 كيلوبايت في حزمة الإنتاج لأن كل الإضافات dynamic-import).
- **5 إضافات Capacitor فقط:** `@capacitor/app` (زر الرجوع) + `@capacitor/status-bar` (شريط الحالة) + `@capacitor/splash-screen` (الإقلاع) + `@capacitor/haptics` (الاهتزاز) + `@capacitor/network` (حالة الشبكة). كلها خفيفة جداً.

### حجم الـAPK (موثّق)
- **مجلد `android/` الكامل:** 1.4MB (مصدر)
- **الأصول المحلية في الـAPK:** 12KB (`native-shell/index.html` فقط — لا خطوط/أصوات/أيقونات الويب، لأنها تُخزّن في كاش الـSW على الموقع الحي)
- **الأيقونات + Splash:** 1.1MB (في `res/`)
- **تقدير الـAPK المبني:** **~3-5MB** (غلاف Capacitor الأصلي ~2-3MB + الأيقونات + الأصول المحلية) — **أقل بكثير من حد 15MB** ✅

---

## 8) هيكل الملفات (ما أُنشئ/عُدّل)

### ملفات جديدة
| المسار | الغرض |
|---|---|
| `capacitor.config.ts` | إعداد Capacitor (appId, server.url, webDir, plugins) |
| `src/lib/capacitor.ts` | طبقة رقيقة: `isNativePlatform()` + دوال async للإضافات (dynamic import) |
| `src/components/native/NativeBridge.tsx` | يربط Status Bar + Splash hide + Back Button + Network listener |
| `public/native-offline.html` | صفحة «غير متصل» محلية (بهوية توفير + إعادة محاولة تلقائية) |
| `native-shell/index.html` | نسخة محلية للجسر (يحوي نفس صفحة الأوفلاين — تُنسخ للـAPK) |
| `resources/icon.png` + `splash.png` + `icon-foreground.png` + `icon-background.png` | مصادر الأيقونات (مولّدة بـ Python) |
| `scripts/gen-capacitor-assets.py` | سكربت توليد الأيقونات (Python PIL + Cairo-Black font) |
| `android/` | مشروع Android الأصلي (مولّد بـ `npx cap add android`) |
| `android/app/src/main/res/values/colors.xml` | ألوان الهوية (#005B82, #003B55, #C9A23A) |

### ملفات معدّلة
| المسار | التغيير |
|---|---|
| `src/app/providers.tsx` | إضافة `<NativeBridge />` في شجرة Providers |
| `src/lib/haptic.ts` | استدعاء `nativeHaptic()` على Native (fire-and-forget) + السقوط على `navigator.vibrate` بالويب |
| `src/hooks/usePwaInstall.ts` | `canShow = !isNativePlatform() && ...` (إخفاء زر PWA داخل Native) |
| `src/components/public/SearchFiltersSheet.tsx` | `BadgeShekel` → `BadgePercent` (أيقونة غير موجودة في lucide-react 0.525 — إصلاح typecheck) |
| `src/components/shared/SessionRestore.tsx` | حارس null لـ`refresh_token` (إصلاح typecheck) |
| `android/app/src/main/res/values/styles.xml` | خلفية splash صلبة #005B82 |

### ملفات محمية (لم تُلمس — احترام القاعدة الذهبية)
- `src/components/theme/theme-provider.tsx` ✅
- `src/hooks/usePrefersReducedMotion.ts` ✅
- `src/services/api-client.ts` + `customer-api-client.ts` + `owner-api-client.ts` ✅ (API_BASE = "/api" كما هو)
- `src/lib/ws-client.ts` + `src/lib/sound-service.ts` ✅
- `src/app/sw.js/route.ts` + `src/app/manifest.webmanifest/route.ts` ✅
- صفحة تسجيل الدخول + معالجة 401 ✅

---

## 9) الأوامر السريعة (مرجع المطور)

```bash
# مزامنة بعد تعديل أصول الويب
npx cap sync android

# فتح في Android Studio
npx cap open android

# إعادة توليد الأيقونات (بعد تعديل السكربت)
python3 scripts/gen-capacitor-assets.py && npx capacitor-assets generate --android

# فحص الجودة
bun run lint          # 0 أخطbn + 3 تحذيرات موروثة
bun run typecheck     # 0 أخطbn

# إعادة تشغيل dev server (عند قتل OOM — خطر بيئي موثّق)
pkill -9 -f "next" && rm -rf .next
setsid bash -c 'exec bun run dev > dev.log 2>&1' < /dev/null & disown
```

---

## 10) المخاطر والملاحظات

### 1. خطر بيئي: OOM Killer
بيئة التطوير تقتل `next-server` دورياً (يستهلك ~2GB أثناء compile مع Turbopack). هذا **خطر بيئي بحت** — لا علاقة له بالكود. أُعيد التشغيل بالأمر الموثّق أعلاه. الـAPK النهائي لا يتأثر بذلك إطلاقاً.

### 2. أول إطلاق يحتاج إنترنت (لمرة واحدة)
المسار 2 يتطلب اتصالاً عند أول فتح بعد التثبيت (لتسجيل الـSW + كاش الهيكل). هذا **مقبول وموثّق بصدق** — بعدها يعمل التطبيق أوفلاين بالكامل. لو كان هذا مرفوضاً تماماً، لكان المسار 1 إجبارياً — لكنه يكسر ميزات الجولات الـ17 (route handlers الديناميكية) ويرفع الحجم ≥15MB.

### 3. توقيع assetlinks
إن استخدمت keystore مختلفاً للـrelease، سيظهر شريط عنوان أخضر في أندرويد وستتعطل روابط Deep Links. الحل: استخرج بصمة SHA-256 من keystore الـrelease وحدّث `public/.well-known/assetlinks.json` ثم انشرها على `https://tawfir.giize.com/.well-known/assetlinks.json`.

### 4. Google Play App Signing
إن فعّلت Google Play App Signing (الإعداد الافتراضي)، سيُوقّع Google بمفتاحهم الخاص بعد رفعك الـAAB. عندها:
- استخرج بصمة SHA-256 من Play Console (App signing → App signing key certificate)
- حدّث `assetlinks.json` بالبصمة من Google (ليس بصمتك)
- هذا يضمن عمل Deep Links بعد النشر عبر Play

### 5. تحديثات الموقع الحي
عند تحديث الموقع، يكتشف الـSW التحديث تلقائياً (كل ساعة + عند عودة الاتصال) ويعرض شريحة «تحديث الآن». المستخدم يستلم الميزات الجديدة دون إصدار جديد على Play — ميزة ضخمة للمسار 2.

---

**انتهى الدليل.** لأي سؤال أو مشكلة، راجع `worklog.md` (سجل العمل الموحّد) أو شغّل `bun run lint && bun run typecheck` للتأكد من سلامة الكود.

---

## خطوات إعادة توليد أيقونات android (بعد اعتماد هوية توفير الزمردية)

الأصل المعتمد: `هويه توفير/assets/generated/tawfir-app-icon.png` (1920×1920) و
`هويه توفير/assets/generated/tawfir-splash-screen.png` (1440×2560) — **قص/تصغير فقط، لا توليد**.

### 1) تجهيز موارد Capacitor (موجودة مسبقاً في resources/)
- `resources/icon.png` — 1024×1024 (تصغير من tawfir-app-icon.png)
- `resources/splash.png` — 1280×2276 (تصغير من tawfir-splash-screen.png)
- `resources/icon-foreground.png` — 1024×1024 (الرمز المقصوص من المرجع على كحلي #001020)
- `resources/icon-background.png` — 1024×1024 (كحلي #001020 صلب)

### 2) إضافة منصة أندرويد (أول مرة فقط)
```bash
npx cap add android
```

### 3) توليد كل كثافات ic_launcher + splash بسكربت PIL
```python
# scripts/gen-android-icons.py
from PIL import Image
import os

ICON = Image.open("resources/icon.png").convert("RGB")
SPLASH = Image.open("resources/splash.png").convert("RGB")

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
BASE_ICON = 48  # mdpi launcher icon base

for dpi, scale in DENSITIES.items():
    size = int(BASE_ICON * scale)
    d = f"android/app/src/main/res/mipmap-{dpi}"
    os.makedirs(d, exist_ok=True)
    ICON.resize((size, size), Image.LANCZOS).save(f"{d}/ic_launcher.png")
    # نسخة دائرية/مستديرة (نفس الأصل — النظام يقصّها)
    ICON.resize((size, size), Image.LANCZOS).save(f"{d}/ic_launcher_round.png")

# splash التسع بقع (9-patch يكفي نسخة واحدة لكل كثافة)
for dpi, scale in DENSITIES.items():
    w, h = int(320 * scale), int(480 * scale)
    d = f"android/app/src/main/res/drawable-{dpi}"
    os.makedirs(d, exist_ok=True)
    SPLASH.resize((w, h), Image.LANCZOS).save(f"{d}/splash.png")
```

```bash
python3 scripts/gen-android-icons.py   # أو bun scripts/generate-icons.ts إن وجد
```

### 4) المزامنة
```bash
npx cap sync android
```

### 5) ألوان النظام (محدّثة أصلاً في capacitor.config.ts)
- StatusBar/SplashScreen backgroundColor: `#04101E` (كحلي الهوية العميق)
- قناة الإشعارات: `#0C7D63` (الزمردي)
