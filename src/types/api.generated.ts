/**
 * Tawfir API types — derived from https://api.tawfir.giize.com/openapi.json
 * Source of truth: openapi.json (saved locally, fetched live from production).
 *
 * «توفير» — منصة يمنية للخصومات وطلب الوجبات.
 * الأدوار: العميل (تصفّح/طلب/اشتراك عضوية) · المالك (إدارة متجر) · المشرف.
 */

// ─── Enums ────────────────────────────────────────────
/** نوع المتجر — مطاعم ومقاهي فقط (لا public_facility). */
export type FacilityType = 'restaurant' | 'cafe';

/** أدوار المستخدمين. */
export type UserRole = 'admin' | 'owner' | 'customer';

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

// ─── Shared / Common ──────────────────────────────────
export interface TokenOut {
  access_token: string;
  /** رمز تحديث صالح 7 أيام (الجولة 5) — يُستخدم مع POST /auth/refresh */
  refresh_token?: string | null;
  token_type: string;
}

export interface MessageOut {
  detail: string;
  status_code?: number;
}

// ─── Auth — Refresh & Password Reset (الجولة الختامية) ─
/** جسم POST /auth/refresh */
export interface RefreshRequest {
  refresh_token: string;
}

/** استجابة POST /auth/forgot-password — reset_token يُرجع فقط خارج الإنتاج */
export interface ForgotPasswordOut {
  detail: string;
  status_code?: number;
  reset_token?: string | null;
}

/** جسم PUT /auth/reset-password */
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/** جسم PUT /me/password */
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// ─── Uploads (الجولة الختامية) ─────────────────────────
/** استجابة POST /uploads — المالك/الأدمن فقط */
export interface UploadOut {
  /** مسار نسبي مثل /uploads/products/x.webp — يُعرض عبر resolveImageUrl */
  url: string;
  folder: string;
  size_bytes: number;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

// ─── Paginated ─────────────────────────────────────────
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// ─── Region ────────────────────────────────────────────
export interface Region {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface RegionCreate {
  name: string;
  slug?: string;
  is_active?: boolean;
}

export interface RegionUpdate {
  name?: string;
  slug?: string;
  is_active?: boolean;
}

// ─── Card ──────────────────────────────────────────────
export interface CardBrief {
  id: number;
  name: string;
  discount_rate: number;
}

export interface Card {
  id: number;
  name: string;
  platform_name: string;
  discount_rate: number;
  region_id: number;
  is_published: boolean;
  display_order: number;
  facilities: CardBrief[];
  created_at: string;
}

export interface CardCreate {
  name: string;
  platform_name?: string;
  discount_rate?: number;
  region_id: number;
  is_published?: boolean;
  display_order?: number;
}

export interface CardUpdate {
  name?: string;
  platform_name?: string;
  discount_rate?: number;
  region_id?: number;
  is_published?: boolean;
  display_order?: number;
}

// ─── Facility ──────────────────────────────────────────
export interface FacilitySummaryOut {
  id: number;
  name: string;
  type: FacilityType;
  region_id: number;
  image_url: string | null;
  address: string | null;
  phone: string | null;
  working_hours: string | null;
  latitude: number | null;
  longitude: number | null;
  /** نسبة الخصم لعضوية توفير (10-30%). (الجولة 3) */
  discount_rate?: number;
}

export interface Facility {
  id: number;
  name: string;
  type: FacilityType;
  region_id: number;
  description: string | null;
  is_visible: boolean;
  display_order: number;
  cards: CardBrief[];
  owner_id: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  working_hours: string | null;
  image_url: string | null;
  /** نسبة الخصم لعضوية توفير (الجولة 3). */
  discount_rate?: number;
  /** حالة موافقة المشرف — undefined تعامَل كمُوافق عليها (توافق عكسي). */
  is_approved?: boolean;
  /** سبب الرفض إن رُفضت — null عندما لا يوجد رفض. */
  rejection_reason?: string | null;
  /** تاريخ الموافقة — null قبل الموافقة. */
  approved_at?: string | null;
  created_at: string;
}

export interface FacilityCreate {
  name: string;
  type?: FacilityType;
  region_id: number;
  description?: string | null;
  is_visible?: boolean;
  display_order?: number;
  card_ids?: number[];
  owner_id?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  working_hours?: string | null;
  image_url?: string | null;
  /** نسبة الخصم لعضوية توفير (الجولة 3). */
  discount_rate?: number;
}

export interface FacilityUpdate {
  name?: string;
  type?: FacilityType;
  region_id?: number;
  description?: string | null;
  is_visible?: boolean;
  display_order?: number;
  card_ids?: number[];
  owner_id?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  working_hours?: string | null;
  image_url?: string | null;
  /** نسبة الخصم لعضوية توفير (الجولة 3). */
  discount_rate?: number;
}

/** تحديث جزئي للمالك على متجره فقط (لا نوع/منطقة). */
export interface OwnerFacilityUpdate {
  name?: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  working_hours?: string | null;
  image_url?: string | null;
  is_visible?: boolean;
}

/** متجر معلّق بانتظار موافقة المشرف. */
export interface PendingFacilityOut {
  id: number;
  name: string;
  type: FacilityType;
  region_id: number;
  description: string | null;
  owner_id: number;
  owner_name: string | null;
  owner_email: string;
  owner_phone: string;
  address: string | null;
  phone: string | null;
  working_hours: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  /** نسبة الخصم المطلوبة للعضوية (الجولة 3). */
  discount_rate?: number;
  created_at: string;
  rejection_reason: string | null;
}

// ─── Product ───────────────────────────────────────────
/** منتج عند المالك (بدون معلومات المتجر المضمّنة). */
export interface Product {
  id: number;
  facility_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  is_available: boolean;
  available_quantity: number | null;
  display_order: number;
  created_at: string;
}

/** تفاصيل منتج كاملة + معلومات المتجر. GET /products/{id}. */
export interface ProductDetailOut {
  id: number;
  facility_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  is_available: boolean;
  available_quantity: number | null;
  display_order: number;
  created_at: string;
  facility: FacilitySummaryOut;
}

/** منتج مع معلومات متجره + المسافة. GET /products و /products/nearby. */
export interface ProductWithFacilityOut {
  id: number;
  facility_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  image_url: string | null;
  is_available: boolean;
  available_quantity: number | null;
  display_order: number;
  created_at: string;
  facility: FacilitySummaryOut;
  /** المسافة بالمقسومة (ناتج /products/nearby). null في /products. */
  distance_km: number | null;
}

export interface ProductCreate {
  name: string;
  description?: string | null;
  price: number | string;
  category: string;
  image_url?: string | null;
  is_available?: boolean;
  available_quantity?: number | null;
  display_order?: number;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  price?: number | string | null;
  category?: string;
  image_url?: string | null;
  is_available?: boolean;
  available_quantity?: number | null;
  display_order?: number;
}

export interface ProductAvailabilityUpdate {
  is_available: boolean;
}

export interface ProductImportResult {
  status: string;
  imported_count: number;
  errors: Record<string, unknown>[];
  message: string;
}

// ─── Orders ────────────────────────────────────────────
/** صنف داخل طلب جديد. */
export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}

/** جسم POST /orders. كل الأصناف يجب أن تنتمي لنفس المتجر. */
export interface OrderCreate {
  facility_id: number;
  items: OrderItemCreate[];
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_address?: string | null;
  payment_method?: PaymentMethod;
  notes?: string | null;
  /** معرّف العرض الخاص (الجولة 3) — null/undefined إن لم يكن على عرض. */
  special_offer_id?: number | null;
}

/** صنف داخل طلب موجود. */
export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  discount_applied: boolean;
  subtotal: number;
}

