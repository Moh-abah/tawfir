import type { Metadata } from "next";
import OwnerTaskContent from "./OwnerTaskContent";

export const metadata: Metadata = {
  title: "بطاقة مهمة التوصيل | توفير",
};

export default function OwnerTaskPage() {
  return <OwnerTaskContent />;
}
