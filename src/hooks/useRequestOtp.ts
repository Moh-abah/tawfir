"use client";

import { useMutation } from "@tanstack/react-query";
import { authOtpService } from "@/services/auth-otp.service";
import type { OtpRequestInput, OtpRequestOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";

/**
 * POST /otp/request — طلب كود تحقق جديد إلى رقم جوال عبر واتساب.
 *
 * يُستدعى عند الانتقال من مرحلة «form» إلى «otp» في صفحة التسجيل.
 * الرد قد يحمل dev_code في وضع التطوير — الواجهة تُظهره كملاحظة اختبار.
 *
 * ملاحظة: لا نُطلق toast تلقائياً هنا — الصفحة تُدير العرض (dev_code،
 * رسالة الخطأ من cooldown، إلخ).
 */
export function useRequestOtp() {
  return useMutation<OtpRequestOut, ApiError, OtpRequestInput>({
    mutationFn: (input) => authOtpService.requestOtp(input),
  });
}
