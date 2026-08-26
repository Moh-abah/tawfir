"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type {
  Product,
  ProductCreate,
  ProductUpdate,
  ProductAvailabilityUpdate,
  Paginated,
} from "@/types/api.generated";
import { useToast } from "@/hooks/use-toast";
import type { OwnerApiError } from "@/services/owner-api-client";

export function useOwnerProducts(
  facilityId: number,
  params?: { category?: string; search?: string; only_available?: boolean; page?: number; page_size?: number }
) {
  return useQuery<Paginated<Product>>({
    queryKey: ["owner-products", facilityId, params?.search, params?.category, params?.only_available, params?.page, params?.page_size],
    queryFn: () => ownerService.getOwnerProducts(facilityId, params),
    staleTime: 0,
  });
}

export function useCreateProduct(facilityId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<Product, Error, ProductCreate>({
    mutationFn: (data) => ownerService.createProduct(facilityId, data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["owner-products", facilityId] });
      toast({ title: "تمت إضافة المنتج", description: p.name });
    },
    onError: (e: Error) => {
      const apiErr = e as unknown as OwnerApiError;
      const body = apiErr.body as Record<string, unknown> | null;
      if (apiErr.status === 422 && body && Array.isArray(body.detail)) {
        // Let the form handle field-level errors
        throw e;
      }
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateProduct(facilityId: number, productId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<Product, Error, ProductUpdate>({
    mutationFn: (data) => ownerService.updateProduct(facilityId, productId, data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["owner-products", facilityId] });
      toast({ title: "تم تحديث المنتج", description: p.name });
    },
    onError: (e: Error) => {
      const apiErr = e as unknown as OwnerApiError;
      const body = apiErr.body as Record<string, unknown> | null;
      if (apiErr.status === 422 && body && Array.isArray(body.detail)) {
        throw e;
      }
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteProduct(facilityId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<unknown, Error, number>({
    mutationFn: (productId) => ownerService.deleteProduct(facilityId, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-products", facilityId] });
      toast({ title: "تم حذف المنتج" });
    },
    onError: (e: Error) =>
      toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useToggleProductAvailability(facilityId: number) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation<Product, Error, { productId: number; data: ProductAvailabilityUpdate }, { previous: Paginated<Product> | undefined }>({
    mutationFn: ({ productId, data }) =>
      ownerService.toggleProductAvailability(facilityId, productId, data),
    onMutate: async ({ productId, data }) => {
      await qc.cancelQueries({ queryKey: ["owner-products", facilityId] });
      const previous = qc.getQueryData<Paginated<Product>>(["owner-products", facilityId]);
      if (previous) {
        qc.setQueryData<Paginated<Product>>(["owner-products", facilityId], {
          ...previous,
          items: previous.items.map((p) =>
            p.id === productId ? { ...p, is_available: data.is_available } : p
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["owner-products", facilityId], context.previous);
      }
      toast({ title: "خطأ", description: "فشل تغيير حالة التوفر", variant: "destructive" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["owner-products", facilityId] });
    },
  });
}
