"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * شاشة «أنت غير متصل» — بهوية توفير
 * ══════════════════════════════════════════════════════════
 * يخدمها Service Worker عند تعذر تحميل صفحة غير مخزنة بلا اتصال.
 * مسبقة التخزين عند تثبيت العامل — تعمل بلا شبكة بالكامل.
 *
 * الرسالة: التطبيق يفتح بدون إنترنت ويعرض آخر بيانات شوهدت.
 * العمليات (طلب/اشتراك/دخول) تتطلب اتصالاً.
 */
export default function OfflinePage() {
  const prefersReduced = usePrefersReducedMotion();

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="login-ocean-bg relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-6">
      {/* زخرفة النقش */}
      <div
        className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      />

      <motion.div
        {...anim}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="login-logo-glow">
          <TawfirLogo variant="mark" className="h-24 w-auto" />
        </div>

        <div className="space-y-3">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card/90 shadow-soft">
            <WifiOff className="h-7 w-7 text-accent" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold text-foreground">
            أنت غير متصل
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            التطبيق يفتح بدون إنترنت ويعرض آخر بيانات شوهدت. العمليات
            (طلب/اشتراك/دخول) تتطلب اتصالاً.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="min-h-[44px] w-full gap-2 rounded-full"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            إعادة المحاولة
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-[44px] w-full gap-2 rounded-full border-border/60 bg-card/90"
          >
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              العودة للرئيسية
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/70">
          توفير — حياة أجمل.. مع خصومات أكثر
        </p>
      </motion.div>
    </div>
  );
}
