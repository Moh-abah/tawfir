import type { Metadata } from "next";
import AdminFinanceContent from "./AdminFinanceContent";

export const metadata: Metadata = {
  title: "المالية | توفير",
};

export default function AdminFinancePage() {
  return <AdminFinanceContent />;
}
