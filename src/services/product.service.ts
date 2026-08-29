import { apiClient } from "./api-client";
import type {
  ProductDetailOut,
  ProductWithFacilityOut,
  Paginated,
  FacilityType,
} from "@/types/api.generated";

/** مُحدِّدات فلترة لـ GET /products. */
export interface ProductListParams {
  facility_id?: number | null;
  type?: FacilityType | null;
  category?: string | null;
  search?: string | null;
  only_available?: boolean;
  lat?: number | null;
  lng?: number | null;
  radius_km?: number | null;
  page?: number;
  page_size?: number;
}

/**
 * خدمة تصفّح الوجبات (عام — بلا توكن).
 * - GET /products → قائمة وجبات معلّقة بمتاجرها (مُقسّمة).
 * - GET /products/nearby → مرتبة بالمسافة من الموقع الحالي.
 * - GET /products/{id} → تفاصيل وجبة + معلومات المتجر.
 * الخصم يُحتسب في الواجهة إن كان العميل عضواً (× 0.7).
 */
export const productService = {
  /** قائمة الوجبات (مُقسّمة). فلترة حسب المتجر/النوع/التصنيف/البحث/التوفّر. */
  getProducts: (params: ProductListParams = {}) => {
    const q = new URLSearchParams();
    if (params.facility_id != null) q.set("facility_id", String(params.facility_id));
    if (params.type) q.set("type", params.type);
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.only_available !== undefined)
      q.set("only_available", String(params.only_available));
    if (params.lat != null) q.set("lat", String(params.lat));
    if (params.lng != null) q.set("lng", String(params.lng));
    if (params.radius_km != null) q.set("radius_km", String(params.radius_km));
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    return apiClient.get<Paginated<ProductWithFacilityOut>>(
      `/products?${q.toString()}`
    );
  },

  /** الوجبات القريبة من الموقع — مرتبة بالمسافة. */
  getNearby: (lat: number, lng: number, radiusKm = 10, page = 1, pageSize = 20) => {
    const q = new URLSearchParams();
    q.set("lat", String(lat));
    q.set("lng", String(lng));
    q.set("radius_km", String(radiusKm));
    q.set("page", String(page));
    q.set("page_size", String(pageSize));
    return apiClient.get<Paginated<ProductWithFacilityOut>>(
      `/products/nearby?${q.toString()}`
    );
  },

  /** تفاصيل وجبة كاملة + معلومات المتجر. */
  getProduct: (id: number) =>
    apiClient.get<ProductDetailOut>(`/products/${id}`),
};
