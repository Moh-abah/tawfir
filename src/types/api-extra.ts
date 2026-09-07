/**
 * أنواع API الإضافية «توفير» — الجزء المُصان يدوياً من طبقة الأنواع
 * ═════════════════════════════════════════════════════════════════════
 * البنية (الجولة 22 — أتمتة الأنواع):
 *   • api.openapi.ts  : مولّد آلياً من openapi_live.json + ترقيعات
 *                       scripts/openapi-patches.json (فروق السكمة المتقادمة)
 *   • api.generated.ts: مولّد آلياً — يعيد تصدير كل مخططات السكمة +
 *                       الأسماء التاريخية + export * من هنا.
 *   • api-extra.ts    : هذا الملف — الأنواع غير الموجودة في السكمة
 *                       أصلاً (نقاط نهاية أحدث من الملف المحفوظ:
 *                       OTP عبر واتساب، العضوية المجانية، إشعارات FCM
 *                       الحقلية، لوحة إحصائيات المشرف…).
 *
 * ⚠️ عند تحديث openapi_live.json شغّل `bun run api:types` وراجع التقرير:
 *    أي نوع هنا ظهر في السكمة → انقله واحذفه (سيُصدَّر آلياً منها).
 */

/* ─── Enums غير موجودة في السكمة بعد ─────────────────── */

/** حالة طلب العضوية. */
export type MembershipRequestStatus = 'pending' | 'approved' | 'rejected';

/** حالة الطلب (تتبّع). */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

/** طريقة الدفع. wallet غير متاحة حالياً (تُرجع 422). */
export type PaymentMethod = 'cash' | 'wallet';

/** نوع الإشعار — يحدّد الأيقونة والمسار عند النقر. */
export type NotificationType =
  | "order_new"
  | "order_confirmed"
  | "order_preparing"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "membership_new_request"
  | "membership_received"
  | "membership_approved"
  | "membership_rejected"
  | "membership_expiring"
  | "facility_approved"
  | "facility_rejected"
  | "owner_registered"
  | "special_offer_new"
  | "special_offer_ending"
  | "special_offer_soldout";

/* ─── مساعد عام (السكمة تُصدّر نسخاً مُقفلة لكل نوع) ─── */

/** صفحة نتائج موحّدة — تستخدمها كل القوائم في الواجهة. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/* ─── لوحة المشرف ───────────────────────────────────── */

export interface DashboardStats {
  regions: number;
  cards: number;
  published_cards: number;
  facilities: number;
  customers: number;
  owners: number;
  products: number;
  available_products: number;
  pending_facilities: number;
  pending_membership_requests: number;
  orders_today: number;
}

/* ─── OTP via WhatsApp (الجولة 20) ───────────────────── */

/** جسم POST /otp/request و POST /otp/resend. */
export interface OtpRequestInput {
  /** رقم الجوال المستهدف (يبدأ بـ 7 ومجموع 9 أرقام). */
  target: string;
  /** اسم المستخدم (اختياري — يُستخدم في نص رسالة واتساب). */
  name?: string | null;
}

/** ردّ POST /otp/request و POST /otp/resend.
 *  - delivered: تم محاولة الإرسال عبر webhook واتساب
 *  - dev_code: كود 6 أرقام يُرجع فقط في وضع التطوير (للاختبار) */
export interface OtpRequestOut {
  detail: string;
  ttl_seconds: number;
  delivered: boolean;
  dev_code?: string | null;
}

/** جسم POST /otp/verify. */
export interface OtpVerifyInput {
  target: string;
  code: string;
}

/** ردّ POST /otp/verify عند النجاح. الفشل يُرجع 422 مع detail. */
export interface OtpVerifyOut {
  verified: boolean;
  target: string;
}

/* ─── العضوية المجانية (الجولة 20) ───────────────────── */

/** ردّ POST /membership/subscribe-free (الجولة 20).
 * يستدعيها العميل بعد تفعيل المشرف للعضوية المجانية — تمنح عضوية
 * approved فوراً بلا دفع ولا رفع إيصال (is_free=true). */
export interface FreeMembershipSubscribeOut {
  detail: string;
  id: number;
  membership_number: string;
  expires_at: string;
  is_free: boolean;
}

/** ردّ GET /admin/settings/free-membership (auth: admin). */
export interface AdminFreeMembershipOut {
  is_free_membership_enabled: boolean;
  updated_by: number | null;
  updated_at?: string | null;
}

/** جسم PATCH /admin/settings/free-membership. */
export interface AdminFreeMembershipUpdate {
  is_free_membership_enabled: boolean;
}
