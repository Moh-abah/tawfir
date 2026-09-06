"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * مكوّن عرض النجوم — الجولة 21 (webDevReview #5).
 *
 * يعرض متوسط التقييم بنجوم (1-5) + عدد التقييمات.
 * متجاوب: الحجم الافتراضي sm، يمكن تمرير size="lg" للتفاصيل.
 *
 * الاستخدام:
 *   <Stars average={4.5} count={12} />
 *   <Stars average={5} count={1} size="lg" showNumber />
 */
interface StarsProps {
  average: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  showCount?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { star: "h-3 w-3", text: "text-[10px]", container: "gap-0.5" },
  md: { star: "h-3.5 w-3.5", text: "text-xs", container: "gap-1" },
  lg: { star: "h-5 w-5", text: "text-sm", container: "gap-1" },
} as const;

export function Stars({
  average,
  count,
  size = "sm",
  showNumber = true,
  showCount = false,
  className,
}: StarsProps) {
  const sizes = SIZE_MAP[size];

  // قرّب لـ0.5 (مثل 4.5 نجوم)
  const rounded = Math.round(average * 2) / 2;

  return (
    <div
      className={cn("inline-flex items-center", sizes.container, className)}
      role="img"
      aria-label={`تقييم ${average} من 5${count != null ? ` (${count} تقييم)` : ""}`}
    >
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rounded);
          const half = !filled && i - 0.5 <= rounded;
          return (
            <span key={i} className="relative inline-block">
              <Star
                className={cn(sizes.star, "text-muted-foreground/30")}
                aria-hidden="true"
              />
              {(filled || half) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={half ? { width: "50%" } : undefined}
                >
                  <Star
                    className={cn(
                      sizes.star,
                      "fill-accent text-accent",
                    )}
                    aria-hidden="true"
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showNumber && (
        <span className={cn("font-bold text-foreground", sizes.text)}>
          {average.toFixed(1)}
        </span>
      )}
      {showCount && count != null && count > 0 && (
        <span className={cn("text-muted-foreground", sizes.text)}>
          ({count})
        </span>
      )}
    </div>
  );
}
