"use client";

/**
 * courier-api-client — عميل اتصال بوابة المندوب (جزيرة مستقلة §7-2).
 * ═══════════════════════════════════════════════════════════════
 * - كل نداء يمر عبر وكيل Next.js (rewrites): /api/courier/... →
 *   {BASE}/api/v1/courier/... — بلا CORS وبلا كشف قيم حساسة.
 * - 401 → تجديد شفاف (قفل سباق التدوير) → إعادة الطلب → عند الفشل:
 *   خروج حقيقي إلى /courier/login (رسالة عربية + توست).
 * - أخطاء الخادم {detail} العربية تُعرض كما وردت حرفياً (قاعدة §7-7/8).
 * - 422 validation يُفكّ مصفوفة detail إلى رسالة واحدة مقروءة.
 * - 403 لعلم مطفأ أو صلاحية: رسالة واضحة يستهلكها «وضع الانتظار الرشيق».
 */

import { useCourierAuthStore } from "@/store/courierAuth.store";
import { attemptRefresh } from "@/services/token-refresh";
import { toast } from "@/hooks/use-toast";
import type { TokenOut } from "@/types/api.generated";

const API_BASE = "/api";

export class CourierApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "CourierApiError";
    this.status = status;
    this.body = body;
  }
}

/** مسارات الدخول: 401 فيها = بيانات خاطئة (رسالة الخادم كما هي) */
function isAuthEndpoint(url: string): boolean {
  return (
    url.startsWith("/courier/auth/login") ||
    url.startsWith("/courier/auth/register") ||
    url.startsWith("/auth/refresh")
  );
}

/** صفحات المندوب المحمية — انتهاء الجلسة فيها يوجّه للدخول */
const PROTECTED_PREFIXES = [
  "/courier/home",
  "/courier/task",
  "/courier/tasks",
  "/courier/profile",
  "/courier/settings",
];

function isOnProtectedPage(): boolean {
  if (typeof window === "undefined") return false;
  return PROTECTED_PREFIXES.some((p) =>
    window.location.pathname.startsWith(p),
  );
}

function readCourierRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return useCourierAuthStore.getState().refreshToken;
}

function getCourierToken(): string | null {
  if (typeof window === "undefined") return null;
  return useCourierAuthStore.getState().accessToken;
}

function forceLogout(hadSession: boolean): void {
  if (typeof window === "undefined") return;
  useCourierAuthStore.getState().clearAuth();
  if (hadSession) {
    toast({
      title: "انتهت جلسة المندوب",
      description: "يرجى تسجيل الدخول من جديد",
    });
    if (isOnProtectedPage()) {
      window.location.assign("/courier/login?expired=1");
    }
  }
}

async function fetchWithCourierAuth<T>(
  method: string,
  url: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getCourierToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    });
  } catch (networkErr) {
    throw new CourierApiError(
      "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.",
      0,
      networkErr,
    );
  }

  const authEndpoint = isAuthEndpoint(url);

  /* تجديد شفاف عند 401 (خارج مسارات الدخول) */
  if (response.status === 401 && !authEndpoint) {
    if (!retried) {
      const tokens = await attemptRefresh("courier", readCourierRefreshToken);
      if (tokens?.access_token) {
        const newRefresh = tokens.refresh_token ?? readCourierRefreshToken();
        if (newRefresh) {
          useCourierAuthStore
            .getState()
            .updateTokens(tokens.access_token, newRefresh);
          return fetchWithCourierAuth<T>(method, url, body, true);
        }
      }
    }
    forceLogout(Boolean(token));
    throw new CourierApiError(
      "انتهت الجلسة. يرجى تسجيل الدخول مجددًا.",
      401,
      null,
    );
  }

  if (response.status === 403 && !authEndpoint) {
    /* قد يكون علم البوابة مطفأ — وضع الانتظار الرشيق يلتقطها */
    throw new CourierApiError("لا تملك صلاحية الوصول", 403, null);
  }

  if (response.status === 404 && !authEndpoint) {
    throw new CourierApiError("غير موجود", 404, null);
  }

  if (response.status === 429) {
    throw new CourierApiError(
      "عدد كبير من المحاولات، انتظر قليلاً ثم أعد المحاولة",
      429,
      null,
    );
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json") ?? false;
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (
      response.status === 422 &&
      data &&
      typeof data === "object" &&
      "detail" in data
    ) {
      const detail = (data as Record<string, unknown>).detail;
      if (Array.isArray(detail)) {
        const msgs = detail
          .filter(
            (d): d is Record<string, string> =>
              typeof d === "object" && d !== null && "msg" in d,
          )
          .map((d) => d.msg)
          .join("، ");
        throw new CourierApiError(msgs || "بيانات غير صالحة", 422, data);
      }
      if (typeof detail === "string") {
        throw new CourierApiError(detail, 422, data);
      }
    }
    const message =
      (data &&
      typeof data === "object" &&
      "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : null) ??
      `حدث خطأ (${response.status})`;
    throw new CourierApiError(message, response.status, data);
  }

  if (response.status === 204 || data === null) {
    return undefined as T;
  }
  return data as T;
}

