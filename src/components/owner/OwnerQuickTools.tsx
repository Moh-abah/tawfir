"use client";

import Link from "next/link";
import { Plus, Upload, Flame, BarChart3, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

/**
 * الأدوات السريعة — ✦ 4-b: صف أفقي snap قابل للسحب على الموبايل
 * (نمط Netflix) وشبكة 4 أعمدة على sm+.
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
      iconClass: "bg-accent/15 text-accent-ink",
    },
  ];

  const container = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <div
      className={cn(
        "no-mobile-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:pb-0",
        className,
      )}
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
            className="min-w-[150px] shrink-0 snap-start sm:min-w-0"
          >
            <Link
              href={tool.href}
              className="native-tap-card group flex h-[76px] items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-start transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                  tool.iconClass,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground">
                {tool.label}
              </span>
              <ChevronLeft
                className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180"
                aria-hidden="true"
              />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Skeleton للصف الأفقي (بطاقات 76px). */
export function OwnerQuickToolsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "no-mobile-scrollbar flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:pb-0",
        className,
      )}
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          className="h-[76px] min-w-[150px] shrink-0 rounded-2xl sm:min-w-0"
        />
      ))}
    </div>
  );
}
