"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { useMe } from "@/hooks/useMe";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
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
export function ProductCard({ product, className }: ProductCardProps) {
  const [open, setOpen] = useState(false);
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
          "native-tap-card group flex flex-col overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm transition-shadow duration-200 hover:shadow-md",
          outOfStock && "opacity-60",
          className
        )}
        aria-label={product.name}
      >
        {/* الصورة — النقر عليها يفتح التفاصيل (نمط Netflix) */}
        <Link
          href={`/products/${product.id}`}
          className="relative block aspect-square w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`تفاصيل ${product.name}`}
        >
          {product.image_url ? (
            <ImageWithSkeleton
              src={resolveImageUrl(product.image_url)}
              alt={product.name}
              fill
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
        </Link>

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
      </article>

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
