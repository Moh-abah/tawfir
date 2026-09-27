import type { Metadata } from "next";
import { ShareTargetContent } from "@/components/pwa/ShareTargetContent";

/**
 * وجهة مشاركة نظام التشغيل لتطبيق العميل (share_target في الـmanifest)
 * — يعترض الـSW المشاركة ويخزّنها محلياً ثم يعيد التوجيه إلى هنا.
 * noindex: صفحة وظيفية داخلية لا يفيد فهرستها.
 */
export const metadata: Metadata = {
  title: "مشاركة مستلمة | توفير",
  robots: { index: false, follow: false },
};

export default function ShareTargetPage() {
  return <ShareTargetContent variant="customer" />;
}
