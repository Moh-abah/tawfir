"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardService } from "@/services/card.service";
import type { Card, CardCreate, CardUpdate } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useAdminCards() {
  return useQuery({
    queryKey: ["admin", "cards"],
    queryFn: () => cardService.getAdminCards(),
    staleTime: 0,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CardCreate) => cardService.createCard(data),
    onSuccess: (card: Card) => {
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast({ title: "تمت إضافة البطاقة", description: card.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CardUpdate }) =>
      cardService.updateCard(id, data),
    onSuccess: (card: Card) => {
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast({ title: "تم تحديث البطاقة", description: card.name });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => cardService.deleteCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "cards"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast({ title: "تم حذف البطاقة" });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}
