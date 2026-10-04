import type { Metadata } from "next";
import SubscribeContent from "./SubscribeContent";

export const metadata: Metadata = {
  title: "اشترك في عضوية توفير | توفير",
  description:
    "اشترك في عضوية توفير السنوية واحصل على خصومات حصرية على كل الوجبات. موافقة يدوية خلال 24-48 ساعة.",
};

export default function SubscribePage() {
  return <SubscribeContent />;
}