export const courierApiClient = {
  get: <T>(url: string) => fetchWithCourierAuth<T>("GET", url),
  post: <T>(url: string, body?: unknown) =>
    fetchWithCourierAuth<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) =>
    fetchWithCourierAuth<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) =>
    fetchWithCourierAuth<T>("PATCH", url, body),
  delete: <T>(url: string) => fetchWithCourierAuth<T>("DELETE", url),
};

/* ─── عقد الأنواع (من openapi.json الحي — 123 مساراً) ─────── */

export interface CourierLoginIn {
  identifier: string;
  password: string;
}

export interface CourierTokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  role?: string;
}

export interface CourierRegisterIn {
  document_full_name: string;
  public_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  vehicle_type?: string;
  vehicle_plate?: string | null;
  license_number?: string | null;
  region_id?: number | null;
  preferred_shifts?: string | null;
  photo_url?: string | null;
  id_document_path?: string | null;
  id_document_type?: string | null;
  id_document_number?: string | null;
  license_path?: string | null;
  vehicle_photo_path?: string | null;
  birth_date?: string | null;
  license_expires_at?: string | null;
}

export interface CourierRegisterOut {
  courier_id: number;
  user_id: number;
  verification_status: string;
  verification_status_ar: string;
  message: string;
}

export interface CourierStats {
  completed_tasks: number;
  service_km: number;
  total_earnings: number;
  active_days: number;
  avg_response_seconds: number | null;
  level: string;
  level_ar: string;
}

export interface CourierMembershipCard {
  membership_number: string | null;
  public_name: string;
  document_full_name: string;
  vehicle_type: string;
  photo_url: string | null;
  verified: boolean;
  issued_at: string | null;
  next_review_at: string | null;
}

export interface CourierMe {
  courier_id: number;
  user_id: number;
  document_full_name: string;
  public_name: string;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  vehicle_type: string;
  vehicle_plate: string | null;
  region_id: number | null;
  verification_status:
    | "pending"
    | "awaiting_completion"
    | "verified"
    | "rejected"
    | "suspended";
  verification_status_ar: string;
  rejection_reason: string | null;
  availability: string;
  availability_ar: string;
  last_lat: number | null;
  last_lng: number | null;
  last_pulse_at: string | null;
  stats: CourierStats;
  membership_card: CourierMembershipCard;
  appeal_note: string | null;
  preferred_shifts?: string | null;
}

export interface CourierCallCard {
  call_id: number;
  task_id: number;
  order_id: number;
  wave_number: number;
  status: string;
  distance_km: number;
  distance_m: number;
  distance_display: string;
  billed_km: number;
  fee: number;
  per_km_price: number;
  breakdown: string;
  facility_name: string | null;
  facility_type: string | null;
  area_hint: string | null;
  items_count: number;
  items_summary: string | null;
  call_expires_at: string | null;
  call_window_seconds: number;
}

export interface CustomerContactCard {
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  notes: string | null;
  customer_location_available: boolean;
}

export interface TaskItemLine {
  product_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CourierTask {
  task_id: number;
  order_id: number;
  status: string;
  status_ar: string;
  facility_name: string | null;
  facility_lat: number | null;
  facility_lng: number | null;
  distance_km: number;
  distance_m: number;
  distance_display: string;
  billed_km: number;
  fee: number;
  per_km_price: number;
  breakdown: string;
  total_collect: number;
  customer: CustomerContactCard | null;
  items: TaskItemLine[];
  next_actions: string[];
  delivery_code_required: boolean;
  delivery_code?: string | null;
  reserved_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface DecisionOut {
  ok?: boolean;
  message?: string;
  [k: string]: unknown;
}
