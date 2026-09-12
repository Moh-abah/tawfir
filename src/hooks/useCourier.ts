"use client";

/**
 * خطافات بوابة المندوب — جزيرة مستقلة (§7-2).
 * الأنماط مستنسخة من خطافات البوابات القائمة (hydrate + enabled +
 * staleTime + placeholderData) — لكن مفتاح الاستعلام «courier:*» معزول
 * تماماً عن كاش العميل/المالك/المشرف.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courierAuthService, courierService } from "@/services/courier.service";
import {
  CourierApiError,
  type CourierCallCard,
  type CourierMe,
  type CourierTask,
} from "@/services/courier-api-client";
import { useCourierAuthStore } from "@/store/courierAuth.store";

/* ─── الجلسة ───────────────────────────────────────────── */

/** ترطيب المتجر + قراءة حالة الدخول */
export function useCourierSession() {
  const hydrate = useCourierAuthStore((s) => s.hydrate);
  const hydrated = useCourierAuthStore((s) => s.hydrated);
  const hasToken = useCourierAuthStore((s) => Boolean(s.accessToken));

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return { hydrated, hasToken };
}

/* ─── GET /courier/me ──────────────────────────────────── */

export function useCourierMe(enabled = true) {
  const { hydrated, hasToken } = useCourierSession();
  return useQuery({
    queryKey: ["courier:me"],
    queryFn: () => courierService.me(),
    enabled: enabled && hydrated && hasToken,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/* ─── GET /courier/calls — رادار النداءات (استطلاع 5ث) ──── */

export function useCourierCalls(enabled = true) {
  const { hydrated, hasToken } = useCourierSession();
  return useQuery({
    queryKey: ["courier:calls"],
    queryFn: () => courierService.calls(),
    enabled: enabled && hydrated && hasToken,
    refetchInterval: 5 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: 1,
  });
}

/* ─── GET /courier/tasks/current (استطلاع 10ث) ──────────── */

/**
 * 404 من هذا المسار = «لا مهمة جارية لك حالياً» (حالة طبيعية وليست
 * خطأ) — نرتجعها null بدل رميها كي تعرض الشاشة الحالة الفارغة.
 */
export function useCourierCurrentTask(enabled = true) {
  const { hydrated, hasToken } = useCourierSession();
  return useQuery<CourierTask | null>({
    queryKey: ["courier:current-task"],
    queryFn: async () => {
      try {
        return await courierService.currentTask();
      } catch (err) {
        if (
          err instanceof CourierApiError &&
          (err.status === 404 ||
            err.message.includes("لا مهمة جارية"))
        ) {
          return null;
        }
        throw err;
      }
    },
    enabled: enabled && hydrated && hasToken,
    refetchInterval: 10 * 1000,
    staleTime: 0,
    retry: 1,
  });
}

/* ─── GET /courier/tasks — السجل ────────────────────────── */

export function useCourierTasksHistory(
  params: {
    period?: "all" | "today" | "week" | "month";
    status?: "completed" | "cancelled";
    page?: number;
  },
  enabled = true,
) {
  const { hydrated, hasToken } = useCourierSession();
  return useQuery({
    queryKey: ["courier:tasks", params],
    queryFn: () => courierService.tasksHistory(params),
    enabled: enabled && hydrated && hasToken,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 1,
  });
}

/* ─── GET /courier/stats ────────────────────────────────── */

export function useCourierStats(enabled = true) {
  const { hydrated, hasToken } = useCourierSession();
  return useQuery({
    queryKey: ["courier:stats"],
    queryFn: () => courierService.stats(),
    enabled: enabled && hydrated && hasToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/* ─── دخول / خروج ──────────────────────────────────────── */

export function useCourierLogin() {
  const setAuth = useCourierAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (body: { identifier: string; password: string }) =>
      courierAuthService.login(body),
    onSuccess: (pair) => {
      setAuth(pair.access_token, pair.refresh_token);
    },
  });
}

export function useCourierLogout() {
  const clearAuth = useCourierAuthStore((s) => s.clearAuth);
  const qc = useQueryClient();
  return useCallback(() => {
    clearAuth();
    void qc.removeQueries({ queryKey: ["courier"] });
  }, [clearAuth, qc]);
}

/* ─── التوفر ───────────────────────────────────────────── */

export function useCourierAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (available: boolean) =>
      courierService.setAvailability({ available }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["courier:me"] });
      void qc.invalidateQueries({ queryKey: ["courier:calls"] });
    },
  });
}

