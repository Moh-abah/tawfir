"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  CreditCard,
  Store,
  Users,
  ScrollText,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  ShoppingBag,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useUiStore } from "@/store/ui.store";
import { useAdminLogout } from "@/hooks/useAdminAuth";
import { useAdminFacilities } from "@/hooks/useAdminFacilities";
import { useAdminCards } from "@/hooks/useAdminCards";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { useAdminPendingFacilities } from "@/hooks/useAdminPendingFacilities";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useAdminMembershipRequests } from "@/hooks/useAdminMembershipRequests";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

type NavKey = "facilities" | "cards" | "users" | "audit-logs" | "pending" | "orders" | "membership-requests";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: NavKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "لوحة المعلومات", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag, badgeKey: "orders" },
  { href: "/admin/membership-requests", label: "طلبات العضوية", icon: BadgeCheck, badgeKey: "membership-requests" },
  { href: "/admin/facilities", label: "المنشآت", icon: Store, badgeKey: "facilities" },
  { href: "/admin/facilities/pending", label: "طلبات المنشآت المعلّقة", icon: Hourglass, badgeKey: "pending" },
  { href: "/admin/regions", label: "المناطق", icon: Map },
  { href: "/admin/cards", label: "البطاقات", icon: CreditCard, badgeKey: "cards" },
  { href: "/admin/users", label: "المستخدمون", icon: Users, badgeKey: "users" },
  { href: "/admin/audit-logs", label: "سجل التدقيق", icon: ScrollText, badgeKey: "audit-logs" },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** أطول بادئة مطابقة تفوز — حتى لا تتفعّل «المنشآت» داخل صفحة طلباتها المعلّقة */
function getActiveHref(pathname: string): string | null {
  const matches = NAV_ITEMS.filter((item) => isActive(pathname, item.href)).map(
    (item) => item.href
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0];
}

function NavBadgeCounts() {
  const { data: facilitiesData } = useAdminFacilities(1, 1);
  const { data: cardsData } = useAdminCards();
  const { data: usersData } = useAdminUsers(undefined, 1, 1);
  const { data: auditData } = useAdminAuditLogs(1, 1);
  const { data: pendingData } = useAdminPendingFacilities(1, 1);
  const { data: ordersData } = useAdminOrders({ page: 1, page_size: 1 });
  const { data: membershipData } = useAdminMembershipRequests("pending", 1, 1);

  const counts: Record<NavKey, number> = {
    facilities: facilitiesData?.total ?? 0,
    cards: cardsData?.total ?? 0,
    users: usersData?.total ?? 0,
    "audit-logs": auditData?.total ?? 0,
    pending: pendingData?.total ?? 0,
    orders: ordersData?.total ?? 0,
    "membership-requests": membershipData?.total ?? 0,
  };

  return counts;
}

function NavLinks({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed: boolean }) {
  const pathname = usePathname();
  const counts = NavBadgeCounts();
  const activeHref = getActiveHref(pathname);
  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        const count = item.badgeKey ? counts[item.badgeKey] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
              active
                ? "font-medium text-primary before:absolute before:right-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-primary before:to-secondary"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            aria-current={active ? "page" : undefined}
          >
            {/* Active background */}
            {active && (
              <span className="absolute inset-0 rounded-md bg-primary/10" />
            )}
            <Icon className="h-5 w-5 shrink-0 relative z-10" />
            {!collapsed && (
              <span className="relative z-10 flex-1">{item.label}</span>
            )}
            {!collapsed && count > 0 && (
              <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
            {collapsed && count > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarUserProfile({ collapsed }: { collapsed: boolean }) {
  const logout = useAdminLogout();
  if (collapsed) return null;
  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <User className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">المشرف</p>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[44px]"
          >
            <LogOut className="h-3 w-3" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="mt-auto flex flex-col">
      <SidebarUserProfile collapsed={collapsed} />
      {!collapsed && (
        <p className="px-4 py-2 text-xs text-muted-foreground/60">
          Ctrl+K للاختصارات
        </p>
      )}
      <div className={cn(
        "flex items-center border-t p-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <ThemeToggle />
      </div>
    </div>
  );
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
            لوحة التحكم
          </span>
        </div>
      )}
    </div>
  );
}

/** Desktop sidebar — fixed on the RTL start (right) side, hidden on mobile. */
export function AdminSidebar() {
  const collapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-l transition-all duration-300 lg:flex",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, var(--card) 0%, color-mix(in srgb, var(--card) 90%, var(--primary)) 100%)",
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
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

/** Mobile sidebar — shadcn Sheet on the right side, controlled by UI store. */
export function AdminMobileSidebar() {
  const isOpen = useUiStore((s) => s.isAdminSidebarOpen);
  const setOpen = useUiStore((s) => s.setAdminSidebarOpen);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="text-right">
          <SheetTitle className="text-right">
            <SidebarBrand collapsed={false} />
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavLinks onNavigate={() => setOpen(false)} collapsed={false} />
        </div>
        <SidebarFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  );
}