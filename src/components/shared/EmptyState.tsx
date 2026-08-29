"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** إجراء اختياري (زر مثلاً) يظهر أسفل الرسالة */
  action?: React.ReactNode;
}

/**
 * حالة فارغة — تصميم Native (الجولة 4، مواصفة 7.3):
 *  - دائرة كبيرة بأيقونة باهتة (h-20 + h-8)
 *  - عنوان text-sm font-medium + وصف text-xs مُوسّط بعرض 240px
 *  - بلا بطاقة/إطار — نظيف كما في تطبيقات YouTube/Netflix
 *
 * الجولة 17 — صقل بصري: حلقة متدرّجة خافتة حول الدائرة (primary→accent)
 * + تلوين الأيقونة بلون العلامة — عمق بصري دون ضجيج، بديناميكية كاملة
 * للوضعين الفاتح والداكن عبر ألوان CSS vars فقط.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="relative" aria-hidden="true">
        {/* حلقة إشعاعية متدرّجة — بصمة العلامة حول الأيقونة */}
        <span
          className={cn(
            "absolute -inset-2 rounded-full",
            "bg-gradient-to-b from-primary/15 to-accent/10"
          )}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-inner">
          <Icon className="h-8 w-8 text-primary/50" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-[240px] text-center text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
