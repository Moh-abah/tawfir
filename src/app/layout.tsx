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
 *  • theme-color: #0A1A2F (الزمردي — هوية توفير)
 */
export const metadata: Metadata = {
  title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
  description:
    "منصة توفير اليمنية — تصفّح الوجبات اليمنية من المطاعم والمقاهي واطلبها، واشترك في عضوية الخصم حتى 30%. اختر منطقتك واستمتع بالعروض الحصرية.",
  keywords: ["توفير", "Tawfir", "طلب وجبات", "وجبات يمنية", "مندي", "خصم حتى 30%", "مطاعم", "مقاهي", "اليمن", "عضوية"],
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
  /* الجولة 16 — معاينة اجتماعية عند مشاركة الروابط في واتساب/تيليجرام:
     بطاقة ملخّص كبيرة بصورة الغلاف الاجتماعي المعتمدة من الهوية + وصف مختصر */
  openGraph: {
    type: "website",
    locale: "ar_YE",
    siteName: "توفير",
    title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
    description:
      "تطبيق توفير — اطلب أشهى الوجبات اليمنية من مطاعم ومقاهي مدينتك، ووفّر حتى 30% على كل طلب مع عضوية توفير.",
    images: [
      {
        url: "/identity/tawfir-social-cover.png",
        width: 2560,
        height: 1440,
        alt: "توفير — تطبيق طلب الوجبات اليمنية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
    description:
      "تطبيق توفير — اطلب أشهى الوجبات اليمنية من مطاعم ومقاهي مدينتك، ووفّر حتى 30% على كل طلب مع عضوية توفير.",
    images: ["/identity/tawfir-social-cover.png"],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "theme-color": "#0A1A2F",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1A2F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/*
          الجولة 16 — إصلاح CLS (0.08): البانر الترحيبي يُرسم في SSR دائماً،
          ثم يُزال بعد الترطيب للمسجّلين/الرافضين → إزاحة محتوى عند كل تحميل.
          هذا السكربت يعمل قبل أول طلاء (قبل رسم أي بكسل): يقرأ كوكي الجلسة
          وعلم الرفض ويضيف data-wb-hide على <html> — فيخفيه CSS فوراً
          فيبقى التخطيط ثابتاً قبل وبعد الترطيب (نمط منع وميض الثيم نفسه).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(document.cookie.split('; ').some(function(c){return c.indexOf('tawfir_customer_token=')===0})||sessionStorage.getItem('tawfir_welcome_dismissed')!==null){d.setAttribute('data-wb-hide','')}}catch(e){}`,
          }}
        />
      </head>

      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
