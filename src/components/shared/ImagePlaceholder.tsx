"use client";

import { Store, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ImagePlaceholder — بديل بصري جذاب للكيانات بلا صورة (الجولة 25).
 * ═══════════════════════════════════════════════════════════════════
 * ملاحظة VLM السابقة: «المساحة الفارغة داخل البطاقة تجعل التصميم يبدو
 * ناقصاً أو كأن الصور لم تُحمّل». هذا المكوّن يستبدل الرماد المسطح
 * (bg-muted + أيقونة شبه مخفية) بهوية بصرية:
 *
 *  • تدرّج لوني حتمي من لوحة توفير (نفس الكيان = نفس التدرّج دائماً)
 *    عبر hash معرّفه — ألوان توكنات منخفضة التشبع تعمل في الوضعين.
 *  • monogram حرف الاسم الأول خافت كبير خلف الأيقونة (لمسة عربية أنيقة).
 *  • دائرتا زخرفة شفافتين + أيقونة معبّرة بحجم متناسب مع الحاوية.
 *  • يحترم الوضع الداكن (توكنات + طبقات شفافية متكيّفة).
 */

/** تدرّجات من لوحة توفير — تُختار حتمياً من hash المعرّف */
const GRADIENT_SETS = [
  "from-primary/15 via-primary/5 to-accent/20",
  "from-accent/20 via-accent/8 to-primary/15",
  "from-teal-500/15 via-teal-500/5 to-primary/20",
  "from-emerald-500/15 via-primary/10 to-accent/15",
  "from-primary/20 via-teal-500/8 to-accent/15",
  "from-accent/15 via-primary/10 to-emerald-500/15",
] as const;

/** hash بسيط حتمي — نفس المدخل يعطي نفس القيمة في كل الرندرات */
function hashSeed(seed: string | number): number {
  if (typeof seed === "number") {
    return Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  }
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface ImagePlaceholderProps {
  /** معرّف الكيان — يحدد التدرّج والزخرفة بشكل حتمي */
  seed: number | string;
  /** نص الوصولية (اسم الكيان عادة) — يُستخدم أيضاً لحرف الـmonogram */
  label: string;
  /** الأيقونة المركزية — الافتراضي حسب نوع الكيان */
  icon?: LucideIcon;
  /** حجم الأيقونة — يتناسب مع حجم الحاوية (بطاقة صغيرة vs هيرو كبير) */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** أيقونات جاهزة شائعة — لتمرير مبسّط */
export const PLACEHOLDER_ICONS = {
  product: UtensilsCrossed,
  facility: Store,
} as const;

/**
 * بديل الصورة الغائبة — يُوضع مكان فرع else عند غياب image_url.
 * الحاوية الأم تتحكم بالأبعاد (fill/aspect) — هذا مكوّن مطلق يملؤها.
 */
export function ImagePlaceholder({
  seed,
  label,
  icon: Icon = UtensilsCrossed,
  size = "sm",
  className,
}: ImagePlaceholderProps) {
  const h = hashSeed(seed);
  const gradient = GRADIENT_SETS[h % GRADIENT_SETS.length];
  /* إزاحة الزخرفة حتمية أيضاً — تنويع بصري خفيف بين البطاقات المتجاورة */
  const decoShift = h % 3;

  const iconSize = size === "lg" ? "h-16 w-16" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const monogramSize = size === "lg" ? "text-8xl" : size === "md" ? "text-6xl" : "text-5xl";

  /* أول حرف/رمز من الاسم — للعربية يعرض الحرف الأول من الكلمة الأولى */
  const monogram = label.trim().charAt(0) || null;

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-gradient-to-br",
        gradient,
        className,
      )}
      role="img"
      aria-label={label}
    >
      {/* زخرفة: دائرة شفافة أعلى — إزاحتها حتمية حسب seed */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute rounded-full bg-primary/10 blur-md dark:bg-primary/15",
          decoShift === 0 && "-right-8 -top-8 h-28 w-28",
          decoShift === 1 && "-right-4 -top-10 h-20 w-20",
          decoShift === 2 && "right-6 -top-12 h-24 w-24",
        )}
      />
      {/* زخرفة: دائرة شفافة أسفل يسار */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute rounded-full bg-accent/15 blur-md dark:bg-accent/20",
          decoShift === 0 && "-bottom-10 -left-6 h-24 w-24",
          decoShift === 1 && "-bottom-8 -left-10 h-28 w-28",
          decoShift === 2 && "-bottom-12 left-4 h-20 w-20",
        )}
      />
      {/* monogram الحرف الأول — خافت خلف الأيقونة */}
      {monogram && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black leading-none text-foreground/[0.07] dark:text-white/[0.06]",
            monogramSize,
          )}
        >
          {monogram}
        </span>
      )}
      {/* الأيقونة المركزية المعبّرة */}
      <Icon
        className={cn(
          "relative text-foreground/30 dark:text-foreground/40",
          iconSize,
        )}
        aria-hidden="true"
      />
    </div>
  );
}
