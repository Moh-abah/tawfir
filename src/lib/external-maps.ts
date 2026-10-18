/**
 * الخرائط الخارجية — طبقة النقل خارج المنصة (توجيه المالك).
 * ═══════════════════════════════════════════════════════════════════
 * المنصة **لا تعرض** مكوّن خريطة داخلها إطلاقاً (قرار مالك معمّم):
 *   • العميل: زر «تحميل موقعي» يجلب الإحداثيات (Geolocation API).
 *   • المندوب/الإدارة: زر «عرض الموقع» ينقله إلى تطبيق الخرائط
 *     المناسب لجهازه مع تمرير الإحداثيات والعنوان:
 *       - iOS/iPadOS → Apple Maps (روابط maps.apple.com الأصلية)
 *       - غيره → Google Maps (روابط الخرائط الكونية — تفتح التطبيق
 *         إن كان مثبتاً على الموبايل، أو الويب كخيار احتياطي)
 *
 * SSR-safe: على الخادم (بلا navigator) نُرجع روابط Google Maps —
 * تعمل على كل جهاز؛ بعد التركيب (hydration) يعاد احتساب الرابط
 * المناسب للمنصة الفعلية من المستهلك عبر mount-flag.
 */

export interface ExternalMapTarget {
  /** خط عرض النقطة الهدف */
  lat: number;
  /** خط طول النقطة الهدف */
  lng: number;
  /** تسمية تظهر في تطبيق الخرائط (اسم/عنوان) */
  label?: string;
}

/** وضع الفتح: view = معاينة نقطة · navigate = ملاحة بالقيادة إليها */
export type ExternalMapMode = "view" | "navigate";

/** هل الجهاز من عائلة آبل؟ (iPhone/iPad — تفتح Apple Maps أصلياً) */
export function isAppleMapsPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    /* iPadOS 13+ يقدّم نفسه كـ Macintosh بلمس */
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * رابط معاينة نقطة على تطبيق الخرائط المناسب للجهاز.
 * (يُحتسب وقت الاستدعاء — استدعِه بعد التركيب لاكتشاف المنصة فعلياً)
 */
export function externalMapViewUrl(target: ExternalMapTarget): string {
  const { lat, lng, label } = target;
  if (isAppleMapsPlatform()) {
    const q = label ? `&q=${encodeURIComponent(label)}` : `&q=${lat},${lng}`;
    return `https://maps.apple.com/?ll=${lat},${lng}${q}`;
  }
  /* Google — استعلام الإحداثيات الحرفي يجعل الدبوس دقيقاً (لا ترميز geocode) */
  const query = label ? `${encodeURIComponent(label)}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * رابط بدء الملاحة بالقيادة نحو نقطة على تطبيق الخرائط المناسب.
 */
export function externalMapsNavUrl(target: ExternalMapTarget): string {
  const { lat, lng } = target;
  if (isAppleMapsPlatform()) {
    return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/** رابط Google الثابت — للرسم الخادمي (بلا navigator) */
export function externalMapViewFallback(target: ExternalMapTarget): string {
  const query = target.label
    ? encodeURIComponent(target.label)
    : `${target.lat},${target.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/* ════════════════════════════════════════════════════════════════
   الجولة 50 — «صفحة المتجر ذاتها» (طلب المالك الصريح)
   ════════════════════════════════════════════════════════════════
   شكوى المالك: زر «افتح في الخرائط» يبحث باسم المطعم فيظهر لعميله
   **نتائج بحث كثيرة**، والمطلوب أن يفتح **صفحة المطعم نفسها** التي
   أضاف التاجر رابطها من قوقل ماب عند التسجيل — لا نمط بديل ولا ترقيع.

   السلسلة المرجعية المعتمدة (الأدق أولاً):
   1) رابط المكان القانوني `https://maps.google.com/?cid=<CID>` —
      يُلتقط من رابط التاجر عند التسجيل (محلّل resolve-map-link ينتج
      finalUrl بهذه الصيغة حين يتعرف على المكان) ويُخزَّن داخل حقل
      `location_source` الخادمي بصيغة `map|<الرابط>` — حقل نصّي حر
      يقبله الخادم حرفياً في OwnerRegister ولا يوجد له مستهلك آخر.
   2) `resolve-place-page` — محلّلنا الخادمي للمتاجر الأقدم (سُجّلت
      قبل الجولة 50 بلا رابط مخزّن): يجد صفحة المكان بالاسم قرب
      الإحداثيات ويخزّنها في ذاكرة الخادم.
   3) البحث بالاسم داخل نطاق الإحداثيات (17z) — السلوك السابق.
   4) دبوس الإحداثيات الصامت.
 */

/** هل الرابط صفحة مكان قانونية تفتح المتجر نفسه؟ (?cid= أو /place/) */
export function isCanonicalPlaceUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("maps.google.com/?cid=") ||
    url.includes("google.com/maps?cid=") ||
    url.includes("google.com/maps/place/")
  );
}

