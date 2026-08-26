"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { User, UserDetail, Paginated, RoleUpdate } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useAdminUsers(search?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["admin", "users", search ?? "", page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      return apiClient.get<Paginated<User>>(`/admin/users?${params}`);
    },
    staleTime: 0,
  });
}

export function useAdminUser(id: number | null) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => apiClient.get<UserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiClient.patch<UserDetail>(`/admin/users/${userId}/role`, { role } satisfies RoleUpdate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "تم تحديث الدور" });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
