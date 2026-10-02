/**
 * طبقة الاتصال بخادم مصنع «توفير» — المصدر الوحيد للحقيقة: openapi.json
 * كل الاتصال من المتصفح مباشرة (CORS مفتوح مُثبت) — لا قيم مصمتة للسوق.
 */

export const API_BASE = "https://api.tawfir.giize.com/api/v1";
export const WS_NOTIFICATIONS = "wss://api.tawfir.giize.com/api/v1/ws/notifications";

export type ApiResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; errors?: string[] };

/** استخراج رسالة الخطأ العربية كما ترد من الباك إند حرفياً (422 تفصيلية أو نص واحد) */
export function extractError(data: unknown): { error: string; errors?: string[] } {
  if (typeof data === "string" && data.trim()) return { error: data };
  const d = data as Record<string, unknown> | null;
  const detail = d?.detail;
  if (typeof detail === "string" && detail.trim()) return { error: detail };
  if (detail && typeof detail === "object") {
    const msg = String((detail as Record<string, unknown>).message ?? "حدث خطأ غير متوقع");
    const rawErrors = (detail as Record<string, unknown>).errors;
    const errors = Array.isArray(rawErrors)
      ? rawErrors
          .map((e) => {
            if (typeof e === "string") return e;
            const m = (e as Record<string, unknown>).msg;
            if (typeof m !== "string") return null;
            if (/Field required/i.test(m)) {
              const loc = (e as Record<string, unknown>).loc;
              const field = Array.isArray(loc) ? String(loc[loc.length - 1]) : "";
              return field ? `الحقل «${field}» مطلوب` : "حقل مطلوب مفقود";
            }
            return m;
          })
          .filter((x): x is string => !!x)
      : undefined;
    return { error: msg, errors };
  }
  if (typeof d?.message === "string" && d.message.trim()) return { error: d.message };
  return { error: "تعذّر الاتصال بالخادم — أعد المحاولة" };
}

type RequestOptions = {
  token?: string | null;
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const { token, body, method, formData, query } = opts;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(buildUrl(path, query), {
      method: method ?? (body !== undefined || formData ? "POST" : "GET"),
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (res.ok) return { ok: true, status: res.status, data: data as T };
    const { error, errors } = extractError(data);
    return { ok: false, status: res.status, error, errors };
  } catch {
    return { ok: false, status: 0, error: "فشل الاتصال بالشبكة — تحقق من الوصول إلى api.tawfir.giize.com" };
  }
}

export const apiGet = <T = unknown>(p: string, q?: RequestOptions["query"], token?: string | null) =>
  api<T>(p, { method: "GET", query: q, token });
export const apiPost = <T = unknown>(p: string, body?: unknown, token?: string | null) =>
  api<T>(p, { method: "POST", body, token });
export const apiPut = <T = unknown>(p: string, body?: unknown, token?: string | null) =>
  api<T>(p, { method: "PUT", body, token });
export const apiPatch = <T = unknown>(p: string, body?: unknown, token?: string | null) =>
  api<T>(p, { method: "PATCH", body, token });
export const apiDelete = <T = unknown>(p: string, token?: string | null) =>
  api<T>(p, { method: "DELETE", token });

/** رفع أصل هوية: POST /owner/brand/assets?kind=&facility_id= */
export function apiUploadAsset(
  file: File,
  kind: string,
  facilityId: number,
  token: string
): Promise<ApiResult<Record<string, unknown>>> {
  const fd = new FormData();
  fd.append("file", file);
  return api<Record<string, unknown>>(`/owner/brand/assets`, {
    method: "POST",
    formData: fd,
    token,
    query: { kind, facility_id: facilityId },
  });
}

/** رفع keystore إلى خزنة الكونسول: POST /console/apps/{id}/keystore (multipart — الحقول حرفياً من openapi: file, key_alias, store_password, key_password) */
export function apiUploadKeystore(
  file: File,
  appId: string,
  token: string,
  fields: { key_alias: string; store_password: string; key_password: string }
): Promise<ApiResult<Record<string, unknown>>> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("key_alias", fields.key_alias);
  fd.append("store_password", fields.store_password);
  fd.append("key_password", fields.key_password);
  return api<Record<string, unknown>>(`/console/apps/${appId}/keystore`, {
    method: "POST",
    formData: fd,
    token,
  });
}

/** عنوان مطلق لملف أصل مرفوع (الرد يرجع /uploads/...) */
export function assetUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("http")) return u;
  return `https://api.tawfir.giize.com${u}`;
}

/** فحص صيغة الجوال ثنائي الأسواق: 7XXXXXXXX (اليمن) أو 05XXXXXXXX (السعودية) */
export function normalizePhoneInput(raw: string): string {
  return raw.replace(/[\s\-()+]/g, "").replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
}
export function isValidPhone(raw: string): boolean {
  const p = normalizePhoneInput(raw);
  return /^7\d{8}$/.test(p) || /^05\d{8}$/.test(p) || /^\+967\d{8}$/.test(p) || /^\d{7,15}$/.test(p);
}

/** تنسيق مبلغ بعملة قادمة من الـAPI — لا عملة مصمتة أبداً */
export function formatMoney(amount: string | number | null | undefined, currency?: string | null): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const val = Number.isFinite(n as number) ? (n as number).toLocaleString("ar-YE", { maximumFractionDigits: 2 }) : "—";
  return currency ? `${val} ${currency}` : val;
}
