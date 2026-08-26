"use client";

import { cn } from "@/lib/utils";

const priceFormatter = new Intl.NumberFormat("ar-SA", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

interface PriceTagProps {
  price: number;
  className?: string;
  discountedPrice?: number;
}

export function PriceTag({ price, className, discountedPrice }: PriceTagProps) {
  const formattedPrice = priceFormatter.format(price);
  const discount = discountedPrice !== undefined
    ? discountedPrice
    : price * 0.7; // 30% off
  const formattedDiscounted = priceFormatter.format(discount);

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {/* Original price with strikethrough */}
      <span className="text-xs text-muted-foreground line-through">
        {formattedPrice} ر.س
      </span>
      {/* Discounted price */}
      <span className="text-base font-bold text-foreground">
        {formattedDiscounted} ر.س
      </span>
    </div>
  );
}
