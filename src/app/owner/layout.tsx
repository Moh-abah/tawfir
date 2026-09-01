import type { Metadata, Viewport } from "next";

/**
 * Layout بوابة المالك لمسار الدخول /owner/login
 * ------------------------------------------------
 * مكوّن Server يمرر الأبناء كما هو (بلا أي واجهة) — وظيفته الوحيدة:
 * تجاوز ميتا تطبيق العميل بميتا «تطبيق المالك» حتى لو كان الأصل
 * localhost (يُقرأ الـ manifest الصحيح عند تثبيت التطبيق من صفحة الدخول).
 *
 * الميتا:
 *  • manifest: /manifest.webmanifest?app=owner (يخدم manifest المالك)
 *  • appleWebApp: title «توفير مالك» + capable + statusBarStyle default
 *  • apple-touch-icon: /icons/owner-apple-touch-icon.png
 *  • theme-color: #0A1A2F (زمردي عميق لهوية بوابة المتاجر)
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
    "theme-color": "#0A1A2F",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1A2F",
};

export default function OwnerEntryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
