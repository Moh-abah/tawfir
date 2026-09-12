/**
 * Owner service — all owner gateway API calls.
 * Uses the dedicated owner API client (tawfir_owner_token cookie).
 *
 * POST /owner/login → TokenOut (مُتحقَّق منها حيّاً على الإنتاج).
 * POST /owner/register → OwnerRegisterOut {detail, user_id, facility_id, status}
 *   المتجر يُنشأ معلّقاً (status=بانتظار موافقة المشرف) بانتظار المراجعة اليدوية.
 */
import { ownerApiClient } from "./owner-api-client";
import type {
  TokenOut,
  Facility,
  FacilityType,
  OwnerFacilityUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
  ProductAvailabilityUpdate,
  ProductImportResult,
  Paginated,
  MessageOut,
  OrderListOut,
  OrderOut,
} from "@/types/api.generated";

/** ─── تسجيل مالك متجر جديد (POST /owner/register — عام بلا توكن) ─── */

export interface OwnerRegisterInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  facility_name: string;
  facility_type: FacilityType;
  region_id: number;
  description?: string | null;
  address?: string | null;
  phone_facility?: string | null;
  working_hours?: string | null;
  image_url?: string | null;
  /** نسبة الخصم لعضوية توفير (10-30) — الجولة 3 */
  discount_rate?: number;
}

export interface OwnerRegisterResult {
  detail: string;
  status_code: number;
  user_id: number;
  facility_id: number;
  status: string;
}

