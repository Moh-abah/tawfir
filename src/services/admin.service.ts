import { apiClient } from "./api-client";
import type {
  AuditLogOut,
  Facility,
  FacilityType,
  MembershipRequestOut,
  MembershipRequestStatus,
  OrderListOut,
  OrderOut,
  OrderStatus,
  Paginated,
  PendingFacilityOut,
} from "@/types/api.generated";

/* ════════════════════════════════════════════════════════════════ */
/*  بوابة المشرف — سجل التدقيق + المتاجر المعلّقة + الطلبات + العضوية */
/* ════════════════════════════════════════════════════════════════ */

/** PATCH /admin/facilities/{id}/approve | reject → المتجر بعد التحديث */
export type FacilityModerationResult = Facility;

/** الاسم المختصر الذي تستخدمه الـ hooks والصفحات للإشارة إلى PendingFacilityOut */
export type PendingFacility = PendingFacilityOut;

export const adminService = {
  getAuditLogs: (page = 1, pageSize = 20) =>
    apiClient.get<Paginated<AuditLogOut>>(
      `/admin/audit-logs?page=${page}&page_size=${pageSize}`
    ),

  /**
   * قائمة المتاجر المعلّقة بانتظار موافقة المشرف.
   * GET /admin/facilities/pending → {items, total, page, pages}
   */
  getPendingFacilities: (page = 1, pageSize = 20) =>
    apiClient.get<Paginated<PendingFacilityOut>>(
      `/admin/facilities/pending?page=${page}&page_size=${pageSize}`
    ),

  /** قبول متجر معلّق. PATCH /admin/facilities/{id}/approve. */
  approveFacility: (id: number) =>
    apiClient.patch<FacilityModerationResult>(
      `/admin/facilities/${id}/approve`
    ),

  /** رفض متجر معلّق مع السبب. PATCH /admin/facilities/{id}/reject. */
  rejectFacility: (id: number, reason: string) =>
    apiClient.patch<FacilityModerationResult>(
      `/admin/facilities/${id}/reject`,
      { reason }
    ),

  /* ─── الطلبات ──────────────────────────────────────────── */

  /** كل الطلبات مع فلترة اختيارية + بحث (رقم طلب أو اسم عميل — من الخادم). */
  getOrders: (params: {
    status?: OrderStatus | null;
    customer_id?: number | null;
    facility_id?: number | null;
    search?: string | null;
    page?: number;
    page_size?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.customer_id != null)
      q.set("customer_id", String(params.customer_id));
    if (params.facility_id != null)
      q.set("facility_id", String(params.facility_id));
    if (params.search && params.search.trim()) q.set("search", params.search.trim());
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    return apiClient.get<Paginated<OrderListOut>>(
      `/admin/orders?${q.toString()}`
    );
  },

  /** تفاصيل طلب واحد (للمشرف). GET /admin/orders/{id}. */
  getOrder: (id: number) =>
    apiClient.get<OrderOut>(`/admin/orders/${id}`),

  /* ─── طلبات العضوية ────────────────────────────────────── */

  /** قائمة طلبات العضوية مع فلترة اختيارية بالحالة. */
  getMembershipRequests: (
    status?: MembershipRequestStatus | null,
    page = 1,
    pageSize = 20
  ) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    q.set("page", String(page));
    q.set("page_size", String(pageSize));
    return apiClient.get<Paginated<MembershipRequestOut>>(
      `/admin/membership-requests?${q.toString()}`
    );
  },

  /** قبول طلب اشتراك. PATCH /admin/membership-requests/{id}/approve. */
  approveMembershipRequest: (id: number) =>
    apiClient.patch<MembershipRequestOut>(
      `/admin/membership-requests/${id}/approve`
    ),

  /** رفض طلب اشتراك مع السبب. PATCH /admin/membership-requests/{id}/reject. */
  rejectMembershipRequest: (id: number, reason: string) =>
    apiClient.patch<MembershipRequestOut>(
      `/admin/membership-requests/${id}/reject`,
      { reason }
    ),

  /* ═══ إدارة أسطول المناديب (الجولة الرابعة — عقد حي) ═══ */

  /**
   * قائمة طلبات توثيق المناديب. GET /admin/couriers/verification-requests
   * ⚠ ملاحظة حقل إلزامية فلترة status: الاستدعاء بلا معامل — أو بحالات
   * تحمل عناصر — يُرجع الخادم 500 (خلل تسلسل معروف — يوثَّق في تقرير
   * التسليم). الواجهة تمرر الفلتر دائماً وتتعامل مع 500 برسالة رشيقة.
   */
  getCourierVerificationRequests: (
    status: "pending" | "verified" | "rejected" | "awaiting_completion" | "suspended",
    page = 1,
    pageSize = 20
  ) =>
    apiClient.get<Paginated<AdminCourierVerification>>(
      `/admin/couriers/verification-requests?status=${status}&page=${page}&page_size=${pageSize}`
    ),

  /** قرار توثيق مندوب. POST /admin/couriers/{id}/decision */
  courierVerificationDecision: (
    courierId: number,
    action: "verify" | "reject" | "request_completion",
    reason?: string | null,
    notes?: string | null
  ) =>
    apiClient.post<{ detail?: string; status_code?: number }>(
      `/admin/couriers/${courierId}/decision`,
      { action, reason: reason?.trim() || null, notes: notes?.trim() || null }
    ),

  /** إيقاف/تنشيط مندوب. POST /admin/couriers/{id}/suspend */
  courierSuspendDecision: (
    courierId: number,
    action: "suspend" | "activate",
    reason?: string | null
  ) =>
    apiClient.post<{ detail?: string; status_code?: number }>(
      `/admin/couriers/${courierId}/suspend`,
      { action, reason: reason?.trim() || null }
    ),

  /** الرصد الحي لأسطول التوصيل. GET /admin/couriers/monitor */
  getCouriersMonitor: () =>
    apiClient.get<AdminCourierMonitor>("/admin/couriers/monitor"),

  /* ═══ محرر التسعير (GET/PATCH /admin/pricing) ═══ */

  getPricingSettings: () =>
    apiClient.get<AdminPricingSettings>("/admin/pricing"),

  updatePricingSettings: (data: Partial<AdminPricingUpdate>) =>
    apiClient.patch<AdminPricingSettings>("/admin/pricing", data),

  /* ═══ الشركاء (GET /admin/partners/…) ═══ */

  /** قائمة طلبات/حالات ربط الشركاء. GET /admin/partners/requests */
  getPartnerRequests: (status?: string | null) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient.get<Paginated<AdminPartnerRequest>>(
      `/admin/partners/requests${q}`
    );
  },

  /**
   * قرار ربط شريك. POST /admin/partners/{id}/decision
   * الرد عند approve/replace_key يحمل المفتاح الكامل — يظهر مرة واحدة
   * حصراً (يُعرض فوراً في حوار تحذيري قابل للنسخ).
   */
  partnerDecision: (
    partnerId: number,
    action: "approve" | "reject" | "revoke" | "replace_key",
    reason?: string | null
  ) =>
    apiClient.post<AdminPartnerDecisionOut>(
      `/admin/partners/${partnerId}/decision`,
      { action, reason: reason?.trim() || null }
    ),

  /** صحة شريك. GET /admin/partners/{id}/health */
  getPartnerHealth: (partnerId: number) =>
    apiClient.get<AdminPartnerHealth>(`/admin/partners/${partnerId}/health`),

  /** سجل مزامنات شريك. GET /admin/partners/{id}/sync-logs */
  getPartnerSyncLogs: (partnerId: number, page = 1) =>
    apiClient.get<Paginated<AdminPartnerSyncLog>>(
      `/admin/partners/${partnerId}/sync-logs?page=${page}`
    ),
};

