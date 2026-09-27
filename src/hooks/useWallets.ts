"use client";

/**
 * useWallets.ts — hooks جولة المحافظ اليمنية (React Query).
 * مقسّمة حسب البوابة: العميل / المالك / المندوب / الإدارة / عام.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  walletAdminService,
  walletCourierService,
  walletCustomerService,
  walletOwnerService,
  walletPublicService,
} from "@/services/wallet.service";
import type {
  FacilityWalletCreateIn,
  FacilityWalletUpdateIn,
  RequestRemainingPaymentIn,
  WalletProviderCreateIn,
  WalletProviderUpdateIn,
} from "@/types/api-extra";
import type { PricingPreviewRequest } from "@/types/api.generated";

/* ═══════════════ عام ═══════════════ */

/** قائمة المحافظ اليمنية النشطة (التاجر/المندوب/الإدارة). */
export function useWalletProviders(enabled = true) {
  return useQuery({
    queryKey: ["wallet-providers"],
    queryFn: () => walletPublicService.getProviders(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/* ═══════════════ العميل ═══════════════ */

/** محافظ المنشأة النشطة — منتقي المحفظة في نموذج الطلب. */
export function useFacilityWallets(facilityId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["facility-wallets", facilityId],
    queryFn: () => walletCustomerService.getFacilityWallets(facilityId!),
    enabled: enabled && facilityId != null && facilityId > 0,
    staleTime: 60 * 1000,
  });
}

/** شاشة حالة الدفع — polling حي (نفس الشاشة التي غادرها العميل). */
export function useOrderPayment(orderId: number | null) {
  return useQuery({
    queryKey: ["order-payment", orderId],
    queryFn: () => walletCustomerService.getOrderPayment(orderId!),
    enabled: orderId != null && orderId > 0,
    /** تحديث حي — العميل يعود من تطبيق المحفظة ويرى الحالة المحدثة. */
    refetchInterval: (query) => {
      const status = query.state.data?.payment_status;
      /* تتوقف المراقبة عند التأكيد النهائي */
      if (status === "approved") return false;
      return 8000;
    },
    refetchIntervalInBackground: false,
  });
}

/** زر «دفع» — رفع إشعار التحويل (multipart). */
export function usePayOrder(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      senderName,
    }: {
      file: File;
      senderName?: string | null;
    }) => walletCustomerService.payOrder(orderId, file, senderName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-payment", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({
        title: "تم إرسال إشعار التحويل",
        description: "سيراجع المتجر تحويلك ويؤكد طلبك قريباً",
      });
    },
    onError: () => {
      /* رسالة الخطأ العربية تُعرض من مكوّن النداء (detail من الخادم) */
    },
  });
}

/* ═══════════════ المالك ═══════════════ */

/** كل محافظ منشأتي (متضمنة المعطلة). */
export function useOwnerFacilityWallets(facilityId: number | null | undefined) {
  return useQuery({
    queryKey: ["owner-facility-wallets", facilityId],
    queryFn: () => walletOwnerService.getFacilityWallets(facilityId!),
    enabled: facilityId != null && facilityId > 0,
  });
}

function invalidateOwnerWallets(
  queryClient: ReturnType<typeof useQueryClient>,
  facilityId?: number
) {
  queryClient.invalidateQueries({ queryKey: ["owner-facility-wallets", facilityId] });
  queryClient.invalidateQueries({ queryKey: ["facility-wallets"] });
}

/** إضافة محفظة لمنشأتي. */
export function useCreateFacilityWallet(facilityId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FacilityWalletCreateIn) =>
      walletOwnerService.createFacilityWallet(facilityId, data),
    onSuccess: () => {
      invalidateOwnerWallets(queryClient, facilityId);
      toast({ title: "تمت إضافة المحفظة", description: "أصبحت متاحة لعملائك للدفع" });
    },
  });
}

/** تعديل محفظة منشأتي. */
export function useUpdateFacilityWallet(facilityId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, data }: { walletId: number; data: FacilityWalletUpdateIn }) =>
      walletOwnerService.updateFacilityWallet(facilityId, walletId, data),
    onSuccess: () => {
      invalidateOwnerWallets(queryClient, facilityId);
      toast({ title: "تم تحديث المحفظة" });
    },
  });
}

/** حذف محفظة منشأتي. */
export function useDeleteFacilityWallet(facilityId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletId: number) =>
      walletOwnerService.deleteFacilityWallet(facilityId, walletId),
    onSuccess: () => {
      invalidateOwnerWallets(queryClient, facilityId);
      toast({ title: "تم حذف المحفظة" });
    },
  });
}

