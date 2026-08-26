"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type { ProductImportResult } from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";

export function useImportProducts(facilityId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<ProductImportResult, Error, File>({
    mutationFn: (file) => ownerService.importProducts(facilityId, file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["owner-products", facilityId] });
      if (result.status === "success") {
        toast({ title: "تم الاستيراد", description: `تم استيراد ${result.imported_count} منتج` });
      } else {
        toast({
          title: "استيراد جزئي",
          description: `تم استيراد ${result.imported_count} منتج مع ${result.errors.length} أخطاء`,
          variant: "destructive",
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "خطأ في الاستيراد", description: e.message, variant: "destructive" }),
  });
}