/**
 * استخراج رابط صفحة المتجر القانوني من قيمة `location_source` الخادمية.
 * الصيغة المتفق عليها: `map|https://maps.google.com/?cid=…` — وأي رابط
 * قوقل ماب حر في النص يُقبل أيضاً (تحمّل للصيغ القديمة)؛ بلا رابط → null.
 */
export function extractStoredPlaceUrl(
  locationSource: string | null | undefined,
): string | null {
  if (!locationSource) return null;
  const m = locationSource.match(/https?:\/\/[^\s|<>"]+/);
  if (!m) return null;
  const url = m[0];
  /* نُقبل روابط قوقل ماب فقط — لا فتح أرbitrary URLs من حقل المستخدم */
  return /(^https?:\/\/)?((www|maps)\.)?(google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|plus\.codes)/i.test(
    url,
  )
    ? url
    : null;
}

/**
 * رابط «فتح موقع المتجر» للعميل — يُفضّل صفحة المكان على الدبوس الحرفي
 * (طلب المالك: «يفضل أن تظهر صفحة المطعم التي في الخريطة مع بيانات
 * المطعم إذا كان مكتمل البيانات والصور في قوقل ماب»).
 *
 * بوجود الاسم: بحثٌ بالاسم داخل نطاقٍ ضيق (17z ≈ 200م) حول إحداثيات
 * المتجر — فإن كان المطعم/الكافيه مسجلاً في قوقل ماب عرضت قوقل صفحة
 * المكان كاملة (الاسم والصور والتقييمات وأزرار الاتصال)؛ وإن لم يكن
 * عرضت نتائج قريبة من النقطة — كلاهما أفضل من دبوس إحداثيات صامت.
 * بلا اسم: إسقاطٌ إلى دبوس الإحداثيات الحرفي كالسابق.
 *
 * محسوب بصيغة Google فقط (قابلة للرسم الخادمي حرفياً — بلا navigator
 * لا خطر اختلاف hydration) — روابط google.com/maps تفتح تطبيق قوقل
 * على أندرويد وعلى iOS عبر Universal Link، وتعمل على الويب دائماً.
 */
export function externalPlaceViewUrl(target: ExternalMapTarget): string {
  const name = target.label?.trim();
  if (!name) return externalMapViewFallback(target);
  /* صيغة المسار الرسمية التي تولّدها قوقل نفسها عند البحث:
     /maps/search/الاسم/@lat,lng,17z — تطبّق انحياز الموقع وتعرض صفحة المكان */
  return `https://www.google.com/maps/search/${encodeURIComponent(
    name,
  )}/@${target.lat},${target.lng},17z`;
}

/** الرابط الموحّد حسب الوضع المطلوب */
export function externalMapUrl(
  target: ExternalMapTarget,
  mode: ExternalMapMode = "view",
): string {
  return mode === "navigate"
    ? externalMapsNavUrl(target)
    : externalMapViewUrl(target);
}
