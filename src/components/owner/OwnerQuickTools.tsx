"use client";

import Link from "next/link";
import { Plus, Upload, Flame, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

/**
 * شبكة الأدوات السريعة — 4 أعمدة أيقونات — الجولة 9 (المهمة 8)
 *
 * - ➕ منتج جديد → /owner/facilities/{id}/products (مع trigger لفتح النموذج)
 * - 📤 استيراد Excel → /owner/facilities/{id}/products/import
 * - 🔥 عرض خاص → /owner/facilities/{id}/special-offers
 * - 📊 الإحصائيات → /owner (لوحة المالك)
 *
 * كل عنصر ≥44px لمس + نص 11px + أيقونة 24px — نمط Native.
 */
export interface OwnerQuickToolsProps {
  facilityId: number;
  className?: string;
}

interface ToolDef {
  id: string;
  label: string;
  icon: typeof Plus;
  href: string;
  iconClass: string;
  /** query param يفتح نموذج الإضافة مباشرة على صفحة المنتجات */
  newForm?: boolean;
}

export function OwnerQuickTools({ facilityId, className }: OwnerQuickToolsProps) {
  const prefersReduced = useReducedMotion();
  const base = `/owner/facilities/${facilityId}`;

  const tools: ToolDef[] = [
    {
      id: "new-product",
      label: "منتج جديد",
      icon: Plus,
      href: `${base}/products?new=1`,
      iconClass: "bg-primary/10 text-primary",
      newForm: true,
    },
    {
      id: "import",
      label: "استيراد Excel",
      icon: Upload,
      href: `${base}/products/import`,
      iconClass: "bg-secondary/10 text-secondary",
    },
    {
      id: "special-offer",
      label: "عرض خاص",
      icon: Flame,
      href: `${base}/special-offers`,
      iconClass: "bg-destructive/10 text-destructive",
    },
    {
      id: "stats",
      label: "الإحصائيات",
      icon: BarChart3,
      href: "/owner",
      iconClass: "bg-accent/15 text-accent",
    },
  ];

  const container = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <div
      className={cn("grid grid-cols-4 gap-2", className)}
      role="region"
      aria-label="أدوات سريعة"
    >
      {tools.map((tool, idx) => {
        const Icon = tool.icon;
        return (
          <motion.div
            key={tool.id}
            variants={container}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, delay: idx * 0.04 }}
          >
            <Link
              href={tool.href}
              className="native-tap-card group flex h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card p-2 text-center transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                  tool.iconClass,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-foreground">
                {tool.label}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Skeleton للشبكة (4 بطاقات 72px). */
export function OwnerQuickToolsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[72px] rounded-2xl" />
      ))}
    </div>
  );
}
