import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "دخول المندوب | بوابة مندوبي توفير",
  description:
    "سجّل دخولك كبندوب موثق في منصة توفير — استقبل نداءات التوصيل الفورية واربح أجرة عادلة بالكيلومتر.",
  robots: { index: false, follow: false },
};

export default function CourierLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
