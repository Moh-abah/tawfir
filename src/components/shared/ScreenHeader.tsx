"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * رأس الشاشة Native — الجولة 9 (المهمة 4)
 *
 * يُستخدم لكل الشاشات الداخلية (عدا الرئيسية) بدلاً من MainHeader العام.
 * - ارتفاع موحد 56px (h-14)
 * - زر رجوع (ChevronRight للـ RTL — يظهر أقصى اليسار) يعود للتاريخ router.back()
 * - العنوان في المنتصف بالضبط (text-lg font-bold)
 * - خلفية bg-background + border-b border-border/50
 * - safe-area-inset-top محترم (للأجهزة ذات الـ notch)
 * - children اختياري للأزرار العرضية كالجرس أو الإجراءات
 *
 * @param title العنوان المركزي للشاشة (string)
 * @param fallbackHref المسار البديل عند عدم توفر تاريخ (مثلاً الجلسة الناشئة مباشرة)
 * @param children عناصر إضافية تُعرض في الطرف (كالجرس)
 * @param sticky إن كان true (الافتراضي) يبقى الرأس لاصقاً أعلى الشاشة
 */
export interface ScreenHeaderProps {
  title: string;
  /** المسار البديل عند عدم توفر تاريخ (الجلسة الناشئة مباشرة) */
  fallbackHref?: string;
  /** عناصر إضافية (جرس + أزرار إجراءات) — تُعرض في النهاية البصرية اليسرى */
  children?: ReactNode;
  /** يبقى الرأس لاصقاً أعلى الشاشة (الافتراضي true) */
  sticky?: boolean;
  /** إخفاء زر الرجوع (للشاشات الجذرية مثل الدخول/التسجيل) */
  hideBackButton?: boolean;
  className?: string;
}

export function ScreenHeader({
  title,
  fallbackHref,
  children,
  sticky = true,
  hideBackButton = false,
  className,
}: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    // إن وُجد تاريخ سابق، ارجع إليه؛ وإلا انتقل للمسار البديل
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.push("/");
    }
  };

  return (
    <header
      className={cn(
        "z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg",
        sticky && "sticky top-0",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="banner"
    >
      <div className="grid h-14 w-full grid-cols-[44px_1fr_44px] items-center px-2">
        {/* زر الرجوع — أقصى اليسار (للـ RTL يكون ChevronRight موجهاً يميناً = رجوع) */}
        <div className="flex justify-start">
          {!hideBackButton && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="رجوع"
              className="native-tap flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* العنوان المركزي — بالضبط في المنتصف */}
        <h1
          className="truncate text-center text-lg font-bold text-foreground"
          title={title}
        >
          {title}
        </h1>

        {/* أزرار العرض — أقصى اليمين (الطرف البصري الأيمن للـ RTL) */}
        <div className="flex justify-end">{children}</div>
      </div>
    </header>
  );
}

/**
 * نسخة Skeleton من رأس الشاشة — لاستخدامها أثناء تحميل العنوان الديناميكي
 * (مثلاً اسم المتجر في /facilities/{id} قبل وصول البيانات).
 */
export function ScreenHeaderSkeleton({ children }: { children?: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="banner"
      aria-busy="true"
    >
      <div className="grid h-14 w-full grid-cols-[44px_1fr_44px] items-center px-2">
        <div className="flex justify-start">
          <div className="h-10 w-10 rounded-full bg-muted" />
        </div>
        <div className="mx-auto h-6 w-32 rounded-md bg-muted" />
        <div className="flex justify-end">{children}</div>
      </div>
    </header>
  );
}
