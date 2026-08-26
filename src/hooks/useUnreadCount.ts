"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";

/**
 * GET /notifications/unread-count — عدّاد غير المقروء.
 * يُحدّث فورياً من WebSocket (عبر invalidate) + polling كل 30s كاحتياط.
 */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await notificationService.getUnreadCount();
      return res ?? { count: 0 };
    },
    enabled,
    // polling كل 30s كاحتياط خلفي لـ WebSocket
    refetchInterval: 30 * 1000,
    staleTime: 5 * 1000,
  });
}
