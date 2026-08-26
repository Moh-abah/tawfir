"use client";

import { useEffect, useState } from "react";
import { Flame, Clock, UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SpecialOfferOut } from "@/types/api.generated";

interface SpecialOfferCardProps {
  specialOffer: SpecialOfferOut;
  onOrder: (offer: SpecialOfferOut) => void;
  className?: string;
}

/**
 * عدّاد تنازلي حيّ — يُعرض فقط إن كانت نهاية العرض خلال 24 ساعة.
 * حجم مُصغّر (text-[9px]) فوق الصورة أسفلها — نمط Netflix (الجولة 4).
 */
function CountdownTimer({ endsAt }: { endsAt: string | null }) {
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
      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-white">
        <Clock className="h-2.5 w-2.5" aria-hidden="true" />
        انتهى
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
    <span className="inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">
      <Clock className="h-2.5 w-2.5 animate-pulse" aria-hidden="true" />
      <span dir="ltr">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}

/**
 * كارت عرض خاص — Netflix Grid المدمج (الجولة 4):
 *  - زوايا rounded-xl + إطار border-border/30 + ظل خفيف
 *  - تأثير لمس native-tap-card (scale 0.97)
 *  - صورة مربعة aspect-square + تكبير hover سلس
 *  - شارة الخصم أعلى اليسار (accent) + شارة Flame أعلى اليمين
 *  - شارة الكمية (bg-black/70) + عدّاد تنازلي أسفل الصورة
 *  - محتوى p-2.5: عنوان text-xs + مطعم text-[10px] + سطر السعر
 *  - الكارت كامل قابل للنقر → CheckoutSheet (اطلب الآن)
 */
export function SpecialOfferCard({
  specialOffer,
  onOrder,
  className,
}: SpecialOfferCardProps) {
  const product = specialOffer.product;
  const facility = specialOffer.facility;

  const memberPrice = specialOffer.member_price;
  const originalPrice = specialOffer.base_price;
  const offerRate = specialOffer.offer_discount_rate;

  const remaining = specialOffer.quantity_remaining;
  const soldOut = remaining !== null && remaining <= 0;

  return (
    <button
      type="button"
      onClick={() => onOrder(specialOffer)}
      disabled={soldOut}
      aria-label={
        soldOut
          ? `${specialOffer.title} — نفدت الكمية`
          : `اطلب ${specialOffer.title} الآن بسعر العضو`
      }
      className={cn(
        "native-tap-card group relative w-full overflow-hidden rounded-xl border border-border/30 bg-card text-right shadow-sm transition-shadow duration-200 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        soldOut && "opacity-60",
        className
      )}
    >
      {/* الصورة — مربعة 1:1 نمط Netflix */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {product?.image_url ? (
          <ImageWithSkeleton
            src={resolveImageUrl(product.image_url)}
            alt={product?.name ?? specialOffer.title}
            fill
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            skeletonClassName="rounded-none"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-muted"
            role="img"
            aria-label={product?.name ?? specialOffer.title}
          >
            <UtensilsCrossed
              className="h-8 w-8 text-muted-foreground/40"
              aria-hidden="true"
            />
          </div>
        )}

        {/* شارة الخصم — أعلى يسار (compact) */}
        <span
          className="absolute left-2 top-2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground shadow-sm"
        >
          خصم {offerRate}%
        </span>

        {/* شارة Flame + الكمية — أعلى يمين */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <span
            className="inline-flex animate-pulse items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow-sm"
          >
            <Flame className="h-2.5 w-2.5" aria-hidden="true" />
            عرض خاص
          </span>
          {remaining !== null && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white",
                remaining <= 5 ? "bg-destructive" : "bg-black/70"
              )}
            >
              متبقي {remaining}
            </span>
          )}
        </div>

        {/* العدّاد التنازلي — أسفل الصورة وسطاً */}
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <CountdownTimer endsAt={specialOffer.ends_at} />
        </div>
      </div>

      {/* المحتوى — compact */}
      <div className="space-y-1 p-2.5">
        <h3 className="line-clamp-1 text-xs font-bold leading-snug text-foreground">
          {specialOffer.title}
        </h3>
        <p className="line-clamp-1 text-[10px] text-muted-foreground">
          {facility?.name ?? product?.name ?? ""}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span
            className="text-xs font-bold tabular-nums text-primary"
            dir="ltr"
          >
            {formatCurrency(memberPrice)}
          </span>
          <span
            className="text-[10px] tabular-nums text-muted-foreground line-through"
            dir="ltr"
          >
            {formatCurrency(originalPrice)}
          </span>
        </div>
      </div>
    </button>
  );
}

/** هيكل تحميل — مطابق لشكل الكارت النهائي بالضبط (الجولة 4). */
export function SpecialOfferCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border/30 bg-card shadow-sm"
      aria-hidden="true"
    >
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-1 p-2.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      </div>
    </div>
  );
}
