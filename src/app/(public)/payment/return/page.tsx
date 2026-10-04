import type { Metadata } from "next";
import PaymentReturnContent from "./PaymentReturnContent";

/**
 * صفحة رجوع الدفع المدمج — وجهة callback_url في نموذج مويسر.
 * noindex: صفحة معاملة لحظية لا تخص محركات البحث ولا تُشارك روابطها.
 */
export const metadata: Metadata = {
  title: "نتيجة الدفع | توفير",
  robots: { index: false, follow: false },
};

export default function PaymentReturnPage() {
  return <PaymentReturnContent />;
}
