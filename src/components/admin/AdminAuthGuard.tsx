"use client";

import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side guard for protected admin content.
 * - While auth store is hydrating → show a centered loader.
 * - If hydrated but no access token → redirect to /admin/login.
 * - If access token present → render children.
 */
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, hydrated } = useAdminAuth();

  useEffect(() => {
    if (hydrated && !accessToken) {
      window.location.href = "/admin/login";
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
    // Waiting for the redirect effect to run.
    return null;
  }

  return <>{children}</>;
}
