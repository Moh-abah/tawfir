import { apiClient } from "./api-client";
import type { RegisterOut, TokenOut } from "@/types/api.generated";

export const authService = {
  /**
   * تسجيل عميل جديد (بلا عضوية تلقائية).
   * POST /auth/register → {detail, status_code, user_id}
   * العضوية تُطلب لاحقاً عبر POST /membership/subscribe وتُمنح بعد موافقة يدوية.
   */
  register: (data: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
    region_id?: number | null;
  }) => apiClient.post<RegisterOut>("/auth/register", data),

  /** دخول المشرف (POST /admin/login → TokenOut). */
  adminLogin: (data: { identifier: string; password: string }) =>
    apiClient.post<TokenOut>("/admin/login", data),
};
