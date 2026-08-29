"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * عنوان قسم موحّد — الجولة 16 (تحسينات التنسيق البصري):
 *  - شريط لهجة متدرّج (primary → accent) على يمين العنوان — بصمة العلامة
 *    في كل أقسام الرئيسية (نمط عناوين تطبيقات التوصيل العالمية)
 *  - أيقونة اختيارية قبل العنوان
 *  - حاجب علوّي اختياري (eyebrow) — مثل شارة «توفير» الذهبية
 *  - الوصف بمحاذاة بداية العنوان (بلا شريط) — إيقاع قراءة نظيف
 */
export function SectionTitle({
  title,
  description,
  icon: Icon,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {eyebrow}
      <div className="flex items-center gap-2.5">
        <span
          className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-accent"
          aria-hidden="true"
        />
        {Icon ? (
          <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
        <h2 className="text-xl font-extrabold leading-snug text-foreground sm:text-2xl">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="pr-3.5 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
