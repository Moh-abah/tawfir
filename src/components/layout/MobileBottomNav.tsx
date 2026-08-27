"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, ReceiptText, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useMyOrders } from "@/hooks/useMyOrders";
import type { OrderListOut } from "@/types/api.generated";

/** الحالات التي تُعد «طلب نشط» (لم يُسلَّم ولم يُلغَ). */
const ACTIVE_ORDER_STATUSES = new Set<OrderListOut["status"]>([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

/** شارة عدّاد صغيرة (نمط YouTube) — أعلى يسار الأيقونة. */
function TabBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${label}: ${count}`}
      className="absolute -start-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-extrabold leading-none text-white tabular-nums ring-2 ring-card"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * شريط التنقل السفلي — الجولة الختامية (قرار نهائي: 4 تبويبات):
 *  الرئيسية (/) · المنشآت (/facilities) · الطلبات (/orders) · العروض
 *
 *  - تبويب «حسابي» أُزيل نهائياً — الوصول للحساب من زر المستخدم
 *    في أعلى الهيدر (MainHeader → /account، لمسة ≥44px)
 *  - شارة الطلبات تبقى (عدد الطلبات النشطة)
 *  - شارة الإشعارات في الهيدر (جرس NotificationBell مع عدّاد غير المقروء)
 *  - قياسات YouTube الرسمية: h-14 (56dp) + safe-area + أيقونات 24dp + نص 10px
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { accessToken, hydrated } = useCustomerAuth();
  const isLoggedIn = hydrated && !!accessToken;

  /* عدد الطلبات النشطة — للشارة على تبويب «الطلبات» (مسجَّل فقط) */
  const { data: ordersData } = useMyOrders(undefined, isLoggedIn);
  const activeOrdersCount = (ordersData?.items ?? []).filter((o) =>
    ACTIVE_ORDER_STATUSES.has(o.status)
  ).length;

  const NAV_ITEMS = [
    { href: "/", label: "الرئيسية", icon: Home, match: "exact" as const },
    { href: "/facilities", label: "المنشآت", icon: Store, match: "prefix" as const },
    { href: "/orders", label: "الطلبات", icon: ReceiptText, match: "prefix" as const },
    { href: "/#offers", label: "العروض", icon: Flame, match: "hash" as const },
  ] as const;

  const isActive = (item: (typeof NAV_ITEMS)[number]): boolean => {
    if (item.match === "exact") return pathname === "/";
    if (item.match === "hash") return pathname === "/";
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="التنقل الرئيسي"
    >
      <div className="flex h-14 items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const isOrders = item.href === "/orders";
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="native-tap flex min-w-[64px] flex-col items-center gap-1 py-1"
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden="true"
                />
                {isOrders && <TabBadge count={activeOrdersCount} label="الطلبات النشطة" />}
              </span>
              <span
                className={cn(
                  "max-w-[72px] truncate text-[10px] font-medium leading-none transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
