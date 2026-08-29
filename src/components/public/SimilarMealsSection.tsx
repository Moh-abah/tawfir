"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChefHat } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/public/ProductCard";

/**
 * قسم «وجبات من نفس المتجر» — الجولة 15 (ميزة جديدة).
 *
 * يظهر أسفل تفاصيل الوجبة ويقترح بقية وجبات المتجر نفسه —
 * يستفيد من كاش React Query (نفس مفتاح useProducts بفلتر facility_id).
 * - صف أفقي قابل للتمرير (snap) ببطاقات بعرض ثابت — نفس نمط «شاهدت مؤخراً».
 * - يستثني الوجبة الحالية من العرض.
 * - يختفي تماماً إن لم توجد وجبات أخرى (بلا أقسام فارغة).
 * - زر «عرض قائمة المتجر» ينقل لصفحة المتجر (الأقسام/التصنيفات).
 */
export function SimilarMealsSection({
  facilityId,
  facilityName,
  currentProductId,
}: {
  facilityId: number;
  facilityName: string;
  currentProductId: number;
}) {
  const { data, isLoading } = useProducts({
    facility_id: facilityId,
    page: 1,
    page_size: 12,
  });

  const similar = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((p) => p.id !== currentProductId).slice(0, 10);
  }, [data, currentProductId]);

  /* لا نعرض القسم أبداً بلا وجبات مشابهة — ولا أثناء التحميل الأولي
     (هيكل التحميل هنا صغير كي لا يقفز التخطيط عند الوصول) */
  if (isLoading && !data) return null;
  if (similar.length === 0) return null;

  return (
    <section className="mt-8 space-y-4" aria-label="وجبات من نفس المتجر">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground sm:text-xl">
            <ChefHat
              className="h-5 w-5 text-primary sm:h-6 sm:w-6"
              aria-hidden="true"
            />
            من نفس المتجر
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            وجبات أخرى من {facilityName} قد تعجبك
          </p>
        </div>
        <Link
          href={`/facilities/${facilityId}`}
          className="inline-flex min-h-[44px] items-center gap-0.5 text-sm font-bold text-secondary transition-colors hover:text-primary"
        >
          عرض قائمة المتجر
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="no-mobile-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {similar.map((product) => (
          <div
            key={product.id}
            className="w-[164px] shrink-0 snap-start sm:w-[184px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
