import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "بوابة مندوبي توفير | انطلق بأجرة عادلة بالكيلومتر",
  description:
    "انضم لأسطول التوصيل الموثق في منصة توفير — نداءات فورية بصوت واهتزاز، أجرة شفافة بالكيلومتر، شارة مندوب موثق، وملف إنجازاتك.",
  keywords: [
    "مندوب توصيل",
    "عمل مندوب",
    "توصيل طلبات",
    "توفير",
    "Tawfir",
    "أجرة بالكيلومتر",
    "مندوب موثق",
  ],
  alternates: { canonical: "/courier" },
  openGraph: {
    title: "بوابة مندوبي توفير",
    description:
      "درب دخلك مع أسطول التوصيل الموثق — نداءات حية وأجرة عادلة بالكيلومتر",
    locale: "ar_YE",
    type: "website",
  },
};

export default function CourierRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
