import { apiClient } from "./api-client";

/**
 * خدمة KPIs للأدمن — الجولة 21 (webDevReview #10).
 * يجلب مؤشرات الأداء الأساسية: MAU, paid members, active merchants, etc.
 */

export interface AdminKpis {
  mau: number;
  paid_members: number;
  free_members: number;
  active_merchants: number;
  offer_usage_rate: number;
  avg_savings: number;
  sales_value: number;
  renewal_rate: number;
  total_users: number;
  total_facilities: number;
  approved_facilities: number;
  total_offers: number;
  used_offers: number;
  currency: string;
  period: string;
}

export const kpisService = {
  /** GET /admin/kpis — مؤشرات الأداء الأساسية. */
  getKpis: () => apiClient.get<AdminKpis>("/admin/kpis"),
};

