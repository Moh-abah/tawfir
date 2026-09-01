"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleUserRound, Heart, LogIn, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { RegionSelector } from "@/components/public/RegionSelector";
import { CartButton } from "@/components/public/CartButton";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

/**
 * هيدر بوابة العميل — سلوك Native (الجولة 4):
 *  - عند القمة (scrollY ≤ 10): شفاف تماماً على الموبايل
 *  - عند التمرير: يتحول صلباً — bg-card/95 + blur + border + shadow
 *  - انتقال 200ms سلس (نمط YouTube)
 *  - يبقى ظاهراً حتى في وضع standalone (التطبيقات الأصلية لها هيدر
 *    للوصول للمنطقة والحساب) — الفوتر فقط هو الذي يُخفى.
 *  - الشعار مصغّر على الموبايل (scale-90) ويكبر على الديسكتوب.
 */

const MAIN_HEADER_ROUTES: ReadonlySet<string> = new Set(["/"]);

export function MainHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { accessToken, hydrated } = useCustomerAuth();
  const me = useMe();
  const isLoggedIn = hydrated && !!accessToken;
  const fullName = me.data?.full_name;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  // الشاشات الداخلية لها ScreenHeader خاص — لا نريد هيدراً رئيسياً فوقه
  if (!MAIN_HEADER_ROUTES.has(pathname)) return null;
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-[background-color,border-color,box-shadow] duration-200",
        scrolled
          ? "border-b border-border/50 bg-card/95 shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-card/80"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        {/* الشعار المقصوص من الهوية — مصغّر على الموبايل */}
        <div className="origin-right scale-[0.82] sm:scale-100">
          <TawfirLogo variant="mark" size="sm" />
        </div>

        {/* منتقي المنطقة */}
        <div className="flex min-w-0 flex-1 items-center justify-center sm:justify-end">
          <RegionSelector />
        </div>

        {/* حسابي / دخول + السلة + الإشعارات + الثيم */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* الجولة 12 — البحث الموحّد: أيقونة بحث توجّه لـ /search */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="native-tap h-11 min-w-11 rounded-full px-0"
          >
            <Link href="/search" aria-label="البحث">
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
      
          <CartButton />
          {isLoggedIn && <NotificationBell variant="header" />}
          {isLoggedIn ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="native-tap h-11 min-w-11 gap-1.5 rounded-full px-2.5 sm:px-3"
            >
              <Link href="/account" aria-label="حسابي">
                <CircleUserRound className="h-5 w-5" aria-hidden="true" />
                <span className="hidden max-w-[8rem] truncate text-xs font-bold sm:inline sm:text-sm">
                  {fullName ?? "حسابي"}
                </span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="native-tap h-11 min-w-11 gap-1.5 rounded-full px-2.5 sm:px-3"
            >
              <Link href="/login" aria-label="تسجيل الدخول">
                <LogIn className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-bold sm:text-sm">دخول</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
