"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/public/SectionTitle";
import { History } from "lucide-react";
import { productService } from "@/services/product.service";
import { ProductCard } from "@/components/public/ProductCard";
import { useRecentlyViewedStore } from "@/store/recently-viewed.store";

/**
 * قسم «شاهدت مؤخراً» — الجولة 13 (ميزة جديدة).
 *
 * - يسجّل ProductDetailContent كل وجبة تُزور في مخزن محلي (آخر 12).
 * - يظهر فقط عند وجود مشاهدات — الرئيسية تبقى نظيفة للزوار الجدد.
 * - صف أفقي قابل للتمرير (snap) ببطاقات بعرض ثابت — نفس نمط مفضلتي.
 * - جلب واحد كبير (100) + فلترة عميل بمعرّفات المشاهدات (نفس أسلوب
 *   FavoritesSection — مجموعة بيانات صغيرة).
 */
export function RecentlyViewedSection() {
  const recentIds = useRecentlyViewedStore((s) => s.productIds);
  const hasRecent = recentIds.length > 1; /* الواحدة الأخيرة غالباً هي الحالية — نتجاهلها */

  const { data, isLoading } = useQuery({
    queryKey: [
      "products",
      { page: 1, page_size: 100, recent_source: true },
    ],
    queryFn: () => productService.getProducts({ page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: hasRecent,
  });

  const recentProducts = useMemo(() => {
    if (!data?.items || recentIds.length === 0) return [];
    const order = new Map(recentIds.map((id, idx) => [id, idx]));
    return data.items
      .filter((p) => order.has(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .slice(0, 10);
  }, [data, recentIds]);

  /* لا نعرض القسم أبداً بلا مشاهدات كافية */
  if (!hasRecent) return null;

  return (
    <section className="space-y-4" aria-label="شاهدت مؤخراً">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle
          icon={History}
          title="شاهدت مؤخراً"
          description="استأنف من حيث توقفت — آخر الوجبات التي تصفّحتها"
        />
      </div>

      {isLoading ? (
        /* هيكل تحميل — صف من البطاقات */
        <div className="flex gap-3 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-[164px] shrink-0 rounded-xl border border-border/30 bg-card shadow-sm"
            >
              <div className="aspect-square w-full animate-pulse rounded-t-xl bg-muted" />
              <div className="space-y-2 p-2.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-mobile-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {recentProducts.map((product) => (
            <div
              key={product.id}
              className="w-[164px] shrink-0 snap-start sm:w-[184px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
