"use client";

/**
 * useFinance.ts — hooks الجولة المالية v2 (React Query)
 * ═══════════════════════════════════════════════════════════════
 * مفاتيح الكاش كلها مسبوقة بـ"finance:" لعزلها عن بقية الجولات.
 * رسائل الأخطاء العربية (detail) تصل جاهزة من طبقة العملاء وتُعرض كما هي.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  adminFinanceService,
  courierFinanceService,
  customerFinanceService,
  ownerFinanceService,
  type EntriesFilter,
  type NotificationReviewInput,
  type NotificationSubmitInput,
} from "@/services/finance.service";
import { localeService, type LocaleSetInput } from "@/services/locale.service";
import { newIdempotencyKey, idempotencyHeader } from "@/lib/idempotency";

/* ═══════════════ السوق واللغة ═══════════════ */

/** بلد المستخدم وعملته — مصدر تحديد السوق (سعودي/يمني). */
export function useLocaleMe(enabled = true) {
  return useQuery({
    queryKey: ["finance:locale-me"],
    queryFn: () => localeService.getMe(),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** دليل الدول بالأعلام — عام. */
export function useLocaleCountries(enabled = true) {
  return useQuery({
    queryKey: ["finance:locale-countries"],
    queryFn: () => localeService.getCountries(),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSetLocaleMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LocaleSetInput) => localeService.setMe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:locale-me"] });
      toast({ title: "تم حفظ بلدك", description: "تكيّفت المنصة مع سوقك وعملتك" });
    },
  });
}

/* ═══════════════ العميل — الدفع المدمج ═══════════════ */

/** إعدادات بوابة الدفع — مرة واحدة عند فتح شاشة الدفع. */
export function usePaymentsConfig(enabled = true) {
  return useQuery({
    queryKey: ["finance:payments-config"],
    queryFn: () => customerFinanceService.getPaymentsConfig(),
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

/** سجل دفعات الطلب (كشف المدفوع سابقاً). */
export function useFinanceOrderPayments(orderId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["finance:order-payments", orderId],
    queryFn: () => customerFinanceService.getOrderPayments(orderId!),
    enabled: enabled && orderId != null && orderId > 0,
    staleTime: 15 * 1000,
  });
}

/**
 * تحقق الدفعة المدمجة — البرونزية-4: مفتاح idempotency جديد لكل محاولة
 * POST، ويُعاد استخدام **نفس المفتاح** في إعادة «تحقق مجددًا» لنفس النية.
 */
export function useVerifyEmbeddedPayment(orderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      moyasarPaymentId,
      idempotencyKey,
    }: {
      moyasarPaymentId: string;
      idempotencyKey?: string;
    }) =>
      customerFinanceService.verifyEmbeddedPayment(
        orderId,
        {
          moyasar_payment_id: moyasarPaymentId,
          idempotency_key: idempotencyKey,
        },
        idempotencyHeader(idempotencyKey ?? newIdempotencyKey())
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:order-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["order-detail", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/* ═══════════════ المالك — بطاقتي + إشعارات اليمن ═══════════════ */

/** بطاقة التاجر المالية — تُحدّث دورياً (FINANCE_POLLING_SECONDS حي). */
export function useOwnerFinanceCard(enabled = true, pollSeconds = 60) {
  return useQuery({
    queryKey: ["finance:owner-card"],
    queryFn: () => ownerFinanceService.getMyCard(),
    enabled,
    refetchInterval: Math.max(15, pollSeconds) * 1000,
    retry: 1,
  });
}

export function useOwnerYemenNotifications(enabled = true) {
  return useQuery({
    queryKey: ["finance:owner-yemen-notifications"],
    queryFn: () => ownerFinanceService.listYemenNotifications(),
    enabled,
    retry: 1,
  });
}

export function useSubmitYemenNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationSubmitInput) =>
      ownerFinanceService.submitYemenNotification(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:owner-yemen-notifications"] });
      qc.invalidateQueries({ queryKey: ["finance:owner-card"] });
      qc.invalidateQueries({ queryKey: ["finance:admin-yemen-notifications"] });
      toast({
        title: "تم رفع إشعار التسديد",
        description: "سيراجعها فريق المنصة وتظهر النتيجة على بطاقتك المالية",
      });
    },
  });
}

/* ═══════════════ المندوب — الوجهات + الرصيد + المستحقات ═══════════════ */

export function useCourierDestinations(enabled = true) {
  return useQuery({
    queryKey: ["finance:courier-destinations"],
    queryFn: () => courierFinanceService.listDestinations(),
    enabled,
    retry: 1,
  });
}

