"use client";

/**
 * wallet.service.ts — جولة المحافظ اليمنية (الدفع بالتحويل اليدوي).
 * ═══════════════════════════════════════════════════════════════
 * كل نداءات المحافظ في مكان واحد، مقسّمة حسب البوابة:
 *  - العميل   (customerApiClient): محافظ المنشأة + رفع الإشعار + حالة الدفع
 *  - المالك   (ownerApiClient):     إدارة محافظ منشأته + مدفوعات المطعم +
 *                                   الدفعة الناقصة + محافظ المندوب + معاينة السعر
 *  - المندوب  (courierApiClient):   محافظي الشخصية (CRUD — سقف 5)
 *  - الإدارة  (apiClient):          دليل المحافظ + النظرة الشاملة + علم التفعيل
 *  - عام     (customerApiClient):  GET /wallets/providers (أي مستخدم موثق)
 *
 * كل الأخطاء تصل برسائلها العربية من عملاء الـ API كما هي (قاعدة §7-7).
 */

import { customerApiClient, type CustomerApiError } from "./customer-api-client";
import { ownerApiClient, type OwnerApiError } from "./owner-api-client";
import { courierApiClient } from "./courier-api-client";
import { apiClient } from "./api-client";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { useCourierAuthStore } from "@/store/courierAuth.store";
import { useAuthStore } from "@/store/auth.store";
import type {
  AdminWalletOverview,
  CourierWalletOut,
  FacilityWalletOut,
  Paginated,
  PaymentReceiptBriefOut,
  PricingPreviewOut,
  PricingPreviewRequest,
  WalletPaymentsFlagOut,
  WalletPaymentsPage,
  WalletPaymentsSummary,
  WalletProviderOut,
  OrderOut,
} from "@/types/api.generated";
import type {
  CourierWalletCreateIn,
  CourierWalletUpdateIn,
  FacilityWalletCreateIn,
  FacilityWalletUpdateIn,
  OrderPaymentStatusOut,
  RequestRemainingOut,
  RequestRemainingPaymentIn,
  WalletPaymentItem,
  WalletProviderCreateIn,
  WalletProviderUpdateIn,
} from "@/types/api-extra";

/* ─── أنواع ردود النقاط المركّبة ─────────────────────────── */

/** صفحة مدفوعات المطعم — الإجماليات + السجلات في نداء واحد. */
export interface FacilityPaymentsPage {
  summary: WalletPaymentsSummary;
  items: WalletPaymentItem[];
  total: number;
  page: number;
  pages: number;
}

export type { WalletPaymentsSummary, PaymentReceiptBriefOut };

/* ═══════════════ عام (أي مستخدم موثق) ═══════════════ */

/**
 * توكن أي بوابة متاحة — GET /wallets/providers مفتوح لأي مستخدم موثق
 * (عميل/مالك/مندوب/مشرف)، والنداء قد يحدث من أي بوابة، فنجلب التوكن
 * بنفس أولوية upload.service: العميل ← المالك ← المندوب ← المشرف + الكوكيز.
 */
function resolveAnyPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  const readCookie = (name: string): string | null => {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  };
  return (
    useCustomerAuthStore.getState().accessToken ??
    useOwnerAuthStore.getState().accessToken ??
    useCourierAuthStore.getState().accessToken ??
    useAuthStore.getState().accessToken ??
    readCookie("tawfir_customer_token") ??
    readCookie("tawfir_owner_token") ??
    readCookie("tawfir_admin_token") ??
    null
  );
}

