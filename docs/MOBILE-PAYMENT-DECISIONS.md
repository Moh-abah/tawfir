# قرارات معمارية الدفع على الجوال — توفير (v6)

> التاريخ: 2026-10-04 · بصمة · مراجع رسمية موثقة أسفل كل قرار
> النطاق: تطبيقات الجوال (Android/iOS عبر Capacitor) فقط — **الويب لم يُلمس** ويعمل كما هو.

---

## 0) الخلاصة التنفيذية (قراءة دقيقة واحدة)

| المنصة | البطاقات + 3DS | STC Pay | Apple Pay | خروج من التطبيق؟ |
|---|---|---|---|---|
| **الويب/PWA** | نموذج مويسر المدمج داخل الصفحة | داخل النموذج | يعرضه النموذج في Safari تلقائيًا | لا خروج (مفهوم لا ينطبق) |
| **أندرويد (APK)** | داخل الـWebView — iframe | داخل الـWebView | لا ينطبق (لا Apple Pay على أندرويد) | **صفر خروج** |
| **iOS (IPA)** | داخل الـWKWebView — iframe | داخل الـWKWebView | زر داخل التطبيق → ورقة دفع نظيفة داخل SFSafariViewController (متصفح *داخل* التطبيق) | **صفر خروج فعلي** — يعود بضغطة «تم» |

المبدأ الحاكم الذي طلبته وبنينا عليه كل قرار: **«كل خروج = شرخ في الثقة»** — لذلك الصفر خروج هو الافتراضي، وأي ما لا يمكن تشغيله داخل الـWebView يُنفَّذ في **SFSafariViewController** (نافذة داخل التطبيق بشريط واحد وزر «تم» — وليس Safari الخارجي ولا تطبيق آخر).

---

## 1) جدول البحث — سؤال/جواب/دليل

