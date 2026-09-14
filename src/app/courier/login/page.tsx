"use client";

/**
 * /courier/login — تحويل ذكي للدخول الموحّد (الجولة 24).
 * ═════════════════════════════════════════════════════════
 * بوابة المندوب اندمجت في نفس تطبيق العميل: شاشة الدخول واحدة
 * على /login بمبدّل دور [عميل / مندوب توصيل]. هذا المسار القديم
 * يوجّه تلقائياً إلى /login?mode=courier (تبويب المندوب مفتوح) —
 * مع الحفاظ على أي باراميترات (expired مثلاً).
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, Bike } from "lucide-react";

function CourierLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const expired = searchParams.get("expired") === "1" ? "?mode=courier&expired=1" : "?mode=courier";
    router.replace(`/login${expired}`);
  }, [router, searchParams]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background"
      role="status"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Bike className="h-8 w-8" aria-hidden="true" />
      </span>
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">
        جارٍ فتح شاشة الدخول الموحّدة…
      </p>
    </div>
  );
}

export default function CourierLoginPage() {
  return (
    <Suspense>
      <CourierLoginRedirect />
    </Suspense>
  );
}
