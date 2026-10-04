import type { Metadata } from "next";
import PayOrderContent from "./PayOrderContent";

/** شاشة الدفع الإلكتروني المدمج للطلب (السوق السعودي — مويسر). */
export const metadata: Metadata = {
  title: "الدفع الإلكتروني | توفير",
  description: "ادفع قيمة طلبك بأمان عبر بوابة مويسر — بطاقة أو Apple Pay.",
};

export default async function OrderPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PayOrderContent orderId={id} />;
}
