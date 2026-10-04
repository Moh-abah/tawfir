# دليل بناء ونشر التطبيقات — APK/AAB و IPA (جولة الدفع v6)

> شامل خطوات ما قبل البناء الخاصة بجولة الدفع (Apple Pay + مويسر) + خطوات البناء المعتمدة من الأدلة السابقة.
> الأدلة التفصيلية الأصلية تبقى مرجعها: `دليل_الـCapacitor.md` · `دليل_نشر_قوقل_بلاي.md` · `دليل_نشر_App_Store.md`

---

## 1) ما تغير في هذه الجولة ويؤثر على البناء

1. **إضافة جديدة**: `@capacitor/browser@8.0.5` — تُلتقط تلقائيًا بـ`bun install` ثم `npx cap sync` (لا خطوات يدوية).
2. **capacitor.config.ts**: `allowNavigation` أصبح يتضمن `moyasar.com` + `*.moyasar.com` — **الفحص الآلي** في `build-android.yml` يفشل البناء إن اختفوا (مقصود).
3. **ملفات جديدة في الويب**: `src/lib/payment-bridge.ts` + تعديل شاشة الدفع — لا تؤثر على خطوات البناء الأصلية.

## 2) خطوات ما قبل البناء — مطلوب منك (لوحة تحكم فقط)

### أ) مويسر — دومين Apple Pay للويب/PWA (5 دقائق)
1. لوحة مويسر → **Settings → Apple Pay Domains → Add Domain**.
2. أضف: `tawfir.giize.com` (نطاق بدء الدفع الحقيقي).
3. هذا يفعل Apple Pay **للويب وPWA في Safari** (التطبيقات الجوالة لا تحتاج هذه الخطوة — لديها مسار الورقة).

### ب) مويسر — STC Pay (إن لم يكن مفعلاً)
- طلب تفعيل من مدير الحساب/الدعم (مذكور في دليل مويسر الرسمي). عند التفعيل يظهر تلقائيًا في `config.methods` ولا حاجة لأي كود.

### ج) Apple Developer — Team ID (لـUniversal Links على iOS)
1. App Store Connect → Membership → **Team ID** (10 أحرف).
2. ضعه في Vercel: متغير بيئة `APPLE_TEAM_ID` (أو ملف `apple-team-id.txt` بجذر المستودع — سطر واحد).
3. تأكد أن App ID في Apple Developer مفعّل فيه **Associated Domains** (يقوم به الباتش `patch-ios-identity.mjs` تلقائيًا في الـentitlements — المطلوب فقط أن القدرة مفعلة في الحساب).
4. ملاحظة: تحديث AASA قد يحتاج حتى 24 ساعة ليلتقطه Apple CDN (طبيعي).

### د) أندرويد — لا شيء جديد
- `assetlinks.json` منشور ويطابق `com.tawfir.ye.app/.owner` مع بصمة keystore الحالية — أي تغيير keystore مستقبلي = تحديث البصمة في الملف (موثق في دليل الـCapacitor).

## 3) بناء أندرويد (AAB للمتجر + APK للاختبار)
نفس مسار الجولات السابقة (GitHub Actions):
1. ارفع/ادمج الكود في `main` (أو شغّل الـworkflow يدويًا على الفرع).
2. `build-android.yml` يعمل: bun install → إصلاحات الهوية → `npx cap sync android` → فحوصات (assetlinks + allowNavigation + applicationId) → `assembleRelease bundleRelease`.
3. المخرجات: `app-release.aab` (لـPlay Console) + `app-release.apk` (اختبار مباشر).
4. **اختبار الجهاز**: نفّذ قائمة §2-أ في `MOBILE-TEST-REPORT.md` بندًا بندًا.

## 4) بناء آيفون (IPA)
نفس مسار `build-ios.yml` (macOS runner):
1. ارفع الكود → شغّل الـworkflow.
2. bun install → `npx cap sync ios` → الباتش: entitlements (`applinks:tawfir.giize.com` + aps) + Info.plist (وصوف الأذونات العربية) → `pod install` → الأرشفة والتوقيع بشهادتك.
3. ارفع الـIPA عبر Transporter/Xcode إلى App Store Connect.
4. **اختبار الجهاز**: قائمة §2-ب في `MOBILE-TEST-REPORT.md` — خاصة بند زر ** Pay** (يجب أن يفتح نافذة داخل التطبيق بشرط «تم» أعلى).

## 5) متغيرات البيئة (Vercel — مراجعة نهائية)

| المتغير | القيمة | الغرض |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.tawfir.giize.com` | موجود مسبقاً — يقرأه الـrewrites |
| `APPLE_TEAM_ID` | Team ID من §2-ج | Universal Links (AASA) |
| لا مفاتيح سرية دفع في الفرونت | — | المفتاح publishable حي من `/finance/payments/config` |

## 6) فحوصات ما بعد النشر (10 دقائق)
- [ ] `https://tawfir.giize.com/.well-known/assetlinks.json` يعيد JSON الحزمتين.
- [ ] `https://tawfir.giize.com/.well-known/apple-app-site-association` يعيد JSON بـ`appIDs` تحتوي Team ID الحقيقي.
- [ ] عميل سعودي على الويب (Safari للآيفون) → نموذج الدفع يعرض زر Apple Pay (إثبات تسجيل الدومين في مويسر).
- [ ] مسار دفع كامل ببطاقة sandbox `4201320111111010` → صفحة نجاح `/payment/return`.
- [ ] `PAYMENT_MODE=embedded` في `/admin/finance` (الحالة الحالية) — إن أردت صيانة مؤقتة قلبها من اللوحة.

## 7) تكرار الأخطاء الشائع (من الجولات السابقة)
- زر Apple Pay لا يظهر في التطبيق؟ تحقق: iOS أصلي + `applepay` في `GET /finance/payments/config` + `embedded=true` — الزر يخفى تلقائيًا غير ذلك.
- «فتح في المتصفح» عند تنقّل داخلي؟ يعني مضيف ناقص من `allowNavigation` — الفحص الآلي يفشل البناء قبل حدوثها.
- Universal Links لا تفتح التطبيق؟ Team ID ناقص/خاطئ أو قدرة Associated Domains غير مفعلة في App ID أو AASA لم تُلتقط بعد (حتى 24h).
