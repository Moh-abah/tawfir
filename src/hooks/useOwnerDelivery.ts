"use client";

/**
 * useOwnerDelivery — خطافات ميزات التوصيل لمالك المتجر (الجولة الرابعة).
 * ═══════════════════════════════════════════════════════════════════
 * • الرادار: عدّاد المناديب المتاحين حول المتجر (استطلاع 30ث).
 * • الزر الذهبي request-courier → بطاقة المهمة (تُخزَّن محلياً
 *   order→task لأن قائمة الطلبات لا تحمل task_id — قرار موثق).
 * • بطاقة المهمة الحية: استطلاع 10ث ما دامت المهمة نشطة.
 * • handover / problem-decision / action / rating — ردودها = البطاقة
 *   نفسها فتُحدّث الكاش مباشرة (إحساس فوري بلا انتظار الاستطلاع).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type { OwnerTaskCard, CourierRatingInput } from "@/services/owner.service";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { toast } from "@/hooks/use-toast";

/** حالات المهمة النشطة — خارجها يتوقف الاستطلاع (رشاقة). */
const ACTIVE_TASK_STATUSES = new Set([
  "calling",
  "reserved",
  "at_store",
  "picked_up",
  "at_customer",
  "problem",
]);

/* ─── خريطة order→task المحلية ───────────────────────────
   قائمة طلبات المالك (OrderListOut) لا تتضمن task_id من الخادم —
   الخادم يمنع إعادة request-courier ما دام للطلب نداء حي (418) ولا
   يوفر مسار «المهمة حسب الطلب». لذا نحفظ الربط محلياً عند نجاح
   الطلب، وننظّفه عند إغلاق المهمة (بعد دقائق لا حاجة له). */

const TASK_MAP_KEY = "tawfir_owner_order_tasks_v1";

function readTaskMap(): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TASK_MAP_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeTaskMap(map: Record<number, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TASK_MAP_KEY, JSON.stringify(map));
}

export function rememberOrderTask(orderId: number, taskId: number) {
  const map = readTaskMap();
  map[orderId] = taskId;
  writeTaskMap(map);
}

export function forgetOrderTask(orderId: number) {
  const map = readTaskMap();
  delete map[orderId];
  writeTaskMap(map);
}

export function getOrderTask(orderId: number): number | null {
  return readTaskMap()[orderId] ?? null;
}

/* ─── الرادار ──────────────────────────────────────────── */

export function useOwnerRadar(facilityId: number | null | undefined) {
  const hydrated = useOwnerAuthStore((s) => s.hydrated);
  const hasToken = useOwnerAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["owner-radar", facilityId],
    queryFn: () => ownerService.getCourierRadar(facilityId!),
    enabled: facilityId != null && facilityId > 0 && hydrated && hasToken,
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
    retry: 1,
  });
}

/* ─── بطاقة المهمة الحية ───────────────────────────────── */

export function useOwnerTask(taskId: number | null | undefined) {
  const hydrated = useOwnerAuthStore((s) => s.hydrated);
  const hasToken = useOwnerAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["owner-task", taskId],
    queryFn: () => ownerService.getOwnerTask(taskId!),
    enabled: taskId != null && taskId > 0 && hydrated && hasToken,
    refetchInterval: (query) => {
      const st = query.state.data?.status;
      return st && ACTIVE_TASK_STATUSES.has(st) ? 10 * 1000 : false;
    },
    staleTime: 0,
    retry: 1,
  });
}

/* ─── موقع العميل (قرار التوصيل الذاتي) ─────────────────── */

/**
 * تفاصيل الطلب بعين المالك (GET /orders/{id} — يُسمح له حرفياً):
 * إحداثيات العميل + عنوانه + هاتفه + ملاحظاته. تُجلب مرة واحدة
 * (الموقع لا يتغير أثناء الطلب) وبلا استطلاع — بطاقة المهمة
 * الحية 10ث هي التي تحكم الإيقاع.
 */
