"use client";

/**
 * CourierModeCard — بوابة المندوب داخل تطبيق العميل (الجولة 24).
 * ═════════════════════════════════════════════════════════════════
 * تطبيق واحد للجميع: نفس التطبيق المثبَّت ونفس الرابط، والصلاحيات
 * تتحدد بالجلسات. هذه البطاقة تظهر في صفحة «حسابي»:
 *
 *  • جلسة مندوب موجودة → بطاقة زمردية تعرض حالة التوثيق + رابط
 *    لوحة المندوب الميدانية (النداءات/المهام/الأرباح) — التبديل
 *    بين وضع العميل ووضع المندوب بنقرة.
 *  • لا جلسة مندوب → دعوة هادئة «اعمل معنا في التوصيل» تفتح
 *    التسجيل الميداني (خطوة واحدة وتبدأ باستقبال النداءات).
 */

import Link from "next/link";
import { Bike, ChevronLeft, Clock3, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourierMe, useCourierSession } from "@/hooks/useCourier";
import { cn } from "@/lib/utils";

export function CourierModeCard() {
  const { hydrated, hasToken } = useCourierSession();
  const { data: me, isLoading } = useCourierMe(hasToken);

  /* ── لا جلسة مندوب → دعوة هادئة ── */
  if (!hydrated || !hasToken) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Bike className="h-5.5 w-5.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-foreground">
              اعمل معنا في التوصيل
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              انضم لفريق مندوبي توفير واستقبل نداءات التوصيل من نفس تطبيقك
            </p>
          </div>
          <Button
            asChild
            type="button"
            size="sm"
            variant="outline"
            className="h-10 shrink-0 gap-1.5 rounded-full font-bold"
          >
            <Link href="/courier/register">
              انضم الآن
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── جلسة موجودة قيد التحميل ── */
  if (isLoading || !me) {
    return (
      <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    );
  }

  const verified = me.verification_status === "verified";

  /* ── جلسة مندوب نشطة → بطاقة الوصول للوحة ── */
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        verified
          ? "border-primary/30 bg-primary/[0.06]"
          : "border-border/70 bg-muted/40",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            verified
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Bike className="h-5.5 w-5.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-foreground">
              وضع المندوب — {me.public_name ?? "مندوب توفير"}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                verified
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {verified ? (
                <>
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  موثّق
                </>
              ) : (
                <>
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  قيد التوثيق
                </>
              )}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {verified
              ? "لوحتك الميدانية جاهزة — النداءات والمهام والأرباح من نفس التطبيق"
              : "مستنداتك قيد المراجعة من الإدارة — سنبلغك فور الاعتماد"}
          </p>
        </div>
      </div>

      <Button
        asChild
        type="button"
        className="mt-3 min-h-[44px] w-full gap-2 rounded-full font-bold"
        variant={verified ? "default" : "outline"}
      >
        <Link href={verified ? "/courier/home" : "/courier/waiting"}>
          {verified ? (
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          )}
          {verified ? "فتح لوحة المندوب" : "متابعة حالة التوثيق"}
        </Link>
      </Button>
    </div>
  );
}
