import { useAuthStore } from "@/store/auth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { attemptRefresh, type PortalRole } from "@/services/token-refresh";
import { toast } from "@/hooks/use-toast";

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
 * يشمل ذلك طلب التجديد نفسه (لا يدخل منطق refresh أبداً).
 */
function isAuthEndpoint(url: string): boolean {
  return (
    url.startsWith("/admin/login") ||
    url.startsWith("/owner/login") ||
    url.startsWith("/owner/register") ||
    url.startsWith("/auth/refresh") ||
    url.startsWith("/auth/forgot-password") ||
    url.startsWith("/auth/reset-password")
  );
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * تحديد البوابة صاحبة الجلسة الحالية (مشرف أو مالك) بنفس أولوية اختيار التوكن:
 * متجر الأدمن ← متجر المالك ← كوكي الأدمن ← كوكي المالك.
 */
function resolveRole(): "admin" | "owner" | null {
  if (useAuthStore.getState().accessToken) return "admin";
  if (useOwnerAuthStore.getState().accessToken) return "owner";
  if (typeof document !== "undefined") {
    if (readCookieValue("tawfir_admin_token")) return "admin";
    if (readCookieValue("tawfir_owner_token")) return "owner";
  }
  return null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const role = resolveRole();
  if (role === "admin") {
    return useAuthStore.getState().accessToken ?? readCookieValue("tawfir_admin_token");
  }
  if (role === "owner") {
    return useOwnerAuthStore.getState().accessToken ?? readCookieValue("tawfir_owner_token");
  }
  return null;
}

function readRefreshToken(role: "admin" | "owner"): string | null {
  if (typeof window === "undefined") return null;
  if (role === "admin") {
    return (
      useAuthStore.getState().refreshToken ?? readCookieValue("tawfir_admin_refresh")
    );
  }
  return (
    useOwnerAuthStore.getState().refreshToken ?? readCookieValue("tawfir_owner_refresh")
  );
}

/** خروج حقيقي عند فشل التجديد: مسح + توست + توجيه لصفحة دخول البوابة نفسها */
function forceLogout(role: "admin" | "owner" | null, hadSession: boolean): void {
  if (typeof window === "undefined") return;
  if (role === "admin") useAuthStore.getState().clearAuth();
  else if (role === "owner") useOwnerAuthStore.getState().clearAuth();
  else {
    useAuthStore.getState().clearAuth();
    useOwnerAuthStore.getState().clearAuth();
  }
  if (hadSession) {
    toast({ title: "انتهت الجلسة", description: "يرجى تسجيل الدخول من جديد" });
    const path = window.location.pathname;
    if (role === "admin" && path.startsWith("/admin")) {
      window.location.assign("/admin/login?expired=1");
    } else if (role === "owner" && path.startsWith("/owner")) {
      window.location.assign("/owner/login?expired=1");
    }
  }
}

async function fetchWithAuth<T>(
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

  const role = resolveRole();
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
    // تجديد شفاف: 401 → POST /auth/refresh → إعادة الطلب الأصلي بالتوكن الجديد
    if (!retried && role) {
      const portalRole: PortalRole = role;
      const tokens = await attemptRefresh(portalRole, () => readRefreshToken(role));
      if (tokens?.access_token) {
        const newRefresh = tokens.refresh_token ?? readRefreshToken(role);
        if (newRefresh) {
          if (role === "admin") {
            useAuthStore.getState().updateTokens(tokens.access_token, newRefresh);
          } else {
            useOwnerAuthStore.getState().updateTokens(tokens.access_token, newRefresh);
          }
          return fetchWithAuth<T>(method, url, body, options, true);
        }
      }
    }
    forceLogout(role, Boolean(token));
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
