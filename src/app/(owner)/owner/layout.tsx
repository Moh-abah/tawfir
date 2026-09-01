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
    statusBarStyle: "default",
    title: "توفير مالك",
  },
  icons: {
    apple: "/icons/owner-apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1A2F",
};

export default function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <OwnerPortalShell>{children}</OwnerPortalShell>;
}
