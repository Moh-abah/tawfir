import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const cairo = localFont({
  src: [
    {
      path: "../../public/fonts/Cairo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-cairo",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMono-Regular.ttf",
  variable: "--font-geist-mono",
  display: "swap",
});

/**
 * الميتا الافتراضية هنا لتطبيق «العميل» (tawfir.giize.com وlocalhost).
 * بوابة المالك تتجاوزها عبر metadata في:
 *   - src/app/owner/layout.tsx            (صفحة /owner/login)
 *   - src/app/(owner)/owner/layout.tsx    (صفحات البوابة المحمية)
 *
 * الترويسات المغروسة:
 *  • manifest: /manifest.webmanifest (ديناميكي حسب Host)
 *  • appleWebApp: capable + statusBarStyle default + title «توفير»
 *  • apple-touch-icon: /icons/apple-touch-icon.png
 *  • apple-touch-startup-image (splash): يُحقنها (public)/layout.tsx
 *    للأحجام المختلفة — تظهر عند إطلاق التطبيق المثبت على iPhone/iPad
 *  • theme-color: #005B82 (محيطي)
 */
export const metadata: Metadata = {
  title: "توفير | طلب الوجبات اليمنية وخصم 30% للعضوية",
  description:
    "منصة توفير اليمنية — تصفّح الوجبات اليمنية من المطاعم والمقاهي واطلبها، واشترك في عضوية الخصم 30%. اختر منطقتك واستمتع بالعروض الحصرية.",
  keywords: ["توفير", "Tawfir", "طلب وجبات", "وجبات يمنية", "مندي", "خصم 30%", "مطاعم", "مقاهي", "اليمن", "عضوية"],
  authors: [{ name: "توفير" }],
  manifest: "/manifest.webmanifest",
  applicationName: "توفير",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "توفير",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "theme-color": "#005B82",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#005B82",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
