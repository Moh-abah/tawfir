/**
 * خدمة العروض الخاصة — الجولة 3.
 *
 * - GET /special-offers → قائمة العروض النشطة (عام).
 * - GET /special-offers/{id} → تفاصيل عرض.
 * - POST /owner/{fid}/special-offers → إنشاء (مالك).
 * - GET /owner/{fid}/special-offers → قائمة عروض المنشأة (مالك).
 * - PATCH /owner/{fid}/special-offers/{oid}/deactivate → إنهاء (مالك).
 * - DELETE /owner/{fid}/special-offers/{oid} → حذف (مالك).
 */
import { apiClient } from "./api-client";
import { ownerApiClient } from "./owner-api-client";
import type {
  SpecialOfferOut,
  SpecialOfferCreate,
  SpecialOfferCreateOut,
  Paginated,
  FacilityType,
} from "@/types/api.generated";

export interface SpecialOfferListParams {
  facility_id?: number | null;
  type?: FacilityType | null;
  only_members?: boolean;
  page?: number;
  page_size?: number;
}

export interface OwnerSpecialOfferListParams {
  active_only?: boolean;
  page?: number;
  page_size?: number;
}

export const specialOfferService = {
  /** قائمة العروض النشطة (عام). */
  getPublicOffers: (params: SpecialOfferListParams = {}) => {
    const q = new URLSearchParams();
    if (params.facility_id != null) q.set("facility_id", String(params.facility_id));
    if (params.type) q.set("type", params.type);
    if (params.only_members) q.set("only_members", "true");
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    return apiClient.get<Paginated<SpecialOfferOut>>(`/special-offers?${q.toString()}`);
  },

  /** تفاصيل عرض عام. */
  getOffer: (id: number) =>
    apiClient.get<SpecialOfferOut>(`/special-offers/${id}`),

  /** قائمة عروض المنشأة (مالك). */
  getOwnerOffers: (facilityId: number, params: OwnerSpecialOfferListParams = {}) => {
    const q = new URLSearchParams();
    if (params.active_only) q.set("active_only", "true");
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 50));
    return ownerApiClient.get<Paginated<SpecialOfferOut>>(
      `/owner/${facilityId}/special-offers?${q.toString()}`
    );
  },

  /** إنشاء عرض خاص (مالك). */
  createOffer: (facilityId: number, data: SpecialOfferCreate) =>
    ownerApiClient.post<SpecialOfferCreateOut>(
      `/owner/${facilityId}/special-offers`,
      data
    ),

  /** إنهاء عرض (مالك). */
  deactivateOffer: (facilityId: number, offerId: number) =>
    ownerApiClient.patch<SpecialOfferCreateOut>(
      `/owner/${facilityId}/special-offers/${offerId}/deactivate`,
      {}
    ),

  /** حذف عرض (مالك). */
  deleteOffer: (facilityId: number, offerId: number) =>
    ownerApiClient.delete<void>(`/owner/${facilityId}/special-offers/${offerId}`),
};