/** شاشة «مدفوعات المطعم». */
export function useFacilityPayments(
  facilityId: number | null | undefined,
  params: { payment_status?: string | null; page?: number; page_size?: number }
) {
  return useQuery({
    queryKey: ["facility-payments", facilityId, params.payment_status, params.page],
    queryFn: () => walletOwnerService.getFacilityPayments(facilityId!, params),
    enabled: facilityId != null && facilityId > 0,
  });
}

/** محافظ مندوب (بطاقة المندوب/المهمة عند التاجر). */
export function useCourierWalletsOwner(courierId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["courier-wallets-owner", courierId],
    queryFn: () => walletOwnerService.getCourierWallets(courierId!),
    enabled: enabled && courierId != null && courierId > 0,
  });
}

/** زر «طلب الدفعة الناقصة». */
export function useRequestRemaining(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestRemainingPaymentIn) =>
      walletOwnerService.requestRemaining(orderId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["owner-orders"] });
      queryClient.invalidateQueries({ queryKey: ["facility-payments"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      toast({
        title: "تم إشعار العميل بالمتبقي",
        description: data.detail ?? "بانتظار تحويله للمتبقي ورفعه إشعار التحويل الجديد",
      });
    },
  });
}

/**
 * معاينة حية للسعر — تُستدعى أثناء الكتابة (debounce من المستدعي).
 * null عندما لا يكون السعر صالحاً بعد.
 */
export function usePricingPreview(facilityId: number | null | undefined, body: PricingPreviewRequest | null) {
  return useQuery({
    queryKey: ["pricing-preview", facilityId, body?.price, body?.offer_discount_rate ?? null],
    queryFn: () => walletOwnerService.pricingPreview(facilityId!, body!),
    enabled: facilityId != null && facilityId > 0 && body != null && (body?.price ?? 0) > 0,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

/* ═══════════════ المندوب ═══════════════ */

export function useMyCourierWallets() {
  return useQuery({
    queryKey: ["courier-wallets"],
    queryFn: () => walletCourierService.getMyWallets(),
  });
}

export function useCreateCourierWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FacilityWalletCreateIn) =>
      walletCourierService.createMyWallet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-wallets"] });
      toast({ title: "تمت إضافة المحفظة", description: "سيراها التاجر لتحويل أجرة التوصيل" });
    },
  });
}

export function useUpdateCourierWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, data }: { walletId: number; data: FacilityWalletUpdateIn }) =>
      walletCourierService.updateMyWallet(walletId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-wallets"] });
      toast({ title: "تم تحديث المحفظة" });
    },
  });
}

export function useDeleteCourierWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walletId: number) => walletCourierService.deleteMyWallet(walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-wallets"] });
      toast({ title: "تم حذف المحفظة" });
    },
  });
}

/* ═══════════════ الإدارة ═══════════════ */

export function useAdminWalletOverview() {
  return useQuery({
    queryKey: ["admin-wallet-overview"],
    queryFn: () => walletAdminService.getOverview(),
    refetchInterval: 30 * 1000,
  });
}

export function useAdminWalletProviders() {
  return useQuery({
    queryKey: ["admin-wallet-providers"],
    queryFn: () => walletAdminService.getProviders(),
  });
}

export function useAdminPaymentsFlag() {
  return useQuery({
    queryKey: ["admin-wallet-payments-flag"],
    queryFn: () => walletAdminService.getPaymentsFlag(),
  });
}

export function useSetAdminPaymentsFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => walletAdminService.setPaymentsFlag(enabled),
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-payments-flag"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
      toast({
        title: enabled ? "تم تفعيل الدفع عبر المحافظ" : "تم تعطيل الدفع عبر المحافظ",
        description: enabled
          ? "يستطيع التجار استقبال التحويلات الآن"
          : "لن يقبل النظام طلبات الدفع بالمحافظ",
      });
    },
  });
}

export function useCreateWalletProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WalletProviderCreateIn) => walletAdminService.createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-providers"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
      toast({ title: "تمت إضافة المحفظة للدليل" });
    },
  });
}

export function useUpdateWalletProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WalletProviderUpdateIn }) =>
      walletAdminService.updateProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-providers"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
      toast({ title: "تم تحديث المحفظة" });
    },
  });
}

export function useDeleteWalletProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => walletAdminService.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-overview"] });
      toast({ title: "تم حذف المحفظة من الدليل" });
    },
  });
}
