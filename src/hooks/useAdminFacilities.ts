"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Facility, FacilityCreate, FacilityUpdate, Paginated } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useAdminFacilities(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["admin", "facilities", page, pageSize],
    queryFn: () =>
      apiClient.get<Paginated<Facility>>(
        `/admin/facilities?page=${page}&page_size=${pageSize}`
      ),
    staleTime: 0,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: FacilityCreate) =>
      apiClient.post<Facility>("/admin/facilities", data),
    onSuccess: (f: Facility) => {
      qc.invalidateQueries({ queryKey: ["admin", "facilities"] });
      toast({ title: "تمت إضافة المنشأة", description: f.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FacilityUpdate }) =>
      apiClient.put<Facility>(`/admin/facilities/${id}`, data),
    onSuccess: (f: Facility) => {
      qc.invalidateQueries({ queryKey: ["admin", "facilities"] });
      toast({ title: "تم تحديث المنشأة", description: f.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/admin/facilities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "facilities"] });
      toast({ title: "تم حذف المنشأة" });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
