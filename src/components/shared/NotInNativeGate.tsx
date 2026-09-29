"use client";

import * as React from "react";

/**
 * بوابة «ليس داخل التطبيق» — تُخفي الأطفال داخل الـAPK (Capacitor).
 * Vercel Analytics/SpeedInsights لا قيمة لهما داخل الـAPK (زيارات
 * التطبيق ليست متصفحاً — وتحميل سكربتيهما يستهلك شبكة/CPU بلا فائدة)،
 * والقاعدة data-native يضبطها سكربت متزامن في <head> قبل أول طلاء.
 *
 * useSyncExternalStore: النمط القياسي الآمن للـSSR هنا — السيرفر يرجع
 * false (يُرسم الأطفال)، وعميل الـAPK يقرأ الخاصية الفعلية من DOM
 * فيستبدلها بـnull بعد الترطيب بلا أخذة mismatch (React يتعامل مع
 * اختلاف getServerSnapshot عن قيمة العميل كتحديث مشروع، لا خطأ).
 * الخاصية data-native لا تتغير بعد الإقلاع — لا حاجة لاشتراك فعلي.
 */
const emptySubscribe = () => () => {};

function getIsNative(): boolean {
  return document.documentElement.hasAttribute("data-native");
}

function getIsNativeServer(): boolean {
  return false;
}

export function NotInNativeGate({ children }: { children: React.ReactNode }) {
  const isNative = React.useSyncExternalStore(
    emptySubscribe,
    getIsNative,
    getIsNativeServer
  );

  return isNative ? null : <>{children}</>;
}
