"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { useAccountMe } from "@/hooks/useAccountMe";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";

/**
 * الشريط العلوي للموبايل — الجولة 9 (المهمة 8)
 *
 * نمط Native (YouTube/iOS-style): 56px ارتفاع + safe-area-inset-top
 * - زر ☰ على اليمين (للـ RTL أقصى اليمين البصري) يفتح Sheet جانبي
 * - اسم المتجر في المنتصف (يُستخرج ديناميكياً من URL أو اسم المالك)
 * - جرس الإشعارات على اليسار البصري
 *
 * يظهر فقط على الموبايل (`md:hidden` يُطبّق من المستدعي).
 */
export interface OwnerMobileTopBarProps {
  /** فتح قائمة ☰ الجانبية */
  onOpenMenu: () => void;
  className?: string;
}

/** يُستخرج معرّف المتجر من pathname عند وجوده. */
function useFacilityIdFromPath(): number | null {
  const pathname = usePathname();
  if (!pathname) return null;
  const m = pathname.match(/\/owner\/facilities\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function OwnerMobileTopBar({ onOpenMenu, className }: OwnerMobileTopBarProps) {
  const facilityId = useFacilityIdFromPath();
  const pathname = usePathname();
  const { data: facilities } = useMyFacilities();
  const { accessToken, hydrated } = useOwnerAuth();
  const me = useAccountMe("owner", hydrated && !!accessToken);

  // اسم المتجر الحالي (أو سلسلة عرض حسب الصفحة)
  const facilityName = (() => {
    if (facilityId) {
      const f = facilities?.find((x) => x.id === facilityId);
      if (f) return f.name;
    }
    if (pathname === "/owner") return "توفير — بوابة المالك";
    if (pathname?.startsWith("/owner/settings")) return "الإعدادات";
    return "توفير — بوابة المالك";
  })();

  // اسم المالك (للحالة التي لا يوجد فيها متجر محدد)
  const ownerName = me.data?.full_name?.trim() || "";

  const title = facilityId
    ? facilityName
    : (ownerName || facilityName);

  // منع وميض hydration: نبدأ بعنوان ثابت ثم نتبع العنوان الديناميكي
  // (نمط React الرسمي «تعديل الحالة عند تغيّر prop» داخل مرحلة الرندر —
  //  بلا useEffect/setState-in-effect)
  const [displayTitle, setDisplayTitle] = useState<string>(title);
  const [prevTitle, setPrevTitle] = useState<string>(title);
  if (prevTitle !== title) {
    setPrevTitle(title);
    setDisplayTitle(title);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="banner"
    >
      <div className="grid h-14 w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center px-1">
        {/* زر القائمة ☰ — أقصى اليمين البصري (RTL) */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="فتح القائمة"
            className="native-tap flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* العنوان المركزي + رمز الشعار — h2 لتجنّب تكرار h1 مع الشريط الجانبي */}
        <div className="flex min-w-0 items-center justify-center gap-1.5">
          {/* ✦ 2-b: رمز الشعار المقصوص في ترويسة الموبايل */}
          <TawfirLogo
            variant="mark"
            href=""
            className="shrink-0 [&_img]:!h-7 [&_img]:!w-auto"
          />
          <h2
            className="truncate text-center text-sm font-semibold text-foreground"
            title={displayTitle}
          >
            {displayTitle}
          </h2>
        </div>

        {/* ✦ 4-b: جرس الإشعارات + مبدّل الثيم — أقصى اليسار البصري
            (نفس ترتيب ترويسة الأدمن للاتساق) */}
        <div className="flex items-center justify-end gap-0.5">
          <NotificationBell variant="header" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
