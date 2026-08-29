"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useFavoritesStore } from "@/store/favorites.store";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: number;
  productName: string;
  /** صغير (على كارت المنتج — 32px فوق الصورة) أو عادي (44px). */
  size?: "sm" | "md";
  className?: string;
}

/**
 * زر المفضلة — الجولة 10 (ميزة جديدة).
 *
 * قلب يتبدل بين «مفضَّل» (ممتلئ primary) وفارغ — مع نبضة تكبير/تصغير
 * عند التبديل (framer-motion) + اهتزاز لمسي خفيف (haptic tick).
 * يعمل للزوار أيضاً (المفضلة محلية ولا تحتاج تسجيل دخول).
 *
 * يوقف انتشار النقر حتى لا يفتح رابط الصورة/التفاصيل تحته.
 */
export function FavoriteButton({
  productId,
  productName,
  size = "sm",
  className,
}: FavoriteButtonProps) {
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const prefersReduced = useReducedMotion();
  const [justToggled, setJustToggled] = useState(false);

  const isFavorite = favoriteIds.includes(productId);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFavorite = toggleFavorite(productId);
    haptic("tick");
    if (!prefersReduced) {
      setJustToggled(true);
      window.setTimeout(() => setJustToggled(false), 350);
    }
    // بلا toast هنا — الحالة مرئية فوراً على الزر (نبضة + امتلاء القلب)
    void nowFavorite;
    void productName;
  };

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite ? `إزالة ${productName} من المفضلة` : `إضافة ${productName} إلى المفضلة`
      }
      animate={
        justToggled && !prefersReduced ? { scale: [1, 1.35, 1] } : { scale: 1 }
      }
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn(
        "native-tap inline-flex items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-200",
        size === "sm" ? "h-8 w-8" : "h-11 w-11",
        isFavorite
          ? "bg-card/95 text-primary shadow-soft"
          : "bg-black/45 text-white hover:bg-black/60",
        className
      )}
    >
      <Heart
        className={cn(
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          isFavorite && "fill-current"
        )}
        aria-hidden="true"
      />
    </motion.button>
  );
}
