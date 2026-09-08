import type { Metadata, Viewport } from "next";

/**
 * Layout صفحة دخول لوحة الإدارة (/admin/login)
 * ------------------------------------------------
 * ميتا بوابة الإدارة لصفحة الدخول — الصفحة نفسها مكوّن عميل فلا تستطيع
 * تصدير metadata؛ هذا الـlayout الخادمي يوفّر هوية الإدارة (manifest
 * الأدمن + عنوان + ثيم ثنائي الوضع) حتى صفحة الدخول (إصلاح هوية
 * بوابة الأدمن: كانت ترث هوية تطبيق العميل بالكامل).
 */
export const metadata: Metadata = {
  title: "توفير | تسجيل دخول الإدارة",
  manifest: "/manifest.webmanifest?app=admin",
  applicationName: "توفير — لوحة الإدارة",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "توفير — لوحة الإدارة",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  /* إصلاح الثيم — ثنائي الوضع (نفس الجذر) */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1A2F" },
  ],
};

export default function AdminLoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
