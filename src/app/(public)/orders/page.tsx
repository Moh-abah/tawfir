import type { Metadata } from "next";
import OrdersContent from "./OrdersContent";

export const metadata: Metadata = {
  title: "طلباتي | توفير",
  description: "استعرض طلباتك السابقة وحالتها على منصة توفير.",
};

export default function OrdersPage() {
  return <OrdersContent />;
}
