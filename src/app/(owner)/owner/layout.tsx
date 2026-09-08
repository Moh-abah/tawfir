import type { Metadata, Viewport } from "next";
import { OwnerPortalShell } from "./OwnerPortalShell";

/**
 * Layout بوابة المالك (الصفحات المحمية /owner/*)
 * ------------------------------------------------
 * مكوّن Server يحمل ميتا «تطبيق المالك» (يتجاوز ميتا العميل في الجذر)
 * ويفوّض الواجهة والحراسة إلى OwnerPortalShell (مكوّن عميل).
 */
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest?app=owner",
  applicationName: "توفير مالك",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "توفير مالك",
  },
  icons: {
    apple: "/icons/owner-apple-touch-icon.png",
  },
  /* (أزلنا other المكررة — تُولّد من appleWebApp/viewport) */
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* الجولة 22 — سلوك Native: تعطيل التقريب بإصبعين + زووم النقر المزدوج
     على الجوال (viewport meta يعمل على أندرويد؛ iOS يُكمل بمنع
     gesturestart في NativeBridge — كلاهما معاً يغطي كل المتصفحات). */
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

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <OwnerPortalShell>{children}</OwnerPortalShell>;
}
