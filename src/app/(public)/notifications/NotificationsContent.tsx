"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useMarkRead, useMarkAllRead } from "@/hooks/useMarkRead";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import {
  getNotificationMeta,
  formatRelativeTime,
  getNotificationHref,
  getNotificationCategory,
  getNotificationDateGroup,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_DATE_GROUP_LABELS,
  type NotificationCategory,
} from "@/lib/notifications-meta";
import { formatDate } from "@/lib/format";
import { SoundService } from "@/lib/sound-service";
import { cn } from "@/lib/utils";
import type { NotificationOut } from "@/types/api.generated";

type TabKey = "all" | "unread";
type CategoryFilter = NotificationCategory | "all";

export function NotificationsContent() {
  const router = useRouter();
  const { accessToken, hydrated } = useCustomerAuth();
  const [tab, setTab] = useState<TabKey>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [page, setPage] = useState(1);
  const unreadOnly = tab === "unread";

  // صوت فتح الإشعارات — مرة واحدة عند فتح الصفحة (الجولة 8)
  useEffect(() => {
    SoundService.play("notification_open");
  }, []);

  const { data: unreadData } = useUnreadCount();
  const { data, isLoading, isFetching, isError } = useNotifications(page, unreadOnly);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleTabChange = (v: string) => {
    setTab(v as TabKey);
    setPage(1);
  };

  const handleCategoryChange = (c: CategoryFilter) => {
    setCategory(c);
  };

  const count = unreadData?.count ?? 0;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

  /* الفلترة بالفئة تجري على العميل (بيانات الصفحة الحالية) — لا تُغيّر
     الصفحة: تبديل الفئة أثناء تصفح صفحة متقدمة يُربك، والأقسام التاريخية
     تعرض ما يخصها من نفس الصفحة. */
  const filtered = useMemo(
    () =>
      category === "all"
        ? items
        : items.filter(
            (n) => getNotificationCategory(n.notification_type) === category,
          ),
    [items, category],
  );

  /* تجميع تاريخي: اليوم / أمس / أقدم — بترتيب ظهور أول عنصر من كل قسم
     (الـAPI يرجع الأحدث أولاً). */
  const grouped = useMemo(() => {
    const groups: Array<{
      key: "today" | "yesterday" | "older";
      items: NotificationOut[];
    }> = [];
    for (const n of filtered) {
      const g = getNotificationDateGroup(n.created_at);
      const last = groups[groups.length - 1];
      if (last && last.key === g) last.items.push(n);
      else groups.push({ key: g, items: [n] });
    }
    return groups;
  }, [filtered]);

  const handleClick = (n: NotificationOut) => {
    if (!n.is_read) markRead.mutate(n.id);
    const href = getNotificationHref(n.notification_type, n.data ?? null);
    if (href) router.push(href);
  };

  // جرس الإشعارات — فقط للمستخدمين المسجّلين بعد الترطيب
  const showBell = hydrated && !!accessToken;

  return (
    <>
      <ScreenHeader title="الإشعارات" fallbackHref="/">
        {showBell && <NotificationBell />}
      </ScreenHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 sm:py-8" dir="rtl">
        {/* شريط الحالة + تعليم الكل كمقروء */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {count > 0
              ? `لديك ${count} إشعار غير مقروء`
              : "كل إشعاراتك مقروءة"}
          </p>
          {count > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 gap-1.5 rounded-full px-3 text-xs font-bold native-tap"
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

      <Tabs value={tab} onValueChange={handleTabChange} className="mb-3">
        <TabsList className="grid w-full grid-cols-2 rounded-full">
          <TabsTrigger value="all" className="rounded-full">
            الكل
          </TabsTrigger>
          <TabsTrigger value="unread" className="rounded-full">
            غير المقروء
            {count > 0 && (
              <Badge className="ms-1.5 h-5 min-w-5 px-1 text-[10px] tabular-nums">
                {count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* رقائق فلترة الفئة — الطلبات / العروض / العضوية / النظام */}
      <div
        className="mb-5 flex gap-2 overflow-x-auto pb-1 no-mobile-scrollbar"
        role="group"
        aria-label="تصفية الإشعارات حسب الفئة"
      >
        <button
          type="button"
          onClick={() => handleCategoryChange("all")}
          aria-pressed={category === "all"}
          className={cn(
            "native-tap shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
            category === "all"
              ? "border-primary bg-primary text-primary-foreground shadow-soft-sm"
              : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          الكل
        </button>
        {NOTIFICATION_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => handleCategoryChange(c.key)}
            aria-pressed={category === c.key}
            className={cn(
              "native-tap shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
              category === c.key
                ? "border-primary bg-primary text-primary-foreground shadow-soft-sm"
                : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="flex gap-3 p-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Bell}
          title="تعذّر تحميل الإشعارات"
          description="تأكد من اتصالك بالإنترنت ثم أعد المحاولة."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            category !== "all"
              ? "لا توجد إشعارات في هذه الفئة"
              : unreadOnly
                ? "لا توجد إشعارات غير مقروءة"
                : "لا توجد إشعارات"
          }
          description={
            category !== "all"
              ? "جرّب فئة أخرى أو اعرض كل الإشعارات."
              : unreadOnly
                ? "تم تعليم كل إشعاراتك كمقروءة."
                : "ستظهر هنا إشعارات الطلبات والعضوية والعروض الجديدة."
          }
        />
      ) : (
        <>
          {grouped.map((group) => (
            <section key={group.key} className="mb-5" aria-label={NOTIFICATION_DATE_GROUP_LABELS[group.key]}>
              {/* عنوان القسم التاريخي */}
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                  {NOTIFICATION_DATE_GROUP_LABELS[group.key]}
                </h2>
                <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                  {group.items.length}
                </span>
              </div>
              <ul className="space-y-2">
                {group.items.map((n) => {
                  const meta = getNotificationMeta(n.notification_type);
                  const Icon = meta.icon;
                  const href = getNotificationHref(n.notification_type, n.data ?? null);
                  return (
                    <li key={n.id}>
                      <Card
                        className={cn(
                          "group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.995]",
                          !n.is_read && "border-primary/30 bg-primary/5"
                        )}
                      >
                        <CardContent
                          className="flex gap-3 p-4"
                          onClick={() => handleClick(n)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleClick(n);
                            }
                          }}
                        >
                          <span
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                              meta.bgClass
                            )}
                          >
                            <Icon
                              className={cn("h-6 w-6", meta.colorClass)}
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-1 text-sm font-bold text-foreground">
                                {n.title}
                              </h3>
                              {!n.is_read && (
                                <span
                                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                  aria-label="غير مقروء"
                                />
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {n.body}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[11px] text-muted-foreground/70">
                                {formatDate(n.created_at)}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground/70">
                                {formatRelativeTime(n.created_at)}
                              </p>
                            </div>
                          </div>
                          {/* سهم التنقل — يظهر عند التحويم على العناصر القابلة للفتح */}
                          {href && (
                            <ChevronLeft
                              className="mt-1 h-4 w-4 shrink-0 self-start text-muted-foreground/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* ترقيم صفحات بسيط */}
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full min-h-[40px]"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحة {page} من {pages} ({total})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full min-h-[40px]"
                disabled={page >= pages || isFetching}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
