"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWs } from "@/lib/ws-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { getNotificationMeta, getNotificationHref } from "@/lib/notifications-meta";
import { useRouter } from "next/navigation";
import type { NotificationOut } from "@/types/api.generated";
import { Button } from "@/components/ui/button";

interface WsIncomingMessage {
  type?: string;
  data?: NotificationOut | Partial<NotificationOut>;
  /** الصيغة الفعلية للخادم: الإشعار يُدفع ككائن مباشر على المستوى الأعلى */
  notification_type?: string;
  title?: string;
  body?: string;
}

/**
 * يستخرج كائن الإشعار من رسالة WS خام.
 *
 * الصيغتان المدعومتان (تحقّق فعلي بالجولة 6):
 *  1) الصيغة الفعلية للخادم الحالي: كائن NotificationOut مباشرةً
 *     {id, user_id, title, body, notification_type, data, is_read, created_at}
 *  2) صيغة مغلّفة احتياطية: {type:"notification", data:{...NotificationOut}}
 * رسالة التحية {type:"hello", user_id} تُتجاهل.
 */
function extractNotification(raw: unknown): NotificationOut | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as WsIncomingMessage;
  // تحية الاتصال من الخادم — ليست إشعاراً
  if (msg.type === "hello") return null;
  // صيغة مغلّفة (توافق مستقبلي)
  if (msg.type === "notification" && msg.data?.notification_type) {
    return msg.data as NotificationOut;
  }
  // الصيغة المباشرة الفعلية: notification_type + title في المستوى الأعلى
  if (msg.notification_type && typeof msg.title === "string") {
    return msg as unknown as NotificationOut;
  }
  return null;
}

/**
 * NotificationsProvider — يدير دورة حياة WebSocket للمستخدم الحالي.
 *
 *  - عند أي دخول ناجح (توكن موجود): يتصل بـ wss://.../ws/notifications?token=
 *  - يستمع لرسائل الإشعارات (كائن مباشر أو مغلّف — انظر extractNotification)
 *  - عند الاستقبال: يُحدّث React Query (invalidate notifications + unread-count)
 *  - يعرض toast فوري بالعنوان + المحتوى + زر «عرض» يُنقل حسب نوع الإشعار
 *  - عند تسجيل الخروج: يقطع الاتصال فوراً.
 *
 * يُوضع في providers.tsx خارج BrowserRouter — لا حاجة لأي props.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const customerAuth = useCustomerAuth();
  const ownerAuth = useOwnerAuth();
  const adminAuth = useAdminAuth();

  // نختار التوكن الفعّال — العميل أولاً، ثم المالك، ثم المشرف.
  const activeToken =
    customerAuth.accessToken ?? ownerAuth.accessToken ?? adminAuth.accessToken ?? null;

  const isHydrated =
    customerAuth.hydrated && ownerAuth.hydrated && adminAuth.hydrated;

  useEffect(() => {
    if (!isHydrated) return;
    if (!activeToken) {
      // تسجيل خروج (أو زائر): نقطع أي اتصال سابق.
      notificationWs.disconnect();
      return;
    }
    // تسجيل دخول: نفتح الاتصال بالتوكن الحالي.
    notificationWs.connect(activeToken);

    const offMessage = notificationWs.onMessage((raw) => {
      const n = extractNotification(raw);
      if (!n) return;
      // 1) حدّث React Query cache (invalidate كلا الاستعلامين)
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // 2) اعرض toast فوري بالعنوان + المحتوى + زر «عرض» يُنقل حسب النوع
      const meta = getNotificationMeta(n.notification_type);
      const Icon = meta.icon;
      const href = getNotificationHref(n.notification_type, n.data ?? null);
      toast({
        title: (
          <span className="flex items-center gap-2">
            <Icon
              className={`h-4 w-4 ${meta.colorClass}`}
              aria-hidden="true"
            />
            <span>{n.title}</span>
          </span>
        ),
        description: n.body,
        action: href ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => router.push(href)}
          >
            عرض
          </Button>
        ) : undefined,
      });
    });

    return () => {
      offMessage();
    };
  }, [activeToken, isHydrated, qc, toast, router]);

  return <>{children}</>;
}
