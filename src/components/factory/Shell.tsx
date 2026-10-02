"use client";

import { cn } from "@/lib/utils";
import { useNav, useSession, type SectionId } from "@/store/session";
import { BackendStatus } from "./shared/Bits";
import { Button } from "@/components/ui/button";
import {
  Factory,
  Home,
  Palette,
  Globe,
  Bike,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
} from "lucide-react";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "main" | "owner" | "admin" | "console" | "site" | "dev";
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "الرئيسية", icon: Home, group: "main" },
  { id: "owner-brand", label: "هويتي (منشآتي)", icon: Palette, group: "owner" },
  { id: "owner-site", label: "موقعي", icon: Globe, group: "owner" },
  { id: "owner-couriers", label: "مناديبي", icon: Bike, group: "owner" },
  { id: "admin-sites", label: "مواقع التجار (إدارة)", icon: LayoutDashboard, group: "admin" },
  /* الكونسول المنفصل: صفحة مستقلة تماماً على /console — عزل بصري وتوكني (لا يُعرض داخل هذا الصدف) */
  { id: "console", label: "الكونسول المنفصل", icon: MonitorSmartphone, group: "console" },
  { id: "generated-site", label: "الموقع المولَّد", icon: Globe, group: "site" },
  { id: "factory-dev", label: "التعبئة وFCM", icon: Package, group: "dev" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "",
  owner: "لوحة المنشآت — المالك",
  admin: "لوحة الإدارة",
  console: "الكونسول المنفصل",
  site: "قالب الموقع المولَّد",
  dev: "أدوات المصنع",
};

export function Shell({ children }: { children: React.ReactNode }) {
  const section = useNav((s) => s.section);
  const setSection = useNav((s) => s.setSection);
  const tokens = useSession((s) => s.tokens);

  const grouped = (["main", "owner", "admin", "console", "site", "dev"] as const).map((g) => ({
    group: g,
    items: NAV_ITEMS.filter((i) => i.group === g),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setSection("home")}
            className="flex items-center gap-2 text-start"
            aria-label="الصفحة الرئيسية"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Factory className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold text-stone-900">توفير — مصنع المنصات</span>
              <span className="block text-[11px] text-stone-500">الكونسول + المواقع + الهوية + المناديب</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <BackendStatus />
          </div>
        </div>
        <nav aria-label="أقسام المصنع" className="border-t border-stone-100 bg-white">
          <div className="mx-auto max-w-7xl overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex items-center gap-1 py-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                const cls = cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                );
                return (
                  <li key={item.id}>
                    {item.id === "console" ? (
                      /* الكونسول يفتح صفحته المستقلة /console — لا يُرسم داخل هذا التخطيط إطلاقاً */
                      <a href="/console" className={cls} title="يُفتح في صفحة مستقلة معزولة — /console">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => setSection(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={cls}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-auto border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500 sm:flex-row">
          <p>
            مصنع منصات «توفير» — مدمج داخل tawfir-front · الكونسول معزول على /console · العملة وصيغة الجوال من الـAPI حصراً
          </p>
          <p className="flex items-center gap-2">
            <span>جلسات فعّالة:</span>
            {(["owner", "admin", "console"] as const).map((r) => (
              <span
                key={r}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  tokens[r] ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
                )}
              >
                {r === "owner" ? "مالك" : r === "admin" ? "إدارة" : "كونسول"}
              </span>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => useSession.getState().logoutAll()}>
              تصفير الجلسات
            </Button>
          </p>
        </div>
      </footer>
    </div>
  );
}

export { GROUP_LABELS };
