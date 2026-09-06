import { customerApiClient } from "./customer-api-client";
import type {
  FreeMembershipSubscribeOut,
  MembershipInfoOut,
  MembershipSubscribeOut,
} from "@/types/api.generated";

/**
 * خدمة العضوية للعميل.
 *  - الاشتراك بموافقة يدوية: العميل يرفع صورة التحويل → pending → يراجعها المشرف.
 *  - الاشتراك المجاني (الجولة 20): عند تفعيل المشرف للعلم
 *    `is_free_membership_enabled` → العميل يحصل على عضوية approved فوراً
 *    بلا دفع ولا رفع إيصال عبر POST /membership/subscribe-free.
 */
export const membershipService = {
  /** بيانات التحويل الثابتة قبل الاشتراك. GET /membership/info. */
  getInfo: () =>
    customerApiClient.get<MembershipInfoOut>("/membership/info"),

  /**
   * رفع طلب اشتراك (multipart/form-data).
   * @param receiptImage ملف صورة التحويل (png/jpg، ≤2MB)
   * @param amount مبلغ التحويل (افتراضي 3000)
   * @param transferAccountName اسم صاحب حساب التحويل
   * @param transferAccountNumber رقم حساب التحويل
   * استجابة 201: {detail, id, status:"pending"}
   */
  subscribe: (
    receiptImage: File,
    amount: number,
    transferAccountName: string,
    transferAccountNumber: string
  ) => {
    const form = new FormData();
    form.append("receipt_image", receiptImage);
    form.append("amount", String(amount));
    form.append("transfer_account_name", transferAccountName);
    form.append("transfer_account_number", transferAccountNumber);
    return customerApiClient.post<MembershipSubscribeOut>(
      "/membership/subscribe",
      form
    );
  },

  /**
   * الحصول على عضوية مجانية فورية (الجولة 20).
   * POST /membership/subscribe-free (بلا جسم) — يمنح العميل عضوية approved
   * فوراً (is_free=true) إذا كان علم العضوية المجانية مفعّلاً من المشرف.
   * استجابة 201: {detail, id, membership_number, expires_at, is_free}.
   * أخطاء محتملة: 409 «لديك عضوية نشطة بالفعل» أو 403 «العضوية المجانية
   * غير مفعّلة».
   */
  subscribeFree: () =>
    customerApiClient.post<FreeMembershipSubscribeOut>(
      "/membership/subscribe-free"
    ),
};
