"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { SoundService, type SoundRole } from "@/lib/sound-service";

/**
 * GET /notifications/unread-count — عدّاد غير المقروء.
 * يُحدّث فورياً من WebSocket (عبر invalidate) + polling كل 30s كاحتياط.
 *
 * الجولة 8 — مسار الصوت الاحتياطي: إذا زاد العدّاد بين استطلاعين
 * (سقوط WebSocket) نجلب أحدث إشعار ونُشغّل صوته. التكرار مع WebSocket
 * ممنوع داخل SoundService بمعرّف الإشعار (notificationId).
 */
export function useUnreadCount(enabled = true) {
  const query = useQuery({
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

  const prevCountRef = useRef<number | null>(null);
  const count = query.data?.count;

  useEffect(() => {
    if (!enabled || typeof count !== "number") return;
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    // أول قراءة (تحميل/دخول) لا تُصوِّت — فقط الزيادة بين استطلاعين
    if (prev === null || count <= prev) return;
    // زيادة: جلب أحدث إشعار وتشغيل صوته (يُتجاهل إن صوّته WebSocket قبلنا)
    notificationService
      .getNotifications({ page: 1, page_size: 1 })
      .then((page) => {
        const latest = page?.items?.[0];
        if (latest) {
          SoundService.playNotification(
            latest,
            detectSoundRole()
          );
        }
      })
      .catch(() => {
        /* فشل الجلب — العدّاد وحده يكفي */
      });
  }, [count, enabled]);

  return query;
}

/**
 * دور المستمع الفعّال — بنفس أسبقية اختيار البوابة في notification.service
 * والـ WebSocket (customer ← owner ← admin حسب توفر الكوكيز).
 */
export function detectSoundRole(): SoundRole {
  if (typeof document === "undefined") return "customer";
  const has = (name: string) =>
    document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));
  if (has("tawfir_customer_token")) return "customer";
  if (has("tawfir_owner_token")) return "owner";
  if (has("tawfir_admin_token")) return "admin";
  return "customer";
}
