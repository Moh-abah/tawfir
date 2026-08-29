/**
 * اهتزاز لمسي خفيف — إحساس Native (الجولة 10 + امتداد Capacitor).
 *
 * على الويب: navigator.vibrate API (أندرويد/كروم)؛ iOS Safari آمن (no-op).
 * على Native (Capacitor أندرويد): Haptics plugin عبر nativeHaptic()
 *  • «tick»  = ImpactStyle.Light
 *  • «light» = ImpactStyle.Medium
 *  • «success» = NotificationType.Success
 *
 * المزامنة: nativeHaptic دالة async، لكن haptic() متزامنة (تُستدعى في
 * معالجات الأحداث المتزامنة). لذا نُطلق nativeHaptic في الخلفية
 * (fire-and-forget) ثم نسقط على navigator.vibrate على الويب.
 */
import { isNativePlatform, nativeHaptic } from "@/lib/capacitor";

export type HapticPattern = "tick" | "light" | "success";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tick: 10,
  light: 20,
  success: [30, 40, 30],
};

export function haptic(pattern: HapticPattern = "light"): void {
  if (typeof navigator === "undefined") return;

  /* Native (Capacitor): استخدم الجسر الأصلي في الخلفية */
  if (isNativePlatform()) {
    void nativeHaptic(pattern);
    return;
  }

  /* الويب: Vibration API */
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[pattern]);
  } catch {
    /* بلا اهتزاز — لا شيء يحدث */
  }
}
