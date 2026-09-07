"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";

/**
 * قشرة شاشات الدخول الثلاث (دخول/تسجيل/استعادة) — جلد هوية توفير:
 *  - ثنائية الثيم (الجولة 22): login-page-bg تتكيف مع الوضع الفاتح
 *    (خلفية فاتحة + هالات زمردية ناعمة) والداكن (كحلي الهوية العميق).
 *    كان التصميم كحلياً ثابتاً فحسب — أُصلح ليحترم اختيار المستخدم.
 *  - هالات زمرردية/فيروزية/ذهبية عائمة (login-blob-*) — تكثُف في الداكن
 *  - الشعار الكامل المقصوص variant=full مع توهج زمردي
 *  - التاغلاين المعتمد «وفّر أكثر.. عِش أجمل» كبسولة زمرردية (توكنات الثيم)
 *  - زر رجوع زجاجي بنمط Native — ألوانه من توكنات الثيم (بوتstrap توكن)
 */
export function AuthShell({
  children,
  backHref = "/",
  wide = false,
}: {
  children: ReactNode;
  backHref?: string;
  /** صيغة عريضة لشاشات متعددة الأعمدة (كالتسجيل على الديسكتوب) */
  wide?: boolean;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  };

  return (
    <div
      className="login-page-bg relative min-h-[100dvh] overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* هالات زمرردية/ذهبية/فيروزية عائمة */}
      <div
        className="login-blob-emerald pointer-events-none absolute -start-28 -top-28 h-80 w-80 rounded-full blur-3xl opacity-60 dark:opacity-100"
        aria-hidden="true"
      />
      <div
        className="login-blob-gold pointer-events-none absolute -end-24 top-1/4 h-72 w-72 rounded-full blur-3xl opacity-60 dark:opacity-100"
        aria-hidden="true"
      />
      <div
        className="login-blob-teal pointer-events-none absolute -bottom-32 start-1/4 h-80 w-80 rounded-full blur-3xl opacity-60 dark:opacity-100"
        aria-hidden="true"
      />

      {/* زر الرجوع الزجاجي — ألوان من توكنات الثيم */}
      <div
        className={`relative z-20 mx-auto w-full px-4 pt-4 ${
          wide ? "max-w-6xl" : "max-w-md"
        }`}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="رجوع"
          className="native-tap flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/80 text-foreground shadow-soft backdrop-blur-md transition-colors hover:bg-card"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* الشعار الكبير + التاغلاين المعتمد */}
      <div className="relative z-10 flex flex-col items-center gap-3 pt-2 text-center">
        <div className="dark:login-logo-glow">
          <TawfirLogo variant="full" size="lg" href="" />
        </div>
        <TawfirPillBadge className="shadow-soft" />
      </div>

      <div
        className={`relative z-10 mx-auto flex w-full flex-col items-center px-4 pb-16 pt-6 ${
          wide ? "max-w-6xl" : "max-w-md"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
