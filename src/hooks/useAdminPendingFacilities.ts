"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { PendingFacility } from "@/services/admin.service";
import { useToast } from "@/hooks/use-toast";

/**
 * جلب قائمة المنشآت المعلّقة — يعاد التحقق عند العودة للصفحة
 * (staleTime: 0 كما في بقية استعلامات الأدمن).
 */
export function useAdminPendingFacilities(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["admin", "pending-facilities", page, pageSize],
    queryFn: () => adminService.getPendingFacilities(page, pageSize),
    staleTime: 0,
  });
}

/** رسالة خطأ عربية نظيفة — تفكّك تفاصيل 422 غير المتوقعة */
function cleanErrorMessage(error: Error): string {
  const raw = error.message || "";
  if (!raw || raw === "[object Object]") {
    return "تعذّر تنفيذ العملية — حاول مرة أخرى";
  }
  return raw;
}

/**
 * موافقة المشرف على منشأة معلّقة:
 * toast نجاح عربي + إبطال استعلام القائمة فتُزال البطاقة فوراً.
 */
export function useApproveFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => adminService.approveFacility(id),
    onSuccess: (facility) => {
      qc.invalidateQueries({ queryKey: ["admin", "pending-facilities"] });
      toast({
        title: "تم قبول المنشأة بنجاح",
        description: facility?.name,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "تعذّر قبول المنشأة",
        description: cleanErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * رفض منشأة معلّقة مع السبب:
 * toast عربي بالاسم والسبب + إبطال الاستعلام لإزالة البطاقة.
 */
export function useRejectFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminService.rejectFacility(id, reason),
    onSuccess: (facility, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "pending-facilities"] });
      toast({
        title: "تم رفض المنشأة بنجاح",
        description: facility?.name
          ? `${facility.name} — ${variables.reason}`
          : variables.reason,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "تعذّر رفض المنشأة",
        description: cleanErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export type { PendingFacility };
