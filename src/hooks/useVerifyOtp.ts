"use client";

import { useMutation } from "@tanstack/react-query";
import { authOtpService } from "@/services/auth-otp.service";
import type { OtpVerifyInput, OtpVerifyOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";

/**
 * POST /otp/verify — التحقق من كود 6 أرقام.
 *
 * نجاح: {verified:true, target}.
 * فشل: 422 مع detail عربي («الكود غير صحيح. محاولات متبقية: N»)
 * — الواجهة تُظهره داخل النموذج (لا toast).
 */
export function useVerifyOtp() {
  return useMutation<OtpVerifyOut, ApiError, OtpVerifyInput>({
    mutationFn: (input) => authOtpService.verifyOtp(input),
  });
}
