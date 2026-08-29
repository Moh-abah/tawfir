"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";
import {
  SpecialOfferCard,
  SpecialOfferCardSkeleton,
} from "@/components/public/SpecialOfferCard";
import {
  CheckoutSheet,
  type CheckoutProduct,
} from "@/components/public/CheckoutSheet";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSpecialOffers } from "@/hooks/useSpecialOffers";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { SpecialOfferOut } from "@/types/api.generated";

/**
 * الجولة 10 — حالة «لا توجد عروض» احتفالية بلمسة حركة خفيفة:
 * أيقونة شرارة تنبض بتوهّج ذهبي + شرارات عائمة حولها (تحترم تقليل الحركة).
 */
function OffersEmptyCelebration() {
  const prefersReduced = usePrefersReducedMotion();
  if (prefersReduced) {
    return (
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-primary/10 to-accent/10"
        aria-hidden="true"
      >
        <Sparkles className="h-10 w-10 text-primary/60" />
      </div>
    );
  }
  return (
    <div
      className="relative mx-auto flex h-24 w-24 items-center justify-center"
      aria-hidden="true"
    >
      {/* هالة نابضة */}
      <motion.span
        className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/15 to-accent/15"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute inset-2 rounded-full bg-gradient-to-b from-primary/10 to-accent/10" />
      {/* شرارات عائمة */}
      <motion.span
        className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-accent/70"
        animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute -bottom-1 left-2 h-1.5 w-1.5 rounded-full bg-secondary/70"
        animate={{ y: [0, 5, 0], opacity: [0.6, 1, 0.6] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
      />
      <motion.span
        className="absolute top-3 -left-1 h-1.5 w-1.5 rotate-45 bg-primary/60"
        animate={{ rotate: [45, 90, 45], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <Sparkles className="relative h-10 w-10 text-primary/70" />
    </div>
  );
}

/**
 * شاشة العروض الخاصة — الجولة 9 (المهمة 5)
 *
 * القاعدة المطلقة: العروض الخاصة فقط (لا منتجات عادية إطلاقاً).
 *  - إن وُجدت عروض نشطة → شبكة كروت
 *  - إن لم توجد → EmptyState أنيق («لا توجد عروض حالياً — ترقّب عروضاً حصرية قريباً»)
 *  - تبويب العروض في الشريط السفلي يوجّه إلى هذه الصفحة (/offers)
 */
export function OffersContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSpecialOffers(1, 50);

  const [selectedOffer, setSelectedOffer] = useState<SpecialOfferOut | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  const offers = useMemo(() => data?.items ?? [], [data]);

  const handleOrder = (offer: SpecialOfferOut) => {
    setSelectedOffer(offer);
    setOpen(true);
  };

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["special-offers"] });
  };

  // بناء CheckoutProduct من العرض الخاص المُحدّد
  const checkoutProduct: CheckoutProduct = selectedOffer
    ? {
        id: selectedOffer.product?.id ?? 0,
        facility_id: selectedOffer.facility_id,
        name: selectedOffer.product?.name ?? selectedOffer.title,
        description: null,
        // السعر الأصلي يُستعمل فقط كمرجع؛ CheckoutSheet يستعمل أسعار العرض
        price: String(
          selectedOffer.base_price ?? selectedOffer.product?.price ?? 0,
        ),
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
    <>
      <ScreenHeader title="العروض الخاصة" fallbackHref="/" />

      <PullToRefresh onRefresh={onRefresh}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8">
          {/* العنوان — الجولة 10: h2 بدل h1 (الـ h1 الوحيد للصفحة في ScreenHeader — SEO) */}
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-foreground sm:text-3xl">
              <Flame className="h-6 w-6 text-primary" aria-hidden="true" />
              عروض حصرية
            </h2>
            <p className="text-sm text-muted-foreground">
              خصومات إضافية لأعضاء توفير على وجباتك المفضلة — عُد للعروض
              الجديدة كل يوم.
            </p>
          </div>

          {/* المحتوى — Netflix Grid */}
          <div className="mt-6">
            {error ? (
              <EmptyState
                icon={Flame}
                title="تعذّر تحميل العروض"
                description="حدث خطأ أثناء جلب العروض الخاصة. حاول مرة أخرى."
                action={
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    إعادة المحاولة
                  </button>
                }
              />
            ) : isLoading ? (
              <div
                className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
                aria-busy="true"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SpecialOfferCardSkeleton key={i} />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-4 py-14">
                <OffersEmptyCelebration />
                <div className="space-y-1.5 text-center">
                  <p className="text-base font-extrabold text-foreground">
                    لا توجد عروض حالياً
                  </p>
                  <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
                    ترقّب عروضاً حصرية قريباً — نضيف عروضاً جديدة من مطاعمنا
                    وكافيهاتنا المشتركة باستمرار. فعّل الإشعارات لتصلك أولاً
                    بأول 🔔
                  </p>
                </div>
                <Link
                  href="/"
                  className="native-tap mt-1 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
                >
                  تصفّح الوجبات
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                {offers.map((offer, i) => (
                  <SpecialOfferCard
                    key={offer.id}
                    specialOffer={offer}
                    onOrder={handleOrder}
                    priority={i === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* CheckoutSheet واحد مشترك — يُفتح بالعرض المُحدّد */}
      <CheckoutSheet
        product={checkoutProduct}
        facilityName={selectedOffer?.facility?.name ?? undefined}
        specialOffer={checkoutSpecialOffer}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
