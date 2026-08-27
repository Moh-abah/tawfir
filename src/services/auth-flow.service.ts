import { customerApiClient } from "./customer-api-client";
import { apiClient } from "./api-client";
import { ownerApiClient } from "./owner-api-client";
import type {
  ForgotPasswordOut,
  MessageOut,
  PasswordChangeRequest,
} from "@/types/api.generated";

export type PortalRoleKey = "customer" | "owner" | "admin";

/**
 * تدفقات كلمة المرور — الجولة الختامية.
 * - PUT /me/password (توكن أي دور) → تغيير + إبطال كل refresh tokens.
 * - POST /auth/forgot-password (بلا توكن) → دائماً نجاح عام (لا نكشف الوجود).
 * - PUT /auth/reset-password (بلا توكن، توكن أحادي الاستخدام 30 دقيقة).
 */
export const authFlowService = {
  /** طلب استعادة كلمة المرور — الاستجابة العامة دائماً (لا تكشف وجود الحساب). */
  forgotPassword: (email: string) =>
    customerApiClient.post<ForgotPasswordOut>("/auth/forgot-password", { email }),

  /** إعادة التعيين بالتوكن الوارد في البريد. */
  resetPassword: (token: string, new_password: string) =>
    customerApiClient.put<MessageOut>("/auth/reset-password", {
      token,
      new_password,
    }),

  /**
   * تغيير كلمة المرور لجلسة الدور الحالي — عبر عميل البوابة الصحيح
   * (كل عميل يمرّر توكنه ويجدد جلسته شفافاً عند الحاجة).
   */
  changePassword: (role: PortalRoleKey, data: PasswordChangeRequest) => {
    if (role === "admin") return apiClient.put<MessageOut>("/me/password", data);
    if (role === "owner")
      return ownerApiClient.put<MessageOut>("/me/password", data);
    return customerApiClient.put<MessageOut>("/me/password", data);
  },
};
