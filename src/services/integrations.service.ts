/**
 * integrations.service.ts — طبقة التكاملات v4.1 (النموذج المركزي)
 * ═════════════════════════════════════════════════════════════════
 * العقد المتعاقد عليه مع الباك (16 مساراً تحت /api/v1/integrations):
 *   ping · health · connections (GET/PUT) · toggle · refresh-token ·
 *   foodics (connect-url/callback/sync-menu/menu) ·
 *   external-dispatch · external-deliveries (+cancel) ·
 *   dispatch/resolve · deliverect/push-order · events
 *
 * مبادئ النموذج المركزي:
 *  - المفاتيح عند الأدمن فقط (مقنّعة في الردود) — التاجر يربط بنقرة OAuth.
 *  - كل ردود الأخطاء detail عربي جاهز للعرض — تُمرَّر كما هي.
 *  - 404 من أي مسار هنا يعني «الطبقة غير منشورة على الخادم بعد» —
 *    الحالة الهادئة (لا انهيار) وتضيء الشاشات تلقائياً عند النشر.
 *
 * ملاحظة أمان عرض: tracking_url قصير الأجل — يُقرأ من آخر رد دائماً
 * ولا يُخزَّن في حالة عميل طويلة العمر (hooks refetch قصير).
 */
import { apiClient, ApiError } from "./api-client";
import { ownerApiClient } from "./owner-api-client";

const BASE = "/integrations";

/* ─── الأنواع (من التوثيق المتعاقد عليه v4.1) ─────────────── */

export type IntegrationProvider = "foodics" | "supermile" | "deliverect";
export type ConnectionStatus = "disabled" | "connecting" | "connected" | "error";
export type ConnectionEnvironment = "sandbox" | "live";
export type ConnectionScopeType = "global" | "facility";

