"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
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
import { useMarkRead } from "@/hooks/useMarkRead";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import {
  getNotificationMeta,
  formatRelativeTime,
  getNotificationHref,
} from "@/lib/notifications-meta";
import { formatDate } from "@/lib/format";
import { SoundService } from "@/lib/sound-service";
import { cn } from "@/lib/utils";
import type { NotificationOut } from "@/types/api.generated";

type TabKey = "all" | "unread";

export function NotificationsContent() {
  const router = useRouter();
  const { accessToken, hydrated } = useCustomerAuth();
  const [tab, setTab] = useState<TabKey>("all");
  const [page, setPage] = useState(1);
  const unreadOnly = tab === "unread";

  // صوت فتح الإشعارات — مرة واحدة عند فتح الصفحة (الجولة 8)
  useEffect(() => {
    SoundService.play("notification_open");
  }, []);

  const { data: unreadData } = useUnreadCount();
  const { data, isLoading, isFetching, isError } = useNotifications(page, unreadOnly);
  const markRead = useMarkRead();

  const handleTabChange = (v: string) => {
    setTab(v as TabKey);
    setPage(1);
  };

  const count = unreadData?.count ?? 0;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

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
        {count > 0 && (
          <p className="mb-3 text-center text-xs text-muted-foreground">
            لديك {count} إشعار غير مقروء
          </p>
        )}

      <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}
          description={
            unreadOnly
              ? "تم تعليم كل إشعاراتك كمقروءة."
              : "ستظهر هنا إشعارات الطلبات والعضوية والعروض الجديدة."
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((n) => {
              const meta = getNotificationMeta(n.notification_type);
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <Card
                    className={cn(
                      "cursor-pointer overflow-hidden transition-all hover:shadow-md",
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
                            <Badge className="shrink-0 bg-primary text-primary-foreground text-[10px]">
                              جديد
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {n.body}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-muted-foreground/70">
                            {formatDate(n.created_at)}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>

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
