import { customerApiClient } from "./customer-api-client";
import type {
  CustomerLogin,
  MeOut,
  MeUpdate,
  TokenOut,
} from "@/types/api.generated";

export const customerAuthService = {
  /** POST /auth/login → {access_token, token_type} */
  login: (data: CustomerLogin) =>
    customerApiClient.post<TokenOut>("/auth/login", data),

  /** GET /me (Bearer) → بيانات العميل + بطاقة العضوية الحقيقية */
  getMe: () => customerApiClient.get<MeOut>("/me"),

  /** PUT /me — تعديل الاسم/الجوال فقط (البريد ثابت) */
  updateMe: (data: MeUpdate) =>
    customerApiClient.put<MeOut>("/me", data),
};
