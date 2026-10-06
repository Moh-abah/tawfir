import { apiClient } from "./api-client";
import type { Region } from "@/types/api.generated";

/** مفتاح بلد السوق — صيغة الباك إند v3 (967 اليمن | 966 السعودية). */
export type MarketCountryCode = "966" | "967";

export const regionService = {
  // Public list (dropdown) + admin list.
  // v5 — الفصل الحقيقي للسوقين: country_code إلزامي في الواجهة العامة
  // (تُمرره useRegions من سوق الجلسة). الإدارة ترى بلا فلتر (كل الأسواق)
  // أو بفلتر السوق المختار من مبدّلها — المعامل اختياري للأدمن فقط.
  getRegions: (isAdmin = false, countryCode?: MarketCountryCode | null) => {
    const url = isAdmin ? "/admin/regions" : "/regions";
    const suffix =
      countryCode != null ? `?country_code=${encodeURIComponent(countryCode)}` : "";
    return apiClient.get<Region[]>(`${url}${suffix}`);
  },
  // Admin CRUD — v5: جنسية السوق حقل رسمي في الإنشاء/التعديل.
  createRegion: (data: {
    name: string;
    slug: string;
    country_code: MarketCountryCode;
  }) =>
    apiClient.post<Region>("/admin/regions", data),
  updateRegion: (
    id: number,
    data: { name: string; slug: string; country_code: MarketCountryCode }
  ) => apiClient.put<Region>(`/admin/regions/${id}`, data),
  deleteRegion: (id: number) => apiClient.delete(`/admin/regions/${id}`),
};
