import { apiClient } from "./api-client";
import type { Region } from "@/types/api.generated";

export const regionService = {
  // Public list (dropdown) + admin list
  getRegions: (isAdmin = false) => {
    const url = isAdmin ? "/admin/regions" : "/regions";
    return apiClient.get<Region[]>(url);
  },
  // Admin CRUD
  createRegion: (data: { name: string }) =>
    apiClient.post<Region>("/admin/regions", data),
  updateRegion: (id: number, data: { name: string }) =>
    apiClient.put<Region>(`/admin/regions/${id}`, data),
  deleteRegion: (id: number) =>
    apiClient.delete(`/admin/regions/${id}`),
};
