"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useRegisterFcm, useUnregisterFcm } from "@/hooks/useFcm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  getFcmMessaging,
  getFcmToken,
  subscribeFcmMessages,
  subscribeFcmTokenRefresh,
  isFcmSupported,
} from "@/lib/firebase";
import {
  SoundService,
  ALL_SOUND_TYPES,
  type SoundRole,
  type SoundType,
} from "@/lib/sound-service";
import { isNativePlatform, getNativeFcmToken } from "@/lib/capacitor";
import {
  getNotificationMeta,
  getNotificationHref,
} from "@/lib/notifications-meta";
import type { MessagePayload } from "firebase/messaging";

/**
 * FcmRegistrar — يدير تسجيل/إلغاء توكن FCM الحقيقي + الإشعارات الأمامية.
 *
 * ============ تسجيل/إلغاء التوكن ============
 *  - عند الدخول (توكن موجود): يطلب إذن الإشعارات من المتصفح
 *    (Notification.requestPermission()). إن مُنح (permission === "granted")
 *    يطلب توكن FCM الحقيقي عبر Firebase (`getToken(messaging, { vapidKey })`)،
 *    يخزّنه في sessionStorage، ويُسجّله عبر POST /fcm/token مرة واحدة لكل
 *    جلسة (نتحقق من sessionStorage لتفادي التكرار عبر تحديثات الصفحة).
 *  - عند الخروج (activeToken === null): يقرأ التوكن المخزّن، يُلغيه عبر
 *    DELETE /fcm/token، ويمسحه من sessionStorage، ويُوقف اشتراك onMessage.
 *
 *  كل العمليات مُغلّفة بـ try/catch: إن فشل Firebase/المتصفح غير مدعوم/
 *  الإذن مرفوض ← يُتخطّى التسجيل بصمت دون تعطيل بقية التطبيق.
 *
 * ============ الإشعارات الأمامية (foreground) ============
 *  - عند كل جلسة دخول نشطة: يشترك في `onMessage(messaging, cb)` عبر
 *    `subscribeFcmMessages(...)`.
 *  - إصلاح onTokenRefresh: يشترك في `onTokenRefresh(messaging, cb)` عبر
 *    `subscribeFcmTokenRefresh(...)` — عند تجدّد توكن FCM أثناء الجلسة
 *    يطلب توكناً جديداً ويُعيد تسجيله في الباك إند ويحذف تسجيل القديم
 *    (كان التوكن المتقادم يبقى مسجلاً فتتوقف الإشعارات بصمت).
 *  - عند وصول رسالة FCM في المقدمة: يستخرج العنوان/المحتوى/النوع
 *    من `payload.notification` أو `payload.data`، يُشغّل الصوت المناسب
 *    (إن كان النوع ضمن أصوات الإشعارات المُبقاة — SoundService)، ويعرض
 *    توست بنمط علامة توفير (أيقونة ملوّنة + زر «عرض» يُنقل للرابط المناسب).
 *  - يُزامن التشغيل الصوتي مع نظام الأصوات المركزي (SoundService.play)
 *    ويمنع الازدواجية مع التوست المركزي عبر `sound: "none"`.
 *
 * ملاحظة: الإشعارات الخلفية (التطبيق مغلق/بالخلفية) يعرضها
 * /firebase-messaging-sw.js (Service Worker منفصل بـ importScripts compat).
 */

const FCM_TOKEN_KEY = "tawfir_fcm_token";

