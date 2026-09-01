"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Package, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyFacilities } from "@/hooks/useMyFacilities";

/**
 * الشريط السفلي للبائع — الجولة 9 (المهمة 8)
 *
 * نمط YouTube: 56px ارتفاع + 4 تبويبات لمسية (≥44px) + نص 10px
 * - الرئيسية → /owner (لوحة المالك)
 * - الطلبات  → /owner/facilities/{id}/orders
 * - المنتجات → /owner/facilities/{id}/products
 * - القائمة  → يفتح Sheet (OwnerMobileMenuSheet)
 *
 * ✦ 4-b: عند غياب معرّف المتجر من المسار (مثل /owner نفسها) نستخدم
 * أول متجر مملوك من useMyFacilities — التبويبات تعمل دائماً بدل تعطيلها.
 *
 * القائمة السفلية لا تُعرض على الديسكتوب (`md:hidden` من المستدعي).
 * safe-area-inset-bottom محترم عبر padding-bottom.
 */
export interface OwnerMobileBottomNavProps {
  /** فتح قائمة «المزيد» — يستدعي OwnerMobileMenuSheet */
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

type TabKey = "home" | "orders" | "products" | "menu";

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Home;
  href?: string; // محدد: الانتقال لرابط
  onClick?: "open-menu"; // بدلاً من ذلك: فتح القائمة
}

export function OwnerMobileBottomNav({ onOpenMenu, className }: OwnerMobileBottomNavProps) {
  const pathname = usePathname();
  const pathFacilityId = useFacilityIdFromPath();
  const { data: facilities } = useMyFacilities();

  // ✦ 4-b: fallback لأول متجر مملوك عندما لا يحمل المسار معرّف متجر
  const facilityId =
    pathFacilityId ??
    (facilities && facilities.length > 0 ? facilities[0].id : null);

  // تبويبات الطلبات/المنتجات تُعطّل فقط عند غياب أي متجر نهائياً
  const facilityBase = facilityId ? `/owner/facilities/${facilityId}` : null;

  const tabs: TabDef[] = [
    { key: "home", label: "الرئيسية", icon: Home, href: "/owner" },
    {
      key: "orders",
      label: "الطلبات",
      icon: ShoppingBag,
      href: facilityBase ? `${facilityBase}/orders` : undefined,
    },
    {
      key: "products",
      label: "المنتجات",
      icon: Package,
      href: facilityBase ? `${facilityBase}/products` : undefined,
    },
    { key: "menu", label: "القائمة", icon: LayoutGrid, onClick: "open-menu" },
  ];

  function isActive(tab: TabDef): boolean {
    if (tab.key === "home") return pathname === "/owner";
    if (tab.key === "orders" && tab.href) {
      return pathname === tab.href || pathname.startsWith(`${tab.href}`);
    }
    if (tab.key === "products" && tab.href) {
      // تجنّب مطابقة صفحات الاستيراد كـ active للمنتجات
      return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    }
    return false;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-lg",
        className,
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="التنقّل السفلي للبائع"
    >
      <ul className="mx-auto grid h-14 max-w-2xl grid-cols-4 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const disabled = !tab.href && tab.onClick !== "open-menu";

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
                  aria-label="فتح القائمة"
                  className="native-tap flex h-14 w-full flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  {content}
                </button>
              ) : disabled ? (
                <span
                  className="flex h-14 w-full cursor-not-allowed flex-col items-center justify-center gap-0.5 opacity-40"
                  aria-disabled="true"
                >
                  {content}
                </span>
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
