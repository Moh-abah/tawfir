import type { Metadata } from "next";
import IntegrationsContent from "./IntegrationsContent";

export const metadata: Metadata = {
  title: "التكاملات | توفير",
  description: "غرفة تحكم التكاملات الخارجية: الاتصالات، منيو فودكس، التوصيل الخارجي، وسجل الأحداث.",
};

export default function AdminIntegrationsPage() {
  return <IntegrationsContent />;
}
