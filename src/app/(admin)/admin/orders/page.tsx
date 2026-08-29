import type { Metadata } from "next";
import OrdersContent from "./OrdersContent";

export const metadata: Metadata = {
  title: "الطلبات | توفير",
  description: "كل الطلبات على المنصة مع فلترة بالحالة والعميل والمتجر.",
};

export default function AdminOrdersPage() {
  return <OrdersContent />;
}
