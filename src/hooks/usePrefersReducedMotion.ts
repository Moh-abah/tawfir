"use client";

import * as React from "react";
import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

const emptySubscribe = () => () => {};

/**
 * نسخة آمنة للـ SSR:
 * تعيد false في أول رسم (الخادم + أول رسم العميل) لضمان تطابق الـ Hydration،
 * ثم تعيد القيمة الحقيقية بعد التركيب.
 *
 * mounted يُحسب عبر useSyncExternalStore (false على الخادم، true على العميل
 * بعد التركيب) — بلا setState داخل effect (قاعدة react-hooks/set-state-in-effect).
 */
export function usePrefersReducedMotion(): boolean {
  const framerValue = useFramerReducedMotion();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return mounted && framerValue === true;
}
