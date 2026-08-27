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
 * - GET /orders → طلباتي (قائمة أخف) + بحث برقم الطلب.
 * - GET /orders/{id} → تفاصيل طلب (مع الأصناف).
 * - POST /orders/{id}/cancel → إلغاء طلب معلّق (pending فقط).
 */
export const orderService = {
  /** إنشاء طلب جديد. كل الأصناف يجب أن تنتمي لنفس facility_id. */
  createOrder: (data: OrderCreate) =>
    customerApiClient.post<OrderOut>("/orders", data),

  /** طلباتي — قائمة مرتبة من الأحدث. فلترة اختيارية بالحالة + بحث برقم الطلب. */
  getMyOrders: (
    status?: OrderStatus,
    search?: string,
    page = 1,
    pageSize = 20
  ) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search && search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    return customerApiClient.get<Paginated<OrderListOut>>(
      `/orders?${params.toString()}`
    );
  },

  /** تفاصيل طلب واحد (مع الأصناف + موقع التوصيل). */
  getOrder: (id: number) =>
    customerApiClient.get<OrderOut>(`/orders/${id}`),

  /**
   * إلغاء طلبي — POST /orders/{id}/cancel.
   * - pending فقط؛ 409 «لا يمكن إلغاء طلب بدأ تحضيره».
   * - 403 «لا تملك صلاحية إلغاء هذا الطلب» لطلبات غيري.
   * - يعيد الطلب بحالته الجديدة (cancelled) — الخادم يسترجع المخزون وينعش العروض.
   */
  cancelOrder: (id: number) =>
    customerApiClient.post<OrderOut>(`/orders/${id}/cancel`),
};