/* ─── النبضة (دائرة النبض الرئيسية) ────────────────────── */

/**
 * دائرة النبض — ترسل الموقع الحي كل 30 ثانية أثناء التوفر + عند كل
 * حركة GPS > 25م (خنق الجهاز والخادم معاً — الخادم يقيّد 3ث كحد أدنى).
 */
export function useCourierPulse(active: boolean) {
  const lastSent = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [lastPulseAt, setLastPulseAt] = useState<number | null>(null);
  const [pulseError, setPulseError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  /* قراءة البطارية (اختيارية — غير متوفرة في بعض المتصفحات) */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number }>;
    };
    if (typeof nav.getBattery === "function") {
      nav
        .getBattery()
        .then((b) => setBattery(Math.round(b.level * 100)))
        .catch(() => undefined);
    }
  }, []);

  /* مراقبة الموقع الحي */
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setPulseError("تعذّر الوصول لموقعك الحي — فعّل خدمة الموقع بالجهاز");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);

  /* إرسال النبضة عند توفر إحداثيات جديدة */
  useEffect(() => {
    if (!active || !coords) return;
    const now = Date.now();
    const last = lastSent.current;
    const moved =
      !last ||
      Math.abs(coords.lat - last.lat) > 0.00025 ||
      Math.abs(coords.lng - last.lng) > 0.00025;
    const due = !last || now - last.t > 30 * 1000;
    if (!moved && !due) return;
    lastSent.current = { ...coords, t: now };
    courierService
      .pulse({
        lat: coords.lat,
        lng: coords.lng,
        battery_level: battery,
      })
      .then(() => {
        setLastPulseAt(Date.now());
        setPulseError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof CourierApiError && err.status === 0) {
          setPulseError("النبضة متوقفة مؤقتاً — لا اتصال بالخادم");
        }
      });
  }, [active, coords, battery]);

  return { coords, battery, lastPulseAt, pulseError };
}

/* ─── قبول النداء ──────────────────────────────────────── */

export function useCourierAcceptCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (callId?: number) => courierService.acceptCall(callId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["courier:calls"] });
      void qc.invalidateQueries({ queryKey: ["courier:current-task"] });
      void qc.invalidateQueries({ queryKey: ["courier:me"] });
    },
  });
}

/* ─── تقدم المهمة ──────────────────────────────────────── */

export function useCourierTaskProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      taskId: number;
      body: Parameters<typeof courierService.progress>[1];
    }) => courierService.progress(vars.taskId, vars.body),
    onSuccess: (updated: CourierTask) => {
      qc.setQueryData(["courier:current-task"], updated);
      void qc.invalidateQueries({ queryKey: ["courier:me"] });
      if (updated.status === "completed" || updated.status === "cancelled") {
        void qc.invalidateQueries({ queryKey: ["courier:tasks"] });
        void qc.invalidateQueries({ queryKey: ["courier:stats"] });
      }
    },
  });
}

/* ─── رفع المستندات ────────────────────────────────────── */

export function useCourierDocUpload() {
  return useMutation({
    mutationFn: (vars: { file: File; docType: string }) =>
      courierService.uploadDocument(vars.file, vars.docType),
  });
}

/* ─── طلب إعادة الفحص ──────────────────────────────────── */

export function useCourierRecheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => courierService.requestRecheck(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["courier:me"] });
    },
  });
}

/* ─── تحديث الملف العلني ───────────────────────────────── */

export function useCourierProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      public_name?: string;
      photo_url?: string;
      region_id?: number;
      preferred_shifts?: string;
    }) => courierService.updateProfile(body),
    onSuccess: (me: CourierMe) => {
      qc.setQueryData(["courier:me"], me);
    },
  });
}

/* ─── التسجيل الميداني ─────────────────────────────────── */

export function useCourierRegister() {
  return useMutation({
    mutationFn: (
      body: Parameters<typeof courierAuthService.register>[0],
    ) => courierAuthService.register(body),
  });
}

/* ─── بطاقة النداء النشطة (النداء الأول الحي) ───────────── */

/** النداء الأول غير المنتهي — يستهدفه العد التنازلي والصوت */
export function pickActiveCall(
  calls: CourierCallCard[] | undefined,
): CourierCallCard | null {
  if (!calls?.length) return null;
  const live = calls.find(
    (c) =>
      c.status === "ringing" ||
      c.status === "active" ||
      c.status === "open" ||
      c.status === "new",
  );
  return live ?? calls[0];
}
