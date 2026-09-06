import { customerApiClient } from "./customer-api-client";

/**
 * خدمة سجل التوفير — الجولة 21 (webDevReview #5).
 * تُظهر للمستخدم كم وفّر من العضوية (شهري/سنوياً/إجمالي + ROI).
 * الهدف: إقناع المستخدم بأن العضوية تستحق التجديد.
 */

export interface SavingsSummary {
  total_savings: number;
  month_savings: number;
  year_savings: number;
  membership_amount: number;
  is_free_membership: boolean;
  net_savings: number;
  roi_percent: number;
  orders_with_discount: number;
  currency: string;
}

export const savingsService = {
  /** GET /savings/summary — ملخص توفير المستخدم. */
  getSummary: () =>
    customerApiClient.get<SavingsSummary>("/savings/summary"),
};
