import Link from "next/link";
import { Home, Search } from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/**
 * صفحة 404 (not-found.tsx) — الجولة 21.
 * تُعرض عند عدم وجود صفحة مطلوبة.
 */
export default function NotFound() {
  return (
    <div className="login-navy-bg relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <TawfirLogo variant="mark" className="h-20 w-auto" />
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-white">404</h1>
          <p className="text-lg font-bold text-white">الصفحة غير موجودة</p>
          <p className="text-sm text-white/70">
            الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/"
            className="native-tap inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            العودة للرئيسية
          </Link>
          <Link
            href="/search"
            className="native-tap inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-transparent px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            البحث عن وجبة
          </Link>
        </div>
      </div>
    </div>
  );
}
