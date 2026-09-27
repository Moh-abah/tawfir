/**
 * أنواع API الإضافية «توفير» — الجزء المُصان يدوياً من طبقة الأنواع
 * ═════════════════════════════════════════════════════════════════════
 * هذا الملف مكتفٍ ذاتياً — لا يستورد من api.generated (لا دورات استيراد).
 * يُعاد تصديره كاملاً من api.generated.ts عبر `export *`.
 *
 * يحوي:
 *   • أنواع نقاط نهاية أحدث من الملف المحفوظ (OTP عبر واتساب، العضوية
 *     المجانية، إشعارات FCM الحقلية، لوحة إحصائيات المشرف).
 *   • جولة المحافظ اليمنية كاملة (الدفع بالتحويل اليدوي) — أنواع يدوية
 *     موثقة من تقرير ربط الباك إند v1.1.0 وسكيمة openapi الحية.
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

/** طريقة الدفع — cash (عند الاستلام) | wallet (تحويل يدوي عبر محفظة التاجر). */
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
  | "special_offer_soldout"
  /* جولة المحافظ اليمنية */
  | "order_payment_receipt"
  | "order_payment_remaining"
  | "order_payment_completion";

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

/* ─── حذف حساب العميل (متطلب Apple 5.1.1(v)) ───────── */

/** جسم DELETE /customer/account — مسار توفير المحلي (BFF).
 *  يمرَّر اختياريًا لتزويد الخادم بتوكنات FCM المسجّلة على هذا
 *  الجهاز فيزيلها من الباك إند أثناء الحذف (قبل انتهاء الجلسة). */
export interface AccountDeleteIn {
  fcm_tokens?: string[];
}

/** ردّ DELETE /customer/account.
 *  mode:
 *   - "deleted"    حُذف سجل الحساب كليًا من الباك إند.
 *   - "anonymized" قُنّنت البيانات الشخصية (الاسم/الجوال) وبقيت
 *                 الطلبات كسجلات تجارية مجهولة الهوية. */
export interface AccountDeleteOut {
  ok: boolean;
  mode: "deleted" | "anonymized";
  message: string;
}

/* ─── إضافات توفير: بطاقة هوية المندوب واللوحة اليمنية (2-a) ─── */

/** موقع المتجر المحدد — GPS مباشر أو من تطبيق الخرائط الخارجي.
 *  (نوع واجهة فقط — re-export نوعي بلا أي استيراد وقت تشغيل) */
export type { StoreLocation } from "@/components/shared/StoreLocationPicker";

/* ═══════════════════════════════════════════════════════════════════
   جولة المحافظ اليمنية (الدفع بالتحويل اليدوي)
   ═══════════════════════════════════════════════════════════════════ */

/** حالة إيصالة التحويل — partial_requested = التاجر طلب تكملة الدفعة. */
export type PaymentReceiptStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "partial_requested";

/** ملخص إيصالة الدفع المدمجة داخل الطلب (جولة المحافظ). */
export interface PaymentReceiptBriefOut {
  id: number;
  status: PaymentReceiptStatus;
  amount: number;
  receipt_image_url: string;
  sender_name?: string | null;
  wallet_snapshot?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  /* ─── الدفعة الناقصة (جولة التكملة) ─── */
  /** إجمالي ما أكّد التاجر استلامه (تراكمي). */
  paid_amount?: number | null;
  /** المتبقي على العميل. */
  remaining_amount?: number | null;
  remaining_note?: string | null;
  remaining_requested_at?: string | null;
  /** مبلغ تحويل المتبقي. */
  completion_amount?: number | null;
  /** صورة إشعار تحويل المتبقي. */
  completion_image_url?: string | null;
  completion_uploaded_at?: string | null;
  /** هل رُفع إشعار تكملة الدفعة الناقصة؟ */
  is_completion: boolean;
}

/** ردّ GET /orders/{id}/payment — شاشة حالة الدفع للعميل. */
export interface OrderPaymentStatusOut {
  order_id: number;
  payment_method: "cash" | "wallet";
  payment_status: PaymentReceiptStatus | null;
  payment_wallet_id: number | null;
  payment_wallet_label: string | null;
  /** المبلغ المطلوب تحويله «الآن» — عند وجود دفعة ناقصة = المتبقي وإلا إجمالي الطلب. */
  amount_due: number;
  /** إجمالي الطلب الكامل (وجبة + توصيل). */
  order_total: number;
  /** ما أكّد التاجر استلامه (تراكمي) — موجود في جولة الدفعة الناقصة. */
  paid_amount?: number | null;
  /** المتبقي على العميل. */
  remaining_amount?: number | null;
  /** ملاحظة التاجر عند طلب التكملة. */
  remaining_note?: string | null;
  is_completion?: boolean;
  payment_receipt: PaymentReceiptBriefOut | null;
}

/** ردّ POST /owner/orders/{id}/payment/request-remaining. */
export interface RequestRemainingOut {
  order_id: number;
  payment_status: PaymentReceiptStatus;
  order_total: number;
  paid_amount: number;
  remaining_amount: number;
  remaining_note: string | null;
  remaining_requested_at: string | null;
  detail: string;
}

/** جسم POST /owner/orders/{id}/payment/request-remaining. */
export interface RequestRemainingPaymentIn {
  /** المبلغ المستلم فعلياً حتى الآن (تراكمي — أكبر من صفر). */
  paid_amount: number;
  /** ملاحظة اختيارية للعميل (≤500). */
  note?: string | null;
}

