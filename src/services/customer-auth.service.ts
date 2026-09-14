import { customerApiClient } from "./customer-api-client";
import type {
  CustomerLogin,
  MeOut,
  MeUpdate,
  TokenOut,
} from "@/types/api.generated";
import type {
  AccountDeleteIn,
  AccountDeleteOut,
} from "@/types/api-extra";

export const customerAuthService = {
  /** POST /auth/login → {access_token, token_type} */
  login: (data: CustomerLogin) =>
    customerApiClient.post<TokenOut>("/auth/login", data),

  /** GET /me (Bearer) → بيانات العميل + بطاقة العضوية الحقيقية */
  getMe: () => customerApiClient.get<MeOut>("/me"),

  /** PUT /me — تعديل الاسم/الجوال فقط (البريد ثابت) */
  updateMe: (data: MeUpdate) =>
    customerApiClient.put<MeOut>("/me", data),

  /** DELETE /customer/account — حذف الحساب نهائيًا (متطلب Apple 5.1.1(v)).
   *  مسار محلي (BFF): يوثّق الهوية بتوكن العميل نفسه ثم يحذف/يُكيّف
   *  البيانات لدى الباك إند ويزيل توكنات FCM المُمرَّرة معه. */
  deleteAccount: (data?: AccountDeleteIn) =>
    customerApiClient.delete<AccountDeleteOut>("/customer/account", data),
};
