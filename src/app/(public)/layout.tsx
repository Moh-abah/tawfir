"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WelcomeBanner } from "@/components/shared/WelcomeBanner";
import { MainHeader } from "@/components/layout/MainHeader";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { PageTransition } from "@/components/shared/PageTransition";
import { NativeNotificationsNudge } from "@/components/shared/NativeNotificationsNudge";
import { StickyMiniCart } from "@/components/public/StickyMiniCart";
import { GlobalPullToRefresh } from "@/components/shared/GlobalPullToRefresh";
import { useRegionStore } from "@/store/region.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useRecentSearchesStore } from "@/store/recent-searches.store";
import { useCartStore } from "@/store/cart.store";
import { useRecentlyViewedStore } from "@/store/recently-viewed.store";
import { useRegions } from "@/hooks/useRegions";

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
  const pathname = usePathname();

  /* الجولة 26 — إصلاح الروابط المباشرة لزائر جديد: كان اختيار المنطقة
     التلقائي يحدث فقط في هيدر الرئيسية (MAIN_HEADER_ROUTES = ["/"])، فأي
     رابط مباشر (مشاركة متجر/إعلان/SEO) لزائر بلا منطقة مخزّنة يعرض
     «المتجر غير موجود» لأن استعلام المتاجر معطّل بلا منطقة. الآن نستدعي
     useRegions في التخطيط نفسه — يختار أول منطقة تلقائياً في كل الصفحات
     (الاستعلام مشترك مع منتقي الهيدر عبر react-query فلا طلب مزدوج). */
  useRegions();

  const isReceiptRoute = /^\/orders\/\d+\/receipt$/.test(pathname ?? "");

  /* شاشات الدخول الثلاث (دخول/تسجيل/استعادة): تجربة غامرة بهوية توفير —
     AuthShell يوفر خلفية كحلية + شعار + زر رجوع، فتُخفى كل قواقع
     التطبيق (بتر الترحيب/الهيدر/الفوتر/التنقل/شريط السلة) */
  const isAuthRoute = /^\/(login|register|reset-password)\/?$/.test(
    pathname ?? ""
  );

  /* ترطيب المنطقة المثبتة بعد التركيب (بلا اختلاف ترطيب SSR) —
     يجعل التطبيق يفتح أوفلاين على آخر منطقة تصفحها المستخدم */
  useEffect(() => {
    void useRegionStore.persist.rehydrate();
    /* الجولة 10 — ترطيب المفضلة + البحث الأخير (نفس النمط: بلا فرق SSR) */
    void useFavoritesStore.persist.rehydrate();
    void useRecentSearchesStore.persist.rehydrate();
    /* الجولة 11 — ترطيب السلة المحلية (متعددة الأصناف) */
    void useCartStore.persist.rehydrate();
    /* الجولة 13 — ترطيب «شاهدت مؤخراً» */
    void useRecentlyViewedStore.persist.rehydrate();
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-[100dvh] flex-col bg-background text-foreground",
        isAuthRoute && "bg-transparent"
      )}
    >
      <IosSplashLinks />
      {!isAuthRoute && <WelcomeBanner />}
      {!isAuthRoute && <MainHeader />}
      {/* داخل الـAPK فقط: شريط تفعيل إشعارات التطبيق عند رفض الإذن —
          نافذة السماح الأصلية + مسار التعافي عبر إعدادات النظام */}
      {!isAuthRoute && <NativeNotificationsNudge />}
      <main
        className={cn(
          "flex-1 pb-28 md:pb-0",
          (isReceiptRoute || isAuthRoute) && "pb-0 md:pb-0",
        )}
        data-main-content
      >
        {/* السحب للتحديث بنمط توفير — يُحلّ محل مؤشر المتصفح الافتراضي في
            كل صفحات العميل. لا يُركّب في شاشات الدخول (لا تحتاج تحديث بيانات). */}
        {!isAuthRoute ? (
          <GlobalPullToRefresh>
            <PageTransition>{children}</PageTransition>
          </GlobalPullToRefresh>
        ) : (
          <PageTransition>{children}</PageTransition>
        )}
      </main>
      {!isReceiptRoute && !isAuthRoute && <Footer />}
      {!isReceiptRoute && !isAuthRoute && <MobileBottomNav />}
      {/* الجولة 11 — شريط سلة عائم (يظهر عند وجود أصناف في السلة) */}
      {!isReceiptRoute && !isAuthRoute && <StickyMiniCart />}
      {!isReceiptRoute && <ScrollToTop />}
      <CookieConsent />
    </div>
  );
}
