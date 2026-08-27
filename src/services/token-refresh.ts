import type { TokenOut } from "@/types/api.generated";

const API_BASE = "/api";

/**
 * تجديد الجلسة — POST /auth/refresh (الجولة الختامية).
 *
 * آلية التدوير في الخادم: كل refresh يُبطل التوكن القديم ويُصدر زوجاً جديداً،
 * لذا يجب ألا يطلق الطلبان المتوازيان تجدينين منفصلين — القفل أدناه يضمن
 * أن كل الطلبات التي اصطدمت بـ 401 في نفس اللحظة تتشارك وعداً واحداً
 * (طلب HTTP واحد للتجديد) ثم يعيد كلٌّ منها طلبه الأصلي بالتوكن الجديد.
 *
 * القفل لكل دور على حدة (عميل/مشرف/مالك) لأن التوكنات مستقلة تماماً.
 */
const inFlight: Partial<Record<"customer" | "admin" | "owner", Promise<TokenOut>>> = {};

export type PortalRole = "customer" | "admin" | "owner";

export function refreshTokens(role: PortalRole, refreshToken: string): Promise<TokenOut> {
  if (!inFlight[role]) {
    inFlight[role] = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data: unknown = await res.json().catch(() => null);
        if (
          !res.ok ||
          !data ||
          typeof data !== "object" ||
          typeof (data as Record<string, unknown>).access_token !== "string"
        ) {
          const detail =
            data && typeof data === "object" && "detail" in data
              ? String((data as Record<string, unknown>).detail)
              : "فشل تجديد الجلسة";
          throw new Error(detail);
        }
        return data as TokenOut;
      } finally {
        inFlight[role] = undefined;
      }
    })();
  }
  return inFlight[role] as Promise<TokenOut>;
}

/**
 * محاولة تجديد مع تحصين ضد سباق التدوير:
 * لو فشل التجديد لأن توكن آخر سبق واستهلكه (rotation من طلب موازٍ)،
 * يُقرأ التوكن الحالي من المتجر ويُعاد التجديد به مرة أخيرة.
 */
export async function attemptRefresh(
  role: PortalRole,
  readRefreshToken: () => string | null
): Promise<TokenOut | null> {
  const rt = readRefreshToken();
  if (!rt) return null;
  try {
    return await refreshTokens(role, rt);
  } catch {
    const current = readRefreshToken();
    if (current && current !== rt) {
      try {
        return await refreshTokens(role, current);
      } catch {
        return null;
      }
    }
    return null;
  }
}