export const walletPublicService = {
  /** قائمة المحافظ اليمنية النشطة — لكل قوائم الاختيار (التاجر/المندوب/الإدارة). */
  getProviders: async (): Promise<WalletProviderOut[]> => {
    const token = resolveAnyPortalToken();
    const res = await fetch("/api/wallets/providers", {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { detail?: string }
        | null;
      throw new Error(
        data?.detail ?? "تعذّر تحميل قائمة المحافظ اليمنية"
      );
    }
    return (await res.json()) as WalletProviderOut[];
  },
};

/* ═══════════════ العميل ═══════════════ */

export const walletCustomerService = {
  /** محافظ المنشأة النشطة — شاشة اختيار المحفظة في نموذج الطلب. */
  getFacilityWallets: (facilityId: number) =>
    customerApiClient.get<FacilityWalletOut[]>(`/facilities/${facilityId}/wallets`),

  /**
   * زر «دفع» — رفع صورة إشعار التحويل (multipart/form-data).
   * الصور حتى 10 ميجابايت تُضغط تلقائياً على الخادم — لا نعالجها في التطبيق.
   * نفس النقطة تتعرّف تلقائياً على إشعار التكملة (الدفعة الناقصة).
   */
  payOrder: (orderId: number, receiptImage: File, senderName?: string | null) => {
    const fd = new FormData();
    fd.append("receipt_image", receiptImage);
    if (senderName && senderName.trim()) fd.append("sender_name", senderName.trim());
    return customerApiClient.post<OrderOut>(`/orders/${orderId}/pay`, fd);
  },

  /** شاشة حالة الدفع — نفس الشاشة التي غادرها العميل للتحويل. */
  getOrderPayment: (orderId: number) =>
    customerApiClient.get<OrderPaymentStatusOut>(`/orders/${orderId}/payment`),
};

/* ═══════════════ المالك (التاجر) ═══════════════ */

export const walletOwnerService = {
  /** كل محافظ منشأتي (متضمنة المعطلة). */
  getFacilityWallets: (facilityId: number) =>
    ownerApiClient.get<FacilityWalletOut[]>(`/owner/facilities/${facilityId}/wallets`),

  /** إضافة محفظة (سقف 10 لكل منشأة). */
  createFacilityWallet: (facilityId: number, data: FacilityWalletCreateIn) =>
    ownerApiClient.post<FacilityWalletOut>(`/owner/facilities/${facilityId}/wallets`, data),

  /** تعديل محفظة — is_active:false يخفيها عن العملاء. */
  updateFacilityWallet: (facilityId: number, walletId: number, data: FacilityWalletUpdateIn) =>
    ownerApiClient.patch<FacilityWalletOut>(
      `/owner/facilities/${facilityId}/wallets/${walletId}`,
      data
    ),

  /** حذف محفظة. */
  deleteFacilityWallet: (facilityId: number, walletId: number) =>
    ownerApiClient.delete<{ detail?: string }>(
      `/owner/facilities/${facilityId}/wallets/${walletId}`
    ),

  /** شاشة «مدفوعات المطعم» — السجلات + الإجماليات في نداء واحد. */
  getFacilityPayments: (
    facilityId: number,
    params?: { payment_status?: string | null; page?: number; page_size?: number }
  ) => {
    const q = new URLSearchParams();
    if (params?.payment_status) q.set("payment_status", params.payment_status);
    q.set("page", String(params?.page ?? 1));
    q.set("page_size", String(params?.page_size ?? 20));
    return ownerApiClient.get<FacilityPaymentsPage>(
      `/owner/facilities/${facilityId}/payments?${q.toString()}`
    );
  },

  /** محافظ مندوب — لتحويل أجرة التوصيل له. */
  getCourierWallets: (courierId: number) =>
    ownerApiClient.get<CourierWalletOut[]>(`/owner/couriers/${courierId}/wallets`),

  /** زر «طلب الدفعة الناقصة» — إشعار فوري للعميل بالمتبقي. */
  requestRemaining: (orderId: number, data: RequestRemainingPaymentIn) =>
    ownerApiClient.post<RequestRemainingOut>(
      `/owner/orders/${orderId}/payment/request-remaining`,
      data
    ),

  /** معاينة حية للسعر — شفافية التاجر عند إضافة وجبة/عرض. */
  pricingPreview: (facilityId: number, data: PricingPreviewRequest) =>
    ownerApiClient.post<PricingPreviewOut>(`/owner/${facilityId}/pricing-preview`, data),
};

/* ═══════════════ المندوب ═══════════════ */

export const walletCourierService = {
  /** محافظي الشخصية (سقف 5). */
  getMyWallets: () => courierApiClient.get<CourierWalletOut[]>("/courier/wallets"),

  createMyWallet: (data: CourierWalletCreateIn) =>
    courierApiClient.post<CourierWalletOut>("/courier/wallets", data),

  updateMyWallet: (walletId: number, data: CourierWalletUpdateIn) =>
    courierApiClient.patch<CourierWalletOut>(`/courier/wallets/${walletId}`, data),

  deleteMyWallet: (walletId: number) =>
    courierApiClient.delete<{ detail?: string }>(`/courier/wallets/${walletId}`),
};

/* ═══════════════ الإدارة ═══════════════ */

export const walletAdminService = {
  /** الدليل كاملاً (متضمناً المعطل). */
  getProviders: () => apiClient.get<WalletProviderOut[]>("/admin/wallet-providers"),

  createProvider: (data: WalletProviderCreateIn) =>
    apiClient.post<WalletProviderOut>("/admin/wallet-providers", data),

  updateProvider: (providerId: number, data: WalletProviderUpdateIn) =>
    apiClient.patch<WalletProviderOut>(`/admin/wallet-providers/${providerId}`, data),

  deleteProvider: (providerId: number) =>
    apiClient.delete<{ detail?: string }>(`/admin/wallet-providers/${providerId}`),

  /** النظرة الشاملة — المحافظ والتحويلات. */
  getOverview: () => apiClient.get<AdminWalletOverview>("/admin/wallets/overview"),

  /** علم تشغيل/إيقاف الدفع عبر المحافظ (حي). */
  getPaymentsFlag: () =>
    apiClient.get<WalletPaymentsFlagOut>("/admin/settings/wallet-payments"),

  setPaymentsFlag: (enabled: boolean) =>
    apiClient.patch<WalletPaymentsFlagOut>("/admin/settings/wallet-payments", {
      wallet_payments_enabled: enabled,
    }),
};

/* ═══════════════ مساعدات عرض مشتركة ═══════════════ */

/** تسميات حالة الإيصالة (عربية جاهزة للعرض). */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "تم تأكيد الدفع",
  rejected: "مرفوض",
  partial_requested: "بانتظار تكملة الدفعة",
};

/** أصناف الشارة لكل حالة إيصالة (Tailwind tokens فقط). */
export const PAYMENT_STATUS_TONE: Record<string, string> = {
  pending: "bg-accent/15 text-accent-ink border-accent/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  partial_requested: "bg-accent/15 text-accent-ink border-accent/40",
};

export type { CustomerApiError, OwnerApiError, Paginated };