/** طلب كامل (تفاصيل + قائمة أصنافه). GET /orders/{id}. */
export interface OrderOut {
  id: number;
  customer_id: number;
  facility_id: number;
  facility_name: string | null;
  status: OrderStatus;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_address: string | null;
  delivery_fee: number;
  payment_method: PaymentMethod;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  items: OrderItemOut[];
}

/** عرض أخف للقوائم (بدون الأصناف). GET /orders و /admin/orders. */
export interface OrderListOut {
  id: number;
  customer_id: number;
  facility_id: number;
  facility_name: string | null;
  customer_name: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
}

/** جسم PATCH /orders/{id}/status. */
export interface OrderStatusUpdate {
  status: Exclude<OrderStatus, 'pending'>;
}

// ─── Membership ────────────────────────────────────────
/** بيانات التحويل الثابتة قبل الاشتراك. GET /membership/info. */
export interface MembershipInfoOut {
  amount: number;
  currency: string;
  transfer_account_name: string;
  transfer_account_number: string;
  wallet_name: string;
  instructions: string;
}

/** ردّ فوري بعد رفع صورة التحويل. POST /membership/subscribe. */
export interface MembershipSubscribeOut {
  detail: string;
  id: number;
  status: MembershipRequestStatus;
}

/** طلب اشتراك (رؤية العميل + المشرف). */
export interface MembershipRequestOut {
  id: number;
  user_id: number;
  amount: number;
  payment_method: string;
  transfer_account_name: string;
  transfer_account_number: string;
  receipt_image_url: string;
  status: MembershipRequestStatus;
  rejection_reason: string | null;
  membership_number: string | null;
  expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/** بطاقة عضوية العميل المُوافق عليها (داخل /me). null حين لا توجد. */
export interface MyMembershipCard {
  membership_number: string;
  membership_type: string;
  discount_rate: number;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

/** جسم رفض طلب الاشتراك. */
export interface RejectBody {
  reason: string;
}

// ─── User / Auth ───────────────────────────────────────
export interface UserOut {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserDetailOut extends UserOut {
  region_id: number | null;
}

export interface UserRegister {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  region_id?: number | null;
}

/** POST /auth/register — بلا عضوية تلقائية. */
export interface RegisterOut {
  detail: string;
  status_code: number;
  user_id: number;
}

export interface CustomerLogin {
  identifier: string;
  password: string;
}

export interface MeOut {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
  membership: MyMembershipCard | null;
}

/** PUT /me — الاسم/الجوال فقط (البريد ثابت). */
export interface MeUpdate {
  full_name?: string;
  phone?: string;
}

export interface RoleUpdate {
  role: string;
}

export interface AdminLogin {
  identifier: string;
  password: string;
}

export interface OwnerLogin {
  identifier: string;
  password: string;
}

export interface OwnerRegister {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  facility_name: string;
  facility_type: FacilityType;
  region_id: number;
  /** نسبة الخصم لعضوية توفير (10-30). (الجولة 3) */
  discount_rate?: number;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone_facility?: string | null;
  working_hours?: string | null;
  image_url?: string | null;
}

export interface OwnerRegisterOut {
  detail: string;
  status_code: number;
  user_id: number;
  facility_id: number;
  status: string;
}

// ─── Audit Log ─────────────────────────────────────────
export interface AuditLogOut {
  id: number;
  user_id: number | null;
  action_type: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ─── Dashboard ─────────────────────────────────────────
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

// ─── Notifications (الجولة 3) ──────────────────────────
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

/** إشعار — GET /notifications و PATCH /notifications/{id}/read. */
export interface NotificationOut {
  id: number;
  user_id: number;
  title: string;
  body: string;
  notification_type: NotificationType | string;
  /** JSON إضافي (order_id, facility_name, ...). null إن لم يُرسل. */
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

/** عدّاد غير المقروء — GET /notifications/unread-count. */
export interface UnreadCountOut {
  count: number;
}

// ─── FCM (الجولة 3) ───────────────────────────────────
/** تسجيل توكن FCM — POST /fcm/token. */
export interface FcmTokenRegister {
  token: string;
  device_info?: string | null;
}

/** حذف توكن FCM — DELETE /fcm/token. */
export interface FcmTokenDelete {
  token: string;
}

/** استجابة تسجيل/حذف توكن FCM. */
export interface FcmTokenOut {
  id: number;
  user_id: number;
  token: string;
  device_info: string | null;
  created_at: string;
}

// ─── Special Offers (الجولة 3) ─────────────────────────
/** ملخص المتجر داخل العرض الخاص. */
export interface SpecialOfferFacilityBrief {
  id: number;
  name: string;
  type: FacilityType;
  image_url: string | null;
  address: string | null;
  phone: string | null;
}

/** ملخص المنتج داخل العرض الخاص. */
export interface SpecialOfferProductBrief {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

/** عرض خاص عام — GET /special-offers. التسعير مُحسب في الخادم. */
export interface SpecialOfferOut {
  id: number;
  facility_id: number;
  product_id: number;
  title: string;
  offer_discount_rate: number;
  quantity_limit: number | null;
  quantity_sold: number;
  quantity_remaining: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  facility: SpecialOfferFacilityBrief | null;
  product: SpecialOfferProductBrief | null;
  base_price: number;
  member_price: number;
  non_member_price: number;
  facility_discount_rate: number;
}

/** جسم إنشاء عرض خاص — POST /owner/{fid}/special-offers. */
export interface SpecialOfferCreate {
  product_id: number;
  title: string;
  offer_discount_rate: number;
  quantity_limit?: number | null;
  ends_at?: string | null;
}

/** استجابة إنشاء عرض خاص — 201. */
export interface SpecialOfferCreateOut {
  id: number;
  facility_id: number;
  product_id: number;
  title: string;
  offer_discount_rate: number;
  quantity_limit: number | null;
  quantity_sold: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

// ─── Owner Stats (الجولة 3) ────────────────────────────
/** نقطة في رسم طلبات آخر 7 أيام. */
export interface ChartPointOut {
  date: string;
  count: number;
  revenue: number;
}

/** أكثر المنتجات طلباً في المتجر. */
export interface TopProductOut {
  product_id: number;
  name: string;
  count: number;
  revenue: number;
}

/** إحصائيات المالك — GET /owner/{fid}/stats. */
export interface OwnerStatsOut {
  total_products: number;
  available_products: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  today_orders: number;
  today_revenue: number;
  total_revenue: number;
  active_special_offers: number;
  facility_discount_rate: number;
  recent_orders: OrderListOut[];
  top_products: TopProductOut[];
  orders_chart: ChartPointOut[];
}

// ─── Compatibility aliases (مراجع تاريخية مسموحة) ────
/** @deprecated Use Card */
export type CardOut = Card;
/** @deprecated Use Facility */
export type FacilityOut = Facility;
/** @deprecated Use UserOut */
export type User = UserOut;
/** @deprecated Use UserDetailOut */
export type UserDetail = UserDetailOut;
/** @deprecated Use AuditLogOut */
export type AuditLog = AuditLogOut;
/** @deprecated Use TokenOut */
export type AdminLoginResponse = TokenOut;