export const ownerService = {
  /**
   * تسجيل حساب مالك + متجره الجديد.
   * استجابة 201: {detail, user_id, facility_id, status: "بانتظار موافقة المشرف"}
   * الأخطاء: 409 تكرار بريد/جوال (detail نصي عربي) — 422 تحقق (detail.errors
   * مصفوفة بـ loc لكل حقل) — 404 منطقة غير موجودة.
   */
  ownerRegister: (data: OwnerRegisterInput) =>
    ownerApiClient.post<OwnerRegisterResult>("/owner/register", data),
  /** تسجيل دخول المالك. POST /owner/login → TokenOut (موجود في OpenAPI). */
  ownerLogin: (data: { identifier: string; password: string }) =>
    ownerApiClient.post<TokenOut>("/owner/login", data),

  getMyFacilities: () =>
    ownerApiClient.get<Facility[]>("/owner/facility"),

  getMyFacility: (id: number) =>
    ownerApiClient.get<Facility>(`/owner/facility/${id}`),

  updateMyFacility: (id: number, data: OwnerFacilityUpdate) =>
    ownerApiClient.put<Facility>(`/owner/facility/${id}`, data),

  getOwnerProducts: (facilityId: number, params?: {
    category?: string;
    search?: string;
    only_available?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const qp = new URLSearchParams();
    if (params?.category) qp.set("category", params.category);
    if (params?.search) qp.set("search", params.search);
    if (params?.only_available !== undefined) qp.set("only_available", String(params.only_available));
    if (params?.page) qp.set("page", String(params.page));
    if (params?.page_size) qp.set("page_size", String(params.page_size));
    const qs = qp.toString();
    return ownerApiClient.get<Paginated<Product>>(
      `/owner/${facilityId}/products${qs ? `?${qs}` : ""}`
    );
  },

  createProduct: (facilityId: number, data: ProductCreate) =>
    ownerApiClient.post<Product>(`/owner/${facilityId}/products`, data),

  updateProduct: (facilityId: number, productId: number, data: ProductUpdate) =>
    ownerApiClient.put<Product>(`/owner/${facilityId}/products/${productId}`, data),

  deleteProduct: (facilityId: number, productId: number) =>
    ownerApiClient.delete<MessageOut>(`/owner/${facilityId}/products/${productId}`),

  toggleProductAvailability: (facilityId: number, productId: number, data: ProductAvailabilityUpdate) =>
    ownerApiClient.patch<Product>(`/owner/${facilityId}/products/${productId}/availability`, data),

  importProducts: (facilityId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return ownerApiClient.post<ProductImportResult>(
      `/owner/${facilityId}/products/import`,
      fd
    );
  },

  /* ─── طلبات المتجر (للمالك) ─────────────────────────── */

  /**
   * طلبات متجري. GET /owner/{facilityId}/orders → Paginated<OrderListOut>.
   * الجولة 5: دعم فلترة الحالة وترقيم من الباك إند (كانت الفلترة محلية
   * على أول 20 طلباً فقط — تفقد الطلبات الأقدم).
   * الجولة الختامية: بحث من الخادم (search — رقم طلب أو اسم عميل).
   */
  getOwnerOrders: (
    facilityId: number,
    params?: {
      status?: string | null;
      search?: string | null;
      page?: number;
      page_size?: number;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search && params.search.trim()) q.set("search", params.search.trim());
    q.set("page", String(params?.page ?? 1));
    q.set("page_size", String(params?.page_size ?? 100));
    return ownerApiClient.get<Paginated<OrderListOut>>(
      `/owner/${facilityId}/orders?${q.toString()}`
    );
  },

  /** تحديث حالة طلب. PATCH /orders/{id}/status (مالك/مشرف). */
  updateOrderStatus: (orderId: number, status: string) =>
    ownerApiClient.patch<OrderOut>(`/orders/${orderId}/status`, { status }),

  /* ─── التوصيل عبر المناديب (توسعة الجولة الرابعة — عقد حي 100%) ── */

  /** رادار المناديب حول متجري. GET /owner/facilities/{fid}/courier-radar */
  getCourierRadar: (facilityId: number) =>
    ownerApiClient.get<OwnerCourierRadar>(
      `/owner/facilities/${facilityId}/courier-radar`
    ),

  /** الزر الذهبي: طلب مندوب لطلب مؤكد/قيد تحضير. POST /owner/orders/{oid}/request-courier */
  requestCourier: (orderId: number) =>
    ownerApiClient.post<OwnerTaskCard>(`/owner/orders/${orderId}/request-courier`),

  /** بطاقة مهمة التوصيل (ملف المندوب العام + الأزرار المتاحة). GET /owner/tasks/{tid} */
  getOwnerTask: (taskId: number) =>
    ownerApiClient.get<OwnerTaskCard>(`/owner/tasks/${taskId}`),

  /** تأكيد تسليم الطلب للمندوب عند المتجر. POST /owner/tasks/{tid}/handover */
  confirmHandover: (taskId: number, confirmed: boolean) =>
    ownerApiClient.post<OwnerTaskCard>(`/owner/tasks/${taskId}/handover`, {
      confirmed,
    }),

  /** قرار المالك على مشكلة تسليم. POST /owner/tasks/{tid}/problem-decision */
  decideProblem: (
    taskId: number,
    decision: "wait" | "cancel_customer" | "cancel_compensate" | "force_complete",
    reason?: string | null
  ) =>
    ownerApiClient.post<OwnerTaskCard>(`/owner/tasks/${taskId}/problem-decision`, {
      decision,
      reason: reason?.trim() || null,
    }),

  /** إجراء المالك على المهمة (إلغاء قبل/بعد، إعادة نداء، توصيل ذاتي). POST /owner/tasks/{tid}/action */
  ownerTaskAction: (
    taskId: number,
    action: "cancel_before_assignment" | "cancel_after_assignment" | "recall" | "self_delivery",
    reason?: string | null
  ) =>
    ownerApiClient.post<OwnerTaskCard>(`/owner/tasks/${taskId}/action`, {
      action,
      reason: reason?.trim() || null,
    }),

  /** تقييم المندوب بعد إتمام المهمة. POST /owner/courier-ratings */
  rateCourier: (data: CourierRatingInput) =>
    ownerApiClient.post<CourierRatingOut>("/owner/courier-ratings", data),

  /** تقدير أجرة توصيل من متجري. POST /owner/delivery-estimate */
  deliveryEstimate: (data: { facility_id: number; lat?: number | null; lng?: number | null }) =>
    ownerApiClient.post<OwnerDeliveryEstimateOut>("/owner/delivery-estimate", data),

  /* ─── ربط الشريك (واجهة شريك الخدمات) ───────────────── */

  /** طلب ربط نظام خارجي بمتجري. POST /partner/facilities/{fid}/link-request */
  partnerLinkRequest: (
    facilityId: number,
    data: { system_name: string; contact_email: string; link_mode?: "internal_system" | "mobile_backend" }
  ) =>
    ownerApiClient.post<{ detail: string; status_code: number }>(
      `/partner/facilities/${facilityId}/link-request`,
      data
    ),

  /** حالة الربط + صحة الشريك + آخر مزامنات. GET /partner/facilities/{fid}/link-status */
  partnerLinkStatus: (facilityId: number) =>
    ownerApiClient.get<PartnerLinkStatusOut>(`/partner/facilities/${facilityId}/link-status`),
};

/* ─── عقد التوصيل للمالك (من openapi الحي + ردود مجرّبة) ─── */

/** رادار المناديب — عدّاد فقط (عدسة خصوصية: لا أسماء ولا هواتف). */
export interface OwnerCourierRadar {
  available_count: number;
  radius_km: number;
  message: string;
}

/** الملف العام للمندوب — كما يراه المالك (بلا هاتف/اسم كامل). */
export interface OwnerCourierPublic {
  courier_id: number;
  public_name: string;
  photo_url: string | null;
  vehicle_type: string | null;
  verified_badge: boolean;
  avg_rating: number | null;
  rating_count: number;
  completed_tasks: number;
  level: string;
  level_ar: string;
  joined_year: number;
}

/** بطاقة مهمة المالك — الرد الموحّد من كل مسارات التوصيل. */
export interface OwnerTaskCard {
  task_id: number;
  order_id: number;
  status: string;
  status_ar: string;
  courier: OwnerCourierPublic | null;
  distance_display: string | null;
  billed_km: number | null;
  fee: number | null;
  per_km_price: number | null;
  breakdown: string | null;
  delivery_code: string | null;
  reserved_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  delivery_duration_minutes: number | null;
  owner_actions: string[];
}

/** مدخلات تقييم المندوب (نجوم إلزامية + 3 محاور اختيارية + تعليق). */
export interface CourierRatingInput {
  task_id: number;
  stars: number;
  timeliness?: number | null;
  care?: number | null;
  conduct?: number | null;
  comment?: string | null;
}

export interface CourierRatingOut {
  id: number;
  task_id: number;
  courier_id: number;
  facility_id: number;
  stars: number;
  timeliness: number | null;
  care: number | null;
  conduct: number | null;
  comment: string | null;
  review_state: string;
  created_at: string;
  edited_at: string | null;
}

/** تقدير أجرة المالك — نفس شكل تقدير العميل. */
export interface OwnerDeliveryEstimateOut {
  distance_km: number;
  distance_display: string;
  billed_km: number;
  fee: number;
  per_km_price: number;
  breakdown: string;
  imprecise_address: boolean;
  max_km_applied: number;
  exceeds_cap: boolean;
  note: string | null;
}

/** صحة الشريك داخل حالة الربط. */
export interface PartnerHealthOut {
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

/** حالة ربط الشريك — GET /partner/facilities/{fid}/link-status */
export interface PartnerLinkStatusOut {
  linked: boolean;
  request_status: string | null;
  status: string | null;
  key_prefix: string;
  system_name: string | null;
  health: PartnerHealthOut | null;
  recent_syncs: unknown[];
}
