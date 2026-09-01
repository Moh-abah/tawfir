"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * شعار توفير — مبني بالقص من الصور المعتمدة للهوية (لا رسم SVG يدوي):
 *  • الرمز واللوغوه كاملة مقصوصة من «tawfir-identity-master-reference.png»
 *    ومحفوظة في public/identity/ (mark / arabic / latin / lockup-full / lockup-horizontal)
 *  • النسخ: full (اللوغو العمودي) / horizontal (رمز + توفير أفقياً) /
 *    mark (الرمز فقط) / mark-gold (الرمز بمرشح ذهبي) / mark-white (الرمز بمرشح أبيض)
 *  • الألوان في كل مكان عبر توكنات CSS — الصور أصل بكسلي لا يُعدّل.
 */

type LogoVariant = "full" | "horizontal" | "mark" |"lockup_fulltra"| "mark-gold" | "mark-white";

interface TawfirLogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  showPill?: boolean;
  className?: string;
  variant?: LogoVariant;
  onDark?: boolean;
  color?: string;
}

const SOURCES: Record<LogoVariant, { src: string; w: number; h: number }> = {
  full: { src: "/identity/lockup-full.png", w: 359, h: 411 },
  lockup_fulltra: { src: "/identity/lockup-fulltra.png", w: 359, h: 411 },
  horizontal: { src: "/identity/lockup-horizontal.png", w: 669, h: 232 },
  mark: { src: "/identity/mark.png", w: 294, h: 232 },
  "mark-gold": { src: "/identity/mark.png", w: 294, h: 232 },
  "mark-white": { src: "/identity/mark.png", w: 294, h: 232 },
};

/** مرشحات CSS للنسخ الملونة — مسموح بها بدل إعادة التوليد */
const FILTERS: Record<LogoVariant, string> = {
  full: "",
  lockup_fulltra: "",
  horizontal: "",
  mark: "",
  "mark-gold": "grayscale(1) sepia(1) saturate(2.6) hue-rotate(-6deg) brightness(1.02)",
  "mark-white": "brightness(0) invert(1)",
};

const SIZES = {
  sm: { h: 34, pill: "text-[9px] px-2 py-0.5" },
  md: { h: 52, pill: "text-[10px] px-3 py-1" },
  lg: { h: 84, pill: "text-xs px-4 py-1.5" },
};

export function TawfirLogo({
  size = "sm",
  href = "/",
  showPill = false,
  className,
  variant = "full",
  onDark = false,
  color,
}: TawfirLogoProps) {
  const s = SIZES[size];
  const src = SOURCES[variant];
  const filter = FILTERS[variant];

  const logoContent = (
    <span
      className="inline-flex items-center gap-2 select-none"
      style={color && !filter ? { filter: undefined, color } : undefined}
    >
      <Image
        src={src.src}
        alt="شعار توفير"
        width={src.w}
        height={src.h}
        priority={size === "lg"}
        draggable={false}
        className="h-auto object-contain"
        style={{
          height: s.h,
          width: "auto",
          ...(filter ? { filter } : {}),
        }}
      />
    </span>
  );

  const pill = showPill && (
    <span
      className={cn(
        "rounded-full font-semibold whitespace-nowrap",
        s.pill
      )}
      style={{
        background: "var(--primary)",
        color: "var(--primary-foreground)",
      }}
    >
      وفّر أكثر.. عِش أجمل
    </span>
  );

  if (!href) {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center gap-1.5 outline-none",
          className
        )}
        aria-label="شعار توفير"
        data-on-dark={onDark || undefined}
      >
        {logoContent}
        {pill}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label="توفير — الصفحة الرئيسية"
    >
      {logoContent}
      {pill}
    </Link>
  );
}
