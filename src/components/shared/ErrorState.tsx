"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "حدث خطأ",
  message = "لم نتمكن من تحميل البيانات. يرجى المحاولة مرة أخرى.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="flex flex-col items-center text-center rounded-2xl border bg-card p-8 sm:p-10 max-w-sm w-full">
        {/* Warning triangle with gradient background */}
        <div className="relative mb-5">
          <div
            className="absolute inset-0 -m-2 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, var(--destructive) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full">
            <div
              className="absolute inset-0 rounded-full opacity-10"
              style={{
                background: "linear-gradient(135deg, var(--destructive), var(--accent))",
              }}
            />
            <AlertTriangle className="relative h-8 w-8 text-destructive" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs mb-5 leading-relaxed">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="rounded-full">
            إعادة المحاولة
          </Button>
        )}
      </div>
    </div>
  );
}
