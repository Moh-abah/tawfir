"use client";

/**
 * (courier)/courier/layout — قشرة البوابة المحمية (جزيرة مستقلة).
 * الحارس الثلاثي:
 *   1) لا توكن → /courier/login
 *   2) توكن + حالة ≠ verified → /courier/waiting
 *   3) verified → القشرة الميدانية (شريط سفلي + حاشية سفلية)
 * التحقق من حالة التوثيق من GET /courier/me (لا من الـ JWT — مصدر حقيقة
 * واحداً: الخادم).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogOut, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourierBottomNav } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import { useCourierMe, useCourierSession, useCourierLogout } from "@/hooks/useCourier";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

function CourierPortalGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, hasToken } = useCourierSession();
  const logout = useCourierLogout();
  const { data: me, isLoading, isError, error, refetch, isRefetching } = useCourierMe(
    hydrated && hasToken,
  );

  /* 1) لا توكن → الدخول */
  useEffect(() => {
    if (hydrated && !hasToken) {
      router.replace("/courier/login");
    }
  }, [hydrated, hasToken, router]);

  /* 2) غير موثق → الانتظار */
  useEffect(() => {
    if (me && me.verification_status !== "verified") {
      router.replace("/courier/waiting");
    }
  }, [me, router]);

  if (!hydrated || (hasToken && isLoading)) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4" role="status">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Bike className="h-8 w-8" aria-hidden="true" />
        </span>
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">جارٍ فتح بوابتك الميدانية…</p>
      </div>
    );
  }

  if (isError && hasToken) {
    /* 403/انقطاع — وضع الانتظار الرشيق داخل القشرة */
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-6 p-4">
        <TawfirLogo variant="full" size="md" href="" />
        <WaitMode
          reason={
            error instanceof Error
              ? error.message
              : "تعذّر الاتصال بخدمة المندوبين — حسابك محفوظ ولن يتأثر"
          }
          hint="إن ظهرت رسالة صلاحية فهذا قد يعمل أن بوابة المندوبين موقوفة مؤقتاً من الإدارة"
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
        <Button
          variant="ghost"
          onClick={() => {
            logout();
            router.replace("/courier/login");
          }}
          className="gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          تسجيل الخروج
        </Button>
      </main>
    );
  }

  if (!me || me.verification_status !== "verified") {
    /* في الطريق إلى waiting — رسم انتقالي */
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  /* 3) الموثق — القشرة الميدانية */
  return (
    <div className="min-h-[100dvh] bg-background pb-20 lg:pb-0">
      {children}
      <CourierBottomNav />
      {/* فوتر ثابت أسفل — يمتد أسفل المحتوى بلا فراغ عائم */}
      <footer className="mt-auto hidden border-t border-border/50 py-4 text-center text-[11px] text-muted-foreground lg:block">
        بوابة مندوبي توفير —{" "}
        <Link href="/" className="hover:text-foreground hover:underline">
          tawfir.giize.com
        </Link>
      </footer>
    </div>
  );
}

export default function CourierPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CourierPortalGuard>{children}</CourierPortalGuard>;
}
