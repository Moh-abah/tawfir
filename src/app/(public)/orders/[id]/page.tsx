import type { Metadata } from "next";
import OrderDetailContent from "./OrderDetailContent";

export const metadata: Metadata = {
  title: "تفاصيل الطلب | توفير",
  description: "تتبّع حالة طلبك ومحتواه على منصة توفير.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailContent orderId={id} />;
}
