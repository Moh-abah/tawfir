"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, LogOut, ChevronLeft, ChevronRight, Package, Settings, Keyboard, ShoppingBag, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useUiStore } from "@/store/ui.store";
import { useOwnerLogout } from "@/hooks/useOwnerAuth";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

const FACILITY_TYPE_LABELS: Record<string, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/owner") return pathname === "/owner";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-5 py-4",
      collapsed && "justify-center px-2"
    )}>
      <TawfirLogo variant="mark" className="h-9 w-9 shrink-0" />
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">توفير</span>
          <span className="bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent text-xs font-semibold">
            بوابة المالك
          </span>
        </div>
      )}
    </div>
  );
}

function FacilitySwitcher({ facilities, collapsed }: { facilities: { id: number; name: string }[]; collapsed: boolean }) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    String(facilities[0].id)
  );

  if (facilities.length < 2) return null;

  const selectedFacility = facilities.find((f) => String(f.id) === selectedFacilityId);

  return (
    <div className={cn("px-3 pt-2 pb-1", collapsed && "px-2")}>
      <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
        <SelectTrigger
          className={cn(
            "w-full rounded-lg border min-h-[44px]",
            collapsed && "hidden"
          )}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            <SelectValue placeholder={facilities[0].name} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={String(f.id)}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {collapsed && (
        <button
          type="button"
          className="flex h-[44px] w-full items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
          title={selectedFacility?.name}
          aria-label={selectedFacility?.name}
        >
          <Store className="h-5 w-5 text-primary" />
        </button>
      )}
    </div>
  );
}

function NavLinks({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed: boolean }) {
  const pathname = usePathname();
  const { data: facilities, isLoading } = useMyFacilities();

  const facilityName = facilities && facilities.length === 1 ? facilities[0].name : "متجري";

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {!isLoading && facilities && facilities.length >= 2 && (
        <FacilitySwitcher facilities={facilities} collapsed={collapsed} />
      )}
      <Link
        href="/owner"
        onClick={onNavigate}
        title={collapsed ? "متجري" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
          isActive(pathname, "/owner")
            ? "font-medium text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-secondary before:to-primary"
            : "text-muted-foreground hover:bg-secondary/5 hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
        aria-current={isActive(pathname, "/owner") ? "page" : undefined}
      >
        {isActive(pathname, "/owner") && (
          <span className="absolute inset-0 rounded-md bg-primary/10" />
        )}
        <Store className="h-5 w-5 shrink-0 relative z-10" />
        <span className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-destructive" />
        {!collapsed && <span className="relative z-10">متجري</span>}
      </Link>

      {isLoading && (
        <div className="px-3 py-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
      )}

      {facilities?.map((f) => {
        const href = `/owner/facilities/${f.id}/products`;
        const active = isActive(pathname, href);
        return (
          <div key={f.id}>
            <Link
              href={href}
              onClick={onNavigate}
              title={collapsed ? f.name : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
                active
                  ? "font-medium text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-secondary before:to-primary"
                  : "text-muted-foreground hover:bg-secondary/5 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute inset-0 rounded-md bg-primary/10" />
              )}
              <Package className="h-4 w-4 shrink-0 relative z-10" />
              {!collapsed && (
                <span className="relative z-10 truncate">{f.name}</span>
              )}
            </Link>
            {!collapsed && (
              <>
                <Link
                  href={`/owner/facilities/${f.id}/orders`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md pe-3 ps-11 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-secondary/5 hover:text-foreground",
                    isActive(pathname, `/owner/facilities/${f.id}/orders`) && "text-primary"
                  )}
                >
                  <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  طلبات المتجر
                </Link>
                <Link
                  href={`/owner/facilities/${f.id}/special-offers`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md pe-3 ps-11 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-secondary/5 hover:text-foreground",
                    isActive(pathname, `/owner/facilities/${f.id}/special-offers`) && "text-primary"
                  )}
                >
                  <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  العروض الخاصة
                </Link>
                <Link
                  href={`/owner/facilities/${f.id}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md pe-3 ps-11 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-secondary/5 hover:text-foreground",
                    isActive(pathname, `/owner/facilities/${f.id}`) && "text-primary"
                  )}
                >
                  تعديل المتجر
                </Link>
              </>
            )}
          </div>
        );
      })}

      {/* Contextual facility label */}
      {!collapsed && facilities && facilities.length > 0 && (
        <div className="mt-4 border-t pt-3 px-3">
          <p className="text-xs text-muted-foreground/70 truncate">{facilityName}</p>
        </div>
      )}

      {/* Settings link */}
      <Link
        href="/owner/settings"
        onClick={onNavigate}
        title={collapsed ? "الإعدادات" : undefined}
        className={cn(
          "relative mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
          isActive(pathname, "/owner/settings")
            ? "font-medium text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-secondary before:to-primary"
            : "text-muted-foreground hover:bg-secondary/5 hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
        aria-current={isActive(pathname, "/owner/settings") ? "page" : undefined}
      >
        {isActive(pathname, "/owner/settings") && (
          <span className="absolute inset-0 rounded-md bg-primary/10" />
        )}
        <Settings className="h-5 w-5 shrink-0 relative z-10" />
        {!collapsed && <span className="relative z-10">الإعدادات</span>}
      </Link>
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const logout = useOwnerLogout();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  return (
    <>
      <div className={cn(
        "mt-auto flex items-center border-t p-3",
        collapsed ? "flex-col gap-2" : "justify-between"
      )}>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 text-muted-foreground hover:text-destructive min-h-[44px]",
            collapsed && "px-2"
          )}
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </Button>
        <ThemeToggle />
      </div>
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
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
              className="rounded-full min-h-[44px]"
              onClick={() => { setShowLogoutDialog(false); logout(); }}
            >
              تسجيل الخروج
            </Button>
            <Button
              variant="outline"
              className="rounded-full min-h-[44px]"
              onClick={() => setShowLogoutDialog(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OwnerSidebar() {
  const collapsed = useUiStore((s) => s.isOwnerSidebarCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleOwnerSidebarCollapsed);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-l transition-all duration-300 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, var(--card) 0%, color-mix(in srgb, var(--card) 90%, var(--secondary)) 100%)",
      }}
    >
      {/* Gradient top line */}
      <div className="h-[3px] w-full bg-gradient-to-l from-primary via-secondary to-accent" />

      <div className="flex items-center justify-between border-b px-2 py-2">
        <SidebarBrand collapsed={collapsed} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      {/* جرس الإشعارات — أعلى القائمة */}
      <div className={cn("border-b px-2 py-2", collapsed ? "flex justify-center" : "flex justify-end")}>
        <NotificationBell variant="sidebar" />
      </div>
      <NavLinks collapsed={collapsed} />
      {/* Gradient separator line */}
      <div className="mx-4 my-2 h-[2px] w-auto rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />
      {/* Keyboard shortcuts hint */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-5 py-1.5">
          <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">اختصارات لوحة المفاتيح</span>
        </div>
      )}
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

export function OwnerMobileSidebar() {
  const isOpen = useUiStore((s) => s.isOwnerSidebarOpen);
  const setOpen = useUiStore((s) => s.setOwnerSidebarOpen);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="text-right">
          <SheetTitle className="text-right">
            <SidebarBrand collapsed={false} />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto no-mobile-scrollbar">
          <NavLinks onNavigate={() => setOpen(false)} collapsed={false} />
        </div>
        <SidebarFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}