import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { attemptRefresh } from "@/services/token-refresh";
import { toast } from "@/hooks/use-toast";

const API_BASE = "/api";

export class OwnerApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "OwnerApiError";
    this.status = status;
    this.body = body;
  }
}

function getOwnerToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStore = useOwnerAuthStore.getState().accessToken;
  if (fromStore) return fromStore;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_owner_token="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function readOwnerRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromStore = useOwnerAuthStore.getState().refreshToken;
  if (fromStore) return fromStore;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("tawfir_owner_refresh="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * مسارات الدخول: أخطاء 401/403 تُعرض فيها رسالة الخادم (detail)
 * مباشرة — ولا تُعدّ «انتهت الجلسة» ولا تمسح التوكنات.
 * يشمل ذلك طلب التجديد نفسه (لا يدخل منطق refresh أبداً).
 */
function isAuthEndpoint(url: string): boolean {
  return (
    url.startsWith("/owner/login") ||
    url.startsWith("/owner/register") ||
    url.startsWith("/auth/refresh") ||
    url.startsWith("/auth/forgot-password") ||
    url.startsWith("/auth/reset-password")
  );
}

/** خروج حقيقي عند فشل التجديد: مسح الزوجين + توست + توجيه لصفحة الدخول */
function forceLogout(hadSession: boolean): void {
  if (typeof window === "undefined") return;
  useOwnerAuthStore.getState().clearAuth();
  if (hadSession) {
    toast({ title: "انتهت الجلسة", description: "يرجى تسجيل الدخول من جديد" });
    if (window.location.pathname.startsWith("/owner")) {
      window.location.assign("/owner/login?expired=1");
    }
  }
}

async function fetchWithOwnerAuth<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
  retried = false
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options?.headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getOwnerToken();
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
    throw new OwnerApiError(
      "تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.",
      0,
      networkErr
    );
  }

  const authEndpoint = isAuthEndpoint(url);

  if (response.status === 401 && !authEndpoint) {
    // تجديد شفاف: 401 → POST /auth/refresh → إعادة الطلب الأصلي بالتوكن الجديد
    if (!retried) {
      const tokens = await attemptRefresh("owner", readOwnerRefreshToken);
      if (tokens?.access_token) {
        const newRefresh = tokens.refresh_token ?? readOwnerRefreshToken();
        if (newRefresh) {
          useOwnerAuthStore.getState().updateTokens(tokens.access_token, newRefresh);
          return fetchWithOwnerAuth<T>(method, url, body, options, true);
        }
      }
    }
    forceLogout(Boolean(token));
    throw new OwnerApiError("انتهت الجلسة. يرجى تسجيل الدخول مجددًا.", 401, null);
  }

  if (response.status === 403 && !authEndpoint) {
    throw new OwnerApiError("لا تملك صلاحية الوصول", 403, null);
  }

  if (response.status === 404 && !authEndpoint) {
    throw new OwnerApiError("غير موجود", 404, null);
  }

  if (response.status === 429) {
    throw new OwnerApiError("عدد كبير من المحاولات، انتظر قليلاً ثم أعد المحاولة", 429, null);
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
        throw new OwnerApiError(msgs || "بيانات غير صالحة", 422, data);
      }
      if (typeof detail === "string") {
        throw new OwnerApiError(detail, 422, data);
      }
    }
    const message =
      (data && typeof data === "object" && "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : null) ??
      `حدث خطأ (${response.status})`;
    throw new OwnerApiError(message, response.status, data);
  }

  if (response.status === 204 || data === null) {
    return undefined as T;
  }
  return data as T;
}

export const ownerApiClient = {
  get: <T>(url: string) => fetchWithOwnerAuth<T>("GET", url),
  post: <T>(url: string, body?: unknown, options?: { headers?: Record<string, string> }) =>
    fetchWithOwnerAuth<T>("POST", url, body, options),
  put: <T>(url: string, body?: unknown) => fetchWithOwnerAuth<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => fetchWithOwnerAuth<T>("PATCH", url, body),
  delete: <T>(url: string) => fetchWithOwnerAuth<T>("DELETE", url),
};
