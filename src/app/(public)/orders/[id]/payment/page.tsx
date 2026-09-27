import type { Metadata } from "next";
import PaymentScreenContent from "./PaymentScreenContent";

export const metadata: Metadata = {
  title: "إتمام الدفع | توفير",
  description: "أكمل الدفع عبر محفظة المتجر وارفع صورة إشعار التحويل.",
};

export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentScreenContent orderId={id} />;
}