export interface IntegrationsConnection {
  connection_id: number;
  provider: IntegrationProvider | string;
  environment?: ConnectionEnvironment | string | null;
  scope_type?: ConnectionScopeType | string | null;
  facility_id?: number | null;
  facility_name?: string | null;
  status?: ConnectionStatus | string | null;
  enabled?: boolean;
  auth_type?: string | null;
  credentials_masked?: Record<string, string> | null;
  has_access_token?: boolean;
  token_expires_at?: string | null;
  last_message?: string | null;
  last_sync_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface IntegrationsHealthOut {
  bridge_enabled?: boolean;
  connections?: IntegrationsConnection[] | null;
  layer?: string | null;
  version?: string | null;
  [key: string]: unknown;
}

export interface ConnectionUpsertIn {
  provider: IntegrationProvider | string;
  environment: ConnectionEnvironment;
  scope_type: ConnectionScopeType;
  facility_id?: number | null;
  credentials?: Record<string, string>;
}

export interface FoodicsConnectUrlOut {
  authorize_url: string;
  [key: string]: unknown;
}

export interface FoodicsSyncMenuOut {
  remote_items?: number;
  created?: number;
  updated?: number;
  [key: string]: unknown;
}

export interface FoodicsMenuItemOut {
  id?: number | string;
  name: string;
  price?: number | string | null;
  status?: "mapped" | "unmapped" | string | null;
  external_id?: string | null;
  remote_id?: string | null;
  [key: string]: unknown;
}

export type ExternalDeliveryStatus =
  | "requested"
  | "accepted"
  | "picked_up"
  | "on_route"
  | "delivered"
  | "cancelled"
  | "failed"
  | string;

export interface ExternalDeliveryOut {
  id?: number;
  delivery_id?: number;
  order_id?: number;
  provider?: string | null;
  local_status?: ExternalDeliveryStatus | null;
  remote_status?: string | null;
  tracking_url?: string | null;
  error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface DispatchResolveOut {
  provider?: string | null;
  engine?: string | null;
  facility_id?: number | null;
  facility_specific?: boolean;
  [key: string]: unknown;
}

export interface IntegrationEventOut {
  id?: number | string;
  provider?: string | null;
  event_type?: string | null;
  direction?: "in" | "out" | string | null;
  status?: "received" | "processed" | "failed" | "ignored" | "bridge.applied" | string | null;
  order_id?: number | null;
  error?: string | null;
  payload?: unknown;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface IntegrationsEventsQuery {
  provider?: string | null;
  order_id?: number | null;
  limit?: number;
}

/* ─── أدوات ──────────────────────────────────────────────── */

/** هل الخطأ «الطبقة غير منشورة على الخادم بعد»؟ (404 من /integrations/*) */
export function isLayerUnavailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/** استخراج نص detail العربي من خطأ ApiError كما ورد من الخادم (بلا صياغة) */
export function integrationErrorText(err: unknown): string {
  if (err instanceof ApiError) return err.message || "فشل الطلب";
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message || "فشل الطلب");
  }
  return "فشل الطلب";
}

/** حسم اسم المزود من رد resolve (provider أو engine — حسب العقد الحي) */
export function resolvedProviderName(r: DispatchResolveOut | null | undefined): string {
  if (!r) return "manual";
  const v = (r.provider ?? r.engine ?? "manual") as string;
  return String(v);
}

function itemsOf<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "events", "deliveries", "connections", "menu", "results"]) {
      const v = obj[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

export { itemsOf };

/* ─── الخدمة (أدمن = apiClient · ربط فودكس للمالك = ownerApiClient) ─── */

export const integrationsService = {
  /** فحص حي عام — 404 يعني الطبقة غير منشورة */
  ping: () => apiClient.get<{ ok?: boolean; layer?: string; version?: string }>(`${BASE}/ping`),

  /** كل الاتصالات + bridge_enabled (أدمن) */
  health: () => apiClient.get<IntegrationsHealthOut>(`${BASE}/health`),

  /** قائمة الاتصالات بمفاتيح مقنّعة (أدمن) */
  connections: () => apiClient.get<unknown>(`${BASE}/connections`).then((d) => itemsOf<IntegrationsConnection>(d)),

  /** إنشاء/تحديث اتصال (أدمن) — المفاتيح اختيارية إن كانت في ملف الخادم */
  saveConnection: (body: ConnectionUpsertIn) =>
    apiClient.put<IntegrationsConnection>(`${BASE}/connections`, body),

  toggle: (connectionId: number, enabled: boolean) =>
    apiClient.post<{ ok?: boolean }>(`${BASE}/connections/${connectionId}/toggle`, { enabled }),

  refreshToken: (connectionId: number) =>
    apiClient.post<{ ok?: boolean }>(`${BASE}/connections/${connectionId}/refresh-token`),

  /** رابط «اربط كاشيرك» — مسموح للمالك والأدمن (يُستدعى بجلسة صاحبة الشاشة) */
  foodicsConnectUrl: (facilityId: number | null, asOwner: boolean) => {
    const q = facilityId != null ? `?facility_id=${facilityId}` : "";
    const client = asOwner ? ownerApiClient : apiClient;
    return client.get<FoodicsConnectUrlOut>(`${BASE}/foodics/connect-url${q}`);
  },

  syncMenu: (facilityId: number | null) => {
    const q = facilityId != null ? `?facility_id=${facilityId}` : "";
    return apiClient.post<FoodicsSyncMenuOut>(`${BASE}/foodics/sync-menu${q}`);
  },

  foodicsMenu: (facilityId: number | null) => {
    const q = facilityId != null ? `?facility_id=${facilityId}` : "";
    return apiClient
      .get<unknown>(`${BASE}/foodics/menu${q}`)
      .then((d) => itemsOf<FoodicsMenuItemOut>(d));
  },

  /** إرسال الطلب للتوصيل الخارجي (أدمن) */
  externalDispatch: (orderId: number) =>
    apiClient.post<ExternalDeliveryOut>(`${BASE}/external-dispatch/${orderId}`),

  cancelExternalDelivery: (deliveryId: number) =>
    apiClient.post<{ ok?: boolean }>(`${BASE}/external-deliveries/${deliveryId}/cancel`),

  externalDeliveries: (orderId: number) =>
    apiClient
      .get<unknown>(`${BASE}/external-deliveries?order_id=${orderId}`)
      .then((d) => itemsOf<ExternalDeliveryOut>(d)),

  /** حسم المنفذ لمتجر: manual أو supermile (أدمن) */
  dispatchResolve: (facilityId: number) =>
    apiClient.get<DispatchResolveOut>(`${BASE}/dispatch/resolve/${facilityId}`),

  deliverectPush: (orderId: number) =>
    apiClient.post<ExternalDeliveryOut>(`${BASE}/deliverect/push-order/${orderId}`),

  /** سجل الأحداث (أدمن) — فلاتر: مزود/طلب */
  events: (q: IntegrationsEventsQuery) => {
    const params = new URLSearchParams();
    if (q.provider) params.set("provider", q.provider);
    if (q.order_id != null) params.set("order_id", String(q.order_id));
    params.set("limit", String(q.limit ?? 100));
    return apiClient
      .get<unknown>(`${BASE}/events?${params.toString()}`)
      .then((d) => itemsOf<IntegrationEventOut>(d));
  },
};
