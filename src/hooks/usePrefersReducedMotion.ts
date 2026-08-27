"use client";

import * as React from "react";
import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * نسخة آمنة للـ SSR:
 * تعيد false في أول رسم (الخادم + أول رسم العميل) لضمان تطابق الـ Hydration،
 * ثم تعيد القيمة الحقيقية بعد التركيب.
 */
export function usePrefersReducedMotion(): boolean {
 const framerValue = useFramerReducedMotion();
 const [mounted, setMounted] = React.useState(false);

 React.useEffect(() => {
   
  setMounted(true);
 }, []);

 return mounted && framerValue === true;
}