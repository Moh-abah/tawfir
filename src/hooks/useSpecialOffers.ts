"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { specialOfferService } from "@/services/special-offer.service";
import { toast } from "@/hooks/use-toast";
import type { SpecialOfferCreate } from "@/types/api.generated";

/** GET /special-offers — قائمة العروض النشطة (عام). */
export function useSpecialOffers(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["special-offers", page, pageSize],
    queryFn: () =>
      specialOfferService.getPublicOffers({ page, page_size: pageSize }),
    staleTime: 30 * 1000,
  });
}

/** GET /special-offers/{id} — تفاصيل عرض. */
export function useSpecialOffer(id: number | null) {
  return useQuery({
    queryKey: ["special-offer", id],
    queryFn: () => specialOfferService.getOffer(id as number),
    enabled: id != null,
  });
}

/** GET /owner/{fid}/special-offers — قائمة عروض المتجر (مالك). */
export function useOwnerSpecialOffers(facilityId: number | null, activeOnly = false) {
  return useQuery({
    queryKey: ["owner-special-offers", facilityId, activeOnly],
    queryFn: () =>
      specialOfferService.getOwnerOffers(facilityId as number, {
        active_only: activeOnly,
      }),
    enabled: facilityId != null,
  });
}

/** POST /owner/{fid}/special-offers — إنشاء عرض. */
export function useCreateSpecialOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: number; data: SpecialOfferCreate }) =>
      specialOfferService.createOffer(facilityId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["owner-special-offers", vars.facilityId] });
      qc.invalidateQueries({ queryKey: ["special-offers"] });
      qc.invalidateQueries({ queryKey: ["owner-stats", vars.facilityId] });
      toast({
        title: "تم نشر العرض!",
        description: "تم إشعار كل الأعضاء بعرضك الجديد.",
      });
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      toast({
        title: "تعذّر نشر العرض",
        description: e.message ?? "حاول مرة أخرى لاحقاً.",
        variant: "destructive",
      });
    },
  });
}

/** PATCH /owner/{fid}/special-offers/{oid}/deactivate — إنهاء عرض. */
export function useDeactivateSpecialOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, offerId }: { facilityId: number; offerId: number }) =>
      specialOfferService.deactivateOffer(facilityId, offerId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["owner-special-offers", vars.facilityId] });
      qc.invalidateQueries({ queryKey: ["special-offers"] });
      qc.invalidateQueries({ queryKey: ["owner-stats", vars.facilityId] });
      toast({ title: "تم إنهاء العرض" });
    },
    onError: () => {
      toast({
        title: "تعذّر إنهاء العرض",
        variant: "destructive",
      });
    },
  });
}

/** DELETE /owner/{fid}/special-offers/{oid} — حذف عرض. */
export function useDeleteSpecialOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, offerId }: { facilityId: number; offerId: number }) =>
      specialOfferService.deleteOffer(facilityId, offerId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["owner-special-offers", vars.facilityId] });
      qc.invalidateQueries({ queryKey: ["special-offers"] });
      qc.invalidateQueries({ queryKey: ["owner-stats", vars.facilityId] });
      toast({ title: "تم حذف العرض" });
    },
    onError: () => {
      toast({
        title: "تعذّر حذف العرض",
        variant: "destructive",
      });
    },
  });
}
