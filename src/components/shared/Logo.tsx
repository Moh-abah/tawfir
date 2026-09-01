"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * نسخة خفيفة من شعار توفير (الرمز + الكلمة أفقياً) — بالقص من الصور المعتمدة.
 * تحافظ على نفس واجهة المكوّن القديم (className/href/showPill/size).
 */
interface LogoProps {
  className?: string;
  href?: string;
  showPill?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { h: 30, pill: "text-[9px] px-2 py-0.5" },
  md: { h: 44, pill: "text-[10px] px-3 py-1" },
  lg: { h: 68, pill: "text-xs px-4 py-1.5" },
};

export function Logo({ className, href = "/", showPill = false, size = "md" }: LogoProps) {
  const s = SIZES[size];

  return (
    <Link
      href={href}
      className={cn("inline-flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label="توفير — الصفحة الرئيسية"
    >
      <Image
        src="/identity/lockup-horizontal.png"
        alt="شعار توفير"
        width={669}
        height={232}
        draggable={false}
        className="h-auto w-auto object-contain"
        style={{ height: s.h }}
      />
      {showPill && (
        <span
          className={cn("rounded-full font-semibold whitespace-nowrap", s.pill)}
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          وفّر أكثر.. عِش أجمل
        </span>
      )}
    </Link>
  );
}
