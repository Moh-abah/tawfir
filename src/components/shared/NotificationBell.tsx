"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNotifications } from "@/hooks/useNotifications";
import { useMarkRead, useMarkAllRead } from "@/hooks/useMarkRead";
import { getNotificationMeta, formatRelativeTime, getNotificationHref } from "@/lib/notifications-meta";
import { cn } from "@/lib/utils";
import type { NotificationOut } from "@/types/api.generated";

interface NotificationBellProps {
  /** مظهر الجرس — الافتراضي للهيدر/السايدبار الزرّي. */
  variant?: "header" | "sidebar";
  className?: string;
}

/**
 * جرس الإشعارات — الجولة 3.
 *
 *  - أيقونة Bell + badge رقمي بالعدّاد غير المقروء (يختفي عند 0)
 *  - عند النقر: dropdown popover يعرض آخر 5 إشعارات
 *  - زر «تعليم الكل كمقروء»
 *  - زر «عرض الكل» → /notifications
 *  - النقر على إشعار: تعليمه كمقروء + تنقل حسب نوعه
 *  - غير المقروء: خلفية soft (primary/5)
 */
export function NotificationBell({ variant = "header", className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: unreadData, isLoading: unreadLoading } = useUnreadCount();
  const { data: notifsData, isLoading: notifsLoading } = useNotifications(1, false);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const count = unreadData?.count ?? 0;
  const items = notifsData?.items?.slice(0, 5) ?? [];

  const handleClick = (n: NotificationOut) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    const href = getNotificationHref(n.notification_type, n.data ?? null);
    if (href) router.push(href);
  };

  const isSidebar = variant === "sidebar";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative min-h-[44px] min-w-[44px] rounded-full",
            isSidebar && "w-full",
            className
          )}
          aria-label={`الإشعارات${count > 0 ? ` (${count} غير مقروء)` : ""}`}
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -left-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums"
              aria-live="polite"
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[min(360px,calc(100vw-2rem)] p-0"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-bold">الإشعارات</span>
          {count > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 rounded-full px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              تعليم الكل كمقروء
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifsLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const meta = getNotificationMeta(n.notification_type);
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full gap-3 px-3 py-2.5 text-right transition-colors hover:bg-muted/50",
                        !n.is_read && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          meta.bgClass
                        )}
                      >
                        <Icon className={cn("h-4 w-4", meta.colorClass)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="line-clamp-1 text-xs font-bold text-foreground">
                          {n.title}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="غير مقروء"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t p-2">
          <Button
            type="button"
            asChild
            variant="ghost"
            size="sm"
            className="w-full rounded-full min-h-[40px]"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">عرض الكل</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
