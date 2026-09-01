"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Store, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * الشريط السفلي للأدمن — المهمة 4-a (هيكلة Netflix للموبايل)
 *
 * بنفس بنية OwnerMobileBottomNav (نمط Native):
 * - fixed bottom-0 + h-14 (56px) + تبويبات لمسية (≥44px) + نص 10px
 * - bg-background/95 + backdrop-blur + safe-area-inset-bottom
 * - النشط: text-primary · غير النشط: text-muted-foreground
 *
 * التبويبات:
 * - الرئيسية → /admin
 * - الطلبات  → /admin/orders
 * - المتاجر  → /admin/facilities
 * - العملاء  → /admin/users
 * - المزيد   → يفتح AdminMobileSidebar (Sheet عبر onOpenMenu)
 *
 * يظهر فقط على الموبايل (`lg:hidden` — من المستدعي أو من هنا).
 */
export interface AdminMobileBottomNavProps {
  /** فتح قائمة «المزيد» — يستدعي AdminMobileSidebar */
  onOpenMenu: () => void;
  className?: string;
}

type TabKey = "home" | "orders" | "facilities" | "users" | "menu";

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Home;
  href?: string; // محدد: الانتقال لرابط
  onClick?: "open-menu"; // بدلاً من ذلك: فتح القائمة
}

const TABS: TabDef[] = [
  { key: "home", label: "الرئيسية", icon: Home, href: "/admin" },
  { key: "orders", label: "الطلبات", icon: ShoppingBag, href: "/admin/orders" },
  { key: "facilities", label: "المتاجر", icon: Store, href: "/admin/facilities" },
  { key: "users", label: "العملاء", icon: Users, href: "/admin/users" },
  { key: "menu", label: "المزيد", icon: LayoutGrid, onClick: "open-menu" },
];

export function AdminMobileBottomNav({
  onOpenMenu,
  className,
}: AdminMobileBottomNavProps) {
  const pathname = usePathname();

  function isActive(tab: TabDef): boolean {
    if (!pathname) return false;
    if (tab.key === "home") return pathname === "/admin";
    if (tab.href) {
      return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    }
    return false;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-lg lg:hidden",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="التنقّل السفلي للإدارة"
    >
      <ul className="mx-auto grid h-14 max-w-2xl grid-cols-5 items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);

          const content = (
            <>
              <Icon
                className={cn(
                  "h-6 w-6 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                  tab.key === "menu" && "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "mt-0.5 text-[10px] font-medium leading-none transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </>
          );

          return (
            <li key={tab.key} className="flex">
              {tab.onClick === "open-menu" ? (
                <button
                  type="button"
                  onClick={onOpenMenu}
                  aria-label="فتح قائمة المزيد"
                  className="native-tap flex h-14 w-full flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  {content}
                </button>
              ) : (
                <Link
                  href={tab.href!}
                  aria-current={active ? "page" : undefined}
                  className="native-tap flex h-14 w-full flex-col items-center justify-center gap-0.5 transition-colors hover:bg-muted/40"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
