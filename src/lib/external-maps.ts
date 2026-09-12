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

/** الرابط الموحّد حسب الوضع المطلوب */
export function externalMapUrl(
  target: ExternalMapTarget,
  mode: ExternalMapMode = "view",
): string {
  return mode === "navigate"
    ? externalMapsNavUrl(target)
    : externalMapViewUrl(target);
}
