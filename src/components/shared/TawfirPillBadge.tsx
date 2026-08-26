"use client";

import { cn } from "@/lib/utils";

/**
 * كبسولة توفير الترويجية — سماوية بنص أبيض.
 * «حياة أجمل.. مع خصومات أكثر»
 */
export function TawfirPillBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5",
        "text-xs font-bold text-secondary-foreground shadow-soft",
        className
      )}
    >
      حياة أجمل.. مع خصومات أكثر
    </span>
  );
}
