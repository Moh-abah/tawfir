"use client";

import { useEffect, useRef } from "react";

/**
 * BootSplash — يخفي شاشة إقلاع توفير (الجولة 22)
 * ══════════════════════════════════════════════════
 * شاشة السبلاش تُرسم في HTML الأولي من layout.tsx (عنصر #tawfir-boot)
 * فتظهر فوراً قبل أي JS — مثل إقلاع التطبيقات الأصلية تماماً.
 *
 * هذا المكوّن يُركّب داخل Providers مباشرة بعد الترطيب، ويخفي السبلاش
 * عند تحقّق «جهوزية التطبيق»:
 *   1. اكتمال تحميل خطوط الواجهة (document.fonts.ready — لا قفزة نص)
 *   2. أول إطار رسم بعد الترطيب (rAF×2 — React رسم الواجهة فعلاً)
 *   3. مدة عرض دنيا 750ms (إحساس Native — لا ومضة عابرة)
 * ثم: تلاشي 320ms ← إخفاء كامل (display:none).
 *
 * ⚠️ درس مهم (اكتُشف بالاختبار): العنصر جزء من شجرة React (يُرسم SSR) —
 * لا يجوز إزالته من DOM يدوياً (el.remove()): React يبقي مرجعه الداخلي
 * وأي إدراج لاحق عند التنقل (insertBefore بعقدة مرجعية غائبة) يكسر
 * الواجهة كلها (NotFoundError). الحل: إخفاء فقط — يبقى في الشجرة
 * بلا أي تكلفة (display:none).
 *
 * احتياطات أمان:
 *   • سكربت inline في layout يخفيها بعد 5s مهما حدث (JS معطّل).
 *   • كل خطوة مغلّفة try/catch — أي فشل يخفي السبلاش فوراً.
 */
const MIN_DISPLAY_MS = 750;
const FADE_MS = 320;

export function BootSplash() {
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const startAt = Date.now();

    /* إخفاء فقط — بلا إزالة (انظر التعليق أعلاه: شجرة React) */
    const hide = () => {
      const el = document.getElementById("tawfir-boot");
      if (!el) return;
      el.classList.add("tawfir-boot-hide");
      window.setTimeout(() => {
        el.classList.add("tawfir-boot-hidden");
      }, FADE_MS + 60);
    };

    const attemptHide = () => {
      const elapsed = Date.now() - startAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(hide, wait);
    };

    try {
      const fontsReady =
        typeof document !== "undefined" && "fonts" in document
          ? document.fonts.ready
          : Promise.resolve();

      Promise.race([
        fontsReady,
        new Promise((resolve) => window.setTimeout(resolve, 2000)),
      ])
        .then(() =>
          requestAnimationFrame(() => requestAnimationFrame(attemptHide))
        )
        .catch(attemptHide);

      /* شبكة أمان نهائية */
      window.setTimeout(attemptHide, 3500);
    } catch {
      attemptHide();
    }
  }, []);

  return null;
}
