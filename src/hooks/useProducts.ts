"use client";

import { useQuery } from "@tanstack/react-query";
import { productService, type ProductListParams } from "@/services/product.service";

/**
 * GET /products — قائمة الوجبات مع فلترة.
 * مفتاح الاستعلام يتضمّن كل المُحدِّدات لإعادة الجلب عند تغييرها.
 */
export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productService.getProducts(params),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
