"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { usePwaInstall, type PwaPortal } from "@/hooks/usePwaInstall";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

interface PWAInstallButtonProps {
  portal: PwaPortal;
  /** full = بطاقة كاملة | compact = زر مضغوط */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * زر تثبيت تطبيق توفير (PWA)
 * ══════════════════════════════════════════════════════════
 * • أندرويد/كروم: يطلق مطالبة beforeinstallprompt مباشرة.
 * • iOS سفاري: يعرض إرشاد «شارك ← إضافة إلى الشاشة الرئيسية».
 * • يختفي بعد التثبيت (قبل beforeinstallprompt) أو بعد الرفض
 *   (localStorage tawfir_install_dismissed لكل بوابة).
 * • زر بهوية توفير: TawfirLogo صغير + «تثبيت التطبيق».
 *
 * المواضع المخططة:
 *  • العميل: بطاقة موبايل بالرئيسية (InstallPromoCard) + حسابي /account
 *  • المالك: فوق نموذج الدخول /owner/login + إعداداته /owner/settings
 */
export function PWAInstallButton({
  portal,
  variant = "compact",
  className,
}: PWAInstallButtonProps) {
  const { canShow, isIos, install, dismiss } = usePwaInstall(portal);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  if (!canShow) return null;

  const appName = portal === "owner" ? "تطبيق بوابة المنشآت" : "تطبيق توفير";

  const handleInstallClick = () => {
    if (isIos) {
      setIosDialogOpen(true);
      return;
    }
    void install();
  };

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <>
      <motion.div
        {...anim}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          variant === "full"
            ? "flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 shadow-soft"
            : "flex items-center gap-2",
          className
        )}
      >
        {variant === "full" && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                <TawfirLogo variant="mark" href="" className="h-9 w-auto" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  ثبّت {appName} على جوالك
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  وصول أسرع بلا شريط متصفح — وتصفّح آخر العروض حتى دون اتصال
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="إخفاء زر التثبيت"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className={cn("flex gap-2", variant === "full" && "flex-wrap")}>
          <Button
            onClick={handleInstallClick}
            className="min-h-[44px] gap-2 rounded-full"
            size={variant === "full" ? "default" : "sm"}
          >
            {variant === "compact" ? (
              <TawfirLogo variant="mark" href="" className="h-4 w-auto" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            تثبيت التطبيق
          </Button>
          {variant === "compact" && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="إخفاء زر التثبيت"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </motion.div>

      {/* إرشاد iOS */}
      <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TawfirLogo variant="mark" href="" className="h-6 w-auto" />
              تثبيت {appName}
            </DialogTitle>
            <DialogDescription>
              على iPhone وiPad يتم التثبيت من متصفح سفاري بخطوتين:
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4">
            <li className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Share className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">الخطوة 1</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  اضغط زر <span className="font-bold text-foreground">«مشاركة»</span> في
                  شريط سفاري السفلي
                </p>
              </div>
            </li>
            <li className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <PlusSquare className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">الخطوة 2</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  اختر <span className="font-bold text-foreground">«إضافة إلى الشاشة الرئيسية»</span> ثم اضغط «إضافة»
                </p>
              </div>
            </li>
          </ol>
          <Button
            onClick={() => setIosDialogOpen(false)}
            className="min-h-[44px] w-full rounded-full"
          >
            فهمت
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * بطاقة ترويجية لتثبيت التطبيق — تظهر على الشاشات الصغيرة فقط
 * (تُستخدم في الرئيسية للعميل حسب خطة المواضع).
 */
export function InstallPromoCard({ portal }: { portal: PwaPortal }) {
  const { canShow } = usePwaInstall(portal);

  if (!canShow) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 md:hidden">
      <PWAInstallButton portal={portal} variant="full" />
    </div>
  );
}
