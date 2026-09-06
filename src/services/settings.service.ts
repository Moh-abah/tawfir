import { apiClient } from "./api-client";
import type {
  AdminFreeMembershipOut,
  AdminFreeMembershipUpdate,
} from "@/types/api.generated";

/**
 * خدمة إعدادات المشرف — الجولة 20.
 *
 * تتحكم في علم العضوية المجانية `is_free_membership_enabled`:
 *  - GET  /admin/settings/free-membership → يُرجع العلم الحالي + آخر مُحدِّث.
 *  - PATCH /admin/settings/free-membership {is_free_membership_enabled:bool}
 *    → يُفعّل/يُعطّل منح العضوية المجانية للعملاء الجدد.
 *
 * النقاط تتطلب توكن مشرف (يُدار تلقائياً في apiClient عبر resolveRole).
 */
export const adminSettingsService = {
  /** قراءة علم العضوية المجانية. GET /admin/settings/free-membership. */
  getFreeMembershipFlag: () =>
    apiClient.get<AdminFreeMembershipOut>(
      "/admin/settings/free-membership"
    ),

  /** تحديث علم العضوية المجانية. PATCH /admin/settings/free-membership. */
  setFreeMembershipFlag: (enabled: boolean) =>
    apiClient.patch<AdminFreeMembershipOut>(
      "/admin/settings/free-membership",
      { is_free_membership_enabled: enabled } as AdminFreeMembershipUpdate
    ),
};
