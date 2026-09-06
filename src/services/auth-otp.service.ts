import { apiClient } from "./api-client";
import type {
  OtpRequestInput,
  OtpRequestOut,
  OtpVerifyInput,
  OtpVerifyOut,
} from "@/types/api.generated";

/**
 * خدمة OTP عبر واتساب — الجولة 20.
 *
 * مسار التحقق المرن التسلسلي للعميل:
 *  1) requestOtp(target, name?) → POST /otp/request {detail, ttl_seconds, delivered, dev_code?}
 *  2) verifyOtp(target, code)    → POST /otp/verify   {verified, target}
 *  3) resendOtp(target, name?)   → POST /otp/resend    مثل request (مع cooldown 60ث)
 *
 * النقاط عامة (لا تتطلب auth) — تُستدعى قبل إنشاء الحساب لإثبات ملكية الرقم.
 * نستخدم apiClient العام (لا cookie عميل) لأن المستخدم قد لا يملك توكن بعد.
 *
 * في وضع التطوير يُرجع الباك إند `dev_code` (كود 6 أرقام) — نُظهره في الواجهة
 * كملاحظة اختبار فقط إن وُجد في الردّ.
 */
export const authOtpService = {
  /** طلب كود تحقق جديد إلى رقم جوال عبر واتساب. */
  requestOtp: (data: OtpRequestInput) =>
    apiClient.post<OtpRequestOut>("/otp/request", data),

  /** التحقق من كود OTP. يُرجع 422 مع detail عربي عند الخطأ. */
  verifyOtp: (data: OtpVerifyInput) =>
    apiClient.post<OtpVerifyOut>("/otp/verify", data),

  /** إعادة إرسال الكود (cooldown 60ث على الخادم). */
  resendOtp: (data: OtpRequestInput) =>
    apiClient.post<OtpRequestOut>("/otp/resend", data),
};
