"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationWs } from "@/lib/ws-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/hooks/use-toast";
import { getNotificationMeta, getNotificationHref } from "@/lib/notifications-meta";
import { SoundService, type SoundRole } from "@/lib/sound-service";
import { attemptRefresh } from "@/services/token-refresh";
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
 * الجولة 9 (المهمة 9.3) — أنواع إشعارات تغيير حالة الطلب.
 * عند وصول أي منها، ينبغي أن تُنعش صفحة تفاصيل الطلب المفتوحة
 * + قائمة الطلبات. (order_status_changed احتياطية لمستقبل الخادم.)
 */
const ORDER_STATUS_NOTIFICATION_TYPES: ReadonlySet<string> = new Set<
  string
>([
  "order_new",
  "order_confirmed",
  "order_preparing",
  "order_out_for_delivery",
  "order_delivered",
  "order_cancelled",
  "order_status_changed",
]);

/**
 * يستخرج data.order_id بشكل آمن — يقبل number أو string.
 * يُرجع null عند غياب القيمة أو عدم صلاحيتها.
 */
function extractOrderId(
  data: Record<string, unknown> | null
): number | null {
  if (!data) return null;
  const raw = data.order_id;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
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

  // دور المستمع = مالك التوكن الفعّال (لأولوية «طلب جديد» للمالك + الاهتزاز)
  const activeRole: SoundRole = customerAuth.accessToken
    ? "customer"
    : ownerAuth.accessToken
      ? "owner"
      : "admin";

  const isHydrated =
    customerAuth.hydrated && ownerAuth.hydrated && adminAuth.hydrated;

  useEffect(() => {
    if (!isHydrated) return;
    if (!activeToken) {
      // تسجيل خروج (أو زائر): نقطع أي اتصال سابق.
      notificationWs.setAuthRecoveryHandler(null);
      notificationWs.disconnect();
      return;
    }
    // تسجيل دخول: نفتح الاتصال بالتوكن الحالي.
    notificationWs.connect(activeToken);

    /* استشفاء المصادقة (الجولة 25): إخفاقات اتصال متتالية = توكن منتهٍ
       غالباً — نجدّد جلسة الدور الفعّال (عميل ← مالك ← مشرف) ونرجّع
       التوكن الجديد ليعيد الـWS الاتصال فوراً بدل الدوران بالتوكن الميت.
       تحديث المتجر يُعيد تشغيل هذا التأثير بالتوكن الجديد أيضاً. */
    notificationWs.setAuthRecoveryHandler(async () => {
      const tryRole = async (
        hasAccess: boolean,
        role: "customer" | "owner" | "admin",
        getRefresh: () => string | null,
        updateTokens: (access: string, refresh: string) => void,
      ): Promise<string | null> => {
        if (!hasAccess) return null;
        const tokens = await attemptRefresh(role, getRefresh);
        if (!tokens?.access_token) return null;
        const newRefresh = tokens.refresh_token ?? getRefresh();
        if (newRefresh) updateTokens(tokens.access_token, newRefresh);
        return tokens.access_token;
      };
      // نجرّب الدور الفعّال فقط حسب أولوية التوكن الحالي
      if (customerAuth.accessToken) {
        return tryRole(
          true,
          "customer",
          () => useCustomerAuthStore.getState().refreshToken,
          (a, r) => useCustomerAuthStore.getState().updateTokens(a, r),
        );
      }
      if (ownerAuth.accessToken) {
        return tryRole(
          true,
          "owner",
          () => useOwnerAuthStore.getState().refreshToken,
          (a, r) => useOwnerAuthStore.getState().updateTokens(a, r),
        );
      }
      if (adminAuth.accessToken) {
        return tryRole(
          true,
          "admin",
          () => useAuthStore.getState().refreshToken,
          (a, r) => useAuthStore.getState().updateTokens(a, r),
        );
      }
      return null;
    });

    const offMessage = notificationWs.onMessage((raw) => {
      const n = extractNotification(raw);
      if (!n) return;
      // 0) صوت الإشعار — قبل كل شيء (الجولة 8): يجري إسكاته إن كانت
      //    الأصوات موقوفة/التطبيق بالخلفية/صوت آخر يعمل من داخل الخدمة
      SoundService.playNotification(n, activeRole);
      // 1) حدّث React Query cache (invalidate كلا الاستعلامين)
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // 1.5) الجولة 9 (المهمة 9.3) — إن كان إشعار حالة طلب:
      //      انعاش استعلام تفاصيل الطلب المفتوح + قائمة الطلبات.
      //      الصفحة المفتوحة ستعيد الجلب تلقائياً وتتحدث الحالة + شريط
      //      التتبّع + توميض لطيف على البطاقة (OrderDetailContent).
      if (ORDER_STATUS_NOTIFICATION_TYPES.has(n.notification_type)) {
        const orderId = extractOrderId(n.data);
        if (orderId != null) {
          qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
        } else {
          // لم يصل order_id في البيانات — انعاش كل تفاصيل الطلبات المفتوحة
          qc.invalidateQueries({ queryKey: ["order-detail"] });
        }
        // انعاش القائمة (يغطي كل فلاتر status/search عبر prefix match)
        qc.invalidateQueries({ queryKey: ["orders"] });
      }
      // 2) اعرض toast فوري بالعنوان + المحتوى + زر «عرض» يُنقل حسب النوع
      const meta = getNotificationMeta(n.notification_type);
      const Icon = meta.icon;
      const href = getNotificationHref(n.notification_type, n.data ?? null);
      toast({
        // صوت الإشعار صدر أعلاه — التوست هنا بلا صوت مركزي (منع الازدواج)
        sound: "none",
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
  }, [activeToken, activeRole, isHydrated, qc, toast, router]);

  return <>{children}</>;
}
