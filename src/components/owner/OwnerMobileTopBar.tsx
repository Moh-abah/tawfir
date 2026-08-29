"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
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

  // منع وميض hydration: ابدأ بعنوان ثابت ثم حدّثه بعد hydration
  const [displayTitle, setDisplayTitle] = useState<string>(title);
  useEffect(() => {
    setDisplayTitle(title);
  }, [title]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="banner"
    >
      <div className="grid h-14 w-full grid-cols-[44px_1fr_44px] items-center px-1">
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

        {/* العنوان المركزي — h2 لتجنّب تكرار h1 مع الشريط الجانبي (قاعدة h1 واحد للصفحة) */}
        <h2
          className="truncate text-center text-sm font-semibold text-foreground"
          title={displayTitle}
        >
          {displayTitle}
        </h2>

        {/* جرس الإشعارات — أقصى اليسار البصري */}
        <div className="flex justify-end">
          <NotificationBell variant="header" />
        </div>
      </div>
    </header>
  );
}
