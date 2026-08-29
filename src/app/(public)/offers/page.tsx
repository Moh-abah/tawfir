import type { Metadata } from "next";
import { OffersContent } from "./OffersContent";

export const metadata: Metadata = {
  title: "العروض الخاصة | توفير",
  description:
    "عروض حصرية وخصومات إضافية لأعضاء توفير على وجباتك المفضلة. عُد للعروض الجديدة كل يوم.",
};

export default function OffersPage() {
  return <OffersContent />;
}
