import type { Metadata } from "next";
import { CartPageContent } from "./CartPageContent";

export const metadata: Metadata = {
  title: "سلة الطلبات | توفير",
  description:
    "راجع أصناف سلتك، عدّل الكميات، وأكمل طلبك من متجرك المفضّل مع توصيل سريع.",
  robots: { index: false },
};

export default function CartPage() {
  return <CartPageContent />;
}
