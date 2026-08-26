"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Clock,
  Flame,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  CheckoutSheet,
  type CheckoutProduct,
  type CheckoutSpecialOffer,
  PLACEHOLDER_CHECKOUT_PRODUCT,
} from "@/components/public/CheckoutSheet";
import { useProductDetail } from "@/hooks/useProductDetail";
import { useSpecialOffers } from "@/hooks/useSpecialOffers";
import { useMe } from "@/hooks/useMe";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { DISCOUNT_RATE } from "@/lib/site-config";
import type {
  FacilitySummaryOut,
  ProductDetailOut,
  SpecialOfferOut,
} from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* هيكل تحميل للصفحة كاملة */
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-1/3 rounded-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function AvailabilityBadge({
  available,
  quantity,
}: {
  available: boolean;
  quantity: number | null;
}) {
  if (!available || quantity === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
        نفد
      </span>
    );
  }
  if (quantity === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
        متوفر
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
      الكمية: {quantity}
    </span>
  );
}

function FacilityInfoCard({ facility }: { facility: FacilitySummaryOut }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-bold text-foreground">معلومات المطعم</h3>
      </div>
      <Link
        href={`/facilities/${facility.id}`}
        className="block text-base font-bold text-foreground transition-colors hover:text-primary"
      >
        {facility.name}
      </Link>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {facility.address && (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed">{facility.address}</span>
          </li>
        )}
        {facility.phone && (
          <li className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <a
              href={`tel:${facility.phone}`}
              dir="ltr"
              className="text-secondary transition-colors hover:text-primary"
            >
              {facility.phone}
            </a>
          </li>
        )}
        {facility.working_hours && (
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="leading-relaxed">{facility.working_hours}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * عدّاد تنازلي حيّ — يُعرض فقط إن كانت نهاية العرض خلال 24 ساعة.
 */
function OfferCountdownTimer({ endsAt }: { endsAt: string | null }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const endMs = new Date(endsAt).getTime();
  if (Number.isNaN(endMs)) return null;
  const diffMs = endMs - Date.now();
  if (diffMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        انتهى العرض
      </span>
    );
  }
  if (diffMs > 24 * 60 * 60 * 1000) return null;
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold tabular-nums text-primary">
      <Clock className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
      <span dir="ltr">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

/** بطاقة عرض خاص داخل صفحة تفاصيل المنتج. */
function SpecialOfferDetailCard({
  offer,
  isMember,
}: {
  offer: SpecialOfferOut;
  isMember: boolean;
}) {
  const memberPrice = offer.member_price;
  const nonMemberPrice = offer.non_member_price;
  const remaining = offer.quantity_remaining;

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          عرض خاص — خصم {offer.offer_discount_rate}%
        </span>
        <OfferCountdownTimer endsAt={offer.ends_at} />
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <span
          className="text-2xl font-extrabold tabular-nums text-primary"
          dir="ltr"
        >
          {formatCurrency(isMember ? memberPrice : nonMemberPrice)}
        </span>
        <span
          className="text-sm text-muted-foreground line-through tabular-nums"
          dir="ltr"
        >
          {formatCurrency(offer.base_price)}
        </span>
        {isMember && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            + خصم عضوية {offer.facility_discount_rate}%
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" aria-hidden="true" />
          {isMember ? "السعر للعضو" : "السعر بدون عضوية"}
        </span>
        {remaining !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-bold",
              remaining <= 5 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            الكمية المتبقية: {remaining}
          </span>
        )}
      </div>

      {!isMember && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          اشترك في عضوية توفير لتطبيق خصم إضافي على هذا العرض.
        </p>
      )}
    </div>
  );
}

export default function ProductDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(params.id);
  const { data, isLoading, error, refetch } = useProductDetail(productId);
  const offersQuery = useSpecialOffers(1, 50);
  const me = useMe();
  const { accessToken, hydrated } = useCustomerAuth();

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const product: ProductDetailOut | null = data ?? null;

  // ابحث عن عرض خاص نشط لهذا المنتج
  const specialOffer: SpecialOfferOut | null =
    offersQuery.data?.items?.find(
      (o) => o.product_id === productId && o.is_active
    ) ?? null;

  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;
  const priceNum = product ? parseFloat(product.price) || 0 : 0;
  const finalPrice = isMember ? priceNum * (1 - memberRate / 100) : priceNum;
  const outOfStock =
    !!product &&
    (!product.is_available || product.available_quantity === 0);

  const handleOrder = () => {
    if (!hydrated || !product) return;
    if (!accessToken) {
      toast({
        title: "سجّل الدخول أولاً",
        description: "يجب تسجيل الدخول لإتمام الطلب.",
      });
      router.push("/login");
      return;
    }
    setCheckoutOpen(true);
  };

  const checkoutProduct: CheckoutProduct = product
    ? {
        id: product.id,
        facility_id: product.facility_id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        is_available: product.is_available,
        available_quantity: product.available_quantity,
      }
    : PLACEHOLDER_CHECKOUT_PRODUCT;

  const checkoutSpecialOffer: CheckoutSpecialOffer | null = specialOffer
    ? {
        id: specialOffer.id,
        offer_discount_rate: specialOffer.offer_discount_rate,
        base_price: specialOffer.base_price,
        member_price: specialOffer.member_price,
        non_member_price: specialOffer.non_member_price,
        facility_discount_rate: specialOffer.facility_discount_rate,
      }
    : null;

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState
          title="تعذّر تحميل الوجبة"
          message="حدث خطأ أثناء جلب تفاصيل الوجبة. حاول مرة أخرى."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={UtensilsCrossed}
          title="الوجبة غير موجودة"
          description="لم نتمكن من العثور على هذه الوجبة. ربما حُذفت أو أن الرابط غير صحيح."
          action={
            <Button asChild variant="outline" className="rounded-full min-h-[44px]">
              <Link href="/">العودة للرئيسية</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="مسار التصفح"
        className="mb-4 flex items-center gap-1.5 text-sm"
      >
        <Link
          href="/"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          الرئيسية
        </Link>
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground/50"
          aria-hidden="true"
        />
        <Link
          href={`/facilities/${product.facility.id}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {product.facility.name}
        </Link>
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground/50"
          aria-hidden="true"
        />
        <span className="line-clamp-1 max-w-[200px] font-medium text-foreground sm:max-w-xs">
          {product.name}
        </span>
      </nav>

      {/* Main content */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted">
          {product.image_url ? (
            <ImageWithSkeleton
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              fill
              className="h-full w-full"
              skeletonClassName="rounded-none"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-muted"
              role="img"
              aria-label={product.name}
            >
              <UtensilsCrossed
                className="h-16 w-16 text-muted-foreground/30"
                aria-hidden="true"
              />
            </div>
          )}
          <div className="absolute right-3 top-3">
            <AvailabilityBadge
              available={product.is_available}
              quantity={product.available_quantity}
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              {product.name}
            </h1>
            <Link
              href={`/facilities/${product.facility.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {product.facility.name}
            </Link>
          </div>

          {/* Price / Special offer */}
          {specialOffer ? (
            <SpecialOfferDetailCard offer={specialOffer} isMember={isMember} />
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
              {isMember ? (
                <>
                  <span
                    className="text-base text-muted-foreground line-through"
                    dir="ltr"
                  >
                    {formatCurrency(priceNum)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-accent-foreground">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    خصم {memberRate}%
                  </span>
                  <span
                    className="ml-auto text-2xl font-extrabold text-primary"
                    dir="ltr"
                  >
                    {formatCurrency(finalPrice)}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="text-2xl font-extrabold text-foreground"
                    dir="ltr"
                  >
                    {formatCurrency(priceNum)}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/account")}
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/20"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    اشترك لخصم {DISCOUNT_RATE}%
                  </button>
                </>
              )}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="space-y-1.5">
              <h2 className="text-sm font-bold text-foreground">الوصف</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-foreground">التصنيف</h2>
            <p className="text-sm text-muted-foreground">{product.category}</p>
          </div>

          {/* Order button — scroll-margin-top يحجز مساحة للهيدر الثابت */}
          <Button
            type="button"
            size="lg"
            onClick={handleOrder}
            disabled={outOfStock}
            className={cn(
              "mt-2 min-h-[48px] w-full gap-2 rounded-full",
              "[scroll-margin-top:80px]"
            )}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {outOfStock ? "غير متوفر حالياً" : "اطلب الآن"}
          </Button>

          {/* Facility info */}
          <FacilityInfoCard facility={product.facility} />
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8 mb-4">
        <Link
          href={`/facilities/${product.facility.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary min-h-[44px]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة إلى {product.facility.name}
        </Link>
      </div>

      <CheckoutSheet
        key={checkoutProduct.id}
        product={checkoutProduct}
        facilityName={product.facility.name}
        specialOffer={checkoutSpecialOffer}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />
    </div>
  );
}
