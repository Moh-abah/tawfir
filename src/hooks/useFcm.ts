"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import type { FcmTokenRegister, FcmTokenDelete } from "@/types/api.generated";

/** POST /fcm/token — تسجيل/تجديد توكن FCM. */
export function useRegisterFcm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FcmTokenRegister) =>
      notificationService.registerFcmToken(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fcm-tokens"] });
    },
  });
}

/** DELETE /fcm/token — إلغاء توكن FCM (تسجيل خروج الجهاز). */
export function useUnregisterFcm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FcmTokenDelete) =>
      notificationService.unregisterFcmToken(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fcm-tokens"] });
    },
  });
}
