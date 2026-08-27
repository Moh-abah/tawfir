"use client";

import { useEffect, useState } from "react";
import { notificationWs } from "@/lib/ws-client";

export type WsStatus = "connected" | "disconnected" | "reconnecting" | "error" | "idle";

/**
 * حالة اتصال WebSocket للإشعارات — الجولة 5.
 * يعرض الحالة الحقيقية (متصل / غير متصل / يعيد المحاولة) لأي صفحة
 * تحتاج عرضها (مثل صفحات الإعدادات) — بلا أي بيانات ثابتة.
 */
export function useWsStatus(): WsStatus {
  // تهيئة كسولة: عند الترطيب الأولي الاتصال لم يُفتح بعد (provider
  // يتصل في effect بعد التركيب) → لا خطر عدم تطابق الترطيب.
  const [status, setStatus] = useState<WsStatus>(() =>
    typeof window !== "undefined" && notificationWs.isConnected
      ? "connected"
      : "idle"
  );

  useEffect(() => {
    // نشترك في كل تغيّر قادم من عميل WebSocket
    const off = notificationWs.onStatus((s) => setStatus(s));
    return () => {
      off();
    };
  }, []);

  return status;
}
