"use client";

import { useState } from "react";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCartStore } from "@/store/cart.store";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { ProductWithFacilityOut } from "@/types/api.generated";

interface AddToCartButtonProps {
  product: ProductWithFacilityOut;
  className?: string;
}

/**
 * زر «أضف للسلة» — الجولة 11.
 *
 * - يضيف المنتج للسلة المحلية بكمية 1 (إن كان من نفس متجر السلة)
 * - عند تعارض المتجر (السلة فيها أصناف من متجر آخر): يفتح حوار تأكيد
 *   «استبدال السلة» → يُفرّغ ويُضيف الصنف الجديد
 * - زر صغير دائري 36px على كارت المنتج (بجانب زر الطلب المباشر)
 * - نبضة + تحوّل إلى ✓ مؤقتاً عند النجاح (إحساس Native)
 * - للزوار: يُضيف للسلة محلياً (السلة لا تتطلب دخول) — سيُطلب منهم
 *   الدخول عند تأكيد الطلب
 * - مُصمّم ليُستعمل مع preventDefault + stopPropagation على بطاقة المنتج
 */
export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { t } = useLang();
  const items = useCartStore((s) => s.items);
  const facilityId = useCartStore((s) => s.facilityId);
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const { accessToken, hydrated } = useCustomerAuth();
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [added, setAdded] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  // هل المنتج موجود في السلة بالفعل؟
  const existing = items.find((i) => i.product_id === product.id);
  const inCartQty = existing?.quantity ?? 0;
  const isInCart = inCartQty > 0;

  const maxQty =
    product.available_quantity == null
      ? 99
      : Math.max(0, product.available_quantity);

  const handleAdd = () => {
    // فحص الدخول — السلة محلية لكن تأكيدها يتطلب دخول، لذا نوجّه مبكراً
    if (!hydrated) return;
    if (!accessToken) {
      toast({
        title: t("catalog.auth.loginTitle"),
        description: t("catalog.cart.loginDesc"),
      });
      router.push("/login");
      return;
    }

    const outOfStock =
      !product.is_available || product.available_quantity === 0;
    if (outOfStock) {
      toast({
        title: t("catalog.cart.unavailableTitle"),
        description: t("catalog.cart.unavailableDesc"),
        variant: "destructive",
      });
      return;
    }

    // تعارض المتجر
    if (facilityId !== null && facilityId !== product.facility_id) {
      haptic("light");
      setConflictOpen(true);
      return;
    }

    const ok = addItem({
      product_id: product.id,
      facility_id: product.facility_id,
      facility_name: product.facility.name,
      name: product.name,
      price: product.price,
      image_url: product.image_url ?? null,
      available_quantity: product.available_quantity ?? null,
    });

    if (ok) {
      haptic("tick");
      if (!prefersReduced) {
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }
    }
  };

  const handleConfirmReplace = () => {
    clearCart();
    addItem({
      product_id: product.id,
      facility_id: product.facility_id,
      facility_name: product.facility.name,
      name: product.name,
      price: product.price,
      image_url: product.image_url ?? null,
      available_quantity: product.available_quantity ?? null,
    });
    haptic("tick");
    if (!prefersReduced) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1200);
    }
    setConflictOpen(false);
  };

  const disabled = isInCart && inCartQty >= maxQty;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          handleAdd();
        }}
        disabled={disabled}
        aria-label={
          isInCart
            ? t("catalog.cart.inCartAria", {
                name: product.name,
                count: inCartQty,
              })
            : t("catalog.cart.addAria", { name: product.name })
        }
        title={
          isInCart
            ? t("catalog.cart.inCartTitle", { count: inCartQty })
            : t("catalog.cart.title")
        }
        className={cn(
          "native-tap inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          // اللون يتغيّر حسب الحالة: زر أصفر عند الإضافة، رمادي خلاف ذلك
          added
            ? "bg-success text-white"
            : isInCart
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80",
          disabled && "opacity-50",
          className
        )}
      >
        <motion.span
          key={added ? "added" : "default"}
          initial={prefersReduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          {added ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : isInCart ? (
            <ShoppingCart className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </motion.span>
      </button>

      {/* حوار تعارض المتجر */}
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("catalog.cart.replaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("catalog.cart.replaceDesc", {
                name: product.name,
                facility: product.facility.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="min-h-[44px] flex-1 rounded-full bg-primary text-primary-foreground"
              onClick={(e) => {
                e.preventDefault();
                handleConfirmReplace();
              }}
            >
              {t("catalog.cart.replaceConfirm")}
            </AlertDialogAction>
            <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
              {t("common.cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
