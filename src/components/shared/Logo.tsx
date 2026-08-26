"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  showPill?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, href = "/", showPill = false, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: { text: "text-xl", tag: "w-5 h-5", pill: "text-[9px] px-2 py-0.5" },
    md: { text: "text-3xl", tag: "w-7 h-7", pill: "text-[10px] px-3 py-1" },
    lg: { text: "text-5xl", tag: "w-10 h-10", pill: "text-xs px-4 py-1.5" },
  };

  const s = sizeClasses[size];

  return (
    <Link
      href={href}
      className={cn("inline-flex flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label="توفير — الصفحة الرئيسية"
    >
      <div className="flex items-center gap-1">
        {/* Shopping tag icon on top of و */}
        <div className="relative inline-flex flex-col items-center">
          {/* Tag smiley icon */}
          <svg
            className={cn("absolute -top-2.5 start-1 z-10", s.tag)}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Tag shape */}
            <path
              d="M4 4L20 4L28 12L28 22L12 28L4 20Z"
              fill="#FFA800"
              stroke="#E69600"
              strokeWidth="1.2"
            />
            {/* Tag hole */}
            <circle cx="10" cy="10" r="3" fill="white" opacity="0.85" />
            {/* Eyes */}
            <circle cx="14" cy="16" r="1.8" fill="white" />
            <circle cx="22" cy="16" r="1.8" fill="white" />
            {/* Smile */}
            <path
              d="M13 20Q18 25 23 20"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          {/* و letter in gold */}
          <span
            className={cn("font-black leading-none", s.text)}
            style={{ color: "#FFA800" }}
          >
            و
          </span>
        </div>
        {/* فر in deep teal */}
        <span
          className={cn("font-black leading-none", s.text)}
          style={{ color: "#005B82" }}
        >
          فر
        </span>
      </div>
      {/* Brand pill badge */}
      {showPill && (
        <span
          className={cn(
            "rounded-full font-semibold text-white whitespace-nowrap",
            s.pill
          )}
          style={{ background: "#00A3E0" }}
        >
          حياة أجمل.. مع خصومات أكثر
        </span>
      )}
    </Link>
  );
}
