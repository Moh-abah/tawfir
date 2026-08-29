"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { useMe } from "@/hooks/useMe";
import { CartSheet } from "@/components/public/CartSheet";
import { haptic } from "@/lib/haptic";
import { formatCurrency } from "@/lib/format";
import { DELIVERY_FEE, DISCOUNT_RATE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * شريط السلة العائم — الجولة 11.
 *
 * يظهر في أسفل الشاشة (فوق MobileBottomNav) عندما تكون السلة غير فارغة.
 * يعرض: عدد الأصناف + الإجمالي المبدئي + زر «عرض السلة» يفتح CartSheet.
 *
 * نمط تطبيقات توصيل الطعام (Talabat / HungerStation) — يذكّر المستخدم
 * بوجود أصناف في السلة ويشجّع إكمال الطلب. يختفي عند فراغ السلة.
 *
 * يحترم prefers-reduced-motion (ظهور/اختفاء فوري بدل الانزلاق).
 * يظهر فقط على الموبايل (md:hidden) — الديسكتوب له زر السلة الواضح
 * في الرأس. كما يختفي عند تمرير الشاشة للأسفل بسرعة لتقليل الإزعاج
 * (يظهر مجدداً عند التوقف).
 */
export function StickyMiniCart() {
  const items = useCartStore((s) => s.items);
  const facilityName = useCartStore((s) => s.facilityName);
  const me = useMe();
  const prefersReduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* الجولة 13 — يُخفى على الشاشات الداخلية غير التسوّقية:
     تتبّع الطلبات / الحساب / الإشعارات / العضوية — السلة هناك تشتّت
     عن المهمة الحالية وتغطي المحتوى (نمط Talabat). */
  const isInternalPage = /^\/(orders|account|notifications|membership|cart|login|register|forgot-password)(\/|$)/.test(
    pathname
  );

  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => {
    const base = parseFloat(i.price) || 0;
    const unit = isMember ? base * (1 - memberRate / 100) : base;
    return sum + unit * i.quantity;
  }, 0);
  const total = subtotal + DELIVERY_FEE;
  const hasItems = totalCount > 0;

  // إخفاء عند التمرير السريع للأسفل، إظهار عند التوقف/التمرير للأعلى
  const [hiddenByScroll, setHiddenByScroll] = useState(false);
  useEffect(() => {
    if (!hasItems) return;
    let lastY = window.scrollY;
    let timer: number | null = null;
    const onScroll = () => {
      const y = window.scrollY;
      const scrollingDownFast = y - lastY > 60;
      if (scrollingDownFast) {
        setHiddenByScroll(true);
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => setHiddenByScroll(false), 600);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [hasItems]);

  const visible = hasItems && !hiddenByScroll && !isInternalPage;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={() => {
              haptic("tick");
              setOpen(true);
            }}
            initial={prefersReduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
            animate={prefersReduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            aria-label={`عرض السلة — ${totalCount} أصناف`}
            className={cn(
              "fixed inset-x-3 z-40 md:hidden",
              // فوق MobileBottomNav (الذي يأخذ h-14 56px + safe-area)
              "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
            )}
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-soft-lg">
              <div className="flex items-center gap-2.5">
                <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-primary">
                    {totalCount > 9 ? "9+" : totalCount}
                  </span>
                </span>
                <div className="min-w-0 flex-1 text-right">
                <p className="text-xs font-bold leading-tight">
                  {facilityName ?? "سلتك"}
                </p>
                <p className="text-[10px] leading-tight text-white/70">
                  {totalCount} {totalCount === 1 ? "صنف" : "أصناف"} — أكمل الطلب
                </p>
                </div>
              </div>
              <div className="shrink-0 text-left" dir="ltr">
                <p className="text-[9px] leading-none text-white/70">الإجمالي</p>
                <p className="text-base font-extrabold leading-tight tabular-nums">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
      <CartSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
