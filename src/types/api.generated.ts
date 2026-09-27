/**
 * Tawfir API types — طبقة إعادة التصدير المولّدة آلياً (الجولة 22)
 * ═══════════════════════════════════════════════════════════════════
 * ⚠️ لا تُعدّل هذا الملف يدوياً — مولّد بواسطة `bun run api:types`.
 *
 * المصدر: openapi_live.json (نسخة من /openapi.json الحية للباك إند)
 *   + scripts/openapi-patches.json (فروق موثّقة بين السكمة المحفوظة
 *     والباك إند الحي — تُطبَّق قبل التوليد وتُبلَّغ في تقرير الأمر)
 *   1) openapi-typescript → src/types/api.openapi.ts (الأنواع الخام)
 *   2) هذا الملف: إعادة تصدير مسطّحة لكل المخططات + الأسماء التاريخية
 *      + export * من api-extra.ts (أنواع أحدث من السكمة: OTP،
 *        العضوية المجانية، الإشعارات الحقلية…)
 *
 * لتحديث الأنواع بعد تغييرات الباك إند:
 *   curl https://api.tawfir.giize.com/openapi.json > openapi_live.json
 *   bun run api:types
 * ثم راجع تقرير الترقيعات: أي ترقيع صار «زائداً» = السكمة الرسمية
 * لَحِقت به → احذفه من scripts/openapi-patches.json. أي نوع في
 * api-extra.ts صار موجوداً في السكمة → انقله واحذفه من هناك.
 */

import type { components } from "./api.openapi";

/* ═══ إعادة تصدير من السكمة المرقّعة (مولّدة) ═══ */

