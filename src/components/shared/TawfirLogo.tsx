"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * شعار توفير — «توفير».
 * «ت» بالذهبي (#FFA800 → var(--logo-gold)) + «وفير» بالمحيطي (#005B82 → var(--logo-blue))
 * وتاغ تسوق مبتسم فوق التاء.
 * كل الألوان عبر توكنات CSS (لا ألوان ثابتة في TSX).
 */
interface TawfirLogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  showPill?: boolean;
  className?: string;
  variant?: "full" | "mark";
  onDark?: boolean;
  color?: string;
}

export function TawfirLogo({
  size = "sm",
  href = "/",
  showPill = false,
  className,
  variant = "full",
  onDark = false,
  color,
}: TawfirLogoProps) {
  const sizeClasses = {
    sm: { text: "text-xl", tag: "w-7 h-7", pill: "text-[9px] px-2 py-0.5" },
    md: { text: "text-3xl", tag: "w-9 h-9", pill: "text-[10px] px-3 py-1" },
    lg: { text: "text-5xl", tag: "w-12 h-12", pill: "text-xs px-4 py-1.5" },
  };

  const s = sizeClasses[size];
  const isMark = variant === "mark";

  const logoContent = (
    <div className="flex items-center gap-0.5">
      <div className="relative inline-flex flex-col items-center">
        {/* تاغ التسوق المبتسم فوق التاء */}
        <svg
          className={cn("absolute -top-5 start-0 z-10", s.tag)}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* جسم التاغ */}
          <path
            d="M4 4L20 4L28 12L28 22L12 28L4 20Z"
            fill="var(--logo-gold)"
            stroke="var(--logo-gold)"
            strokeWidth="1.2"
            opacity="0.92"
          />
          {/* ثقب التاغ */}
          <circle cx="10" cy="10" r="3" fill="var(--logo-white)" opacity="0.9" />
          {/* عينا الابتسامة */}
          <circle cx="14" cy="16" r="1.8" fill="var(--logo-white)" />
          <circle cx="22" cy="16" r="1.8" fill="var(--logo-white)" />
          {/* فم مبتسم */}
          <path
            d="M13 20Q18 25 23 20"
            stroke="var(--logo-white)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* حرف «ت» بالذهبي */}
        <span
          className={cn("font-black leading-none", s.text)}
          style={color ? { color } : undefined}
        >
          <span style={{ color: "var(--logo-gold)" }}>ت</span>
        </span>
      </div>

      {/* حروف «وفير» — تظهر فقط في الوضع full */}
      {!isMark && (
        <span
          className={cn("font-black leading-none", s.text)}
          style={{
            color: onDark ? "var(--logo-white)" : "var(--logo-blue)",
          }}
        >
          وفير
        </span>
      )}
    </div>
  );

  const pill = !isMark && showPill && (
    <span
      className={cn(
        "rounded-full font-semibold text-white whitespace-nowrap",
        s.pill
      )}
      style={{ background: "var(--logo-cyan)" }}
    >
      حياة أجمل.. مع خصومات أكثر
    </span>
  );

  if (!href) {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-center gap-1 outline-none",
          className
        )}
        aria-label="شعار توفير"
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
        "inline-flex flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label="توفير — الصفحة الرئيسية"
    >
      {logoContent}
      {pill}
    </Link>
  );
}
