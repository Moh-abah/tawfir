"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { SavingsSummaryCard } from "@/components/public/SavingsSummaryCard";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

/**
 * شاشة سجل التوفير — الجولة 21 (webDevReview #5).
 *
 * تعرض للمستخدم:
 *  - بطاقة SavingsSummaryCard (إجمالي + شهري + سنوي + قيمة العضوية + صافي + ROI)
 *  - شرح موجز: كيف تحسب التوفير
 *  - CTA: تصفّح المتاجر المشتركة لزيادة التوفير
 *
 * الهدف: إقناع المستخدم بأن العضوية تستحق التجديد.
 */
export default function SavingsPage() {
  const { accessToken, hydrated } = useCustomerAuth();

  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="سجل التوفير" fallbackHref="/" />
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="skeleton-branded h-64 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="سجل التوفير" fallbackHref="/" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={TrendingUp}
            title="سجّل الدخول لرؤية سجل توفيرك"
            description="عند تسجيل الدخول ستظهر هنا كل ما وفّرته بفضل عضويتك."
            action={
              <div className="flex flex-col gap-2">
                <Link
                  href="/login?next=/savings"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  إنشاء حساب
                </Link>
              </div>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="سجل التوفير" fallbackHref="/" />
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6">
        <Breadcrumbs
          items={[{ label: "حسابي", href: "/account" }, { label: "سجل التوفير" }]}
          className="mb-4"
        />

        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              كم وفّرت بفضل عضويتك؟
            </h1>
            <p className="text-xs text-muted-foreground">
              تتبع توفيرك من خصم 30% في كل المتاجر المشتركة
            </p>
          </div>
        </div>

        {/* البطاقة الرئيسية */}
        <SavingsSummaryCard variant="full" />

        {/* شرح موجز */}
        <div className="mt-6 rounded-2xl border border-border/40 bg-card p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">
            كيف تحسب التوفير؟
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            نحسب الفرق بين السعر الأصلي والسعر الذي دفعته (بعد خصم العضوية 30%)
            لكل طلب من المتاجر المشتركة. صافي التوفير = إجمالي التوفير ناقص
            قيمة الاشتراك (للعضوية المدفوعة). عائد الاستثمار (ROI) يوضح نسبة
            الفائدة مقابل ما دفعته للاشتراك.
          </p>
        </div>

        {/* CTA */}
        <Button
          asChild
          className="mt-6 w-full min-h-[48px] rounded-2xl"
          size="lg"
        >
          <Link href="/facilities">
            تصفّح المتاجر المشتركة لزيادة توفيرك
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </>
  );
}