export type AdminLogin = components["schemas"]["AdminLogin"];
export type AdminWalletOverview = components["schemas"]["AdminWalletOverview"];
export type AggregateOut = components["schemas"]["AggregateOut"];
export type AuditLogOut = components["schemas"]["AuditLogOut"];
export type Body_import_products_api_v1_owner__facility_id__products_import_post = components["schemas"]["Body_import_products_api_v1_owner__facility_id__products_import_post"];
export type Body_membership_subscribe_api_v1_membership_subscribe_post = components["schemas"]["Body_membership_subscribe_api_v1_membership_subscribe_post"];
export type Body_pay_order_with_wallet_api_v1_orders__order_id__pay_post = components["schemas"]["Body_pay_order_with_wallet_api_v1_orders__order_id__pay_post"];
export type Body_upload_courier_document_api_v1_courier_documents_post = components["schemas"]["Body_upload_courier_document_api_v1_courier_documents_post"];
export type Body_upload_image_api_v1_uploads_post = components["schemas"]["Body_upload_image_api_v1_uploads_post"];
export type Body_upload_public_image_api_v1_uploads_public_post = components["schemas"]["Body_upload_public_image_api_v1_uploads_public_post"];
export type CardBrief = components["schemas"]["CardBrief"];
export type CardCreate = components["schemas"]["CardCreate"];
export type CardOut = components["schemas"]["CardOut"];
export type CardUpdate = components["schemas"]["CardUpdate"];
export type ChartPointOut = components["schemas"]["ChartPointOut"];
export type CourierAcceptTask = components["schemas"]["CourierAcceptTask"];
export type CourierAvailabilityToggle = components["schemas"]["CourierAvailabilityToggle"];
export type CourierCallCardOut = components["schemas"]["CourierCallCardOut"];
export type CourierDocUploadOut = components["schemas"]["CourierDocUploadOut"];
export type CourierLogin = components["schemas"]["CourierLogin"];
export type CourierMeOut = components["schemas"]["CourierMeOut"];
export type CourierMembershipCardOut = components["schemas"]["CourierMembershipCardOut"];
export type CourierPublicOut = components["schemas"]["CourierPublicOut"];
export type CourierPublicUpdate = components["schemas"]["CourierPublicUpdate"];
export type CourierPulseIn = components["schemas"]["CourierPulseIn"];
export type CourierRatingIn = components["schemas"]["CourierRatingIn"];
export type CourierRatingOut = components["schemas"]["CourierRatingOut"];
export type CourierRegister = components["schemas"]["CourierRegister"];
export type CourierRegisterOut = components["schemas"]["CourierRegisterOut"];
export type CourierStatsOut = components["schemas"]["CourierStatsOut"];
export type CourierSuspendDecision = components["schemas"]["CourierSuspendDecision"];
export type CourierTaskOut = components["schemas"]["CourierTaskOut"];
export type CourierTaskProgress = components["schemas"]["CourierTaskProgress"];
export type CourierVerifyDecision = components["schemas"]["CourierVerifyDecision"];
export type CourierWalletCreate = components["schemas"]["CourierWalletCreate"];
export type CourierWalletOut = components["schemas"]["CourierWalletOut"];
export type CourierWalletUpdate = components["schemas"]["CourierWalletUpdate"];
export type CustomerContactCard = components["schemas"]["CustomerContactCard"];
export type CustomerLogin = components["schemas"]["CustomerLogin"];
export type DecisionOut = components["schemas"]["DecisionOut"];
export type DeleteOut = components["schemas"]["DeleteOut"];
export type DeliveryEstimateIn = components["schemas"]["DeliveryEstimateIn"];
export type DeliveryEstimateOut = components["schemas"]["DeliveryEstimateOut"];
export type DeliveryProblemDecision = components["schemas"]["DeliveryProblemDecision"];
export type FacilityBrief = components["schemas"]["FacilityBrief"];
export type FacilityCreate = components["schemas"]["FacilityCreate"];
export type FacilityOut = components["schemas"]["FacilityOut"];
export type FacilitySummaryOut = components["schemas"]["FacilitySummaryOut"];
export type FacilityTotalsOut = components["schemas"]["FacilityTotalsOut"];
export type FacilityType = components["schemas"]["FacilityType"];
export type FacilityUpdate = components["schemas"]["FacilityUpdate"];
export type FacilityWalletCreate = components["schemas"]["FacilityWalletCreate"];
export type FacilityWalletOut = components["schemas"]["FacilityWalletOut"];
export type FacilityWalletUpdate = components["schemas"]["FacilityWalletUpdate"];
export type FavoriteOut = components["schemas"]["FavoriteOut"];
export type FavoriteToggleOut = components["schemas"]["FavoriteToggleOut"];
export type FavoritesListOut = components["schemas"]["FavoritesListOut"];
export type FcmTokenDelete = components["schemas"]["FcmTokenDelete"];
export type FcmTokenOut = components["schemas"]["FcmTokenOut"];
export type FcmTokenRegister = components["schemas"]["FcmTokenRegister"];
export type ForgotPasswordOut = components["schemas"]["ForgotPasswordOut"];
export type ForgotPasswordRequest = components["schemas"]["ForgotPasswordRequest"];
export type FreeMembershipFlagIn = components["schemas"]["FreeMembershipFlagIn"];
export type FreeMembershipFlagOut = components["schemas"]["FreeMembershipFlagOut"];
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];
export type MeOut = components["schemas"]["MeOut"];
export type MeUpdate = components["schemas"]["MeUpdate"];
export type MembershipInfoOut = components["schemas"]["MembershipInfoOut"];
export type MembershipRequestOut = components["schemas"]["MembershipRequestOut"];
export type MembershipSubscribeOut = components["schemas"]["MembershipSubscribeOut"];
export type MessageOut = components["schemas"]["MessageOut"];
export type MyMembershipCard = components["schemas"]["MyMembershipCard"];
export type NotificationOut = components["schemas"]["NotificationOut"];
export type NotifyToggleIn = components["schemas"]["NotifyToggleIn"];
export type NotifyToggleOut = components["schemas"]["NotifyToggleOut"];
export type OrderCreate = components["schemas"]["OrderCreate"];
export type OrderItemCreate = components["schemas"]["OrderItemCreate"];
export type OrderItemOut = components["schemas"]["OrderItemOut"];
export type OrderListOut = components["schemas"]["OrderListOut"];
export type OrderOut = components["schemas"]["OrderOut"];
export type OrderStatusUpdate = components["schemas"]["OrderStatusUpdate"];
export type OtpRequestIn = components["schemas"]["OtpRequestIn"];
export type OtpResendIn = components["schemas"]["OtpResendIn"];
export type OtpVerifyIn = components["schemas"]["OtpVerifyIn"];
export type OwnerFacilityUpdate = components["schemas"]["OwnerFacilityUpdate"];
export type OwnerHandoverConfirm = components["schemas"]["OwnerHandoverConfirm"];
export type OwnerLogin = components["schemas"]["OwnerLogin"];
export type OwnerRegister = components["schemas"]["OwnerRegister"];
export type OwnerRegisterOut = components["schemas"]["OwnerRegisterOut"];
export type OwnerStatsOut = components["schemas"]["OwnerStatsOut"];
export type OwnerTaskAction = components["schemas"]["OwnerTaskAction"];
export type OwnerTaskCardOut = components["schemas"]["OwnerTaskCardOut"];
export type PaginatedResponse_AuditLogOut_ = components["schemas"]["PaginatedResponse_AuditLogOut_"];
export type PaginatedResponse_CardOut_ = components["schemas"]["PaginatedResponse_CardOut_"];
export type PaginatedResponse_FacilityOut_ = components["schemas"]["PaginatedResponse_FacilityOut_"];
export type PaginatedResponse_NotificationOut_ = components["schemas"]["PaginatedResponse_NotificationOut_"];
export type PaginatedResponse_OrderListOut_ = components["schemas"]["PaginatedResponse_OrderListOut_"];
export type PaginatedResponse_PendingFacilityOut_ = components["schemas"]["PaginatedResponse_PendingFacilityOut_"];
export type PaginatedResponse_ProductOut_ = components["schemas"]["PaginatedResponse_ProductOut_"];
export type PaginatedResponse_ProductWithFacilityOut_ = components["schemas"]["PaginatedResponse_ProductWithFacilityOut_"];
export type PaginatedResponse_SpecialOfferOut_ = components["schemas"]["PaginatedResponse_SpecialOfferOut_"];
export type PaginatedResponse_UserOut_ = components["schemas"]["PaginatedResponse_UserOut_"];
export type PaginatedResponse_dict_ = components["schemas"]["PaginatedResponse_dict_"];
export type PartnerLinkDecision = components["schemas"]["PartnerLinkDecision"];
export type PartnerLinkRequestIn = components["schemas"]["PartnerLinkRequestIn"];
export type PartnerOfferEndIn = components["schemas"]["PartnerOfferEndIn"];
export type PartnerOfferIn = components["schemas"]["PartnerOfferIn"];
export type PartnerProductHideIn = components["schemas"]["PartnerProductHideIn"];
export type PartnerProductIn = components["schemas"]["PartnerProductIn"];
export type PartnerProductUpdateIn = components["schemas"]["PartnerProductUpdateIn"];
export type PartnerSyncResultOut = components["schemas"]["PartnerSyncResultOut"];
export type PasswordChangeRequest = components["schemas"]["PasswordChangeRequest"];
export type PaymentReceiptBriefOut = components["schemas"]["PaymentReceiptBriefOut"];
export type PendingFacilityOut = components["schemas"]["PendingFacilityOut"];
export type PricingPreviewOut = components["schemas"]["PricingPreviewOut"];
export type PricingPreviewRequest = components["schemas"]["PricingPreviewRequest"];
export type PricingSettingsUpdate = components["schemas"]["PricingSettingsUpdate"];
export type ProductAvailabilityUpdate = components["schemas"]["ProductAvailabilityUpdate"];
export type ProductCreate = components["schemas"]["ProductCreate"];
export type ProductDetailOut = components["schemas"]["ProductDetailOut"];
export type ProductImportResult = components["schemas"]["ProductImportResult"];
export type ProductOut = components["schemas"]["ProductOut"];
export type ProductUpdate = components["schemas"]["ProductUpdate"];
export type ProductWithFacilityOut = components["schemas"]["ProductWithFacilityOut"];
export type ProviderTotalsOut = components["schemas"]["ProviderTotalsOut"];
export type RadarCountOut = components["schemas"]["RadarCountOut"];
export type RatingCreateIn = components["schemas"]["RatingCreateIn"];
export type RatingOut = components["schemas"]["RatingOut"];
export type RatingsListOut = components["schemas"]["RatingsListOut"];
export type RefreshRequest = components["schemas"]["RefreshRequest"];
export type RegionCreate = components["schemas"]["RegionCreate"];
export type RegionOut = components["schemas"]["RegionOut"];
export type RegionUpdate = components["schemas"]["RegionUpdate"];
export type RegisterOut = components["schemas"]["RegisterOut"];
export type RequestRemainingPayment = components["schemas"]["RequestRemainingPayment"];
export type ResetPasswordRequest = components["schemas"]["ResetPasswordRequest"];
export type RoleUpdate = components["schemas"]["RoleUpdate"];
export type SavingsSummaryOut = components["schemas"]["SavingsSummaryOut"];
export type SpecialOfferCreate = components["schemas"]["SpecialOfferCreate"];
export type SpecialOfferCreateOut = components["schemas"]["SpecialOfferCreateOut"];
export type SpecialOfferFacilityBrief = components["schemas"]["SpecialOfferFacilityBrief"];
export type SpecialOfferOut = components["schemas"]["SpecialOfferOut"];
export type SpecialOfferProductBrief = components["schemas"]["SpecialOfferProductBrief"];
export type TaskItemLine = components["schemas"]["TaskItemLine"];
export type TokenOut = components["schemas"]["TokenOut"];
export type TokenPairOut = components["schemas"]["TokenPairOut"];
export type TopProductOut = components["schemas"]["TopProductOut"];
export type UnreadCountOut = components["schemas"]["UnreadCountOut"];
export type UploadOut = components["schemas"]["UploadOut"];
export type UserCardOut = components["schemas"]["UserCardOut"];
export type UserDetailOut = components["schemas"]["UserDetailOut"];
export type UserOut = components["schemas"]["UserOut"];
export type UserRegister = components["schemas"]["UserRegister"];
export type UserRole = components["schemas"]["UserRole"];
export type ValidationError = components["schemas"]["ValidationError"];
export type ViewIn = components["schemas"]["ViewIn"];
export type ViewOut = components["schemas"]["ViewOut"];
export type WalletPaymentsFlagIn = components["schemas"]["WalletPaymentsFlagIn"];
export type WalletPaymentsFlagOut = components["schemas"]["WalletPaymentsFlagOut"];
export type WalletPaymentsPage = components["schemas"]["WalletPaymentsPage"];
export type WalletPaymentsSummary = components["schemas"]["WalletPaymentsSummary"];
export type WalletProviderCreate = components["schemas"]["WalletProviderCreate"];
export type WalletProviderOut = components["schemas"]["WalletProviderOut"];
export type WalletProviderUpdate = components["schemas"]["WalletProviderUpdate"];
export type app__api__v1__endpoints__admin__approval__RejectBody = components["schemas"]["app__api__v1__endpoints__admin__approval__RejectBody"];
export type app__api__v1__endpoints__admin__membership_requests__RejectBody = components["schemas"]["app__api__v1__endpoints__admin__membership_requests__RejectBody"];

/* ═══ أسماء تاريخية (مولّدة) ═══ */

/** @legacy اسم تاريخي مستخدم في الكود — المصدر: CardOut */
export type Card = components["schemas"]["CardOut"];
/** @legacy اسم تاريخي مستخدم في الكود — المصدر: FacilityOut */
export type Facility = components["schemas"]["FacilityOut"];
/** @legacy اسم تاريخي مستخدم في الكود — المصدر: ProductOut */
export type Product = components["schemas"]["ProductOut"];
/** @legacy اسم تاريخي مستخدم في الكود — المصدر: RegionOut */
export type Region = components["schemas"]["RegionOut"];
/** @legacy اسم تاريخي مستخدم في الكود — المصدر: app__api__v1__endpoints__admin__membership_requests__RejectBody */
export type RejectBody = components["schemas"]["app__api__v1__endpoints__admin__membership_requests__RejectBody"];
/** @legacy اسم تاريخي مستخدم في الكود — المصدر: TokenOut */
export type AdminLoginResponse = components["schemas"]["TokenOut"];

/* ═══ الأنواع غير الموجودة في السكمة (مُصانة يدوياً في api-extra.ts) ═══ */
export * from "./api-extra";
