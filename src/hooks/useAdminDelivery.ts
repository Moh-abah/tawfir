"use client";

/**
 * useAdminDelivery — خطافات إدارة أسطول المناديب/التسعير/الشركاء.
 * ═══════════════════════════════════════════════════════════════════
 * • التوثيق: قائمة حسب الحالة (فلتر status إلزامي — خلل 500 معروف عند
 *   استدعاء بلا معامل) + القرارات verify/reject/request_completion.
 * • الإيقاف/التنشيط + الرصد الحي (15ث).
 * • التسعير: قراءة/تحديث جزئي (PATCH).
 * • الشركاء: القائمة + القرارات (المفتاح الكامل يظهر مرة واحدة —
 *   يُمرر للطبقة العارضة فور النجاح).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type {
  AdminPricingUpdate,
  AdminPartnerDecisionOut,
} from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "@/hooks/use-toast";

export type CourierVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "awaiting_completion"
  | "suspended";

/* ─── طلبات التوثيق ──────────────────────────────────── */

export function useAdminCourierVerifications(status: CourierVerificationStatus) {
  return useQuery({
    queryKey: ["admin-courier-verifications", status],
    queryFn: () => adminService.getCourierVerificationRequests(status),
    staleTime: 15 * 1000,
    retry: 1,
  });
}

export function useAdminCourierDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      courierId: number;
      action: "verify" | "reject" | "request_completion";
      reason?: string | null;
      notes?: string | null;
    }) =>
      adminService.courierVerificationDecision(
        v.courierId,
        v.action,
        v.reason,
        v.notes
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-verifications"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر تنفيذ قرار التوثيق",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useAdminCourierSuspend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      courierId: number;
      action: "suspend" | "activate";
      reason?: string | null;
    }) => adminService.courierSuspendDecision(v.courierId, v.action, v.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courier-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-couriers-monitor"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر تنفيذ قرار الإيقاف/التنشيط",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

/* ─── الرصد الحي ─────────────────────────────────────── */

export function useAdminCouriersMonitor() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const hasToken = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["admin-couriers-monitor"],
    queryFn: () => adminService.getCouriersMonitor(),
    enabled: hydrated && hasToken,
    refetchInterval: 15 * 1000,
    staleTime: 5 * 1000,
    retry: 1,
  });
}

/* ─── التسعير ────────────────────────────────────────── */

export function useAdminPricing() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const hasToken = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["admin-pricing"],
    queryFn: () => adminService.getPricingSettings(),
    enabled: hydrated && hasToken,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useAdminPricingUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminPricingUpdate>) =>
      adminService.updatePricingSettings(data),
    onSuccess: (updated) => {
      qc.setQueryData(["admin-pricing"], updated);
      toast({ title: "حُفظت إعدادات التسعير" });
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر حفظ التسعير",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

/* ─── الشركاء ────────────────────────────────────────── */

export function useAdminPartners(status?: string | null) {
  return useQuery({
    queryKey: ["admin-partners", status ?? "all"],
    queryFn: () => adminService.getPartnerRequests(status),
    staleTime: 20 * 1000,
    retry: 1,
  });
}

export function useAdminPartnerDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      partnerId: number;
      action: "approve" | "reject" | "revoke" | "replace_key";
      reason?: string | null;
    }) => adminService.partnerDecision(v.partnerId, v.action, v.reason),
    onSuccess: (res: AdminPartnerDecisionOut) => {
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      /* لا توست هنا — المفتاح (إن وجد) يُعرض في حوار خاص بالمستهلك */
      if (!res.api_key) {
        toast({ title: res.message ?? res.detail ?? "نُفّذ القرار" });
      }
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر تنفيذ قرار الشريك",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useAdminPartnerHealth(partnerId: number | null) {
  return useQuery({
    queryKey: ["admin-partner-health", partnerId],
    queryFn: () => adminService.getPartnerHealth(partnerId!),
    enabled: partnerId != null && partnerId > 0,
    staleTime: 30 * 1000,
    retry: 1,
  });
}
