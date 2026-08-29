import type { Metadata } from "next";
import FacilityEditContent from "./FacilityEditContent";

export const metadata: Metadata = {
  title: "تعديل المتجر | توفير",
};

export default function FacilityEditPage() {
  return <FacilityEditContent />;
}
