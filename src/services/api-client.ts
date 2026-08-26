import { useAuthStore } from "@/store/auth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type TokenCookieName = "tawfir_admin_token" | "tawfir_owner_token";

/**
 * مسارات الدخول: أخطاء 401/403 تُعرض فيها رسالة الخادم (detail)
 * مباشرة — ولا تُعدّ «انتهت الجلسة» ولا تمسح التوكنات.
 */
function isAuthEndpoint(url: string): boolean {
  return url.startsWith("/admin/login");
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStore = useAuthStore.getState().accessToken;
  if (fromStore) return fromStore;
  for (const name of ["tawfir_admin_token", "tawfir_owner_token"] as TokenCookieName[]) {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${name}=`));
    if (match) return decodeURIComponent(match.split("=")[1]);
  }
  return null;
}

async function fetchWithAuth<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: { headers?: Record<string, string> }
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options?.headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
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
    throw new ApiError(
      "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.",
      0,
      networkErr
    );
  }

  const authEndpoint = isAuthEndpoint(url);

  if (response.status === 401 && !authEndpoint) {
    if (typeof window !== "undefined") {
      useAuthStore.getState().clearAuth();
      useOwnerAuthStore.getState().clearAuth();
    }
    throw new ApiError("انتهت الجلسة. يرجى تسجيل الدخول مجددًا.", 401, null);
  }

  if (response.status === 403 && !authEndpoint) {
    throw new ApiError("لا تملك صلاحية الوصول", 403, null);
  }

  if (response.status === 404 && !authEndpoint) {
    throw new ApiError("غير موجود", 404, null);
  }

  if (response.status === 429) {
    throw new ApiError("عدد كبير من المحاولات، انتظر قليلاً ثم أعد المحاولة", 429, null);
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
        throw new ApiError(msgs || "بيانات غير صالحة", 422, data);
      }
      if (typeof detail === "string") {
        throw new ApiError(detail, 422, data);
      }
    }
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : null) ??
      `حدث خطأ (${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204 || data === null) {
    return undefined as T;
  }
  return data as T;
}

export const apiClient = {
  get: <T>(url: string) => fetchWithAuth<T>("GET", url),
  post: <T>(url: string, body?: unknown, options?: { headers?: Record<string, string> }) =>
    fetchWithAuth<T>("POST", url, body, options),
  put: <T>(url: string, body?: unknown) => fetchWithAuth<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => fetchWithAuth<T>("PATCH", url, body),
  delete: <T>(url: string) => fetchWithAuth<T>("DELETE", url),
};
