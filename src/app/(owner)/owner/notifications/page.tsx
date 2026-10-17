"use client";

/**
 * صفحة إشعارات بوابة المالك — /owner/notifications
 * ═══════════════════════════════════════════════════════════════
 * إصلاح 404 مؤكد حياً: زر «عرض كل الإشعارات» في جرس بوابة المالك
 * كان يوجّه إلى /notifications — وهي صفحة بوابة العميل على الدومين
 * الرئيسي حصراً؛ على دومين facility. كانت تعيد 404.
 *
 * هذه الصفحة تعيد استخدام نفس خدمات الإشعارات (notificationService
 * واعية بالبوابة — الجرس يعمل بها على بوابة المالك أصلاً) مع:
 *  - تجميع زمني (اليوم/أمس/أقدم) بنفس نمط صفحة العميل
 *  - تعليم مقروء عند النقر + تنقل واعٍ بالدور (owner) عبر
 *    getNotificationHref — طلبات المالك تذهب لطلبات متجره
 *  - تعليم الكل كمقروء + ترقيم صفحات (الأحدث أولاً)
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { useMarkRead, useMarkAllRead } from "@/hooks/useMarkRead";
import {
  getNotificationMeta,
  formatRelativeTime,
  getNotificationHref,
  getNotificationDateGroup,
  inferRoleFromPath,
  NOTIFICATION_DATE_GROUP_LABELS,
} from "@/lib/notifications-meta";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import type { NotificationOut } from "@/types/api.generated";

export default function OwnerNotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useNotifications(page, false);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;

  /* تجميع زمني متتالٍ — نفس منطق جرس الإشعارات وصفحة العميل */
  const grouped = useMemo(() => {
    const groups: Array<{ key: "today" | "yesterday" | "older"; items: NotificationOut[] }> = [];
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
    const href = getNotificationHref(
      n.notification_type,
      n.data ?? null,
      inferRoleFromPath(),
    );
    if (href) router.push(href);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-10 pt-4">
      {/* الرأس */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-black text-foreground">الإشعارات</h1>
            <p className="text-[11px] text-muted-foreground">
              كل ما يخص متجرك — الطلبات، الاعتماد، العروض
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full"
          disabled={markAllRead.isPending || (data?.total ?? 0) === 0}
          onClick={() => {
            haptic("light");
            markAllRead.mutate();
          }}
        >
          {markAllRead.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
          )}
          تعليم الكل كمقروء
        </Button>
      </div>

      {/* المحتوى */}
      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-6 text-center"
        >
          <p className="text-sm font-bold text-destructive">
            تعذّر تحميل الإشعارات — تحقق من اتصالك ثم أعد المحاولة
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => router.refresh()}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Bell className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-foreground">لا توجد إشعارات بعد</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            ستظهر هنا إشعارات الطلبات الجديدة واعتماد منشأتك والعروض — لا تحتاج لفعل شيء
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.key} aria-label={NOTIFICATION_DATE_GROUP_LABELS[group.key]}>
              <div className="mb-1.5 flex items-center justify-between border-b border-border/40 px-1 pb-1.5">
                <span className="text-[11px] font-black tracking-wide text-muted-foreground">
                  {NOTIFICATION_DATE_GROUP_LABELS[group.key]}
                </span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                  {group.items.length.toLocaleString("ar-EG")}
                </span>
              </div>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                {group.items.map((n) => {
                  const meta = getNotificationMeta(n.notification_type);
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3.5 text-right transition-colors hover:bg-muted/50 active:bg-muted/60 native-tap",
                          !n.is_read && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            meta.bgClass,
                          )}
                        >
                          <Icon className={cn("h-4.5 w-4.5", meta.colorClass)} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="line-clamp-1 text-sm font-bold text-foreground">{n.title}</p>
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

          {/* ترقيم الصفحات */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                السابق
              </Button>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {page} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
