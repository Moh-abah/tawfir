import { Suspense } from "react";
import type { Metadata } from "next";
import { ScreenHeaderSkeleton } from "@/components/shared/ScreenHeader";
import { Skeleton } from "@/components/ui/skeleton";
import SearchContent from "./SearchContent";

export const metadata: Metadata = {
  title: "البحث | توفير",
  description:
    "ابحث في كل شيء: وجبات، مطاعم، مقاهي وعروض خاصة — بحث موحّد سريع في تطبيق توفير.",
};

/** هيكل تحميل صفحة البحث — يُعرض أثناء الـ Suspense (prerender + first paint). */
function SearchFallback() {
  return (
    <>
      <ScreenHeaderSkeleton />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[52px] w-full rounded-2xl" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
