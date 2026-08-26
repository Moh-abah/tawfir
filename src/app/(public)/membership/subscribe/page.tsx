import type { Metadata } from "next";
import SubscribeContent from "./SubscribeContent";

export const metadata: Metadata = {
  title: "اشترك في عضوية توفير | توفير",
  description:
    "اشترك في عضوية توفير السنوية واحصل على خصم 30% على كل الوجبات. مبلغ 3000 ر.ي، موافقة يدوية خلال 24-48 ساعة.",
};

export default function SubscribePage() {
  return <SubscribeContent />;
}
