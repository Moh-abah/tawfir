"use client";

/**
 * WaitMode — «وضع الانتظار الرشيق» (قاعدة §7-4 — لا شاشة بيضاء).
 * يُستهلك في كل شاشات المندوب عند: تعذر الاتصال (status 0) أو 403
 * لعلم مطفأ. رسالة عربية واضحة + زر إعادة المحاولة + حالة فنية مختصرة.
 */

import { CloudOff, RefreshCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WaitMode({
  reason,
  onRetry,
  isRetrying = false,
  hint,
  compact = false,
}: {
  reason: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-muted/40 text-center",
        compact ? "p-6" : "p-10",
      )}
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <CloudOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <p className="text-base font-extrabold text-foreground">
          وضع الانتظار الرشيق
        </p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
          {reason}
        </p>
        {hint && (
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground/80">
            {hint}
          </p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="lg"
          onClick={onRetry}
          disabled={isRetrying}
          className="h-12 gap-2 rounded-2xl native-tap"
          aria-label="إعادة محاولة الاتصال"
        >
          <RefreshCcw
            className={cn("h-4.5 w-4.5", isRetrying && "animate-spin")}
            aria-hidden="true"
          />
          {isRetrying ? "جارٍ إعادة المحاولة…" : "إعادة المحاولة"}
        </Button>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        سنعيد الاتصال تلقائياً فور عودة الشبكة
      </p>
    </div>
  );
}
