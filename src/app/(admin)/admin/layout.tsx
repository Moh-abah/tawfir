import type { Metadata, Viewport } from "next";
import { AdminPortalShell } from "./AdminPortalShell";

/**
 * Layout لوحة الإدارة (الصفحات المحمية /admin/*)
 * ------------------------------------------------
 * مكوّن Server يحمل ميتا «لوحة الإدارة» — إصلاح هوية بوابة الأدمن:
 * كان الـlayout مكوّناً عميلاً ("use client") فلا يمكنه تصدير metadata،
 * فكانت بوابة الأدمن ترث ميتا تطبيق العميل بالكامل (manifest العميل،
 * أيقونات العميل، عنوان «توفير»). الآن لها هوية مستقلة.
 *
 * الميتا:
 *  • manifest: /manifest.webmanifest?app=admin (manifest لوحة الإدارة)
 *  • appleWebApp: title «توفير — لوحة الإدارة» + statusBarStyle
 *    black-translucent
 *  • theme-color: ثنائي الوضع (فاتح/داكن) — إصلاح الثيم
 */
export const metadata: Metadata = {
  title: "توفير | لوحة الإدارة",
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
  /* إصلاح الثيم — ثنائي الوضع (نفس الجذر والمالك) */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1A2F" },
  ],
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminPortalShell>{children}</AdminPortalShell>;
}
