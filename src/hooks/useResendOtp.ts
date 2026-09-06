"use client";

import { useMutation } from "@tanstack/react-query";
import { authOtpService } from "@/services/auth-otp.service";
import type { OtpRequestInput, OtpRequestOut } from "@/types/api.generated";
import type { ApiError } from "@/services/api-client";

/**
 * POST /otp/resend — إعادة إرسال الكود (cooldown 60ث على الخادم).
 *
 * عند الطلب المبكّر يُرجع 422 مع detail «يرجى الانتظار N ثانية قبل
 * إعادة إرسال الكود» — الواجهة تُظهره وتُحدّث العدّاد المحلي.
 */
export function useResendOtp() {
  return useMutation<OtpRequestOut, ApiError, OtpRequestInput>({
    mutationFn: (input) => authOtpService.resendOtp(input),
  });
}
