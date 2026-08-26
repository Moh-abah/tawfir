import { customerApiClient } from "./customer-api-client";
import type {
  MembershipInfoOut,
  MembershipSubscribeOut,
} from "@/types/api.generated";

/**
 * خدمة العضوية للعميل.
 * الاشتراك بموافقة يدوية: العميل يرفع صورة التحويل → pending → يراجعها المشرف.
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
};
