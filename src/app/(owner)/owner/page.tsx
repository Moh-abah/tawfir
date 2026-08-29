import type { Metadata } from "next";
import OwnerFacilitiesContent from "./OwnerFacilitiesContent";

export const metadata: Metadata = {
  title: "متجري | توفير",
};

export default function OwnerPage() {
  return <OwnerFacilitiesContent />;
}
