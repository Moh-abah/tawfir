"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import type { NotificationOut, Paginated } from "@/types/api.generated";

/** GET /notifications — قائمة إشعاراتي بترقيم صفحات. */
export function useNotifications(page = 1, unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", page, unreadOnly],
    queryFn: async () => {
      const res = await notificationService.getNotifications({
        page,
        page_size: 20,
        unread_only: unreadOnly,
      });
      // عند عدم تسجيل الدخول نُرجع نتيجة فارغة بدل رمي.
      return (
        res ?? {
          items: [] as NotificationOut[],
          total: 0,
          page: 1,
          pages: 0,
        } satisfies Paginated<NotificationOut>
      );
    },
    staleTime: 30 * 1000,
  });
}
