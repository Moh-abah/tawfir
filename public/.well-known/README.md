# ملف `assetlinks.json` — ربط تطبيقات أندرويد بنطاق توفير

> هذا الملف ضروري لقبول التطبيق في Google Play (Digital Asset Links)
> ولكي تفتح مطالبات «تثبيت التطبيق» و«فتح في التطبيق» على أندرويد
> بشكل صحيح. يُخدم على المسار الجذري:
> `https://tawfir.giize.com/.well-known/assetlinks.json`
> وعلى نطاق المالك: `https://facility.tawfir.giize.com/.well-known/assetlinks.json`

---

## 1) لماذا نحتاج هذا الملف؟

أندرويد يطلب من متصفّح Chrome التحقق من ملكية النطاق قبل أن يُظهر
مطالبة «تثبيت التطبيق» (PWA) أو يفتح روابط الـ Deep Links داخل
التطبيق المثبّت. التحقق يتم عبر مطابقة بصمة شهادة التطبيق
(SHA-256 fingerprint) الموجودة في ملف APK مع البصمة المذكورة هنا.

---

## 2) أين يجلب المشرف بصمة SHA-256؟

يُولّد مفتاح توقيع التطبيق بصمة SHA-256 فريدة لكل بيئة (debug /
release / play store). للحصول على البصمة الصحيحة:

### أ) من ملف keystore محلي (release)

```bash
keytool -list -v -keystore release.keystore -alias tawfir \
  -storepass PASSWORD -keypass PASSWORD | grep SHA256
```

ستجد سطراً بالصيغة:

```
SHA256: B1:82:9C:F8:D4:A8:00:99:A3:6B:80:E8:5D:99:DC:8B:96:E2:BD:C2:7C:4D:F4:A6:2C:AE:66:84:45:B8:C4:0D
```

### ب) من Google Play Console (App Signing)

1. افتح Google Play Console → تطبيق توفير العميل.
2. انتقل إلى `Setup → App integrity → App signing`.
3. في قسم `App signing key certificate` ستجد بصمة SHA-256.

> **هام:** استخدم بصمة مفتاح التوقيع الإنتاجي (App signing key)
> وليست بصمة الـ upload key، لأن Google تعيد توقيع التطبيق قبل رفعه.

---

## 3) كيف تُلصق البصمة في الملف؟

افتح `assetlinks.json` المرفق واستبدل القيم النائبة بالقيم الحقيقية:

- `PLACEHOLDER_CUSTOMER_PACKAGE` ← اسم حزمة تطبيق العميل على أندرويد
  (مثلاً: `com.tawfir.customer`).
- `PLACEHOLDER_SHA256_CUSTOMER` ← بصمة SHA-256 لتطبيق العميل.
- `PLACEHOLDER_OWNER_PACKAGE` ← اسم حزمة تطبيق المالك على أندرويد
  (مثلاً: `com.tawfir.owner`).
- `PLACEHOLDER_SHA256_OWNER` ← بصمة SHA-256 لتطبيق المالك.

---

## 4) الشكل النهائي بعد التعبئة (مثال)

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tawfir.customer",
      "sha256_cert_fingerprints": [
        "B1:82:9C:F8:D4:A8:00:99:A3:6B:80:E8:5D:99:DC:8B:96:E2:BD:C2:7C:4D:F4:A6:2C:AE:66:84:45:B8:C4:0D"
      ]
    }
  },
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tawfir.owner",
      "sha256_cert_fingerprints": [
        "B1:82:9C:F8:D4:A8:00:99:A3:6B:80:E8:5D:99:DC:8B:96:E2:BD:C2:7C:4D:F4:A6:2C:AE:66:84:45:B8:C4:0D"
      ]
    }
  }
]
```

---

## 5) التحقق من الخدمة

بعد رفع التغييرات، تحقق أن الملف يُخدَم بالترويسات الصحيحة:

```bash
curl -I https://tawfir.giize.com/.well-known/assetlinks.json
```

يجب أن يكون:

- `Content-Type: application/vnd.android.package.archive+json`
- `Cache-Control: public, max-age=0, must-revalidate`

والترويسات معرَّفة في `next.config.ts` ضمن قائمة `headers()`.

وللتحقق من صحة JSON نفسها، استخدم أداة Google الرسمية:
<https://developers.google.com/digital-asset-links/tools/generator>

---

## ملاحظات أمنية

- البصمة SHA-256 ليست سرّاً — هي معرّف عام لتطبيقك ولا تُستخدم
  لتوقيع أي شيء، فقط للتحقق من الملكية.
- في حال وجود عدة بيئات (debug/release/play)، يمكن إضافة عدة بصمات
  في المصفوفة `sha256_cert_fingerprints`:

```json
"sha256_cert_fingerprints": [
  "DEBUG_SHA256:...",
  "RELEASE_SHA256:...",
  "PLAY_SIGNING_SHA256:..."
]
```
