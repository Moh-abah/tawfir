"use client";

/**
 * finance.service.ts — خدمة الجولة المالية v2 (طبقة العقود الحية)
 * ═══════════════════════════════════════════════════════════════
 * مصدر الحقيقة: openapi_live.json (199 مساراً / 196 مخططاً) — المسارات
 * المالية 23 مساراً تحت /finance/* و /payments/moyasar/webhook.
 *
 * توزيع البوابات على العملاء:
 *   - customerApiClient → payments/config · pay/verify · finance/orders/{id}
 *   - ownerApiClient    → finance/owner/card · yemen/notifications
 *   - courierApiClient  → finance/courier/* (وجهات الصرف، رصيدي، مستحقاتي)
 *   - apiClient (أدمن)  → settings · admin/yemen/* · payouts · entries ·
 *                          admin/owner/{id}/card · export/csv
 *
 * ملاحظات وحدات موثقة (bronze-6):
 *   - PaymentOut.amount بالهللات في السوق السعودي (114 SAR = 11400) —
 *     الواجهة تقسم على 100 عند العرض فقط لهذا النوع الموثق.
 *   - كل باقي المبالغ (total/delivery_fee/fee/commissions…) أعداد
 *     صحيحة بوحدة العملة كما تعيدها الاستجابة — لا تحويل في الواجهة.
 */

import { apiClient } from "@/services/api-client";
import { customerApiClient } from "@/services/customer-api-client";
import { ownerApiClient } from "@/services/owner-api-client";
import { courierApiClient } from "@/services/courier-api-client";
import { useAuthStore } from "@/store/auth.store";
import type { PaymentOut, PayoutOut, DestinationIn, DestinationOut } from "@/types/api.generated";

/* ═══════════════ أنواع العقود الحية (موثقة من الاستجابات الفعلية) ═══════════════ */

/** استجابة GET /finance/payments/config */
export interface PaymentsConfig {
  mode: "embedded" | "direct" | string;
  embedded: boolean;
  publishable_key: string;
  callback_url?: string | null;
  methods: string[];
}

/** طلب POST /finance/orders/{order_id}/pay/verify */
export interface EmbeddedPayVerifyInput {
  moyasar_payment_id: string;
  idempotency_key?: string;
}

/** بطاقة التاجر المالية — GET /finance/owner/card */
export interface OwnerFinanceCard {
  currency: string;
  accumulated_commissions: number;
  outstanding_debt: number;
  paid_total: number;
  pending_notifications: number;
  debt_cap: number | string | null;
  cap_reached: boolean;
  invoices_count: number;
  orders_count: number;
  transfers_count: number;
}

/** سطر نظرة الأدمن الشاملة — GET /finance/owner/overview */
export interface OwnerOverviewRow {
  owner_id: number;
  debt: number;
  accumulated: number;
  paid: number;
  cap_reached: boolean;
}

/** استجابة GET /finance/owner/overview (أدمن) */
export interface OwnerFinanceOverview {
  owners: OwnerOverviewRow[];
  commissions: Record<string, number>;
  notifications: FinanceNotification[];
  payouts: PayoutOut[];
}

/** إشعار تسديد يمني — المالك/الأدمن */
export interface FinanceNotification {
  id: number;
  owner_id: number;
  amount: number;
  currency: string;
  bank_name?: string | null;
  reference_no?: string | null;
  transfer_date?: string | null;
  image_url?: string | null;
  status: "submitted" | "approved" | "rejected" | string;
  review_note?: string | null;
  created_at: string;
}

/** إدخال إدخال دفتر القيود — GET /finance/entries */
export interface FinanceEntry {
  id: number;
  entry_type: string;
  party_type: string;
  party_id: number;
  order_id: number | null;
  amount: number;
  currency: string;
  status: string;
  ref_id?: string | null;
  note?: string | null;
  created_at: string;
}

export interface FinanceEntriesPage {
  total: number;
  page: number;
  pages: number;
  items: FinanceEntry[];
}

/** بند إعدادات مالية — GET /finance/settings */
export interface FinanceSettingItem {
  key: string;
  value: string;
  updated_at: string | null;
}

/** رصيدي — GET /finance/courier/my/balance */
export interface CourierBalance {
  receivable: number;
  currency: string;
}

/** نموذج رفع إشعار تسديد يمني (المالك). */
export interface NotificationSubmitInput {
  amount: number;
  bank_name?: string | null;
  reference_no?: string | null;
  transfer_date?: string | null;
  image_url?: string | null;
}

