import type { Metadata } from "next";
import OwnerFinanceContent from "./OwnerFinanceContent";

export const metadata: Metadata = {
  title: "المالية | توفير",
};

export default function OwnerFinancePage() {
  return <OwnerFinanceContent />;
}
