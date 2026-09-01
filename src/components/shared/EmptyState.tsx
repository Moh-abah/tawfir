"use client";

import Image from "next/image";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** إجراء اختياري (زر مثلاً) يظهر أسفل الرسالة */
  action?: React.ReactNode;
  /**
   * رسمة الهوية المعتمدة للحالات الفارغة — الافتراضي رسمة توفير.
   * مرّر null للعودة إلى نمط الدائرة/الأيقونة القديم.
   */
  image?: string | null;
}

/**
 * حالة فارغة — بهوية توفير:
 *  - رسمة tawfir-empty-state.png (من أصول الهوية المعتمدة) عبر next/image
 *    مع الأيقونة الأصلية كشارة صغيرة أسفلها — احتفاظ بمعنى كل استخدام
 *  - عنوان text-sm font-medium + وصف text-xs مُوسّط بعرض 240px
 *  - بلا بطاقة/إطار — نظيف كما في تطبيقات YouTube/Netflix
 *  - كل الألوان عبر توكنات CSS للوضعين الفاتح والداكن
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  image = "/identity/tawfir-empty-state.png",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16">
      {image ? (
        <div className="relative" aria-hidden="true">
          <span className="glow-emerald absolute -inset-6 rounded-full" />
          <Image
            src={image}
            alt=""
            width={1920}
            height={1920}
            draggable={false}
            className="h-auto w-[148px] select-none object-contain opacity-90 sm:w-[168px]"
          />
          {/* الأيقونة الأصلية كشارة أسفل الرسمة — تُبقي دلالة الاستخدام */}
          <span className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card shadow-soft">
            <Icon className="h-4 w-4 text-primary/70" />
          </span>
        </div>
      ) : (
        <div className="relative" aria-hidden="true">
          {/* حلقة إشعاعية متدرّجة — بصمة العلامة حول الأيقونة */}
          <span className="absolute -inset-2 rounded-full bg-gradient-to-b from-primary/15 to-accent/10" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-inner">
            <Icon className="h-8 w-8 text-primary/50" />
          </div>
        </div>
      )}
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
