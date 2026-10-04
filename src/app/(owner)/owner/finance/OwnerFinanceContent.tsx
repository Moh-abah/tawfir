"use client";

import { useOwnerFinanceCard } from "@/hooks/useFinance";
import { OwnerFinanceCardPanel } from "@/components/owner/OwnerFinanceCardPanel";
import { OwnerYemenNotifications } from "@/components/owner/OwnerYemenNotifications";

/**
 * محتوى صفحة «المالية» — جولة التوسعة المالية v2 (Task 4-b).
 *
 * - البطاقة المالية: ذمة/عمولات/مدفوع/معلّقات مع تحديث حي (polling 60s)
 *   وزر تحديث يدوي — داخل OwnerFinanceCardPanel (نفس queryKey فيتش مرة واحدة).
 * - إشعارات التسديد اليمنية: تظهر ديناميكياً فقط عندما يعيد الخادم
 *   card.currency === "YER" (بوابة العرض داخل المكوّن نفسه — بلا hardcode
 *   للسوق؛ في السوق السعودي يختفي القسم كلياً).
 */
export default function OwnerFinanceContent() {
  /* نفس مفتاح الكاش ["finance:owner-card"] المستخدم داخل اللوحة —
     نداء شبكة واحد يشترك فيه المكوّنان. */
  const card = useOwnerFinanceCard(true, 60);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">المالية</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ذمتك وعمولاتك وإشعارات تسديدك — تُحدَّث تلقائياً كل دقيقة.
        </p>
      </header>

      <OwnerFinanceCardPanel />

      <OwnerYemenNotifications currency={card.data?.currency ?? null} />
    </div>
  );
}
