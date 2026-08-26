"use client";

import { useEffect } from "react";
import { WelcomeBanner } from "@/components/shared/WelcomeBanner";
import { MainHeader } from "@/components/layout/MainHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { PageTransition } from "@/components/shared/PageTransition";
import { useRegionStore } from "@/store/region.store";

/**
 * شاشات انطلاق iOS لتطبيق العميل — يرفعها React 19 إلى <head> تلقائياً.
 * تُعرض عند إطلاق التطبيق المثبت من الشاشة الرئيسية على iPhone/iPad.
 */
const IOS_SPLASHES: ReadonlyArray<{ href: string; media: string }> = [
  {
    href: "/icons/splash/splash-640x1136.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    href: "/icons/splash/splash-750x1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    href: "/icons/splash/splash-1242x2208.png",
    media:
      "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    href: "/icons/splash/splash-1170x2532.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    href: "/icons/splash/splash-1284x2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    href: "/icons/splash/splash-2048x2732.png",
    media:
      "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
  },
];

function IosSplashLinks() {
  return (
    <>
      {IOS_SPLASHES.map((splash) => (
        <link
          key={splash.href}
          rel="apple-touch-startup-image"
          href={splash.href}
          media={splash.media}
        />
      ))}
    </>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ترطيب المنطقة المثبتة بعد التركيب (بلا اختلاف ترطيب SSR) —
     يجعل التطبيق يفتح أوفلاين على آخر منطقة تصفحها المستخدم */
  useEffect(() => {
    void useRegionStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <IosSplashLinks />
      <WelcomeBanner />
      <MainHeader />
      <main className="flex-1 pb-28 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <MobileBottomNav />
      <ScrollToTop />
      <CookieConsent />
    </div>
  );
}
