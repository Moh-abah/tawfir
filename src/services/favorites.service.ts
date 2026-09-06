import { customerApiClient } from "./customer-api-client";

/**
 * خدمة المفضلة — الجولة 21 (webDevReview #3).
 * تربط الفرونت إند مع باك إند /favorites (متاجر مفضلة + إشعارات ذكية).
 *
 * ملاحظة: مفضلة المنتجات محلية (favorites.store) لأنها للاستخدام السريع.
 * مفضلة المتاجر مُزامَنة مع الباك إند للاستفادة منها في نظام الإشعارات الذكية
 * (عند نشر عرض خاص على متجر، يُرسل إشعار فوري للمستخدمين الذين فضّلوه).
 */

export interface FavoriteToggleOut {
  is_favorite: boolean;
  notify_offers: boolean;
}

export interface FavoriteOut {
  facility_id: number;
  facility_name: string;
  facility_type: string | null;
  notify_offers: boolean;
  added_at: string | null;
}

export interface FavoritesListOut {
  items: FavoriteOut[];
  total: number;
}

export const favoritesService = {
  /** POST /favorites/{facility_id} — بدّل حالة مفضلة متجر. */
  toggle: (facilityId: number) =>
    customerApiClient.post<FavoriteToggleOut>(`/favorites/${facilityId}`),

  /** GET /favorites — قائمة المتاجر المفضلة. */
  list: () => customerApiClient.get<FavoritesListOut>(`/favorites`),

  /** PATCH /favorites/{facility_id}/notify — تفعيل/تعطيل إشعارات العروض. */
  setNotify: (facilityId: number, notifyOffers: boolean) =>
    customerApiClient.patch<FavoriteToggleOut>(
      `/favorites/${facilityId}/notify`,
      { notify_offers: notifyOffers },
    ),
};
