"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface DiscountBadgeProps {
  percentage?: number;
  className?: string;
}

export function DiscountBadge({
  /* بلا رقم افتراضي: النسبة الحقيقية تأتي من المتجر (يحددها التاجر) أو
     من عضوية العميل (من /me) — 0/غياب = لا تُعرض الشارة إطلاقاً */
  percentage = 0,
  className,
}: DiscountBadgeProps) {
  if (!percentage || percentage <= 0) return null;
  return (
    <span
      className={cn(
        "animate-badge-shimmer relative inline-flex items-center gap-1.5 overflow-hidden",
        "rounded-full px-3 py-1.5",
        "bg-accent text-accent-foreground",
        "text-xs font-extrabold leading-none tracking-wide",
        "shadow-lg shadow-accent/25",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      <span>خصم {percentage}%</span>
    </span>
  );
}
