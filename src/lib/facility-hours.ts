/**
 * تحليل ساعات عمل المتجر — الجولة 21 (webDevReview #2):
 * يحوّل نص working_hours (مثل "11ص - 11م" أو "8ص - 1ص") إلى حالة مفتوح/مغلق.
 *
 * يدعم الصيغ العربية الشائعة:
 *  - "11ص - 11م" (صباح/مساء)
 *  - "8ص - 1ص" (يعبر منتصف الليل)
 *  - "10:00 - 22:00" (24 ساعة)
 *  - "7 AM - 11 PM" (إنجليزي)
 *
 * @param workingHours نص ساعات العمل
 * @returns true إذا كان المتجر مفتوحاً الآن
 */
export function isFacilityOpen(workingHours: string | null | undefined): boolean {
  if (!workingHours || typeof window === "undefined") return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const parsed = parseWorkingHours(workingHours);
  if (!parsed) return false;

  const { openMin, closeMin } = parsed;
  // إذا كان وقت الإغلاق قبل وقت الفتح (مثل 8ص - 1ص) → يعبر منتصف الليل
  if (closeMin < openMin) {
    return nowMinutes >= openMin || nowMinutes <= closeMin;
  }
  return nowMinutes >= openMin && nowMinutes <= closeMin;
}

function parseWorkingHours(
  text: string,
): { openMin: number; closeMin: number } | null {
  // أنماط شائعة: "11ص - 11م" / "8 AM - 1 AM" / "10:00 - 22:00"
  const match = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|AM|PM)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|AM|PM)?/,
  );
  if (!match) return null;

  const [, openH, openM, openMeridiem, closeH, closeM, closeMeridiem] = match;
  if (!openH || !closeH) return null;

  let openHour = parseInt(openH, 10);
  let closeHour = parseInt(closeH, 10);
  const openMin = parseInt(openM || "0", 10);
  const closeMin = parseInt(closeM || "0", 10);

  // تحويل 12 ساعة → 24 ساعة
  openHour = to24Hour(openHour, openMeridiem);
  closeHour = to24Hour(closeHour, closeMeridiem);

  return {
    openMin: openHour * 60 + openMin,
    closeMin: closeHour * 60 + closeMin,
  };
}

function to24Hour(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const m = meridiem.toLowerCase();
  if (m === "ص" || m === "am") {
    return hour === 12 ? 0 : hour;
  }
  if (m === "م" || m === "pm") {
    return hour === 12 ? 12 : hour + 12;
  }
  return hour;
}
