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
  const { data, isLoading, error } = useSpecialOffers(1, 12);

  const [selectedOffer, setSelectedOffer] = useState<SpecialOfferOut | null>(
    null
  );
  const [open, setOpen] = useState(false);

  const offers = useMemo(() => data?.items ?? [], [data]);

  // إخفاء القسم بالكامل إن لم تكن هناك عروض أو حدث خطأ
  if (error || (!isLoading && offers.length === 0)) {
    return null;
  }

  const handleOrder = (offer: SpecialOfferOut) => {
    setSelectedOffer(offer);
    setOpen(true);
  };

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
    <section className="space-y-6" aria-label="العروض الخاصة">
      {/* العنوان — الجولة 16: SectionTitle موحّد بشريط لهجة متدرّج */}
      <SectionTitle
        icon={Flame}
        title="عروض خاصة"
        description="خصومات إضافية لأعضاء توفير"
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
          {offers.map((offer) => (
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
