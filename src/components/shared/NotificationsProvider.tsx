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
}

/**
 * NotificationsProvider — يدير دورة حياة WebSocket للمستخدم الحالي.
 *
 *  - عند أي دخول ناجح (توكن موجود): يتصل بـ wss://.../ws/notifications?token=
 *  - يستمع للرسائل من نوع {type:"notification", data:{...}}
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
      const msg = raw as WsIncomingMessage;
      if (msg?.type !== "notification" || !msg.data) return;
      const n = msg.data as NotificationOut;
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
