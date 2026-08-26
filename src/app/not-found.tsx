"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const PARTICLES = [
  { top: "calc(50% - 80px)", right: "calc(50% + 120px)", size: 8, delay: 0, duration: 5 },
  { top: "calc(50% - 40px)", right: "calc(50% - 140px)", size: 6, delay: 1.2, duration: 6 },
  { bottom: "calc(50% - 60px)", right: "calc(50% + 100px)", size: 10, delay: 0.8, duration: 7 },
  { top: "calc(50% + 20px)", right: "calc(50% - 110px)", size: 5, delay: 2, duration: 4.5 },
] as const;

export default function NotFound() {
  const prefersReduced = usePrefersReducedMotion();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 text-center overflow-hidden">
      {/* Glowing radial gradient behind 404 */}
      <div
        className="glow-ocean pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[40px]"
      />

      {/* Animated floating particles */}
      {!prefersReduced ? (
        <>{PARTICLES.map((p, i) => {
          const posStyles: React.CSSProperties = {
            width: p.size,
            height: p.size,
            right: p.right,
          };
          if ("top" in p) posStyles.top = p.top;
          if ("bottom" in p) posStyles.bottom = p.bottom;
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute z-[5] rounded-full bg-primary/30"
              style={posStyles}
              animate={{
                y: [0, -15, 10, -8, 0],
                x: [0, 8, -5, 12, 0],
                opacity: [0.2, 0.6, 0.3, 0.5, 0.2],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}</>
      ) : null}

      {/* Logo */}
      <TawfirLogo className="relative z-10 h-12 w-auto" />

      {/* 404 Illustration with floating animation */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2"
        animate={prefersReduced ? {} : { y: [0, -12, 0] }}
        transition={prefersReduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-8xl font-black text-primary/20 leading-none select-none">404</span>
        <h1 className="-mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          الصفحة غير موجودة
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى عنوان آخر.
        </p>
      </motion.div>

      {/* Actions */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] px-8"
        >
          <Link href="/">العودة للرئيسية</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full min-h-[44px] px-8"
        >
          <Link href="/facilities">تصفح المنشآت</Link>
        </Button>
      </div>

      {/* Decorative icon */}
      <SearchX className="relative z-10 mt-4 h-16 w-16 text-muted-foreground/15" />
    </div>
  );
}