export function useOwnerOrderCustomerView(orderId: number | null | undefined) {
  const hydrated = useOwnerAuthStore((s) => s.hydrated);
  const hasToken = useOwnerAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["owner-order-customer", orderId],
    queryFn: () => ownerService.getOwnerOrder(orderId!),
    enabled: orderId != null && orderId > 0 && hydrated && hasToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/* ─── الزر الذهبي ─────────────────────────────────────── */

export function useRequestCourier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => ownerService.requestCourier(orderId),
    onSuccess: (task) => {
      rememberOrderTask(task.order_id, task.task_id);
      qc.setQueryData(["owner-task", task.task_id], task);
      toast({ title: "فُتح نداء المندوب", description: task.status_ar });
    },
    onError: (err: unknown) => {
      /* رد الخادم الحرفي — «هناك نداء حي لهذا الطلب» وأخواتها */
      toast({
        title: "تعذّر طلب المندوب",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

/* ─── إجراءات البطاقة (ردّها = البطاقة المحدّثة) ────────── */

function useTaskMutation<Vars>(
  fn: (vars: Vars) => Promise<OwnerTaskCard>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (task) => {
      qc.setQueryData(["owner-task", task.task_id], task);
      /* المهمة أُغلقت؟ نظّف الخريطة المحلية بعد إشعار النجاح */
      if (!task.owner_actions.length) {
        setTimeout(() => forgetOrderTask(task.order_id), 60 * 1000);
      }
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر تنفيذ الإجراء",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

export function useOwnerHandover() {
  const m = useTaskMutation((v: { taskId: number; confirmed: boolean }) =>
    ownerService.confirmHandover(v.taskId, v.confirmed),
  );
  return {
    ...m,
    mutateHandover: (v: { taskId: number; confirmed: boolean }, opts?: { onSuccess?: () => void }) =>
      m.mutate(v, { onSuccess: () => opts?.onSuccess?.() }),
  };
}

export function useOwnerProblemDecision() {
  return useTaskMutation(
    (v: {
      taskId: number;
      decision: "wait" | "cancel_customer" | "cancel_compensate" | "force_complete";
      reason?: string | null;
    }) => ownerService.decideProblem(v.taskId, v.decision, v.reason),
  );
}

export function useOwnerTaskAction() {
  return useTaskMutation(
    (v: {
      taskId: number;
      action: "cancel_before_assignment" | "cancel_after_assignment" | "recall" | "self_delivery";
      reason?: string | null;
    }) => ownerService.ownerTaskAction(v.taskId, v.action, v.reason),
  );
}

/* ─── تقييم المندوب ───────────────────────────────────── */

export function useOwnerCourierRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourierRatingInput) => ownerService.rateCourier(data),
    onSuccess: () => {
      toast({ title: "شكراً! سُجّل تقييمك للمندوب" });
      qc.invalidateQueries({ queryKey: ["owner-task"] });
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر إرسال التقييم",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}

/* ─── ربط الشريك ──────────────────────────────────────── */

export function usePartnerLinkStatus(facilityId: number | null | undefined) {
  const hydrated = useOwnerAuthStore((s) => s.hydrated);
  const hasToken = useOwnerAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: ["partner-link-status", facilityId],
    queryFn: () => ownerService.partnerLinkStatus(facilityId!),
    enabled: facilityId != null && facilityId > 0 && hydrated && hasToken,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function usePartnerLinkRequest(facilityId: number | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { system_name: string; contact_email: string; link_mode?: "internal_system" | "mobile_backend" }) =>
      ownerService.partnerLinkRequest(facilityId!, data),
    onSuccess: (res) => {
      toast({ title: res.detail });
      qc.invalidateQueries({ queryKey: ["partner-link-status", facilityId] });
    },
    onError: (err: unknown) => {
      toast({
        title: "تعذّر إرسال طلب الربط",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    },
  });
}
