"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { regionService, type MarketCountryCode } from "@/services/region.service";
import type { Region } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

/**
 * قوائم المناطق للإدارة — v5 (الفصل الحقيقي للسوقين)
 * countryCode = "966"|"967" → فلترة خادمية بسوق مختار من مبدّل الأدمن.
 * countryCode = null → «كل الأسواق» (الاستثناء الإداري الوحيد).
 */
export function useAdminRegions(countryCode: MarketCountryCode | null = null) {
  return useQuery({
    queryKey: ["regions", { isAdmin: true, countryCode }],
    queryFn: () => regionService.getRegions(true, countryCode),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateRegion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug: string;
      country_code: MarketCountryCode;
    }) => regionService.createRegion(data),
    onSuccess: (region: Region) => {
      qc.invalidateQueries({ queryKey: ["regions"] });
      qc.invalidateQueries({ queryKey: ["facilities"] });
      toast({
        title: "تمت إضافة المنطقة",
        description: `${region.name} — ${
          region.country_code === "966" ? "سوق السعودية 🇸🇦" : "سوق اليمن 🇾🇪"
        }`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateRegion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; slug: string; country_code: MarketCountryCode };
    }) => regionService.updateRegion(id, data),
    onSuccess: (region: Region) => {
      /* v5 — إبطال واسع: تغيير جنسية المنطقة يورَّث لكل ما تحتها
         (متاجر/بطاقات) فتتغير قوائم السوقين — كل الكاش الجيو يُصفَّف. */
      qc.invalidateQueries({ queryKey: ["regions"] });
      qc.invalidateQueries({ queryKey: ["facilities"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast({
        title: "تم تحديث المنطقة",
        description: `${region.name} — ${
          region.country_code === "966" ? "سوق السعودية 🇸🇦" : "سوق اليمن 🇾🇪"
        }`,
      });
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
