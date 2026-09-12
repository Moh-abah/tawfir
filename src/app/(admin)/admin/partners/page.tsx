import type { Metadata } from "next";
import AdminPartnersContent from "./AdminPartnersContent";

export const metadata: Metadata = {
  title: "روابط الشركاء | توفير",
};

export default function AdminPartnersPage() {
  return <AdminPartnersContent />;
}
