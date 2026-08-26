import type { Metadata } from "next";
import OwnerOrdersContent from "./OwnerOrdersContent";

export const metadata: Metadata = {
  title: "طلبات المنشأة | توفير",
};

export default function OwnerOrdersPage() {
  return <OwnerOrdersContent />;
}