/** نموذج مراجعة الأدمن لإشعار يمني. */
export interface NotificationReviewInput {
  review_note?: string | null;
  idempotency_key?: string;
}

/** فلاتر دفتر القيود. */
export interface EntriesFilter {
  page?: number;
  per_page?: number;
  entry_type?: string | null;
  party_type?: string | null;
  party_id?: number | null;
  currency?: string | null;
  status?: string | null;
}

/* ═══════════════ العميل — الدفع المدمج Moyasar ═══════════════ */

export const customerFinanceService = {
  /** إعدادات بوابة الدفع — تُستدعى مرة عند فتح شاشة الدفع. */
  async getPaymentsConfig(): Promise<PaymentsConfig> {
    return customerApiClient.get<PaymentsConfig>("/finance/payments/config");
  },

  /**
   * التحقق الحتمي من دفعة Moyasar بعد رجوع العميل من النموذج المدمج.
   * البرونزية-4: مرّر X-Idempotency-Key عبر options.headers.
   */
  async verifyEmbeddedPayment(
    orderId: number,
    body: EmbeddedPayVerifyInput,
    headers?: Record<string, string>
  ): Promise<PaymentOut> {
    return customerApiClient.post<PaymentOut>(
      `/finance/orders/${orderId}/pay/verify`,
      body,
      { headers }
    );
  },

  /** سجل دفعات الطلب — كشف «مدفوع سابقًا» قبل السماح بالدفع مجددًا. */
  async getOrderPayments(orderId: number): Promise<PaymentOut[]> {
    const json = await customerApiClient.get<unknown>(`/finance/orders/${orderId}`);
    if (Array.isArray(json)) return json as PaymentOut[];
    const obj = json as { items?: PaymentOut[] };
    return obj?.items ?? [];
  },

  /** مراقبة دفعة واحدة (الويب هوك يصل الخادم مباشرة — نراقب فقط). */
  async getPayment(paymentId: number | string): Promise<PaymentOut> {
    return customerApiClient.get<PaymentOut>(`/finance/payments/${paymentId}`);
  },
};

/* ═══════════════ المالك — بطاقتي المالية + إشعارات اليمن ═══════════════ */

export const ownerFinanceService = {
  /** بطاقة التاجر المالية (ذمة/عمولات/مدفوع). */
  async getMyCard(): Promise<OwnerFinanceCard> {
    return ownerApiClient.get<OwnerFinanceCard>("/finance/owner/card");
  },

  /** إشعارات تسديدي (كاش → تحويل بنكي) لطلباتي اليمنية. */
  async listYemenNotifications(): Promise<FinanceNotification[]> {
    const json = await ownerApiClient.get<unknown>("/finance/yemen/notifications");
    if (Array.isArray(json)) return json as FinanceNotification[];
    const obj = json as { items?: FinanceNotification[] };
    return obj?.items ?? [];
  },

  /** رفع إشعار تسديد جديد. */
  async submitYemenNotification(body: NotificationSubmitInput): Promise<FinanceNotification> {
    return ownerApiClient.post<FinanceNotification>("/finance/yemen/notifications", body);
  },
};

/* ═══════════════ المندوب — وجهات الصرف + رصيدي + مستحقاتي ═══════════════ */

export const courierFinanceService = {
  /** وجهات صرفي (بنك IBAN / محفظة STC Pay). */
  async listDestinations(): Promise<DestinationOut[]> {
    const json = await courierApiClient.get<unknown>("/finance/courier/destinations");
    if (Array.isArray(json)) return json as DestinationOut[];
    const obj = json as { items?: DestinationOut[] };
    return obj?.items ?? [];
  },

  /** إضافة وجهة صرف — bank: IBAN سعودي · wallet: رقم STC Pay 966. */
  async createDestination(body: DestinationIn): Promise<DestinationOut> {
    return courierApiClient.post<DestinationOut>("/finance/courier/destination", body);
  },

  /** مستحقاتي (سجل الصرف). */
  async myPayouts(): Promise<PayoutOut[]> {
    const json = await courierApiClient.get<unknown>("/finance/courier/my");
    if (Array.isArray(json)) return json as PayoutOut[];
    const obj = json as { items?: PayoutOut[] };
    return obj?.items ?? [];
  },

  /** رصيدي المستحق. */
  async myBalance(): Promise<CourierBalance> {
    return courierApiClient.get<CourierBalance>("/finance/courier/my/balance");
  },
};

