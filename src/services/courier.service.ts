"use client";

/**
 * courier.service — نداءات بوابة المندوب (عقد openapi.json الحي حرفياً).
 * كل مسار هنا موجود في العقد — صفر اجتهاد خارج العقد (قاعدة §7-1).
 */

import {
  courierApiClient,
  type CourierCallCard,
  type CourierLoginIn,
  type CourierMe,
  type CourierRegisterIn,
  type CourierRegisterOut,
  type CourierTask,
  type CourierTokenPair,
  type DecisionOut,
} from "@/services/courier-api-client";

/* ─── المصادقة ─────────────────────────────────────────── */

export const courierAuthService = {
  login: (body: CourierLoginIn) =>
    courierApiClient.post<CourierTokenPair>("/courier/auth/login", body),
  register: (body: CourierRegisterIn) =>
    courierApiClient.post<CourierRegisterOut>("/courier/auth/register", body),
};

/* ─── الملف والنبضة والتوفر ────────────────────────────── */

export const courierService = {
  me: () => courierApiClient.get<CourierMe>("/courier/me"),

  updateProfile: (body: {
    public_name?: string;
    photo_url?: string;
    region_id?: number;
    preferred_shifts?: string;
  }) => courierApiClient.patch<CourierMe>("/courier/me", body),

  /** النبضة — POST /courier/pulse {lat, lng, battery_level} */
  pulse: (body: {
    lat: number;
    lng: number;
    accuracy_m?: number | null;
    battery_level?: number | null;
  }) => courierApiClient.post<DecisionOut>("/courier/pulse", body),

  /** مفتاح التوفر — POST /courier/availability {available} */
  setAvailability: (body: { available: boolean }) =>
    courierApiClient.post<DecisionOut>("/courier/availability", body),

  /** النداءات الحية — GET /courier/calls (الحجز الأول يفوز) */
  calls: () => courierApiClient.get<CourierCallCard[]>("/courier/calls"),

  /** قبول نداء — POST /courier/tasks/accept {call_id?} */
  acceptCall: (callId?: number) =>
    courierApiClient.post<DecisionOut>("/courier/tasks/accept", {
      call_id: callId ?? null,
    }),

  /** المهمة الجارية — GET /courier/tasks/current */
  currentTask: () =>
    courierApiClient.get<CourierTask>("/courier/tasks/current"),

  /** تفاصيل مهمة — GET /courier/tasks/{id} */
  taskDetail: (taskId: number) =>
    courierApiClient.get<CourierTask>(`/courier/tasks/${taskId}`),

  /** التقدم الإجباري بالترتيب — POST /courier/tasks/{id}/progress */
  progress: (
    taskId: number,
    body: {
      action:
        | "arrived_store"
        | "confirm_pickup"
        | "arrived_customer"
        | "complete_delivery"
        | "problem";
      delivery_code?: string | null;
      problem_type?: string | null;
      problem_description?: string | null;
      receipt_photo_url?: string | null;
    },
  ) =>
    courierApiClient.post<CourierTask>(
      `/courier/tasks/${taskId}/progress`,
      body,
    ),

  /** سجل المهام — GET /courier/tasks?period&status&page */
  tasksHistory: (params?: {
    period?: "all" | "today" | "week" | "month";
    status?: "completed" | "cancelled";
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.period) q.set("period", params.period);
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString();
    return courierApiClient.get<{
      items?: CourierTask[];
      total?: number;
      page?: number;
      pages?: number;
      [k: string]: unknown;
    }>(`/courier/tasks${qs ? `?${qs}` : ""}`);
  },

  /** إحصاءاتي — GET /courier/stats (أرباحي/مهامي/تقييمي) */
  stats: () => courierApiClient.get<Record<string, unknown>>("/courier/stats"),

  /** رفع مستند — POST /courier/documents (multipart) */
  uploadDocument: (file: File, docType: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doc_type", docType);
    return courierApiClient.post<{
      url: string;
      doc_type: string;
      size_bytes: number;
    }>("/courier/documents", fd);
  },

  /** طلب إعادة فحص المستندات — POST /courier/me/documents-recheck */
  requestRecheck: () =>
    courierApiClient.post<{ message?: string }>(
      "/courier/me/documents-recheck",
      {},
    ),
};

/* ─── FCM (جذب المندوب خارج التطبيق) ───────────────────── */

export const courierFcmService = {
  /** POST /fcm/token — عقد FcmTokenRegister حرفياً {token, device_info} */
  registerToken: (token: string, deviceInfo?: string) =>
    courierApiClient.post<unknown>("/fcm/token", {
      token,
      device_info: deviceInfo ?? undefined,
    }),
};
