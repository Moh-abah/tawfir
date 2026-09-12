import type { Metadata } from "next";
import AdminCouriersContent from "./AdminCouriersContent";

export const metadata: Metadata = {
  title: "أسطول المناديب | توفير",
};

export default function AdminCouriersPage() {
  return <AdminCouriersContent />;
}
