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
};
