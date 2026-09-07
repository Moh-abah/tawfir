"use client";

import { useEffect } from "react";

/**
 * NativeZoomGuard — منع تقريب الكانفس بإصبعين على الجوال (الجولة 22)
 * ═════════════════════════════════════════════════════════════════════
 * الهدف: التطبيق يتصرف كتطبيق Native وليس صفحة ويب — لا pinch-zoom.
 *
 * الطبقات الثلاث المكمّلة:
 *   1) viewport meta: maximum-scale=1 + user-scalable=no (layout.tsx)
 *      → يعمل على أندرويد/كروم/إيدج وفايرفوكس.
 *   2) CSS: touch-action: manipulation على html/body (globals.css)
 *      → يمنع المتصفح من بدء إيماءة التكبير باللمس (كروم).
 *   3) هذا المكوّن: منع أحداث iOS Safari الخاصة (gesturestart /
 *      gesturechange / gestureend) — آبل تتجاهل user-scalable=no منذ
 *      iOS 10 لأسباب وصولية، لكن هذه الأحداث تُلغى برمجياً. تعمل فقط
 *      على أجهزة اللمس (pointer: coarse) — الديسكتوب بلا أي تأثير.
 *
 * الإتاحة: نمنع فقط على الجوال. على الديسكتوب يبقى التكبير بلوحة
 * المفاتيح متاحاً (Ctrl +/-) لأنه أداة وصولية لا إيماءة لمس.
 */
export function NativeZoomGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const prevent = (e: Event) => e.preventDefault();

    /* iOS Safari pinch-zoom */
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("gesturechange", prevent, { passive: false });
    document.addEventListener("gestureend", prevent, { passive: false });

    /* Safari 17+ قد يستخدم wheel+ctrl على iPad مع لوحة لمس اللمس */
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    document.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);

  return null;
}
