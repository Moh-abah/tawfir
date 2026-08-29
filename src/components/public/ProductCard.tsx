"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, ShoppingBag, UtensilsCrossed, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { AddToCartButton } from "@/components/public/AddToCartButton";
import { useMe } from "@/hooks/useMe";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { DISCOUNT_RATE } from "@/lib/site-config";
import type { ProductWithFacilityOut } from "@/types/api.generated";
import {
  CheckoutSheet,
  type CheckoutProduct,
} from "@/components/public/CheckoutSheet";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductWithFacilityOut;
  className?: string;
  /** الجولة 15 — تحميل فوري للصورة (LCP) لأول بطاقة في الشبكة */
  priority?: boolean;
}

/**
 * شارة التوفّر — compact (text-[9px]) نمط Netflix (الجولة 4):
 *  0  → «نفد» (destructive على صورة داكنة)
 *  null → «متوفر» (success)
 *  >0 → «الكمية: X»
 */
function AvailabilityBadge({
  product,
}: {
  product: ProductWithFacilityOut;
}) {
  if (!product.is_available || product.available_quantity === 0) {
    return (
      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-white">
        نفد
      </span>
    );
  }
  if (product.available_quantity === null) {
    return (
      <span className="rounded-full bg-success px-1.5 py-0.5 text-[9px] font-bold text-white">
        متوفر
      </span>
    );
  }
  return (
    <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
      الكمية: {product.available_quantity}
    </span>
  );
}

/**
 * كارت وجبة — Netflix Grid compact (الجولة 4):
 *  - زوايا rounded-xl + p-2.5 + عنوان text-xs + مطعم text-[10px]
 *  - تأثير لمس native-tap-card (scale 0.97)
 *  - الصورة مربعة aspect-square والنقر عليها → تفاصيل الوجبة
 *  - زر طلب دائري (h-11 w-11) بجانب السعر — نمط تطبيقات Native
 *  - السعر: العضو (primary) + الأصلي مشطوب
 */
export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const [open, setOpen] = useState(false);
  /* الجولة 17 — معاينة سريعة للصورة من الشبكة بلا مغادرة القائمة */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const me = useMe();
  const { accessToken, hydrated } = useCustomerAuth();
  const router = useRouter();

  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;
  const priceNum = parseFloat(product.price) || 0;
  const finalPrice = isMember ? priceNum * (1 - memberRate / 100) : priceNum;
  const outOfStock =
    !product.is_available || product.available_quantity === 0;

  const handleOrder = () => {
    if (!hydrated) return;
    if (!accessToken) {
      toast({
        title: "سجّل الدخول أولاً",
        description: "يجب تسجيل الدخول لإتمام الطلب.",
      });
      router.push("/login");
      return;
    }
    setOpen(true);
  };

  const checkoutProduct: CheckoutProduct = {
    id: product.id,
    facility_id: product.facility_id,
    name: product.name,
    description: product.description,
    price: product.price,
    image_url: product.image_url,
    is_available: product.is_available,
    available_quantity: product.available_quantity,
  };

  return (
    <>
      <article
        className={cn(
          "native-tap-card group relative flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm transition-[shadow,border-color,transform] duration-200 hover:border-primary/30 hover:shadow-md",
          outOfStock && "opacity-70",
          className
        )}
        aria-label={product.name}
      >
        {/* منطقة الصورة — حاوية نسبية تضمّ Link وطبقات الأزرار العائمة
            (الجولة 17): زر التكبير أخ للـ Link لا ابن له — HTML صحيح */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <Link
            href={`/products/${product.id}`}
            className="group/img absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`تفاصيل ${product.name}`}
          >
            {product.image_url ? (
              <ImageWithSkeleton
                src={resolveImageUrl(product.image_url)}
                alt={product.name}
                fill
                priority={priority}
                className={cn(
                  "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
                  outOfStock && "grayscale-[35%]"
                )}
                skeletonClassName="rounded-none"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-muted"
                role="img"
                aria-label={product.name}
              >
                <UtensilsCrossed
                  className="h-8 w-8 text-muted-foreground/40"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
              <AvailabilityBadge product={product} />
              {product.distance_km != null && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {Math.round(product.distance_km * 10) / 10} كم
                </span>
              )}
            </div>
            {/* الجولة 16 — شريط مائل «نفدت الكمية» فوق الصورة عند النفاد:
                أوضح من تعتيم الكارت وحده — نمط بطاقات المنتجات في متاجر Native */}
            {outOfStock && product.image_url && (
              <span
                className="absolute bottom-2 right-0 rounded-l-full bg-destructive/95 py-1 pr-2.5 pl-3 text-[10px] font-extrabold text-white shadow-soft"
                aria-hidden="true"
              >
                نفدت الكمية
              </span>
            )}
          </Link>

          {/* الجولة 17 — زر معاينة ملء الشاشة (أسفل يسار الصورة):
              ظاهر دائماً على اللمس، وعلى الديسكتوب يظهر عند hover.
              هدف لمس 32px مضغوط مقبول داخل بطاقة (الأزرار الرئيسية 44px) */}
          {product.image_url && (
            <button
              type="button"
              onClick={() => {
                haptic("tick");
                setLightboxOpen(true);
              }}
              aria-label={`تكبير صورة ${product.name}`}
              className="native-tap absolute bottom-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-black/60 hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* الجولة 10 — زر المفضلة (قلب) أعلى يسار الصورة.
            خارج الـ Link عمداً (HTML صحيح: بلا interactive داخل interactive) —
            position absolute بالنسبة للكارت فوق منطقة الصورة. */}
        <div className="absolute left-2 top-2 z-10">
          <FavoriteButton
            productId={product.id}
            productName={product.name}
            size="sm"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h3 className="line-clamp-1 text-xs font-bold leading-snug text-foreground">
            <Link
              href={`/products/${product.id}`}
              className="transition-colors hover:text-primary"
            >
              {product.name}
            </Link>
          </h3>
          <p className="line-clamp-1 text-[10px] text-muted-foreground">
            {product.facility.name}
          </p>

          <div className="mt-auto flex items-end justify-between gap-1.5 pt-1">
            <div className="flex min-w-0 flex-col">
              {isMember && (
                <span
                  className="text-[10px] tabular-nums text-muted-foreground line-through"
                  dir="ltr"
                >
                  {formatCurrency(priceNum)}
                </span>
              )}
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  isMember ? "text-primary" : "text-foreground"
                )}
                dir="ltr"
              >
                {formatCurrency(finalPrice)}
              </span>
            </div>
            {/* زر طلب دائري Native — هدف لمس 44px */}
            <div className="flex items-center gap-1.5">
              <AddToCartButton product={product} />
              <Button
                type="button"
                size="icon"
                onClick={handleOrder}
                disabled={outOfStock}
                aria-label={outOfStock ? `نفد ${product.name}` : `اطلب ${product.name}`}
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* الجولة 17 — عارض ملء الشاشة للمعاينة السريعة من الشبكة */}
      {product.image_url && (
        <ImageLightbox
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <CheckoutSheet
        product={checkoutProduct}
        facilityName={product.facility.name}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/** هيكل تحميل — مطابق لشكل الكارت النهائي بالضبط (الجولة 4). */
export function ProductCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm"
      aria-hidden="true"
    >
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-1">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}
