import type { Metadata } from "next";
import OwnerIntegrationsContent from "./OwnerIntegrationsContent";

export const metadata: Metadata = {
  title: "التكاملات | توفير",
  description: "اربط كاشيرك متجرك وفعّل التوصيل الخارجي — بضع نقرات بلا إعدادات تقنية.",
};

export default function OwnerIntegrationsPage() {
  return <OwnerIntegrationsContent />;
}
