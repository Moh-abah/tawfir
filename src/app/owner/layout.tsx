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
 *  • appleWebApp: title «توفير مالك» + capable + statusBarStyle black-translucent
 *  • apple-touch-icon: /icons/owner-apple-touch-icon.png
 *  • theme-color: ثنائي الوضع (فاتح/داكن) — إصلاح الثيم (يتّبع النظام
 *    ثم يحدّثه ThemeProvider ديناميكياً؛ PWABuilder يقرأه للمالك)
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

export default function OwnerEntryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
