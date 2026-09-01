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
 * Sheet قائمة ☰ للبائع — ✦ 4-b: تنظيم بأقسام واضحة (نمط iOS)
 *
 * - يُفتح من زر ☰ في OwnerMobileTopBar وزر «القائمة» في OwnerMobileBottomNav
 * - ✦ 4-b: عند غياب facilityId من المسار (مثل /owner) نستخدم أول متجر
 *   من قائمة متاجر المالك — القائمة تعمل دائماً بدل تعطيل روابط المتجر
 * - كل صف ≥44px لمساً + أيقونة ملونة داخل شريحة دائرية + سهم اتجاه RTL
 *
 * الأقسام:
 *   - عام: الرئيسية · الإحصائيات
 *   - إدارة المتجر: تعديل المتجر · العروض الخاصة · استيراد Excel
 *   - عام (تذييل): الإعدادات + تسجيل الخروج
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
  iconClass: string;
  href?: string;
}

/** عنوان قسم صغير داخل القائمة (نمط iOS Settings). */
function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
      {children}
    </p>
  );
}

export function OwnerMobileMenuSheet({
  open,
  onOpenChange,
  facilityId,
}: OwnerMobileMenuSheetProps) {
  const { data: facilities, isLoading } = useMyFacilities();

  // ✦ 4-b: المتجر الفعّال — من المسار أو أول متجر مملوك (fallback)
  const effectiveFacilityId =
    facilityId ?? (facilities && facilities.length > 0 ? facilities[0].id : null);

  const facility =
    facilities?.find((f) => f.id === effectiveFacilityId) ?? null;

  // تحديد حالة المتجر للرأس
  const facilityStatus = (() => {
    if (!facility) return null;
    if (facility.is_approved === false && facility.rejection_reason) {
      return { label: "مرفوضة", tone: "text-destructive" };
    }
    if (facility.is_approved === false) {
      return { label: "بانتظار الموافقة", tone: "text-accent-ink" };
    }
    return { label: "موافق عليها", tone: "text-success" };
  })();

  const hasFacility = effectiveFacilityId != null;
  const base = hasFacility ? `/owner/facilities/${effectiveFacilityId}` : "";

  const generalItems: MenuItemDef[] = [
    { key: "home", label: "الرئيسية", icon: Home, iconClass: "bg-primary/10 text-primary", href: "/owner" },
    {
      key: "stats",
      label: "الإحصائيات",
      icon: BarChart3,
      iconClass: "bg-accent/15 text-accent-ink",
      href: "/owner",
    },
  ];

  const storeItems: MenuItemDef[] = [
    {
      key: "edit",
      label: "تعديل المتجر",
      icon: Store,
      iconClass: "bg-secondary/10 text-secondary",
      href: hasFacility ? `${base}` : undefined,
    },
    {
      key: "offers",
      label: "العروض الخاصة",
      icon: Flame,
      iconClass: "bg-destructive/10 text-destructive",
      href: hasFacility ? `${base}/special-offers` : undefined,
    },
    {
      key: "import",
      label: "استيراد Excel",
      icon: Upload,
      iconClass: "bg-primary/10 text-primary",
      href: hasFacility ? `${base}/products/import` : undefined,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[88%] max-w-xs gap-0 p-0 sm:max-w-xs"
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
                {isLoading
                  ? "جارٍ التحميل..."
                  : (facility?.name ?? "بوابة المالك")}
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

        {/* قائمة العناصر — أقسام واضحة (✦ 4-b) */}
        <nav
          className="no-mobile-scrollbar flex-1 overflow-y-auto"
          aria-label="أقسام بوابة المالك"
        >
          {/* ─── عام ─── */}
          <MenuSectionLabel>عام</MenuSectionLabel>
          <ul className="divide-y border-t">
            {generalItems.map((item) => (
              <MenuRow
                key={item.key}
                item={item}
                onNavigate={() => onOpenChange(false)}
              />
            ))}
          </ul>

          {/* ─── إدارة المتجر ─── */}
          <MenuSectionLabel>إدارة المتجر</MenuSectionLabel>
          <ul className="divide-y border-t">
            {storeItems.map((item) =>
              item.href ? (
                <MenuRow
                  key={item.key}
                  item={item}
                  onNavigate={() => onOpenChange(false)}
                />
              ) : (
                <li key={item.key}>
                  <span
                    className="flex h-14 items-center gap-3 px-4 text-muted-foreground/40"
                    aria-disabled="true"
                    title="سجّل متجرك أولاً"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-50",
                        item.iconClass,
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {item.label}
                    </span>
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </span>
                </li>
              ),
            )}
          </ul>

          {/* ─── الإعدادات ─── */}
          <MenuSectionLabel>التفضيلات</MenuSectionLabel>
          <ul className="divide-y border-t">
            <MenuRow
              item={{
                key: "settings",
                label: "الإعدادات",
                icon: Settings,
                iconClass: "bg-muted text-muted-foreground",
                href: "/owner/settings",
              }}
              onNavigate={() => onOpenChange(false)}
            />
          </ul>
        </nav>

        {/* تذييل: زر الخروج */}
        <SheetFooter className="mt-auto border-t p-3">
          <LogoutButton />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** صف قائمة واحد — أيقونة ملونة داخل شريحة + عنوان + سهم RTL (≥44px). */
function MenuRow({
  item,
  onNavigate,
}: {
  item: MenuItemDef;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href!}
        onClick={onNavigate}
        className="native-tap flex h-14 min-h-[44px] items-center gap-3 px-4 text-foreground transition-colors hover:bg-muted/50"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            item.iconClass,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex-1 text-sm font-medium">{item.label}</span>
        <ChevronLeft
          className="h-4 w-4 text-muted-foreground rtl:rotate-180"
          aria-hidden="true"
        />
      </Link>
    </li>
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
