import type { Metadata } from "next";
import AdminPricingContent from "./AdminPricingContent";

export const metadata: Metadata = {
  title: "إعدادات التسعير | توفير",
};

export default function AdminPricingPage() {
  return <AdminPricingContent />;
}
