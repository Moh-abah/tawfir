import type { Metadata } from "next";
import OwnerPaymentsContent from "./OwnerPaymentsContent";

export const metadata: Metadata = {
  title: "مدفوعات المطعم | توفير",
};

export default function OwnerPaymentsPage() {
  return <OwnerPaymentsContent />;
}
