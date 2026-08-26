import type { Metadata } from "next";
import OwnerProductsContent from "./OwnerProductsContent";

export const metadata: Metadata = {
  title: "إدارة المنتجات | توفير",
};

export default function OwnerProductsPage() {
  return <OwnerProductsContent />;
}
