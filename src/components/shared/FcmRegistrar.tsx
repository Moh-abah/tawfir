"use client";

import { useEffect, useRef } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useRegisterFcm, useUnregisterFcm } from "@/hooks/useFcm";

/**
 * FcmRegistrar — يدير تسجيل/إلغاء توكن FCM حسب حالة الدخول.
 *
 * - عند الدخول (توكن موجود): يطلب إذن الإشعارات من المتصفح
 *   (Notification.requestPermission()). إن مُنح (permission === "granted")
 *   يُولّد pseudo-token فريد للجلسة، يخزّنه في sessionStorage، ويُسجّله عبر
 *   POST /fcm/token مرة واحدة لكل جلسة (نتحقق من sessionStorage لتفادي
 *   التكرار عبر تحديثات الصفحة في نفس التبويب).
 * - عند الخروج (activeToken === null): يقرأ التوكن المخزّن، يُلغيه عبر
 *   DELETE /fcm/token، ويمسحه من sessionStorage.
 *
 * ملاحظة مهمة: مكتبة `firebase` غير مُثبّتة في المشروع، لذا لا يمكن توليد
 * توكن FCM حقيقي عبر `firebase/messaging`. هذا المكوّن يُسجّل pseudo-token
 * للتحقق من أن مسار /fcm/token يعمل من البداية للنهاية (تسجيل + حذف)،
 * والـ WebSocket (notificationWs) يكفي للإشعارات الفورية أثناء استخدام
 * التطبيق. انظر BLOCKERS.md لخطة الترقية لـ FCM حقيقي.
 */
const FCM_TOKEN_KEY = "tawfir_fcm_token";

function generatePseudoToken(): string {
  return `tawfir-web-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    // وضع التصفّح الخاص أو امتلاء التخزين — نُرجع null بأمان
    return null;
  }
}

function writeStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FCM_TOKEN_KEY, token);
  } catch {
    /* تجاهل أخطاء الحصة/الوضع الخاص — لا يُعطّل الدخول */
  }
}

function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
}

function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent;
}

async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === "undefined") return null;
  if (typeof Notification === "undefined") return null;
  try {
    return await Notification.requestPermission();
  } catch {
    return null;
  }
}

export function FcmRegistrar({ children }: { children: React.ReactNode }) {
  const customerAuth = useCustomerAuth();
  const ownerAuth = useOwnerAuth();
  const adminAuth = useAdminAuth();

  // نختار التوكن الفعّال — العميل أولاً، ثم المالك، ثم المشرف (مثل NotificationsProvider).
  const activeToken =
    customerAuth.accessToken ??
    ownerAuth.accessToken ??
    adminAuth.accessToken ??
    null;

  const isHydrated =
    customerAuth.hydrated && ownerAuth.hydrated && adminAuth.hydrated;

  const { mutate: registerFcmToken } = useRegisterFcm();
  const { mutate: unregisterFcmToken } = useUnregisterFcm();
  // نستخدم ref لمنع إعادة التسجيل المتكررة خلال دورة حياة الدخول الواحدة
  // (حتى قبل أن يُكتب sessionStorage داخل الـ async).
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;

    // ─── مسار الخروج ─────────────────────────────────────────────
    if (!activeToken) {
      const stored = readStoredToken();
      if (stored) {
        unregisterFcmToken({ token: stored });
        clearStoredToken();
      }
      // نُعيد الضبط ليُعاد التسجيل عند دخول لاحق
      attemptedRef.current = false;
      return;
    }

    // ─── مسار الدخول ─────────────────────────────────────────────
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    void (async () => {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        if (perm === "denied" || perm === "default") {
          // مُقبول كمعلومة تشخيصية فقط — لا نُظهر شيئاً للمستخدم
          console.warn("[FCM] إذن الإشعارات لم يُمنح:", perm);
        }
        return;
      }

      // تجنّب التسجيل المكرر: إن وُجد توكن في sessionStorage فقد سُجّل
      // في هذه الجلسة (مثلاً بعد تحديث الصفحة) — لا نُكرر.
      const existingToken = readStoredToken();
      if (existingToken) return;

      // TODO(firebase): استبدال توليد pseudo-token بـ firebase/messaging.getToken(...)
      // انظر BLOCKERS.md لمسار الترقية.
      const token = generatePseudoToken();
      writeStoredToken(token);
      registerFcmToken({ token, device_info: getDeviceInfo() });
    })();
  }, [activeToken, isHydrated, registerFcmToken, unregisterFcmToken]);

  return <>{children}</>;
}