/** عنصر سجل في شاشة «مدفوعات المطعم» (GET /owner/facilities/{fid}/payments). */
export interface WalletPaymentItem {
  order_id: number;
  status: string;
  amount: number;
  subtotal: number;
  delivery_fee: number;
  customer_name: string | null;
  customer_phone: string | null;
  wallet_label: string | null;
  payment_status: PaymentReceiptStatus;
  receipt: PaymentReceiptBriefOut | null;
  created_at: string;
}

/** إجماليات مدفوعات منشأة (شاشة «مدفوعات المطعم»). */
export interface WalletPaymentsSummary {
  wallet_orders_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  /** مجموع المبالغ المؤكدة (وجبة + توصيل). */
  approved_amount: number;
  pending_amount: number;
  /** مجموع طلبات المحافظ الموصَّلة (المبلغ الذي اشتغل به التاجر فعلياً). */
  delivered_amount: number;
  cash_orders_count: number;
  total_orders_count: number;
  partial_requested_count: number;
  partial_requested_amount: number;
  completed_partial_count: number;
}

/** قائمة مدفوعات منشأة + الإجماليات (نداء واحد). */
export interface WalletPaymentsPage {
  summary: WalletPaymentsSummary;
  items: WalletPaymentItem[];
  total: number;
  page: number;
  pages: number;
}

/** علم تفعيل الدفع عبر المحافظ (الإدارة). */
export interface WalletPaymentsFlagOut {
  wallet_payments_enabled: boolean;
  updated_by?: number | null;
}

/** جسم PATCH /admin/settings/wallet-payments. */
export interface WalletPaymentsFlagIn {
  wallet_payments_enabled: boolean;
}

/** محفظة يمنية من الدليل (للجميع — قوائم الاختيار). */
export interface WalletProviderOut {
  id: number;
  name: string;
  code?: string | null;
  is_active: boolean;
  display_order: number;
}

/** جسم إنشاء مزوّد محفظة (الإدارة). */
export interface WalletProviderCreateIn {
  name: string;
  code?: string | null;
  display_order?: number;
}

/** جسم تعديل مزوّد محفظة (الإدارة) — تعطيل بدل الحذف عند وجود استخدام. */
export interface WalletProviderUpdateIn {
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
  display_order?: number | null;
}

/** الحقول المشتركة بين محفظة المنشأة ومحفظة المندوب (بطاقة العرض). */
export interface WalletAccountBase {
  id: number;
  provider_id: number;
  provider_name?: string | null;
  account_type: string;
  point_number?: string | null;
  point_name?: string | null;
  phone_number?: string | null;
  account_name?: string | null;
  /** سطر جاهز للنسخ: «12345 (فرع أ)» أو «777123456 (أحمد)». */
  account_label?: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

/** محفظة منشأة — تُعرض للعميل عند الدفع ولتاجر في لوحته. */
export interface FacilityWalletOut extends WalletAccountBase {
  facility_id: number;
}

/** محفظة مندوب شخصية. */
export interface CourierWalletOut extends WalletAccountBase {
  courier_id: number;
}

/** جسم إضافة محفظة منشأة (نقطة أو هاتف). */
export interface FacilityWalletCreateIn {
  provider_id: number;
  account_type: "point" | "phone";
  point_number?: string | null;
  point_name?: string | null;
  phone_number?: string | null;
  account_name?: string | null;
  is_active?: boolean;
  display_order?: number;
}

/** جسم تعديل محفظة منشأة — كل الحقول اختيارية. */
export interface FacilityWalletUpdateIn {
  provider_id?: number;
  account_type?: "point" | "phone";
  point_number?: string | null;
  point_name?: string | null;
  phone_number?: string | null;
  account_name?: string | null;
  is_active?: boolean;
  display_order?: number;
}

/** جسم إضافة/تعديل محفظة مندوب — نفس بنية محفظة المنشأة. */
export type CourierWalletCreateIn = FacilityWalletCreateIn;
export type CourierWalletUpdateIn = FacilityWalletUpdateIn;

/** صف في النظرة الشاملة — by_provider. */
export interface WalletOverviewProviderRow {
  provider_id: number;
  provider_name: string;
  orders_count: number;
  approved_amount: number;
}

/** صف في النظرة الشاملة — top_facilities. */
export interface WalletOverviewFacilityRow {
  facility_id: number;
  facility_name: string;
  orders_count: number;
  approved_amount: number;
}

/** نظرة المحافظ الشاملة للإدارة (GET /admin/wallets/overview). */
export interface AdminWalletOverview {
  wallet_payments_enabled: boolean;
  providers_count: number;
  active_providers_count: number;
  facility_wallets_count: number;
  courier_wallets_count: number;
  wallet_orders_count: number;
  wallet_orders_amount: number;
  approved_count: number;
  approved_amount: number;
  pending_count: number;
  pending_amount: number;
  rejected_count: number;
  partial_requested_count: number;
  partial_requested_amount: number;
  by_provider: WalletOverviewProviderRow[];
  top_facilities: WalletOverviewFacilityRow[];
}

/** طلب معاينة السعر بعد الخصم (مالك — أثناء إضافة وجبة/عرض). */
export interface PricingPreviewRequest {
  /** السعر الرسمي للوجبة (ريال يمني). */
  price: number;
  /** نسبة العرض الخاص إن وجدت (0-50) — اتركها فارغة للوجبات العادية. */
  offer_discount_rate?: number | null;
}

/** ردّ معاينة السعر بعد الخصم (POST /owner/{facility_id}/pricing-preview). */
export interface PricingPreviewOut {
  base_price: number;
  facility_discount_rate: number;
  offer_discount_rate: number;
  member_price: number;
  non_member_price: number;
  member_saving: number;
}
