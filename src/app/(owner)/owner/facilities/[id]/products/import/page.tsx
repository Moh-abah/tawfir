import type { Metadata } from "next";
import ImportProductsContent from "./ImportProductsContent";

export const metadata: Metadata = {
  title: "استيراد المنتجات | توفير",
};

export default function ImportProductsPage() {
  return <ImportProductsContent />;
}
