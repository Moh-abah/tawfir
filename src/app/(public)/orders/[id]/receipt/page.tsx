import type { Metadata } from "next";
import ReceiptContent from "./ReceiptContent";

export const metadata: Metadata = {
  title: "إيصال الطلب | توفير",
  description: "إيصال طلبك القابل للمشاركة من منصة توفير.",
  robots: { index: false },
};

export default async function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReceiptContent orderId={id} />;
}
