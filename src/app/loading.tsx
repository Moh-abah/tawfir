import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * حالة تحميل عامة (loading.tsx) — الجولة 21.
 * تُعرض أثناء تحميل أي صفحة (Next.js streaming).
 */
export default function Loading() {
  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-6">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <TawfirLogo variant="mark" className="h-16 w-auto animate-pulse" />
        <div className="flex items-center gap-2 text-white/80">
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
        </div>
        <p className="text-sm font-medium text-white/70">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
