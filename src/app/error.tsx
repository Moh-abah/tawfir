"use client";

import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * صفحة خطأ عامة (error.tsx) — الجولة 21.
 * تُعرض عند أي خطأ runtime في الصفحات.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <TawfirLogo variant="mark" className="h-20 w-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            حدث خطأ غير متوقع
          </h1>
          <p className="text-sm text-white/70">
            نعتذر عن الإزعاج. حاول مرة أخرى أو عُد للرئيسية.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button
            onClick={reset}
            className="native-tap min-h-[48px] w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            إعادة المحاولة
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-[48px] w-full rounded-2xl border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              الرئيسية
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
