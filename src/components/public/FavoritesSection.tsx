"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/public/SectionTitle";
import { Heart, Trash2 } from "lucide-react";
import { productService } from "@/services/product.service";
import { ProductCard } from "@/components/public/ProductCard";
import { useFavoritesStore } from "@/store/favorites.store";
import { haptic } from "@/lib/haptic";

/**
 * قسم «مفضلتي» — الجولة 10 (ميزة جديدة).
 *
 * - يظهر فقط عند وجود منتجات مفضلة محفوظة محلياً (بلا API خاص —
 *   نجلب صفحة كبيرة من /products ونعمل فلترة عميل بمعرّفات المفضلة).
 * - صف أفقي قابل للتمرير (snap) ببطاقات بعرض ثابت — نمط Talabat/HungerStation.
 * - زر «مسح الكل» مع تأكيد implicitly آمن (المفضلة قابلة لإعادة الإضافة بلمسة).
 * - التقاط الحالة أولاً: إن كان المنتج المفضل غير متوفر الآن يظهر بشفافية
 *   الكارت الافتراضية (opacity-60 من ProductCard نفسها).
 */
export function FavoritesSection() {
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);

  const hasFavorites = favoriteIds.length > 0;

  /* صفحة كبيرة (100) — مجموعة بيانات صغيرة، طلب واحد مخزّن مؤقتاً */
  const { data, isLoading } = useQuery({
    queryKey: ["products", { page: 1, page_size: 100, favorites_source: true }],
    queryFn: () => productService.getProducts({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: hasFavorites,
  });

  const favoriteProducts = useMemo(() => {
    if (!data?.items || favoriteIds.length === 0) return [];
    const order = new Map(favoriteIds.map((id, idx) => [id, idx]));
    return data.items
      .filter((p) => order.has(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [data, favoriteIds]);

  /* لا نعرض القسم أبداً بدون مفضلات — الرئيسية تبقى نظيفة للزوار */
  if (!hasFavorites) return null;

  return (
    <section className="space-y-4" aria-label="مفضلتي">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle
          icon={Heart}
          title="مفضلتي"
          description="وجباتك المفضلة — بلمسة واحدة"
        />
        <button
          type="button"
          onClick={() => {
            clearFavorites();
            haptic("tick");
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border/60 px-4 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive"
          aria-label="مسح كل المفضلات"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          مسح الكل
        </button>
      </div>

      {/* صف أفقي بتمرير snap — بطاقات بعرض ثابت */}
      {isLoading ? (
        <div
          className="flex gap-2.5 overflow-hidden"
          aria-busy="true"
          aria-label="جارٍ تحميل المفضلة"
        >
          {Array.from({ length: Math.min(4, favoriteIds.length) }).map((_, i) => (
            <div
              key={i}
              className="h-[228px] w-[150px] shrink-0 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : favoriteProducts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          المنتجات التي أضفتها للمفضلة لم تعد متاحة الآن — أضف وجبات جديدة من
          العروض بالضغط على القلب ♥
        </p>
      ) : (
        <div
          className="no-mobile-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          role="list"
          aria-label="بطاقات المفضلة"
        >
          {favoriteProducts.map((p) => (
            <div
              key={p.id}
              role="listitem"
              className="w-[150px] shrink-0 snap-start sm:w-[160px]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
