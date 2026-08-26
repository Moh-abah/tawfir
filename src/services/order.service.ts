import { customerApiClient } from "./customer-api-client";
import type {
  OrderCreate,
  OrderOut,
  OrderListOut,
  OrderStatus,
  Paginated,
} from "@/types/api.generated";

/**
 * خدمة الطلبات للعميل.
 * - POST /orders → إنشاء طلب (الخصم يُطبّق آلياً إن كان العميل عضواً مفعّلاً).
 * - GET /orders → طلباتي (قائمة أخف).
 * - GET /orders/{id} → تفاصيل طلب (مع الأصناف).
 */
export const orderService = {
  /** إنشاء طلب جديد. كل الأصناف يجب أن تنتمي لنفس facility_id. */
  createOrder: (data: OrderCreate) =>
    customerApiClient.post<OrderOut>("/orders", data),

  /** طلباتي — قائمة مرتبة من الأحدث. فلترة اختيارية بالحالة. */
  getMyOrders: (status?: OrderStatus, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    return customerApiClient.get<Paginated<OrderListOut>>(
      `/orders?${params.toString()}`
    );
  },

  /** تفاصيل طلب واحد (مع الأصناف + موقع التوصيل). */
  getOrder: (id: number) =>
    customerApiClient.get<OrderOut>(`/orders/${id}`),
};
