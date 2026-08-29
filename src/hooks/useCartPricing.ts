"use client";

import { useCartStore, type CartItem } from "@/store/cart.store";
import { useMe } from "@/hooks/useMe";
import { DELIVERY_FEE, DISCOUNT_RATE } from "@/lib/site-config";

/** صنف سلة مع الأسعار المحسوبة (سعر الوحدة بعد خصم العضوية + مجموع السطر). */
export interface PricedCartItem extends CartItem {
  /** سعر الوحدة قبل الخصم */
  base: number;
  /** سعر الوحدة بعد خصم العضوية (إن وُجدت) */
  unit: number;
  /** مجموع السطر بعد الخصم */
  lineTotal: number;
}

/**
 * حسابات تسعير السلة — الجولة 13.
 *
 * مصدر واحد للحقيقة تستخدمه صفحة /cart وشريط السلة (وأي شاشة قادمة):
 * - base: مجموع الأسعار الأصلية (قبل أي خصم)
 * - subtotal: المجموع بعد خصم العضوية (إن كانت نشطة)
 * - memberSavings: ما وفّره العضو فعلياً بهذا الطلب
 * - delivery: رسوم التوصيل الثابتة
 * - total: الإجمالي النهائي
 */
export function useCartPricing() {
  const items = useCartStore((s) => s.items);
  const facilityId = useCartStore((s) => s.facilityId);
  const facilityName = useCartStore((s) => s.facilityName);
  const me = useMe();

  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;

  const pricedItems: PricedCartItem[] = items.map((i) => {
    const base = parseFloat(i.price) || 0;
    const unit = isMember ? base * (1 - memberRate / 100) : base;
    return { ...i, base, unit, lineTotal: unit * i.quantity };
  });

  const baseSubtotal = pricedItems.reduce((s, i) => s + i.base * i.quantity, 0);
  const subtotal = pricedItems.reduce((s, i) => s + i.lineTotal, 0);
  const memberSavings = baseSubtotal - subtotal;
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const delivery = DELIVERY_FEE;
  const total = subtotal + delivery;

  return {
    items,
    pricedItems,
    facilityId,
    facilityName,
    totalCount,
    baseSubtotal,
    subtotal,
    memberSavings,
    delivery,
    total,
    isMember,
    memberRate,
    /** ما كان سيوفّره العضو لو كان مشتركاً — للاقتراح الترويجي */
    potentialSavings: isMember ? 0 : baseSubtotal * (DISCOUNT_RATE / 100),
  };
}
