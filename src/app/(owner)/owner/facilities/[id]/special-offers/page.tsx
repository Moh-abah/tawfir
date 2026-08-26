import type { Metadata } from "next";
import OwnerSpecialOffersContent from "./OwnerSpecialOffersContent";

export const metadata: Metadata = {
  title: "العروض الخاصة | توفير",
};

export default function OwnerSpecialOffersPage() {
  return <OwnerSpecialOffersContent />;
}
