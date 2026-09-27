import type { Metadata } from "next";
import { ShareTargetContent } from "@/components/pwa/ShareTargetContent";

/**
 * وجهة مشاركة نظام التشغيل لبوابة المالك (share_target في manifest المالك)
 * — مشاركة صور المنتجات/الفواتير من أي تطبيق → معاينة هنا.
 * داخل src/app/owner (تخطيط الدخول الخفيف بلا حماية بوابة) حتى تُعرض
 * المعاينة حتى قبل تسجيل الدخول — عمليات الاستيراد تتطلب الدخول طبعاً.
 */
export const metadata: Metadata = {
  title: "مشاركة مستلمة | توفير مالك",
  robots: { index: false, follow: false },
};

export default function OwnerShareTargetPage() {
  return <ShareTargetContent variant="owner" />;
}
