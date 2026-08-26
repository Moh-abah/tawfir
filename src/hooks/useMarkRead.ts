"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";
import { toast } from "@/hooks/use-toast";

/** PATCH /notifications/{id}/read — تعليم إشعار كمقروء. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast({
        title: "تعذّر تحديث الإشعار",
        description: "حاول مرة أخرى لاحقاً.",
        variant: "destructive",
      });
    },
  });
}

/** PATCH /notifications/read-all — تعليم الكل كمقروء. */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "تم تعليم جميع الإشعارات كمقروءة" });
    },
    onError: () => {
      toast({
        title: "تعذّر تحديث الإشعارات",
        description: "حاول مرة أخرى لاحقاً.",
        variant: "destructive",
      });
    },
  });
}
