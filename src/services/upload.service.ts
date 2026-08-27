import { useAuthStore } from "@/store/auth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { attemptRefresh } from "@/services/token-refresh";
import type { UploadOut } from "@/types/api.generated";

const API_URL = "/api/uploads";

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * التوكن المناسب لبوابة الرفع: رفع الصور للمالك أو المشرف فقط (العميل 403).
 * نفس أولوية apiClient: متجر الأدمن ← متجر المالك ← الكوكيز.
 */
function getPortalToken(): { token: string | null; role: "admin" | "owner" | null } {
  if (typeof window === "undefined") return { token: null, role: null };
  const adminStore = useAuthStore.getState();
  if (adminStore.accessToken) return { token: adminStore.accessToken, role: "admin" };
  const ownerStore = useOwnerAuthStore.getState();
  if (ownerStore.accessToken) return { token: ownerStore.accessToken, role: "owner" };
  const adminCookie = readCookieValue("tawfir_admin_token");
  if (adminCookie) return { token: adminCookie, role: "admin" };
  const ownerCookie = readCookieValue("tawfir_owner_token");
  if (ownerCookie) return { token: ownerCookie, role: "owner" };
  return { token: null, role: null };
}

function readRefreshToken(role: "admin" | "owner"): string | null {
  if (role === "admin") {
    return useAuthStore.getState().refreshToken ?? readCookieValue("tawfir_admin_refresh");
  }
  return useOwnerAuthStore.getState().refreshToken ?? readCookieValue("tawfir_owner_refresh");
}

function xhrUpload(
  file: File,
  folder: "products" | "facilities",
  token: string | null,
  onProgress: (pct: number) => void
): Promise<UploadOut> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL);
    xhr.responseType = "json";
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.max(1, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      const data = xhr.response as { detail?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof data === "object" && "url" in data) {
        resolve(data as unknown as UploadOut);
      } else {
        reject(
          new Error(
            (data && typeof data === "object" && data.detail) ||
              `فشل رفع الصورة (${xhr.status})`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error("تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت."));
    xhr.onabort = () => reject(new Error("أُلغي رفع الصورة"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    xhr.send(fd);
  });
}

/**
 * رفع صورة إلى الخادم — POST /api/v1/uploads (multipart: file + folder).
 * شريط تقدم فعلي عبر XHR (fetch لا يدعم تقدم الرفع).
 * عند 401: تجديد شفاف واحد ثم إعادة المحاولة — نفس منطق عملاء الـ API.
 */
export async function uploadImage(
  file: File,
  folder: "products" | "facilities",
  onProgress: (pct: number) => void
): Promise<UploadOut> {
  const { token, role } = getPortalToken();
  try {
    return await xhrUpload(file, folder, token, onProgress);
  } catch (err) {
    const is401 = err instanceof Error && err.message.includes("(401)");
    if (!is401 || !role) throw err;
    // انتهى الـ access أثناء الجلسة → جرّب التجديد ثم أعد المحاولة مرة واحدة
    const tokens = await attemptRefresh(role, () => readRefreshToken(role));
    if (!tokens?.access_token) throw err;
    const newRefresh =
      tokens.refresh_token ??
      (role === "admin" ? readCookieValue("tawfir_admin_refresh") : readCookieValue("tawfir_owner_refresh"));
    if (role === "admin" && newRefresh) {
      useAuthStore.getState().updateTokens(tokens.access_token, newRefresh);
    } else if (newRefresh) {
      useOwnerAuthStore.getState().updateTokens(tokens.access_token, newRefresh);
    }
    return xhrUpload(file, folder, tokens.access_token, onProgress);
  }
}
