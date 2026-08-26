"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type { OwnerFacilityUpdate, Facility } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useUpdateMyFacility(facilityId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<Facility, Error, OwnerFacilityUpdate>({
    mutationFn: (data) => ownerService.updateMyFacility(facilityId, data),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["my-facilities"] });
      qc.invalidateQueries({ queryKey: ["my-facility", facilityId] });
      toast({ title: "تم تحديث المنشأة", description: f.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}