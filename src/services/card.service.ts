import { apiClient } from "./api-client";
import type { Card, CardCreate, CardUpdate, Paginated } from "@/types/api.generated";

export const cardService = {
  getPublicCards: (regionId: number) =>
    apiClient.get<Card[]>(`/cards?region_id=${regionId}`),

  getAdminCards: (page = 1, pageSize = 50) =>
    apiClient.get<Paginated<Card>>(`/admin/cards?page=${page}&page_size=${pageSize}`),

  createCard: (data: CardCreate) => apiClient.post<Card>("/admin/cards", data),
  updateCard: (id: number, data: CardUpdate) =>
    apiClient.put<Card>(`/admin/cards/${id}`, data),
  deleteCard: (id: number) => apiClient.delete(`/admin/cards/${id}`),
};
