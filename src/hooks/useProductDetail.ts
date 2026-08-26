"use client";

import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/product.service";

/** GET /products/{id} — تفاصيل وجبة + معلومات المنشأة. */
export function useProductDetail(id: number | null) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.getProduct(id as number),
    enabled: id != null && id > 0,
    staleTime: 60 * 1000,
  });
}