/* ═══════════════ الأدمن — الإعدادات + المراجعة + الصرف + الدفتر ═══════════════ */

export const adminFinanceService = {
  /* ── الإعدادات المالية (17 مفتاحاً حياً) ── */

  async getSettings(): Promise<FinanceSettingItem[]> {
    const json = await apiClient.get<{ items?: FinanceSettingItem[] } | FinanceSettingItem[]>(
      "/finance/settings"
    );
    if (Array.isArray(json)) return json;
    return json?.items ?? [];
  },

  async updateSetting(key: string, value: string): Promise<unknown> {
    return apiClient.put("/finance/settings", { key, value });
  },

  /* ── مراجعة إشعارات التسديد اليمنية ── */

  async listYemenNotifications(status?: string | null): Promise<FinanceNotification[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const json = await apiClient.get<unknown>(`/finance/admin/yemen/notifications${qs}`);
    if (Array.isArray(json)) return json as FinanceNotification[];
    const obj = json as { items?: FinanceNotification[] };
    return obj?.items ?? [];
  },

  async approveNotification(
    notificationId: number,
    body: NotificationReviewInput
  ): Promise<unknown> {
    return apiClient.post(
      `/finance/admin/yemen/notifications/${notificationId}/approve`,
      body
    );
  },

  async rejectNotification(
    notificationId: number,
    body: NotificationReviewInput
  ): Promise<unknown> {
    return apiClient.post(
      `/finance/admin/yemen/notifications/${notificationId}/reject`,
      body
    );
  },

  /* ── الصرف للمندوبين (payouts) ── */

  async listPayouts(status?: string | null): Promise<PayoutOut[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const json = await apiClient.get<unknown>(`/finance/payouts${qs}`);
    if (Array.isArray(json)) return json as PayoutOut[];
    const obj = json as { items?: PayoutOut[] };
    return obj?.items ?? [];
  },

  /** تنفيذ صرف — البرونزية-4: X-Idempotency-Key إلزامي. */
  async executePayout(
    body: {
      order_id?: number | null;
      courier_id?: number | null;
      amount?: number | null;
      destination_id?: number | null;
      idempotency_key?: string;
    },
    headers?: Record<string, string>
  ): Promise<PayoutOut> {
    return apiClient.post<PayoutOut>("/finance/payouts/execute", body, { headers });
  },

  async pollPayouts(): Promise<unknown> {
    return apiClient.post("/finance/payouts/poll");
  },

  /* ── لوحة المالك الشاملة + بطاقة مالك محدد ── */

  async getOwnerOverview(): Promise<OwnerFinanceOverview> {
    return apiClient.get<OwnerFinanceOverview>("/finance/owner/overview");
  },

  async getOwnerCard(ownerId: number): Promise<OwnerFinanceCard> {
    return apiClient.get<OwnerFinanceCard>(`/finance/admin/owner/${ownerId}/card`);
  },

  /* ── دفتر القيود + تصدير CSV ── */

  async getEntries(filter: EntriesFilter = {}): Promise<FinanceEntriesPage> {
    const qs = new URLSearchParams();
    if (filter.page) qs.set("page", String(filter.page));
    if (filter.per_page) qs.set("per_page", String(filter.per_page));
    for (const k of ["entry_type", "party_type", "currency", "status"] as const) {
      const v = filter[k];
      if (v) qs.set(k, String(v));
    }
    if (filter.party_id != null) qs.set("party_id", String(filter.party_id));
    return apiClient.get<FinanceEntriesPage>(`/finance/entries?${qs.toString()}`);
  },

  /**
   * تصدير القيود CSV — استجابة نصية (ليست JSON) لذا نستعمل fetch مباشرة
   * بتوكن الأدمن نفسه الذي يستعمله apiClient (store ← cookie).
   */
  async exportCsv(): Promise<Blob> {
    const token =
      useAuthStore.getState().accessToken ?? readAdminCookie("tawfir_admin_token");
    const res = await fetch("/api/finance/export/csv", {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "text/csv",
      },
    });
    if (!res.ok) {
      let detail = `تعذّر التصدير (${res.status})`;
      try {
        const j = (await res.json()) as { detail?: string };
        if (j?.detail) detail = String(j.detail);
      } catch {
        /* ليست JSON — نُبقي الرسالة الافتراضية */
      }
      throw new Error(detail);
    }
    return res.blob();
  },
};

function readAdminCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}
