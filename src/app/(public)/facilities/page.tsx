import type { Metadata } from "next";
import FacilitiesContent from "./FacilitiesContent";

export const metadata: Metadata = {
  title: "المتاجر | توفير",
};

export default function FacilitiesPage() {
  return <FacilitiesContent />;
}
