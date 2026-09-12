"use client";

/**
 * CourierBottomNav — الشريط السفلي لبوابة المندوب (نمط Native).
 * تبويبات لمسية ≥44px + safe-area — مستنسخ من أنماط البوابات القائمة.
 * تبويب «مهمتي» يظهر شارة نقطية حمراء عند وجود مهمة جارية.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, ClipboardList, Home, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCourierCurrentTask } from "@/hooks/useCourier";

interface TabDef {
  label: string;
  icon: typeof Home;
  href: string;
  exact?: boolean;
}

const TABS: TabDef[] = [
  { label: "الرئيسية", icon: Home, href: "/courier/home", exact: true },
  { label: "مهمتي", icon: Package, href: "/courier/task", exact: true },
  { label: "مهامي", icon: ClipboardList, href: "/courier/tasks" },
  { label: "ملفي", icon: User, href: "/courier/profile" },
];

export function CourierBottomNav() {
  const pathname = usePathname();
  const { data: currentTask } = useCourierCurrentTask();
  const hasActiveTask = Boolean(currentTask?.task_id);

  return (
    <nav
      aria-label="التنقل الرئيسي لبوابة المندوب"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const showDot =
            tab.href === "/courier/task" && hasActiveTask && !active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 min-w-[64px] flex-col items-center justify-center gap-0.5 native-tap",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <tab.icon className="h-5 w-5" aria-hidden="true" />
                  {showDot && (
                    <span
                      className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">
                  {tab.label}
                </span>
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <span className="sr-only" aria-live="polite">
        {hasActiveTask ? "لديك مهمة جارية" : "لا مهمة جارية حالياً"}
      </span>
    </nav>
  );
}

/** رأس الشاشة الموحد للبوابة */
export function CourierScreenHeader({
  title,
  subtitle,
  icon: Icon = Bike,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Home;
}) {
  return (
    <header
      className="flex items-center gap-3 px-4 pt-4"
      style={{ paddingTop: "max(16px, env(safe-area-inset-top, 0px))" }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5.5 w-5.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
