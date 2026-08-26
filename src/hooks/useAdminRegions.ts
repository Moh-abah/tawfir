"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { regionService } from "@/services/region.service";
import type { Region } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useAdminRegions() {
  return useQuery({
    queryKey: ["regions", { isAdmin: true }],
    queryFn: () => regionService.getRegions(true),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { name: string }) => regionService.createRegion(data),
    onSuccess: (region: Region) => {
      qc.invalidateQueries({ queryKey: ["regions"] });
      toast({ title: "تمت إضافة المنطقة", description: region.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRegion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      regionService.updateRegion(id, data),
    onSuccess: (region: Region) => {
      qc.invalidateQueries({ queryKey: ["regions"] });
      toast({ title: "تم تحديث المنطقة", description: region.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRegion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => regionService.deleteRegion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regions"] });
      toast({ title: "تم حذف المنطقة" });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
