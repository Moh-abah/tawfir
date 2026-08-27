/**
 * Owner service — all owner gateway API calls.
 * Uses the dedicated owner API client (tawfir_owner_token cookie).
 *
 * POST /owner/login → TokenOut (مُتحقَّق منها حيّاً على الإنتاج).
 * POST /owner/register → OwnerRegisterOut {detail, user_id, facility_id, status}
 *   المنشأة تُنشأ معلّقة (status=بانتظار موافقة المشرف) بانتظار المراجعة اليدوية.
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

/** ─── تسجيل مالك منشأة جديدة (POST /owner/register — عام بلا توكن) ─── */

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
   * تسجيل حساب مالك + منشأته الجديدة.
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

  /* ─── طلبات المنشأة (للمالك) ─────────────────────────── */

  /**
   * طلبات منشأتي. GET /owner/{facilityId}/orders → Paginated<OrderListOut>.
   * الجولة 5: دعم فلترة الحالة وترقيم من الباك إند (كانت الفلترة محلية
   * على أول 20 طلباً فقط — تفقد الطلبات الأقدم).
   */
  getOwnerOrders: (
    facilityId: number,
    params?: { status?: string | null; page?: number; page_size?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    q.set("page", String(params?.page ?? 1));
    q.set("page_size", String(params?.page_size ?? 100));
    return ownerApiClient.get<Paginated<OrderListOut>>(
      `/owner/${facilityId}/orders?${q.toString()}`
    );
  },

  /** تحديث حالة طلب. PATCH /orders/{id}/status (مالك/مشرف). */
  updateOrderStatus: (orderId: number, status: string) =>
    ownerApiClient.patch<OrderOut>(`/orders/${orderId}/status`, { status }),
};
