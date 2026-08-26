// // "use client";

// // import { useEffect } from "react";
// // import { useOwnerAuth } from "@/hooks/useOwnerAuth";
// // import { Skeleton } from "@/components/ui/skeleton";

// // export function OwnerAuthGuard({ children }: { children: React.ReactNode }) {
// //   const { accessToken, hydrated } = useOwnerAuth();

// //   useEffect(() => {
// //     if (hydrated && !accessToken) {
// //       const next = window.location.pathname;
// //       window.location.href = `/owner/login?next=${encodeURIComponent(next)}`;
// //     }
// //   }, [hydrated, accessToken]);

// //   if (!hydrated) {
// //     return (
// //       <div className="flex min-h-screen items-center justify-center">
// //         <div className="flex flex-col items-center gap-4">
// //           <Skeleton className="h-10 w-10 rounded-full" />
// //           <Skeleton className="h-4 w-40" />
// //         </div>
// //       </div>
// //     );
// //   }

// //   if (!accessToken) {
// //     return null;
// //   }

// //   return <>{children}</>;
// // }

// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useOwnerAuth } from "@/hooks/useOwnerAuth";
// import { Skeleton } from "@/components/ui/skeleton";

// export function OwnerAuthGuard({ children }: { children: React.ReactNode }) {
//   const { accessToken, hydrated } = useOwnerAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (hydrated && !accessToken) {
//       const next = window.location.pathname;
//       // لا توجّه أبداً إذا كنا أصلاً في صفحة الدخول
//       if (next !== "/owner/login") {
//         router.replace(`/owner/login?next=${encodeURIComponent(next)}`);
//       }
//     }
//   }, [hydrated, accessToken, router]);

//   if (!hydrated) {
//     return (
//       <div className="flex min-h-screen items-center justify-center">
//         <div className="flex flex-col items-center gap-4">
//           <Skeleton className="h-10 w-10 rounded-full" />
//           <Skeleton className="h-4 w-40" />
//         </div>
//       </div>
//     );
//   }

//   if (!accessToken) return null;

//   return <>{children}</>;
// }
"use client";

import { useEffect } from "react";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * الحماية من مسارات خطيرة (open redirect).
 * يقبل فقط المسارات النسبية التي تبدأ بـ /owner/ أو / فقط.
 */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/owner";
  const trimmed = raw.trim();
  // Reject absolute URLs, protocol-relative, or paths not starting with /
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("://")) {
    // Only allow /owner/* or /
    if (trimmed === "/" || trimmed.startsWith("/owner/")) {
      return trimmed;
    }
  }
  return "/owner";
}

export function OwnerAuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, hydrated } = useOwnerAuth();

  useEffect(() => {
    if (hydrated && !accessToken) {
      const next = sanitizeNext(
        new URLSearchParams(window.location.search).get("next")
      );
      window.location.href = `/owner/login?next=${encodeURIComponent(next)}`;
    }
  }, [hydrated, accessToken]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
