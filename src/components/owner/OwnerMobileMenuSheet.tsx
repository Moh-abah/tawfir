"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  Flame,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Home,
  ChevronLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOwnerLogout } from "@/hooks/useOwnerAuth";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * Sheet قائمة ☰ للبائع — الجولة 9 (المهمة 8)
 *
 * - يُفتح من زر ☰ في OwnerMobileTopBar
 * - يُفتح من زر «القائمة» في OwnerMobileBottomNav
 * - عناصر القائمة (في سياق متجر محدد):
 *   - الرئيسية (/owner)
 *   - تعديل المتجر (/owner/facilities/{id})
 *   - العروض الخاصة (/owner/facilities/{id}/special-offers)
 *   - الاستيراد (/owner/facilities/{id}/products/import)
 *   - الإحصائيات (/owner — لوحة المالك)
 *   - الإعدادات (/owner/settings)
 *   - تسجيل الخروج
 *
 * عند عدم وجود facilityId (مثلاً على /owner نفسها)، عناصر المتجر تُعطّل.
 */
export interface OwnerMobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId?: number | null;
}

interface MenuItemDef {
  key: string;
  label: string;
  icon: typeof Home;
  href?: string;
  disabled?: boolean;
}

export function OwnerMobileMenuSheet({
  open,
  onOpenChange,
  facilityId,
}: OwnerMobileMenuSheetProps) {
  const { data: facilities, isLoading } = useMyFacilities();
  const facility = facilities?.find((f) => f.id === facilityId) ?? null;

  // تحديد حالة المتجر للرأس
  const facilityStatus = (() => {
    if (!facility) return null;
    if (facility.is_approved === false && facility.rejection_reason) {
      return { label: "مرفوضة", tone: "text-destructive" };
    }
    if (facility.is_approved === false) {
      return { label: "بانتظار الموافقة", tone: "text-accent" };
    }
    return { label: "موافق عليها", tone: "text-success" };
  })();

  // عناصر القائمة — تتكيّف حسب سياق المتجر
  const items: MenuItemDef[] = [
    { key: "home", label: "الرئيسية", icon: Home, href: "/owner" },
    {
      key: "edit",
      label: "تعديل المتجر",
      icon: Store,
      href: facilityId ? `/owner/facilities/${facilityId}` : undefined,
      disabled: !facilityId,
    },
    {
      key: "offers",
      label: "العروض الخاصة",
      icon: Flame,
      href: facilityId
        ? `/owner/facilities/${facilityId}/special-offers`
        : undefined,
      disabled: !facilityId,
    },
    {
      key: "import",
      label: "استيراد Excel",
      icon: Upload,
      href: facilityId
        ? `/owner/facilities/${facilityId}/products/import`
        : undefined,
      disabled: !facilityId,
    },
    {
      key: "stats",
      label: "الإحصائيات",
      icon: BarChart3,
      href: "/owner",
    },
    {
      key: "settings",
      label: "الإعدادات",
      icon: Settings,
      href: "/owner/settings",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[88%] max-w-xs p-0 sm:max-w-xs"
      >
        {/* ترويسة القائمة — اسم المتجر + شعار + حالة */}
        <SheetHeader className="space-y-0 p-0">
          <SheetTitle className="sr-only">قائمة البائع</SheetTitle>
          <SheetDescription className="sr-only">
            تنقّل سريع بين أقسام بوابة المالك
          </SheetDescription>
          <div className="flex items-center gap-3 border-b bg-gradient-to-l from-primary/10 to-secondary/10 p-4">
            <TawfirLogo variant="mark" className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {isLoading ? "جارٍ التحميل..." : (facility?.name ?? "بوابة المالك")}
              </p>
              {facilityStatus && (
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    facilityStatus.tone,
                  )}
                >
                  {facilityStatus.label}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* قائمة العناصر — نمط iOS: صفوف بسهم > */}
        <nav className="no-mobile-scrollbar flex-1 overflow-y-auto">
          <ul className="divide-y">
            {items.map((item) => {
              const Icon = item.icon;
              if (item.disabled || !item.href) {
                return (
                  <li key={item.key}>
                    <span
                      className="flex h-14 items-center gap-3 px-4 text-muted-foreground/40"
                      aria-disabled="true"
                      title="اختر متجراً أولاً"
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className="native-tap flex h-14 min-h-[44px] items-center gap-3 px-4 text-foreground transition-colors hover:bg-muted/50"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                    <ChevronLeft
                      className="h-4 w-4 text-muted-foreground rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* فاصل قبل الإعدادات/الخروج */}
          <div className="mx-4 my-3 h-[2px] w-auto rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />
        </nav>

        {/* تذييل: زر الخروج */}
        <SheetFooter className="mt-auto border-t p-3">
          <LogoutButton />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** زر الخروج — يفتح Dialog تأكيد قبل تسجيل الخروج. */
function LogoutButton() {
  const logout = useOwnerLogout();
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        className="native-tap flex h-12 min-h-[44px] w-full items-center justify-start gap-3 rounded-xl px-4 text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => setShowDialog(true)}
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">تسجيل الخروج</span>
      </Button>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد تسجيل الخروج</DialogTitle>
            <DialogDescription>
              سيتم تسجيل خروجك من حساب المالك. ستحتاج إعادة تسجيل الدخول.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="destructive"
              className="native-tap rounded-full min-h-[44px]"
              onClick={() => {
                setShowDialog(false);
                logout();
              }}
            >
              تسجيل الخروج
            </Button>
            <Button
              variant="outline"
              className="native-tap rounded-full min-h-[44px]"
              onClick={() => setShowDialog(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Skeleton خفيف للقائمة (يستخدم أثناء التحميل في موضع آخر إن لزم). */
export function OwnerMobileMenuSheetSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
