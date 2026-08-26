/**
 * خدمة الإشعارات — الجولة 3.
 *
 * كل المسارات تعمل عبر بوابات العميل/المالك/المشرف — الباك إند يصدر الإشعارات
 * حسب المستلم (user_id) بغضّ النظر عن نوع التوكن. لذلك نُوجَّه كل طلب للبوابة
 * الصالحة للمستخدم الحالي:
 *  - العميل: customerApiClient (tawfir_customer_token)
 *  - المالك/المشرف: apiClient/ownerApiClient (تشارك نفس الآلية)
 *
 * للتسهيل: نختار العميل إن وُجد توكنه، وإلا المالك، وإلا المشرف. عند فشل إحداها
 * نحاول الأخرى. إن لم يُسجّل أيّها، نُرجع Promise.resolve(null) بدل رمي 401.
 */
import { customerApiClient } from "./customer-api-client";
import { apiClient } from "./api-client";
import type {
  NotificationOut,
  Paginated,
  UnreadCountOut,
  FcmTokenRegister,
  FcmTokenOut,
  FcmTokenDelete,
  MessageOut,
} from "@/types/api.generated";

function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_customer_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getOwnerToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_owner_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_admin_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** يختار البوابة الفعّالة. يُرجع 'none' إن لم يُسجّل أيّها. */
function pickGateway(): "customer" | "owner" | "admin" | "none" {
  if (getCustomerToken()) return "customer";
  if (getOwnerToken()) return "owner";
  if (getAdminToken()) return "admin";
  return "none";
}

async function gatewayGet<T>(url: string): Promise<T | null> {
  const gw = pickGateway();
  if (gw === "none") return null;
  const client = gw === "customer" ? customerApiClient : apiClient;
  return client.get<T>(url);
}

async function gatewayPatch<T>(url: string, body?: unknown): Promise<T | null> {
  const gw = pickGateway();
  if (gw === "none") return null;
  const client = gw === "customer" ? customerApiClient : apiClient;
  return client.patch<T>(url, body);
}

async function gatewayPost<T>(url: string, body?: unknown): Promise<T | null> {
  const gw = pickGateway();
  if (gw === "none") return null;
  const client = gw === "customer" ? customerApiClient : apiClient;
  return client.post<T>(url, body);
}

async function gatewayDelete<T>(url: string, body?: unknown): Promise<T | null> {
  const gw = pickGateway();
  if (gw === "none") return null;
  // apiClient.delete لا يقبل body — نوظّف post عبر DELETE يدوياً عند الحاجة.
  // لـ /fcm/token DELETE نحتاج body — نستخدم fetchWithAuth غير مباشر:
  // فعلياً apiClient.delete لا يمرر body. سنمرّر التوكن في query بدلاً من body
  // لتفادي هذا القيد. لكن الباك إند يطلب body — لذا نستخدم POST زائف عبر apiClient
  // مع method=DELETE غير ممكن. الحل: نستخدم fetch مباشرة.
  if (body === undefined) return apiClient.delete<T>(url);
  // استدعاء fetch مباشر مع body (DELETE + body غير شائع لكن مسموح).
  if (typeof window === "undefined") return null;
  const token = getCustomerToken() ?? getOwnerToken() ?? getAdminToken();
  if (!token) return null;
  const res = await fetch(`/api${url}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  return (isJson ? await res.json().catch(() => null) : null) as T | null;
}

export interface NotificationListParams {
  page?: number;
  page_size?: number;
  unread_only?: boolean;
}

export const notificationService = {
  /** قائمة إشعاراتي. GET /notifications. */
  getNotifications: (params: NotificationListParams = {}) => {
    const q = new URLSearchParams();
    if (params.unread_only) q.set("unread_only", "true");
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    return gatewayGet<Paginated<NotificationOut>>(`/notifications?${q.toString()}`);
  },

  /** عدّاد غير المقروء. GET /notifications/unread-count. */
  getUnreadCount: () =>
    gatewayGet<UnreadCountOut>("/notifications/unread-count"),

  /** تعليم إشعار كمقروء. PATCH /notifications/{id}/read. */
  markRead: (id: number) =>
    gatewayPatch<NotificationOut>(`/notifications/${id}/read`),

  /** تعليم كل الإشعارات كمقروءة. PATCH /notifications/read-all. */
  markAllRead: () =>
    gatewayPatch<UnreadCountOut>("/notifications/read-all"),

  /** تسجيل توكن FCM. POST /fcm/token. */
  registerFcmToken: (data: FcmTokenRegister) =>
    gatewayPost<FcmTokenOut>("/fcm/token", data),

  /** حذف توكن FCM. DELETE /fcm/token (مع body). */
  unregisterFcmToken: (data: FcmTokenDelete) =>
    gatewayDelete<MessageOut>("/fcm/token", data),
};
