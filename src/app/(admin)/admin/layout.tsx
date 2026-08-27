"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { NotificationBell } from "@/components/shared/NotificationBell";
import {
  AdminSidebar,
  AdminMobileSidebar,
} from "@/components/layout/AdminSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/store/ui.store";

/* ─── Keyboard shortcut items ───────────────────── */
interface ShortcutItem {
  keys: string[];
  description: string;
  href: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["Ctrl", "K"], description: "فتح اختصارات لوحة المفاتيح", href: "" },
  { keys: ["Ctrl", "1"], description: "لوحة التحكم", href: "/admin" },
  { keys: ["Ctrl", "2"], description: "المناطق", href: "/admin/regions" },
  { keys: ["Ctrl", "3"], description: "البطاقات", href: "/admin/cards" },
  { keys: ["Ctrl", "4"], description: "المنشآت", href: "/admin/facilities" },
  { keys: ["Ctrl", "5"], description: "العملاء", href: "/admin/users" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toggleSidebar = useUiStore((s) => s.toggleAdminSidebar);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* ─── Keyboard shortcut handler ────────────────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key;

      if (key === "k") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (key === "1") {
        e.preventDefault();
        router.push("/admin");
        setShortcutsOpen(false);
        return;
      }
      if (key === "2") {
        e.preventDefault();
        router.push("/admin/regions");
        setShortcutsOpen(false);
        return;
      }
      if (key === "3") {
        e.preventDefault();
        router.push("/admin/cards");
        setShortcutsOpen(false);
        return;
      }
      if (key === "4") {
        e.preventDefault();
        router.push("/admin/facilities");
        setShortcutsOpen(false);
        return;
      }
      if (key === "5") {
        e.preventDefault();
        router.push("/admin/users");
        setShortcutsOpen(false);
        return;
      }
    },
    [router],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AdminAuthGuard>
      <div className="flex min-h-screen flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="فتح القائمة"
            onClick={toggleSidebar}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold">توفير — لوحة التحكم</span>
          <div className="flex items-center gap-1">
            {/* جرس الإشعارات الحقيقي — GET /notifications/unread-count */}
            <NotificationBell variant="header" />
            <ThemeToggle />
          </div>
        </header>

        {/* جرس سطح المكتب يوفّره AdminSidebar (جرس حقيقي أعلى القائمة) */}

        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>

        <AdminMobileSidebar />

          {/* Keyboard Shortcuts Dialog */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                اختصارات لوحة المفاتيح
              </DialogTitle>
              <DialogDescription>
                استخدم هذه الاختصارات للتنقل السريع بين أقسام لوحة التحكم.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 pt-2">
              {SHORTCUTS.map((sc) => (
                <div
                  key={sc.description}
                  className="flex items-center justify-between min-h-[44px] rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm">{sc.description}</span>
                  <div className="flex items-center gap-1">
                    {sc.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <kbd className="rounded border bg-muted px-2 py-1 text-xs font-mono shadow-sm">
                          {k}
                        </kbd>
                        {i < sc.keys.length - 1 && (
                          <span className="text-muted-foreground text-xs">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminAuthGuard>
  );
}
