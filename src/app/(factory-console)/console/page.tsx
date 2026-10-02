import { ConsoleApp } from "@/components/factory/console/ConsoleApp";

/**
 * صفحة الكونسول المنفصل — /console
 * مكوّن عميل كامل مستقل (2029 سطراً): دخول factory_admin ثم 5 تبويبات.
 * لا يُمرَّر عبر Shell الخاص بالمصنع — عزل بصري كامل من التصميم.
 */
export default function ConsolePage() {
  return <ConsoleApp />;
}
