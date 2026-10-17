"use client";

import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/**
 * كبسولة توفير الترويجية — زمردية بنص أبيض.
 * تحمل التاغلاين المعتمد: «وفّر أكثر.. عِش أجمل»
 */
export function TawfirPillBadge({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5",
        "text-xs font-bold text-secondary-foreground shadow-soft",
        className
      )}
    >
      {t("profile.card.tagline")}
    </span>
  );
}
