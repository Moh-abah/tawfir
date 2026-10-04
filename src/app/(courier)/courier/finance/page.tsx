import type { Metadata } from "next";
import CourierFinanceContent from "./CourierFinanceContent";

export const metadata: Metadata = {
  title: "المالية والمستحقات | توفير",
};

export default function CourierFinancePage() {
  return <CourierFinanceContent />;
}
