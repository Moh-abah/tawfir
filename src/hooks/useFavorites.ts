"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { favoritesService } from "@/services/favorites.service";
import { useToast } from "@/hooks/use-toast";

/**
 * Hooks للمفضلة — الجولة 21 (webDevReview #3).
 */

/** قائمة المتاجر المفضلة للمستخدم الحالي. */
export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => favoritesService.list(),
    staleTime: 30 * 1000,
  });
}

/** بدّل حالة مفضلة متجر. يُبطل استعلام favorites بعد النجاح. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (facilityId: number) => favoritesService.toggle(facilityId),
    onSuccess: (data, facilityId) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["facilities"] });
      qc.invalidateQueries({ queryKey: ["facility", facilityId] });
      toast({
        title: data.is_favorite ? "أضيف للمفضلة" : "أُزيل من المفضلة",
        description: data.is_favorite
          ? "ستصلك إشعارات العروض الجديدة لهذا المتجر"
          : "لن تصلك إشعارات هذا المتجر",
      });
    },
    onError: () => {
      toast({
        title: "تعذّر تحديث المفضلة",
        description: "يرجى المحاولة لاحقاً",
        variant: "destructive",
      });
    },
  });
}

/** تفعيل/تعطيل إشعارات العروض لمتجر مفضل. */
export function useSetNotifyOffers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      facilityId,
      notifyOffers,
    }: {
      facilityId: number;
      notifyOffers: boolean;
    }) => favoritesService.setNotify(facilityId, notifyOffers),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast({
        title: data.notify_offers ? "الإشعارات مفعّلة" : "الإشعارات معطّلة",
      });
    },
  });
}
