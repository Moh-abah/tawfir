"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** إجراء اختياري (زر مثلاً) يظهر أسفل الرسالة */
  action?: React.ReactNode;
}

/**
 * حالة فارغة — تصميم Native (الجولة 4، مواصفة 7.3):
 *  - دائرة كبيرة bg-muted بأيقونة باهتة (h-20 + h-8)
 *  - عنوان text-sm font-medium + وصف text-xs مُوسّط بعرض 240px
 *  - بلا بطاقة/إطار — نظيف كما في تطبيقات YouTube/Netflix
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <Icon className="h-8 w-8 text-muted-foreground/50" />
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