/* ── مساعدات sessionStorage (تفادي إعادة التسجيل عبر تحديث الصفحة) ── */

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FCM_TOKEN_KEY, token);
  } catch {
    /* وضع التصفّح الخاص أو امتلاء التخزين — لا يُعطّل الدخول */
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

/* ── إزالة تكرار رسائل FCM الأمامية بمعرّف الرسالة (messageId) ── */

/**
 * مجموعة معرّفات الرسائل الفورية المستلمة لمنع عرض التوست مرتين
 * للرسالة نفسها (قد يصل FCM إلى onMessage أكثر من مرة بسبب إعادة
 * محاولة المتصفح أو إعادة تشغيل SW). مُحَدَّدة بـ 50 إدخالاً لتفادي
 * النمو غير المحدود. الترتيب بحسب الإدراج (Set يحفظ الترتيب).
 */
const seenFcmMessageIds = new Set<string>();
const SEEN_FCM_MAX = 50;

function markSeen(id: string | undefined): boolean {
  if (!id) return true; // لا يوجد معرّف — نسمح بالعرض (لا مكرّر معروف)
  if (seenFcmMessageIds.has(id)) return false;
  if (seenFcmMessageIds.size >= SEEN_FCM_MAX) {
    // نُفرّغ النصف الأقدم لتفادي النمو غير المحدود
    const half = Math.ceil(SEEN_FCM_MAX / 2);
    let i = 0;
    for (const v of seenFcmMessageIds) {
      seenFcmMessageIds.delete(v);
      if (++i >= half) break;
    }
  }
  seenFcmMessageIds.add(id);
  return true;
}

/* ── المكون ─────────────────────────────────────────────────────── */

export function FcmRegistrar({ children }: { children: React.ReactNode }) {
  const customerAuth = useCustomerAuth();
  const ownerAuth = useOwnerAuth();
  const adminAuth = useAdminAuth();

  // نختار التوكن الفعّال — العميل أولاً، ثم المالك، ثم المشرف.
  const activeToken =
    customerAuth.accessToken ??
    ownerAuth.accessToken ??
    adminAuth.accessToken ??
    null;

  // دور المستمع = مالك التوكن الفعّال (لأولوية «طلب جديد» للمالك + الاهتزاز).
  const activeRole: SoundRole = customerAuth.accessToken
    ? "customer"
    : ownerAuth.accessToken
      ? "owner"
      : "admin";

  const isHydrated =
    customerAuth.hydrated && ownerAuth.hydrated && adminAuth.hydrated;

  const { mutate: registerFcmToken } = useRegisterFcm();
  const { mutate: unregisterFcmToken } = useUnregisterFcm();
  const { toast } = useToast();
  const router = useRouter();

  // نستخدم ref لمنع إعادة التسجيل المتكررة ضمن دورة حياة الدخول الواحدة.
  const attemptedRef = useRef(false);
  // نُحتفظ بدالة إلغاء اشتراك onMessage لتنظيفها عند الخروج/إعادة التسجيل.
  const unsubscribeFcmRef = useRef<(() => void) | null>(null);
  // إلغاء اشتراك onTokenRefresh (إصلاح إعادة الاشتراك عند تجدّد التوكن).
  const unsubscribeTokenRefreshRef = useRef<(() => void) | null>(null);
  // قفل أثناء معالجة تجدد التوكن حتى لا تتزاحم المعالجات.
  const refreshingTokenRef = useRef(false);

  /**
   * معالج رسالة FCM الأمامية — يعرض توست بنمط توفير + يُشغّل الصوت المناسب.
   * يُمرَّر إلى subscribeFcmMessages (داخل useEffect).
   */
  const handleFcmForeground = (payload: MessagePayload) => {
    try {
      // 0) إزالة التكرار بمعرّف رسالة FCM إن وُجد
      if (!markSeen(payload.messageId)) return;

      // 1) استخراج العنوان/المحتوى/النوع — يقبَل صيغتَي notification أو data-only
      const notif = payload.notification;
      const data: Record<string, string> = payload.data ?? {};
      const title: string = notif?.title ?? data.title ?? "توفير";
      const body: string = notif?.body ?? data.body ?? "";
      const type: string = data.notification_type ?? data.type ?? "";

      // 2) بناء كائن data لربط زر «عرض» بالمسار المناسب
      const hrefData: Record<string, unknown> = {};
      if (data.order_id) hrefData.order_id = data.order_id;
      if (data.product_id) hrefData.product_id = data.product_id;
      if (data.facility_id) hrefData.facility_id = data.facility_id;

      // 3) تشغيل الصوت إن كان النوع ضمن الأصوات المُبقاة (SoundService)
      //    يُحترم إعداد المستخدم (مُفعّل/معطّل) + المقدمة فقط + الأولويات.
      const notifIdRaw = data.notification_id ?? data.id;
      const notifIdNum = notifIdRaw ? Number(notifIdRaw) : NaN;
      if (
        type &&
        (ALL_SOUND_TYPES as readonly string[]).includes(type)
      ) {
        SoundService.play(type as SoundType, {
          role: activeRole,
          notificationId: Number.isFinite(notifIdNum) ? notifIdNum : undefined,
        });
      }

      // 4) عرض التوست بنمط علامة توفير (أيقونة ملوّنة + زر «عرض»)
      //    أيقونة + لونها من notifications-meta — لون العلامة (accent-ink/primary)
      //    يُعطي التوست هوية توفير بصرية. التوست نفسه يستخدم bg-background
      //    + text-foreground + border (توكنات العلامة).
      const meta = getNotificationMeta(type);
      const Icon = meta.icon;
      const href = getNotificationHref(type, hrefData);

      toast({
        // صوت الإشعار صدر أعلاه — نمنع التوست المركزي من تشغيل صوته
        sound: "none",
        title: (
          <span className="flex items-center gap-2">
            <Icon
              className={`h-4 w-4 ${meta.colorClass}`}
              aria-hidden="true"
            />
            <span>{title}</span>
          </span>
        ),
        description: body || undefined,
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
    } catch (err) {
      console.warn("[FCM] foreground handler error:", err);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

    // ─── مسار الخروج ─────────────────────────────────────────────
    if (!activeToken) {
      const stored = readStoredToken();
      if (stored) {
        unregisterFcmToken({ token: stored });
        clearStoredToken();
      }
      attemptedRef.current = false;
      // إيقاف اشتراك onMessage و onTokenRefresh عند الخروج
      if (unsubscribeFcmRef.current) {
        try {
          unsubscribeFcmRef.current();
        } catch {
          /* تجاهل */
        }
        unsubscribeFcmRef.current = null;
      }
      if (unsubscribeTokenRefreshRef.current) {
        try {
          unsubscribeTokenRefreshRef.current();
        } catch {
          /* تجاهل */
        }
        unsubscribeTokenRefreshRef.current = null;
      }
      return;
    }

    // ─── مسار الدخول ─────────────────────────────────────────────
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    /* 0) الجولة 22 — استقبال رسائل Push المُحوَّلة من Service Worker:
       عامل /sw.js يستقبل كل رسائل FCM (هو مالك الاشتراك). إن كان
       التطبيق مرئياً يُحوّلها هنا عبر postMessage فنعرض التوست، وإن
       كان بالخلفية يعرضها إشعارَ نظام (شاشة القفل) بنفسه. */
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const onSwMessage = (event: MessageEvent) => {
          const data = event.data as
            | {
                __tawfirPush?: boolean;
                payload?: MessagePayload;
                type?: string;
                url?: unknown;
              }
            | undefined;
          if (data && data.__tawfirPush === true && data.payload) {
            handleFcmForeground(data.payload);
          } else if (
            data &&
            data.type === "tawfir-navigate" &&
            typeof data.url === "string"
          ) {
            router.push(data.url);
          }
        };
        navigator.serviceWorker.addEventListener("message", onSwMessage);
        /* نظّف عند فكّ التركيب — نستخدم دالة التفكيك أدناه أيضاً */
        const prevCleanup = unsubscribeFcmRef.current;
        unsubscribeFcmRef.current = () => {
          navigator.serviceWorker.removeEventListener("message", onSwMessage);
          prevCleanup?.();
        };
      }
    } catch (err) {
      console.warn("[FCM] SW message listener setup failed:", err);
    }

    void (async () => {
      // 1) جهّز Messaging + اشترك في onMessage فوراً (مستقل عن الإذن والتوكن).
      //    لو فشل الإذن لاحقاً يبقى الاشتراك معطّلاً بلا أثر — getToken
      //    فقط يحتاج الإذن، أما onMessage فيعمل بلا إذن صريح طالما المتصفح
      //    يدعم FCM. (في الواقع onMessage يعمل حتى لو رُفض الإذن طالما
      //    التطبيق في المقدمة.)
      // 1.5) إصلاح onTokenRefresh — إعادة الاشتراك عند تجدّد التوكن:
      //      FCM يُجددّ توكن الجهاز أحياناً؛ الاشتراك القديم يصبح غير صالح
      //      فيتوقف وصول الإشعارات بصمت. عند التجدد نطلب توكناً جديداً
      //      ونسجّله في الباك إند ونحذف تسجيل القديم ونحدّث المخزن.
      try {
        if (isFcmSupported()) {
          getFcmMessaging(); // يهيّئ المثيل + يُسجّل SW فوراً عند الحاجة
          /* إصلاح تسريب ذاكرة (التدقيق 3-a / H-1): كانت السطر التالي
             تُعوّض (overwrite) مرجع التفكيك الذي يُزيل مستمع
             navigator.serviceWorker "message" أعلاه — فيبقى المستمع
             القديم حياً على كل دورة دخول/خروج (يتراكم مع إغلاق على
             router/toast قديمين). الحل: تركيب سلسلة التفكيك بدل
             التعويض — كل تفكيك جديد يُنفّذ السابقة ثم يُزيّل المستمع. */
          const prevCleanup = unsubscribeFcmRef.current;
          const unsubFcm = subscribeFcmMessages(handleFcmForeground);
          unsubscribeFcmRef.current = () => {
            unsubFcm();
            prevCleanup?.();
          };
          /* اشتراك onTokenRefresh — إصلاح إعادة الاشتراك عند التجدد */
          unsubscribeTokenRefreshRef.current = subscribeFcmTokenRefresh(() => {
            if (refreshingTokenRef.current) return; /* قفل ضد التزاحم */
            refreshingTokenRef.current = true;
            void (async () => {
              try {
                const oldToken = readStoredToken();
                const newToken = await getFcmToken();
                if (
                  newToken &&
                  newToken !== oldToken
                ) {
                  /* سجّل الجديد ثم احذف القديم من الباك إند */
                  writeStoredToken(newToken);
                  registerFcmToken({
                    token: newToken,
                    device_info: getDeviceInfo(),
                  });
                  if (oldToken) {
                    unregisterFcmToken({ token: oldToken });
                  }
                  console.info(
                    "[FCM] جُدّد توكن FCM وأُعيد تسجيله في الباك إند"
                  );
                }
              } catch (err) {
                console.warn("[FCM] token refresh handling failed:", err);
              } finally {
                refreshingTokenRef.current = false;
              }
            })();
          });
        }
      } catch (err) {
        console.warn("[FCM] onMessage setup failed:", err);
      }

      // 2) اطلب إذن الإشعارات (لا يُطلب التوكن بلا إذن)
      //    إصلاح APK: داخل WebView الكاباسيتور نتجاوز طلب الإذن — الإذن
      //    الأصلي POST_NOTIFICATIONS يطلبه MainActivity نفسه، وواجهة
      //    Notification داخل WebView لا تعمل أصلاً (بلا PushManager).
      const perm = isNativePlatform()
        ? ("granted" as NotificationPermission)
        : await requestNotificationPermission();
      if (perm !== "granted") {
        console.warn("[FCM] إذن الإشعارات لم يُمنح:", perm);
        return;
      }

      // 3) تأكّد من دعم المتصفح لـ FCM (إصلاح APK: الـWebView بلا
      //    PushManager — المسار الأصلي في الخطوة 5 يتجاوز هذا الحرس)
      const nativeToken = await getNativeFcmToken();
      if (!nativeToken && !isFcmSupported()) {
        console.warn("[FCM] المتصفح لا يدعم FCM — يُتخطّى التسجيل");
        return;
      }

      // 4) تجنّب التسجيل المكرر: إن وُجد توكن في sessionStorage فقد سُجّل
      //    في هذه الجلسة (مثلاً بعد تحديث الصفحة) — لا نُكرر.
      const existingToken = readStoredToken();
      if (existingToken) return;

      // 5) اطلب توكن FCM (إصلاح APK): الأصلي أولاً عبر TawfirNative
      //    (WebView لا يدعم PushManager) ثم مسار الويب (getToken+VAPID).
      let token = nativeToken;
      if (!token) token = await getFcmToken();
      if (!token) {
        console.warn(
          "[FCM] لم يُعِد getToken توكناً (قد يكون الإذن مرفوض على مستوى النظام أو فشل SW) — يُتخطّى التسجيل"
        );
        return;
      }

      writeStoredToken(token);
      registerFcmToken({ token, device_info: getDeviceInfo() });
    })();

    return () => {
      // تنظيف عند تغيّر activeToken أو فكّ تركيب المكوّن
      if (unsubscribeFcmRef.current) {
        try {
          unsubscribeFcmRef.current();
        } catch {
          /* تجاهل */
        }
        unsubscribeFcmRef.current = null;
      }
      if (unsubscribeTokenRefreshRef.current) {
        try {
          unsubscribeTokenRefreshRef.current();
        } catch {
          /* تجاهل */
        }
        unsubscribeTokenRefreshRef.current = null;
      }
    };
  }, [activeToken, isHydrated, registerFcmToken, unregisterFcmToken]);

  return <>{children}</>;
}
