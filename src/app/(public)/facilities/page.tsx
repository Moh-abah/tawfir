import type { Metadata } from "next";
import FacilitiesContent from "./FacilitiesContent";

export const metadata: Metadata = {
  title: "المنشآت | توفير",
};

export default function FacilitiesPage() {
  return <FacilitiesContent />;
}