/* ═══ عقود أسطول المناديب (من openapi الحي + ردود مجرّبة) ═══ */

/** مستند توثيق مندوب (4 مستندات — معاينة صورة + حالة). */
export interface AdminCourierDoc {
  doc_type: string;
  doc_type_ar: string | null;
  url: string | null;
  status: string;
  status_ar: string | null;
}

/** طلب توثيق مندوب في قائمة الإدارة. */
export interface AdminCourierVerification {
  courier_id: number;
  user_id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  vehicle_type: string | null;
  region_id: number | null;
  submitted_at: string | null;
  documents: AdminCourierDoc[];
  [k: string]: unknown;
}

/** عنصر الرصد الحي. */
export interface AdminCourierMonitorItem {
  courier_id: number;
  public_name: string | null;
  availability: string;
  availability_ar: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_pulse_at: string | null;
  battery_level: number | null;
  active_task_id: number | null;
  [k: string]: unknown;
}

export interface AdminCourierMonitor {
  items: AdminCourierMonitorItem[];
  count: number;
}

/** إعدادات التسعير الكاملة — القراءة حرفية. */
export interface AdminPricingSettings {
  price_per_km: number;
  min_delivery_fee: number;
  max_delivery_km: number;
  imprecise_address_fee: number;
  call_window_seconds: number;
  call_radius_km: number;
  wave_courier_cap: number;
  pulse_grace_seconds: number;
  cancel_compensation_mode: "percent" | "fixed" | string;
  cancel_compensation_value: number;
  dual_tasks_enabled: boolean;
  code_delivery_enabled: boolean;
  pulse_min_interval_seconds: number;
  couriers_enabled: boolean;
  delivery_tasks_enabled: boolean;
  live_pricing_enabled: boolean;
  partner_gateway_enabled: boolean;
  mandatory_order_location_enabled: boolean;
}

/** التحديث الجزئي للتسعير (مداخل محصورة بالنطاقات). */
export interface AdminPricingUpdate {
  price_per_km?: number;
  min_delivery_fee?: number;
  max_delivery_km?: number;
  imprecise_address_fee?: number;
  call_window_seconds?: number;
  call_radius_km?: number;
  wave_courier_cap?: number;
  pulse_grace_seconds?: number;
  cancel_compensation_mode?: string;
  cancel_compensation_value?: number;
}

/** طلب/حالة شريك في قائمة الإدارة. */
export interface AdminPartnerRequest {
  id: number;
  facility_id: number;
  system_name: string;
  contact_email: string;
  link_mode: string;
  request_status: string;
  status: string | null;
  key_prefix: string;
  last_call_at: string | null;
  created_at: string;
}

/** رد قرار الشريك — المفتاح الكامل عند approve/replace_key فقط. */
export interface AdminPartnerDecisionOut {
  ok?: boolean;
  message?: string;
  api_key?: string;
  key_prefix?: string;
  partner_id?: number;
  detail?: string;
  status_code?: number;
}

export interface AdminPartnerHealth {
  partner_id: number;
  facility_id: number;
  system_name: string;
  status: string;
  status_reason: string | null;
  last_call_at: string | null;
  success_count_7d: number;
  synced_products_count: number;
  idle_days: number | null;
}

export interface AdminPartnerSyncLog {
  id: number;
  [k: string]: unknown;
}
