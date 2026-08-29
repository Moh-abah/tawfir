"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Heart, Store, Trash2 } from "lucide-react";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/public/ProductCard";
import { useFavoritesStore } from "@/store/favorites.store";
import { productService } from "@/services/product.service";
import { useHasMounted } from "@/hooks/useHasMounted";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import type { ProductWithFacilityOut } from "@/types/api.generated";

/**
 * صفحة المفضلة — الجولة 13 (ميزة جديدة).
 *
 * المفضلة كانت زر قلب فقط (الجولة 10) بلا صفحة تجمعها — هذه الصفحة:
 * 1. تجلب كل المنتجات المفضلة بالتوازي (useQueries — حتى 30 صنفاً)
 * 2. تعرضها بشبكة ProductCard نفسها (طلب فوري + إضافة للسلة)
 * 3. تفصل المفضلة «المتوفرة» عن «النفدت» (قسم خاص أسفل)
 * 4. زر إزالة الكل بتأكيد نقرتين (يتحوّل لـ«تأكيد؟» ثم يرتدّ بعد 3.5s)
 *
 * الترطيب: favorites.store يعمل بـ skipHydration — ننتظر التركيب
 * قبل قراءة المعرّفات (بلا اختلاف SSR).
 */
export function FavoritesContent() {
  const hasMounted = useHasMounted();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const [confirmingClear, setConfirmingClear] = useState(false);

  /* ترطيب المفضلة من localStorage (النمط الموحّد للمخازن المحلية) */
  useEffect(() => {
    void useFavoritesStore.persist.rehydrate();
  }, []);

  const ids = hasMounted ? favoriteIds : [];

  /* جلب كل المفضلة بالتوازي — يستفيد من كاش React Query الموجود */
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => productService.getProduct(id),
      staleTime: 60 * 1000,
      retry: 1,
    })),
  });

  /* فصل المتوفر عن النافد */
  const { available, outOfStock, loading } = useMemo(() => {
    const available: ProductWithFacilityOut[] = [];
    const outOfStock: ProductWithFacilityOut[] = [];
    let loading = false;
    for (const q of queries) {
      if (q.data) {
        const p = { ...q.data, distance_km: null } as ProductWithFacilityOut;
        if (!p.is_available || p.available_quantity === 0) {
          outOfStock.push(p);
        } else {
          available.push(p);
        }
      } else if (q.isLoading) {
        loading = true;
      }
    }
    return { available, outOfStock, loading };
  }, [queries]);

  const total = available.length + outOfStock.length;

  /* ارتداد زر التأكيد بعد 3.5 ثانية إن لم يُؤكَّد */
  useEffect(() => {
    if (!confirmingClear) return;
    const t = window.setTimeout(() => setConfirmingClear(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmingClear]);

  const handleClear = () => {
    haptic("tick");
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    setConfirmingClear(false);
    clearFavorites();
    toast({ title: "تمت إزالة كل المفضلات" });
  };

  return (
    <>
      <ScreenHeader title="المفضلة" fallbackHref="/">
        {ids.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "native-tap inline-flex h-10 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors",
              confirmingClear
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
            aria-label={
              confirmingClear
                ? "تأكيد إزالة كل المفضلات"
                : "إزالة كل المفضلات"
            }
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {confirmingClear ? "تأكيد؟" : "إزالة الكل"}
          </button>
        )}
      </ScreenHeader>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {/* وصف عدّاد */}
        {ids.length > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            {loading && total === 0
              ? "جارٍ تحميل مفضلتك..."
              : `${total} ${total === 1 ? "وجبة" : "وجبات"} في مفضلتك`}
          </p>
        )}

        {/* الحالة الفارغة */}
        {hasMounted && ids.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="لا توجد مفضلات بعد"
            description="اضغط على أيقونة القلب في أي وجبة لإضافتها هنا — تبقى مفضلاتك محفوظة على جهازك."
            action={
              <Link
                href="/"
                className="native-tap mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                تصفّح الوجبات
              </Link>
            }
          />
        ) : loading && total === 0 ? (
          /* هيكل التحميل — نفس شبكة كروت الوجبات */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: Math.min(ids.length || 4, 4) }).map(
              (_, i) => (
                <ProductCardSkeleton key={i} />
              )
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* المتوفر */}
            {available.length > 0 && (
              <section aria-label="وجبات مفضلة متوفرة">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {available.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* النافد */}
            {outOfStock.length > 0 && (
              <section aria-label="وجبات مفضلة نفدت مؤقتاً">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                    aria-hidden="true"
                  />
                  نفدت مؤقتاً ({outOfStock.length})
                </h2>
                <div className="grid grid-cols-2 gap-3 opacity-70 sm:grid-cols-3 lg:grid-cols-4">
                  {outOfStock.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