### س1: هل 3DS يعمل داخل WebView (Capacitor)؟
**نعم — لأن تحدي 3DS2 يتم داخل iframe فرعي، وإطارات iframe لا تعتبرها Capacitor «تنقّالاً علوياً» فلا تُعترض إطلاقاً.**
- نموذج مويسر المدمج (mpay) يدير تحدي 3DS داخل صفحته المضمنة (iframe) — مرجع: دليل «Card Payments — Basic Integration» الرسمي: https://docs.moyasar.com/guides/card-payments/basic-integration (النموذج يتكفل بالدورة كاملة ثم يُعيد التوجيه إلى callback_url).
- سلوك Capacitor: `shouldOverrideURLLoading` يعتبر **التنقّال العلوي فقط** — وhost خارجي يُفتح في المتصفح الخارجي **إلا** إن كان في `server.allowNavigation`. الإطارات الفرعية (iframe) مستثناة أصلاً. مرجع: وثائق Capacitor server configuration: https://capacitorjs.com/docs/config (server.allowNavigation).
- **شبكة الأمان المضافة (قرار 2)**: إدراج `moyasar.com` + `*.moyasar.com` في allowNavigation لالتقاط التدفقات القديمة النادرة التي تحوّل الصفحة كلها علويًا نحو مويسر ثم تعود — بدونها كان سينفتح متصفح النظام (خروج!).
- البنوك السعودية (الراجحي/الأهلي/الرياض) تصفح صفحات ACS مصممة أساسًا للعمل داخل iframe تجاري (هذا هو المعيار العالمي لـ3DS2) — وتجارب السوق الموثقة (Google Pay تستخدم WKWebView لهذا الغرض حصرًا في دليلها الرسمي: https://developers.google.com/pay/api/web/guides/samples) تؤكد أن تدفقات التحقق داخل WebView مسار مدعوم عمليًا.
- الحالة التي قد تفشل: بنك يستخدم **app-to-app** (فتح تطبيق البنك نفسه) — هذا لا يعمل في أي سياق مضمّن (ولا حتى على الويب) وهو نادر، وإذا حصل يفتح تطبيق البنك ثم يعود المستخدم لتطبيقنا ويجد شاشة التحقق كما هي (زر «تحققت، حدّث الحالة» موجود في صفحة الرجوع).

### س2: هل Apple Pay يعمل داخل WebView؟
**لا داخل WKWebView — نعم داخل SFSafariViewController.**
- `ApplePaySession` (Apple Pay على الويب) متاح في **Safari فقط** — لا يتوفر في WKWebView. مرجع: Apple Developer Forums (فريق Apple): https://developer.apple.com/forums/thread/44883 وتجارب مقارنة موثقة WKWebView مقابل SFSafariViewController: https://github.com/ionic-team/capacitor/issues/39 (تعليق موثق بالفروق).
- داخل SFSafariViewController: Apple Pay **يعمل** (هذا السياق مقصود من Apple لمسارات الدفع داخل التطبيقات بلا SDK أصلي). مرجع: نفس مصادر المقارنة أعلاه + سلوك المنصة الموثق منذ iOS 10.
- مويسر رسميًا: نموذج الويب يعرض زر Apple Pay تلقائيًا حين يتوفر `ApplePaySession` — لذا **يختفي الزر تلقائيًا داخل WKWebView** (سلوك سليم بلا تدخلنا) و**يظهر داخل الورقة**. مرجع: https://docs.moyasar.com/guides/apple-pay/basic-integration
- وثائق مويسر صراحة: تسجيل الويب «feature for **Web implementations only**. **For mobile you must have an active Apple Developer Account** and setup the payment processing certificate» — أي مسار Apple Pay الأصلي داخل التطبيق يتطلب SDK أصلي + حساب مطور + شهادة معالجة دفع. مرجع: https://docs.moyasar.com/guides/apple-pay/web-registration

### س3: هل STC Pay يحتاج تطبيقًا منفصلًا؟
**لا — داخل نموذج مويسر نفسه، ثم إعادة توجيه إلى callback_url.**
- دليل مويسر الرسمي: STC Pay وسيلة داخل Payment Form (`methods: ['stcpay']`)، وتنتهي بإعادة توجيه إلى `callback_url` مع `?id=&status=&message=`. مرجع: https://docs.moyasar.com/guides/stc-pay/basic-integration
- إذن داخل الـWebView: المستخدم يكمل التحقق في النموذج (في صفحة مويسر المضمنة) ثم يُعاد تلقائيًا إلى `/payment/return` **داخل التطبيق** — صفر خروج. (إن طلب تحقق STC تأكيدًا عبر تطبيق STC Pay لدى بعض المحافظ، يعود المستخدم للتبويب/التطبيق فيجد التحويل جاريًا إلى صفحة الرجوع — نفس سلوك المتصفح الحي اليوم.)
- **تنبيه تفعيل**: تفعيل STC Pay لدى مويسر يطلب طلبًا من مدير الحساب (خطوة دش بورد — انظر دليل النشر).

### س4: هل نحتاج فتح الدفع في متصفح خارجي؟
**لا كقاعدة. نعم كحالة واحدة فقط: Apple Pay على iOS — ونعالجها بـSFSafariViewController (متصفح داخل التطبيق، ليس خارجيًا).**
- المرجع الموحد لكل ما سبق (WKWebView بلا Apple Pay / SFSafariViewController معه / Apple يتطلب سياق Safari لـApplePaySession).

### س5: هل نحتاج Deep Links؟ وأي نوع؟
**موجودة بالكامل من الجولات السابقة — أضفنا التوثيق فقط، والنوع الصحيح هو Universal/App Links وليس custom scheme.**
- أندرويد: `assetlinks.json` حي على `https://tawfir.giize.com/.well-known/assetlinks.json` يصرّح بـ`com.tawfir.ye.app` + `com.tawfir.ye.owner` وبصمة SHA-256 للتوقيع — ويؤكدها فحص آلي داخل `build-android.yml`.
- iOS: `apple-app-site-association` يُخدم من مسار Next.js بـContent-Type الصحيح (`src/app/.well-known/apple-app-site-association/route.ts`) يقرأ `APPLE_TEAM_ID` من البيئة أو `apple-team-id.txt` — ويغطي كل المسارات (`/*` شامل `/payment/return`).
- المعالج داخل التطبيق موجود: `setupNativeUrlOpen` في `src/lib/capacitor.ts` يقبل روابط `tawfir.giize.com` حصرًا (حماية أمنية) ويوجّه الـWebView للمسار — أي أن الرجوع من أي دفع خارجي يعود **لداخل التطبيق** إلى صفحة التحقق الحتمي.
- custom scheme (`tawfir://`) **رُفض**: لا يلزم (كل عودتنا عبر https)، ومويسر قد يرفض callback غير https، وcustom schemes تفشل منطقيًا مع روابط مشاركة — App Links أقوى وأكثر احترافية.
- entitlement iOS المرتبط (`applinks:tawfir.giize.com`) يحقنه `scripts/patch-ios-identity.mjs` أثناء بناء الـIPA ✓ (موجود مسبقًا).

### س6: هل نحتاج plugins إضافية؟
**إضافة واحدة فقط: `@capacitor/browser@8`. والبقية موجودة أصلاً:**

| الـplugin | الحالة | لماذا |
|---|---|---|
| `@capacitor/app` | موجودة | زر الرجوع الأصلي + `appUrlOpen` (الروابط العميقة) |
| `@capacitor/geolocation` | موجودة | أجرة التوصيل بالموقع — وصلاحياتها تُدمج تلقائيًا في الـManifest (أندرويد) ويضيف الـpatch وصف الاستخدام في iOS (`NSLocationWhenInUseUsageDescription`) |
| `@capacitor/haptics` / `network` / `splash-screen` / `status-bar` | موجودة | تجربة أصيلة (اهتزاز/أوفلاين/إقلاع/أشرطة نظام) |
| **`@capacitor/browser`** | **أُضيفت (v6)** | ورقة Apple Pay داخل iOS + احتياط عام لمسارات دفع خارجية محتملة |
| `@capacitor/push-notifications` | **غير مطلوبة عمداً** | FCM يعمل عبر جسر `TawfirNative` الأصلي المخصص (يولّده `patch-android-identity.mjs`) — أقوى للـLive WebView ولا يكرر المنظومة |
| `@capacitor/camera` | **غير مطلوبة عمداً** | رفع الإيصالات عبر `<input type=file>` يعمل داخل الـWebView (Android: file chooser مدمج؛ iOS: مدعوم WKWebView) — الكاميرا تُفتح من نفس الـinput عبر `capture` |
| `@capacitor/preferences` | **غير مطلوبة عمداً** | الجلسة كوكيز/تخزين على أصل الموقع الحي داخل الـWebView (نفس أصل الويب) — إضافة تخزين ثانٍ = مصدرين للحقيقة = كسر محتمل |

---

## 2) القرارات (قابلة للتدقيق واحدًا واحدًا)

### قرار 1 — البطاقات + STC Pay + 3DS: كل شيء داخل الـWebView (صفر خروج)
نموذج مويسر المدمج الحالي يعمل كما هو داخل التطبيقين — **بلا أي تغيير على مسار الويب**. أي تدفق دفع يدخل iframe يعمل؛ والتوجيه النهائي إلى `callback_url` يعود إلى أصل الموقع نفسه داخل الـWebView فتظهر صفحة التحقق الحتمي داخل التطبيق.
**السبب**: يحقق حرفيًا رؤيتك «يدخل → يطلب → يدفع → يتتبع — دورة كاملة داخل علامتك»، وهو أقل تعقيد ممكن (صفر كود جديد في المسار الأساسي).

### قرار 2 — allowNavigation += مويسر (شبكة أمان 3DS)
`capacitor.config.ts` أصبح:
```ts
allowNavigation: ["tawfir.giize.com", "facility.tawfir.giize.com", "moyasar.com", "*.moyasar.com"]
```
**السبب**: أي تحويل علوي نحو مويسر (تدفقات ACS قديمة نادرة) كان سيفتح متصفح النظام ويُخرج المستخدم. الآن يبقى داخل الـWebView ويعود إلى callback_url داخليًا. **رافق القرار تحديث فحص `build-android.yml` الآلي** ليتحقق من المضيفين الثلاثة ويفشل البناء مبكرًا إن حُذفوا.

### قرار 3 — Apple Pay على iOS: زر داخل التطبيق → ورقة نظيفة داخل SFSafariViewController
- في شاشة الدفع داخل تطبيق iOS (وفقط: `applepay` ضمن `config.methods` من الخادم الحي) يظهر زر ** Pay** أسود بعرض كامل فوق النموذج.
- الضغط يفتح نفس شاشة الدفع بوضع «الورقة النظيفة» `?sf=1` داخل SFSafariViewController (fullscreen داخل التطبيق) — حيث يعرض نموذج مويسر زر Apple Pay تلقائيًا.
- بعد الدفع تظهر صفحة التحقق داخل الورقة؛ عند «تم» يستقبل التطبيق `browserFinished` فيحدّث حالة الدفع من الخادم فورًا — وإن تم الدفع تنقلب الشاشة لبطاقة «مدفوع سابقًا» تلقائيًا.
- **الأمن**: المفتاح `publishable` علني بطبيعته؛ المبلغ في الورقة استرشادي — سلطة التحقق `POST /finance/orders/{id}/pay/verify` حصراً (يرفض أي عدم تطابق مبلغ/عملة/طلب) — أي عبث في URL الورقة ينتج **دفعة مرفوضة** لا طلبًا مدفوعًا.
- **السبب**: هذا هو المسار الوحيد الذي يمنح Apple Pay على iOS **دون SDK أصلي ودون شهادة معالجة دفع ودون خروج فعلي من التطبيق** — وهو النمط الذي تعتمده Apple للدفع داخل التطبيقات بلا SDK.
- **المستقبل (موثق لا منفذ)**: للحصول على Apple Pay داخل الـWKWebView نفسه: SDK مويسر الأصلي (https://docs.moyasar.com/sdk/ios/installation) + حساب Apple Developer + شهادة معالجة دفع — متى رغبت ننفذه كجولة مستقلة.

### قرار 4 — رفض custom schemes، اعتماد Universal/App Links القائمة
موثق في س5 أعلاه — البنية موجودة ويعمل معها كل شيء؛ لا كود جديد.

### قرار 5 — الويب/PWA يبقى كما هو حرفيًا
كل ما فوق يُفعَّل بشرط `isNativePlatform()`/`getPlatform()==="ios"` (من `src/lib/payment-bridge.ts`) — على الويب: `false` في كل الشروط، الزر لا يُرسم، والورقة `?sf=1` تصلح أيضًا كصفحة مستقلة عادية إن فُتحت يدويًا. استيرادات Capacitor ديناميكية — لا تدخل حزمة الويب.

---

## 3) الملفات المنفذة في هذه الجولة

| الملف | التغيير |
|---|---|
| `src/lib/payment-bridge.ts` | **جديد** — جسر الدفع: كشف النظام، وضع الورقة، Apple Pay sheet، متصفح داخلي احتياطي، hook آمن الترطيب |
| `src/app/(public)/orders/[id]/pay/PayOrderContent.tsx` | نقطة فصل `PayEntry` (الورقة قبل حارس الجلسة) + زر Apple Pay (iOS فقط) + تحديث الحالة بعد إغلاق الورقة + `SafariSheetPay` |
| `capacitor.config.ts` | `allowNavigation` + مويسر (بتعليق السبب) |
| `.github/workflows/build-android.yml` | تحديث الفحص الآلي للمضيفين الثلاثة |
| `package.json` | + `@capacitor/browser@8.0.5` |
| `docs/MOBILE-PAYMENT-DECISIONS.md` / `MOBILE-TEST-REPORT.md` / `MOBILE-DEPLOY-GUIDE.md` | هذا الملف + تقرير الاختبار + دليل بناء AAB/IPA |

## 4) مراجع موحدة
1. مويسر — دمج البطاقات: https://docs.moyasar.com/guides/card-payments/basic-integration
2. مويسر — STC Pay: https://docs.moyasar.com/guides/stc-pay/basic-integration
3. مويسر — Apple Pay (نموذج الويب): https://docs.moyasar.com/guides/apple-pay/basic-integration
4. مويسر — تسجيل Apple Pay الويب (لا يصلح للموبايل): https://docs.moyasar.com/guides/apple-pay/web-registration
5. مويسر — SDK الأصلي (مسار مستقبلي): https://docs.moyasar.com/sdk/ios/installation
6. Capacitor — server.allowNavigation: https://capacitorjs.com/docs/config
7. Apple — ApplePaySession في Safari فقط (منتدى فريق Apple): https://developer.apple.com/forums/thread/44883
8. فروق WKWebView/SFSafariViewController: https://github.com/ionic-team/capacitor/issues/39
9. Google Pay — WKWebView مسار مدعوم للدفع: https://developers.google.com/pay/api/web/guides/samples
