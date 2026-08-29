import type { Metadata } from "next";
import OwnerOrdersContent from "./OwnerOrdersContent";

export const metadata: Metadata = {
  title: "طلبات المتجر | توفير",
};

export default function OwnerOrdersPage() {
  return <OwnerOrdersContent />;
}
