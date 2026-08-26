import { useCustomerAuthStore } from "@/store/customerAuth.store";

const API_BASE = "/api";

export class CustomerApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "CustomerApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * مسارات الدخول: أخطاء 401/403 تُعرض فيها رسالة الخادم العربية
 * مباشرة (detail) — ولا تُعدّ «انتهت الجلسة» ولا تمسح التوكن.
 */
function isAuthEndpoint(url: string): boolean {
  return url.startsWith("/auth/login");
}

function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStore = useCustomerAuthStore.getState().accessToken;
  if (fromStore) return fromStore;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_customer_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function fetchWithCustomerAuth<T>(
  method: string,
  url: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getCustomerToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new CustomerApiError(
      "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.",
      0,
      networkErr
    );
  }

  const authEndpoint = isAuthEndpoint(url);

  if (response.status === 401 && !authEndpoint) {
    if (typeof window !== "undefined") {
      useCustomerAuthStore.getState().clearAuth();
    }
    throw new CustomerApiError("انتهت الجلسة. يرجى تسجيل الدخول مجددًا.", 401, null);
  }

  if (response.status === 403 && !authEndpoint) {
    throw new CustomerApiError("لا تملك صلاحية الوصول", 403, null);
  }

  if (response.status === 404 && !authEndpoint) {
    throw new CustomerApiError("غير موجود", 404, null);
  }

  if (response.status === 429) {
    throw new CustomerApiError("عدد كبير من المحاولات، انتظر قليلاً ثم أعد المحاولة", 429, null);
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json") ?? false;
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 422 && data && typeof data === "object" && "detail" in data) {
      const detail = (data as Record<string, unknown>).detail;
      if (Array.isArray(detail)) {
        const msgs = detail
          .filter((d): d is Record<string, string> => typeof d === "object" && d !== null && "msg" in d)
          .map((d) => d.msg)
          .join("، ");
        throw new CustomerApiError(msgs || "بيانات غير صالحة", 422, data);
      }
      if (typeof detail === "string") {
        throw new CustomerApiError(detail, 422, data);
      }
    }
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : null) ??
      `حدث خطأ (${response.status})`;
    throw new CustomerApiError(message, response.status, data);
  }

  if (response.status === 204 || data === null) {
    return undefined as T;
  }
  return data as T;
}

export const customerApiClient = {
  get: <T>(url: string) => fetchWithCustomerAuth<T>("GET", url),
  post: <T>(url: string, body?: unknown) => fetchWithCustomerAuth<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => fetchWithCustomerAuth<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => fetchWithCustomerAuth<T>("PATCH", url, body),
  delete: <T>(url: string) => fetchWithCustomerAuth<T>("DELETE", url),
};
