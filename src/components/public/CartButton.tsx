"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { CartSheet } from "@/components/public/CartSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

/**
 * زر السلة للرأس — الجولة 11 (وتحسين الجولة 13).
 *
 * أيقونة سلة ثابتة في الرأس (44px) مع شارة عدد الأصناف الكلي.
 * عند الضغط: الموبايل يفتح CartSheet السريع — أما الديسكتوب
 * فينتقل لصفحة السلة المخصّصة /cart (تجربة أعمدة كاملة).
 *
 * الشارة: نبضة تكبير عند تغيّر العدد (pop animation) + احترام
 * prefers-reduced-motion.
 */
export function CartButton() {
  const items = useCartStore((s) => s.items);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const [justChanged, setJustChanged] = useState(false);
  const [prevCount, setPrevCount] = useState(totalCount);
  const router = useRouter();
  const isMobile = useIsMobile();

  // نبضة عند زيادة العدد
  if (totalCount !== prevCount) {
    setPrevCount(totalCount);
    if (totalCount > 0 && !prefersReduced) {
      setJustChanged(true);
      // إعادة بعد 350ms
      if (typeof window !== "undefined") {
        window.setTimeout(() => setJustChanged(false), 350);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic("tick");
          if (isMobile) {
            setOpen(true);
          } else {
            router.push("/cart");
          }
        }}
        aria-label={`السلة — ${totalCount} أصناف`}
        className="native-tap relative inline-flex h-11 min-w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      >
        <motion.span
          animate={
            justChanged && !prefersReduced ? { scale: [1, 1.25, 1] } : { scale: 1 }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        </motion.span>

        <AnimatePresence>
          {totalCount > 0 && (
            <motion.span
              key="badge"
              initial={prefersReduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className={cn(
                "absolute -top-0.5 left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground shadow-sm"
              )}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <CartSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