export function useCreateCourierDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof courierFinanceService.createDestination>[0]) =>
      courierFinanceService.createDestination(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:courier-destinations"] });
      toast({ title: "تمت إضافة وجهة الصرف", description: "ستُستعمل لتحويل مستحقاتك" });
    },
  });
}

export function useCourierBalance(enabled = true) {
  return useQuery({
    queryKey: ["finance:courier-balance"],
    queryFn: () => courierFinanceService.myBalance(),
    enabled,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

export function useMyPayouts(enabled = true) {
  return useQuery({
    queryKey: ["finance:my-payouts"],
    queryFn: () => courierFinanceService.myPayouts(),
    enabled,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

/* ═══════════════ الأدمن — الإعدادات + المراجعة + الصرف + الدفتر ═══════════════ */

export function useFinanceSettings(enabled = true) {
  return useQuery({
    queryKey: ["finance:settings"],
    queryFn: () => adminFinanceService.getSettings(),
    enabled,
    retry: 1,
  });
}

export function useUpdateFinanceSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminFinanceService.updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:settings"] });
      toast({
        title: "تم حفظ الإعداد",
        description: "القيمة الجديدة سارية فوراً على المنصة بلا إعادة نشر",
      });
    },
  });
}

export function useAdminYemenNotifications(status?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["finance:admin-yemen-notifications", status ?? "all"],
    queryFn: () => adminFinanceService.listYemenNotifications(status),
    enabled,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

function useNotificationDecision(kind: "approve" | "reject") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: NotificationReviewInput }) =>
      kind === "approve"
        ? adminFinanceService.approveNotification(id, body)
        : adminFinanceService.rejectNotification(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["finance:admin-yemen-notifications"] });
      qc.invalidateQueries({ queryKey: ["finance:owner-yemen-notifications"] });
      qc.invalidateQueries({ queryKey: ["finance:owner-overview"] });
      qc.invalidateQueries({ queryKey: ["finance:owner-card"] });
      toast({
        title: kind === "approve" ? "تم قبول الإشعار" : "تم رفض الإشعار",
        description:
          kind === "approve"
            ? `خُصم المبلغ من ذمة التاجر #${vars.id}`
            : "سيظهر سبب الرفض للتاجر مع إشعار الإعادة",
      });
    },
  });
}

export function useApproveYemenNotification() {
  return useNotificationDecision("approve");
}

export function useRejectYemenNotification() {
  return useNotificationDecision("reject");
}

export function useAdminPayouts(status?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["finance:admin-payouts", status ?? "all"],
    queryFn: () => adminFinanceService.listPayouts(status),
    enabled,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

/** تنفيذ صرف — مفتاح idempotency جديد لكل محاولة تنفيذ. */
export function useExecutePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      order_id?: number | null;
      courier_id?: number | null;
      amount?: number | null;
      destination_id?: number | null;
    }) =>
      adminFinanceService.executePayout(
        { ...body, idempotency_key: newIdempotencyKey() },
        idempotencyHeader(newIdempotencyKey())
      ),
    onSuccess: (payout) => {
      qc.invalidateQueries({ queryKey: ["finance:admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["finance:my-payouts"] });
      qc.invalidateQueries({ queryKey: ["finance:owner-overview"] });
      toast({
        title: `أُرسل أمر الصرف #${payout?.id ?? ""}`.trim(),
        description:
          payout?.status === "awaiting_activation"
            ? "بانتظار تفعيل عقد التحويلات الصادرة مع مويسر — الحالة محفوظة"
            : "حالة الصرف محدّثة في السجل",
      });
    },
  });
}

export function usePollPayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminFinanceService.pollPayouts(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance:admin-payouts"] });
      qc.invalidateQueries({ queryKey: ["finance:my-payouts"] });
      toast({ title: "تمت مزامنة حالات الصرف من مويسر" });
    },
  });
}

export function useOwnerOverview(enabled = true) {
  return useQuery({
    queryKey: ["finance:owner-overview"],
    queryFn: () => adminFinanceService.getOwnerOverview(),
    enabled,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

export function useAdminOwnerCard(ownerId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["finance:admin-owner-card", ownerId],
    queryFn: () => adminFinanceService.getOwnerCard(ownerId!),
    enabled: enabled && ownerId != null && ownerId > 0,
    retry: 1,
  });
}

export function useFinanceEntries(filter: EntriesFilter, enabled = true) {
  return useQuery({
    queryKey: ["finance:entries", filter],
    queryFn: () => adminFinanceService.getEntries(filter),
    enabled,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}
