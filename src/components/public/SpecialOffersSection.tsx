"use client";

import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { SectionTitle } from "@/components/public/SectionTitle";
import {
  SpecialOfferCard,
  SpecialOfferCardSkeleton,
} from "@/components/public/SpecialOfferCard";
import {
  CheckoutSheet,
  type CheckoutProduct,
} from "@/components/public/CheckoutSheet";
import { useSpecialOffers } from "@/hooks/useSpecialOffers";
import { useMarketFacilities } from "@/hooks/useMarketFacilities";
import { useCustomerCoords } from "@/hooks/useCustomerCoords";
import { useRegionStore } from "@/store/region.store";
import { geoTierSort } from "@/lib/geo-sort";
import { useLang } from "@/lib/i18n";
import type { SpecialOfferOut } from "@/types/api.generated";

/**
 * قسم العروض الخاصة على الصفحة الرئيسية — Netflix Grid (الجولة 4):
 * - الموبايل (360px): عمودان — grid-cols-2
 * - التابلت: 3 أعمدة — sm:grid-cols-3
 * - الديسكتوب: 5-6 أعمدة — lg:grid-cols-5 xl:grid-cols-6
 * - إن لم تكن هناك عروض (أو خطأ في الجلب) → يُخفى القسم بالكامل.
 * - يدير عرضاً مُحدداً واحداً ويُمرّره إلى CheckoutSheet واحد مشترك.
 */
export function SpecialOffersSection() {
  const { t } = useLang();
  const { data, isLoading, error } = useSpecialOffers(1, 12);

  const [selectedOffer, setSelectedOffer] = useState<SpecialOfferOut | null>(
    null
  );
  const [open, setOpen] = useState(false);

  const offers = useMemo(() => data?.items ?? [], [data]);

  /* الجولة 46 — فرز «حولي ← منطقتي ← مدينتي» للوفر أيضاً (طلب المالك):
   * ملخص العرض بلا إحداثيات في الباك إند — نربط facility_id بمتاجر
   * السوق (استعلام مشترك مع قسم المتاجر) ونفرز بنفس الطبقات. قبل
   * وصول المتاجر يُعرض الترتيب الأصلي (الأحدث) بلا رفرفة. */
  const coords = useCustomerCoords();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const { data: marketFacilities } = useMarketFacilities();
  const sortedOffers = useMemo(() => {
    const facMap = new Map(
      (marketFacilities ?? []).map((f) => [f.id, f])
    );
    if (facMap.size === 0) return offers;
    return geoTierSort(
      offers,
      (o) => {
        const f = facMap.get(o.facility_id);
        return f
          ? {
              latitude: f.latitude,
              longitude: f.longitude,
              region_id: f.region_id,
            }
          : null;
      },
      coords,
      selectedRegionId
    );
  }, [offers, marketFacilities, coords, selectedRegionId]);

  // إخفاء القسم بالكامل إن لم تكن هناك عروض أو حدث خطأ
  if (error || (!isLoading && offers.length === 0)) {
    return null;
  }

  const handleOrder = (offer: SpecialOfferOut) => {
    setSelectedOffer(offer);
    setOpen(true);
  };

  const visibleOffers = sortedOffers.length ? sortedOffers : offers;

  // بناء CheckoutProduct من العرض الخاص المُحدّد
  const checkoutProduct: CheckoutProduct = selectedOffer
    ? {
        id: selectedOffer.product?.id ?? 0,
        facility_id: selectedOffer.facility_id,
        name: selectedOffer.product?.name ?? selectedOffer.title,
        description: null,
        // السعر الأصلي يُستعمل فقط كمرجع؛ CheckoutSheet يستعمل أسعار العرض
        price: String(selectedOffer.base_price ?? selectedOffer.product?.price ?? 0),
        image_url: selectedOffer.product?.image_url ?? null,
        is_available: (selectedOffer.quantity_remaining ?? 1) > 0,
        available_quantity: selectedOffer.quantity_remaining,
      }
    : {
        id: 0,
        facility_id: 0,
        name: "",
        description: null,
        price: "0",
        image_url: null,
        is_available: false,
        available_quantity: null,
      };

  // تجميع خاصية مختصرة لعرض الأسعار في CheckoutSheet
  const checkoutSpecialOffer = selectedOffer
    ? {
        id: selectedOffer.id,
        offer_discount_rate: selectedOffer.offer_discount_rate,
        base_price: selectedOffer.base_price,
        member_price: selectedOffer.member_price,
        non_member_price: selectedOffer.non_member_price,
        facility_discount_rate: selectedOffer.facility_discount_rate,
      }
    : null;

  return (
    <section className="space-y-6" aria-label={t("home.specialOffers.aria")}>
      {/* العنوان — الجولة 16: SectionTitle موحّد بشريط لهجة متدرّج */}
      <SectionTitle
        icon={Flame}
        title={t("home.specialOffers.title")}
        description={t("home.specialOffers.description")}
      />

      {/* المحتوى — Netflix Grid */}
      {isLoading ? (
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SpecialOfferCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {visibleOffers.map((offer) => (
            <SpecialOfferCard
              key={offer.id}
              specialOffer={offer}
              onOrder={handleOrder}
            />
          ))}
        </div>
      )}

      {/* CheckoutSheet واحد مشترك — يُفتح بالعرض المُحدّد */}
      <CheckoutSheet
        product={checkoutProduct}
        facilityName={selectedOffer?.facility?.name ?? undefined}
        specialOffer={checkoutSpecialOffer}
        open={open}
        onOpenChange={setOpen}
      />
    </section>
  );
}
