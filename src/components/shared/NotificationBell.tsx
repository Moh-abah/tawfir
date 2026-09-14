"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNotifications } from "@/hooks/useNotifications";
import { useMarkRead, useMarkAllRead } from "@/hooks/useMarkRead";
import { getNotificationMeta, formatRelativeTime, getNotificationHref, getNotificationDateGroup, NOTIFICATION_DATE_GROUP_LABELS } from "@/lib/notifications-meta";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import type { NotificationOut } from "@/types/api.generated";

interface NotificationBellProps {
  /** مظهر الجرس — الافتراضي للهيدر/السايدبار الزرّي. */
  variant?: "header" | "sidebar";
  className?: string;
}

/**
 * جرس الإشعارات — responsive by design:
 *
 *  • الموبايل (< 768px): Drawer سفلي نيتف (vaul) — مقبض سحب، انزلاق
 *    من الأسفل، عرض كامل الشاشة بحواف مستديرة، safe-area سفلية —
 *    إحساس تطبيق أصيل بدل المنبثقة الممتدة.
 *  • الديسكتوب: Popover بعرض ثابت 360px محاذى لليسار.
 *
 *  - أيقونة Bell + badge رقمي بالعدّاد غير المقروء (يختفي عند 0)
 *  - «تعليم الكل كمقروء» + «عرض الكل» → /notifications
 *  - النقر على إشعار: تعليمه كمقروء + تنقل حسب نوعه
 *  - غير المقروء: خلفية soft (primary/5)
 */
export function NotificationBell({ variant = "header", className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: unreadData, isLoading: unreadLoading } = useUnreadCount();
  const { data: notifsData, isLoading: notifsLoading } = useNotifications(1, false);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const count = unreadData?.count ?? 0;
  const items = notifsData?.items?.slice(0, isMobile ? 8 : 5) ?? [];

  /* الجولة 27 — تجميع زمني (اليوم/أمس/أقدم) بعناوين لاصقة داخل الدرج،
   * بنفس منطق صفحة الإشعارات المطوّرة (الجولة 3). القائمة من الخادم
   * مرتبة من الأحدث — التجميع المتتالي يحافظ على الترتيب في كل الأحوال. */
  const grouped = useMemo(() => {
    const groups: {
      key: "today" | "yesterday" | "older";
      items: NotificationOut[];
    }[] = [];
    for (const n of items) {
      const g = getNotificationDateGroup(n.created_at);
      const last = groups[groups.length - 1];
      if (last && last.key === g) last.items.push(n);
      else groups.push({ key: g, items: [n] });
    }
    return groups;
  }, [items]);

  const handleClick = (n: NotificationOut) => {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    const href = getNotificationHref(n.notification_type, n.data ?? null);
    if (href) router.push(href);
  };

  const isSidebar = variant === "sidebar";
  void unreadLoading;

  /* ─── الزر المشترك (الجرس + العدّاد) ─── */
  const bellButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "relative min-h-[44px] min-w-[44px] rounded-full transition-colors hover:bg-muted/70",
        isSidebar && "w-full",
        className
      )}
      aria-label={`الإشعارات${count > 0 ? ` (${count} غير مقروء)` : ""}`}
      aria-expanded={open}
      onClick={() => haptic("light")}
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
  );

  /* ─── رأس اللوحة المشترك ─── */
  const sheetHeader = (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-foreground">الإشعارات</span>
        {count > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      {count > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 gap-1 rounded-full px-3 text-xs"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          {markAllRead.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
          )}
          تعليم الكل كمقروء
        </Button>
      )}
    </div>
  );

  /* ─── قائمة الإشعارات المشتركة ─── */
  const sheetList = (
    <div
      className={cn(
        "overflow-y-auto no-mobile-scrollbar",
        isMobile ? "max-h-[52vh]" : "max-h-96"
      )}
    >
      {notifsLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-foreground">لا توجد إشعارات بعد</p>
          <p className="text-xs text-muted-foreground">
            ستظهر هنا تحديثات طلباتك وعروضك الحصرية
          </p>
        </div>
      ) : (
        <div>
          {grouped.map((group) => (
            <section
              key={group.key}
              aria-label={NOTIFICATION_DATE_GROUP_LABELS[group.key]}
            >
              {/* عنوان المجموعة اللاصق — يبقى ظاهراً أثناء تمرير القائمة */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card/95 px-4 py-1.5 backdrop-blur-sm">
                <span className="text-[11px] font-black tracking-wide text-muted-foreground">
                  {NOTIFICATION_DATE_GROUP_LABELS[group.key]}
                </span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                  {group.items.length.toLocaleString("ar-EG")}
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {group.items.map((n) => {
                  const meta = getNotificationMeta(n.notification_type);
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/50 active:bg-muted/60",
                          !n.is_read && "bg-primary/5"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            meta.bgClass
                          )}
                        >
                          <Icon className={cn("h-4.5 w-4.5", meta.colorClass)} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="line-clamp-1 text-[13px] font-bold text-foreground">
                            {n.title}
                          </p>
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-label="غير مقروء"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );

  /* ─── تذييل «عرض الكل» المشترك ─── */
  const sheetFooter = (
    <div
      className={cn(
        "border-t border-border/60 p-3",
        isMobile &&
          "pb-[max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px))]"
      )}
    >
      <Button
        type="button"
        asChild
        variant="outline"
        size="sm"
        className="w-full rounded-full min-h-[44px] font-bold"
        onClick={() => setOpen(false)}
      >
        <Link href="/notifications">عرض كل الإشعارات</Link>
      </Button>
    </div>
  );

  /* ─── الموبايل: Drawer سفلي نيتف ─── */
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} repositionInputs={false}>
        <DrawerTrigger asChild>{bellButton}</DrawerTrigger>
        <DrawerContent
          dir="rtl"
          className="mx-auto max-w-lg rounded-t-3xl border-t border-border/60 bg-card"
        >
          {/* عنوان وصولي مخفي + زر إغلاق صريح للموبايل */}
          <div className="sr-only">
            <DrawerTitle>الإشعارات</DrawerTitle>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors active:bg-muted native-tap"
            aria-label="إغلاق الإشعارات"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          {sheetHeader}
          {sheetList}
          {sheetFooter}
        </DrawerContent>
      </Drawer>
    );
  }

  /* ─── الديسكتوب: Popover كلاسيكي ─── */
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-90 p-0"
        dir="rtl"
      >
        {sheetHeader}
        {sheetList}
        {sheetFooter}
      </PopoverContent>
    </Popover>
  );
}
