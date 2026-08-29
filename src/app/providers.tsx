"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { NativeBridge } from "@/components/native/NativeBridge";
import { NotificationsProvider } from "@/components/shared/NotificationsProvider";
import { FcmRegistrar } from "@/components/shared/FcmRegistrar";
import { SessionRestore } from "@/components/shared/SessionRestore";
import { SoundService } from "@/lib/sound-service";

/* ------------------------------------------------------------------ */
/*  NProgress-style Top Loading Bar (CSS keyframes only, no state)      */
/* ------------------------------------------------------------------ */
function RouteLoadingBar() {
  const pathname = usePathname();

  /* يعاد تركيب الشريط تلقائياً عند تغيّر المسار عبر المفتاح،
     والأنيميشن CSS ينتهي بالشفافية الكاملة (fill forwards) — بلا أي حالة. */
  return (
    <div
      key={pathname}
      className="nprogress-bar"
      role="progressbar"
      aria-label="جاري التحميل"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Providers                                                          */
/* ------------------------------------------------------------------ */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
          },
        },
      })
  );

  // نظام الأصوات (الجولة 8): تهيئة الكاش المسبق بعد أول تفاعل
  React.useEffect(() => {
    SoundService.init();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionRestore />
        <NotificationsProvider>
          <FcmRegistrar>
            <RouteLoadingBar />
            <OfflineBanner />
            <ServiceWorkerRegistrar />
            <NativeBridge />
            {children}
            <Toaster />
          </FcmRegistrar>
        </NotificationsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
