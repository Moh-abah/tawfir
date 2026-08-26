/**
 * Map audit log action_type strings to Arabic labels.
 * Centralised so both admin and future components share the same translations.
 */
const LABELS: Record<string, string> = {
  // Auth
  login: "تسجيل دخول",
  logout: "تسجيل خروج",

  // Generic CRUD
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",

  // Owner actions
  OWNER_LOGIN: "دخول مالك",
  OWNER_FACILITY_UPDATED: "تحديث منشأة المالك",

  // Product actions
  PRODUCT_CREATED: "إضافة منتج",
  PRODUCT_UPDATED: "تحديث منتج",
  PRODUCT_DELETED: "حذف منتج",
  PRODUCT_AVAILABILITY_TOGGLED: "تبديل توفر منتج",
  PRODUCT_IMPORT: "استيراد منتجات",

  // Admin user actions
  USER_ROLE_UPDATED: "تحديث دور مستخدم",
};

/** Return an Arabic label for the given audit action_type. Falls back to the raw string. */
export function getAuditLabel(action: string): string {
  return LABELS[action] ?? action;
}
