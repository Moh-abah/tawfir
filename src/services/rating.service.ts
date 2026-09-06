import { apiClient } from "./api-client";

/**
 * خدمة التقييمات — الجولة 21 (webDevReview #5).
 * تجلب متوسط التقييم + العدد للمنتجات/المتاجر (public, no auth).
 */

export interface RatingAggregate {
  average: number;
  count: number;
}

export interface RatingItem {
  id: number;
  user_id: number;
  user_name: string;
  stars: number;
  comment: string | null;
  created_at: string | null;
}

export interface RatingsList {
  items: RatingItem[];
  total: number;
  average: number;
  page: number;
  pages: number;
}

export const ratingService = {
  /** GET /ratings/{type}/{id}/aggregate — متوسط + عدد (public). */
  getAggregate: (type: "product" | "facility", id: number) =>
    apiClient.get<RatingAggregate>(`/ratings/${type}/${id}/aggregate`),

  /** GET /ratings/{type}/{id} — قائمة التقييمات (public). */
  list: (type: "product" | "facility", id: number, page = 1) =>
    apiClient.get<RatingsList>(`/ratings/${type}/${id}?page=${page}`),
};
