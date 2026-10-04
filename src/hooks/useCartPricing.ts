"use client";

import { useCartStore, type CartItem } from "@/store/cart.store";
import { useMe } from "@/hooks/useMe";
import { useDeliveryEstimate } from "@/hooks/useDeliveryEstimate";

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
 * حسابات تسعير السلة — مصدر واحد للحقيقة تستخدمه صفحة /cart وCartSheet
 * وشريط السلة العائم (وأي شاشة قادمة).
 *
 * فلسفة التسعير الحية (بلا أي أرقام ميتة في الكود):
 * - نسبة العضوية الفعلية من GET /me فقط (membership.discount_rate) —
 *   بلا أي نسبة افتراضية؛ عضو بلا نسبة → لا خصم يُعرض.
 * - أجرة التوصيل ديناميكية حسب المسافة (GET /orders/delivery-estimate)
 *   عبر useDeliveryEstimate بموقع التوصيل المحفوظ في cart store إن وُجد —
 *   وإلا deliveryFee = null (لم تُحسب بعد).
 * - الإجمالي يأتي مكتمل الأركان فقط عند توفر الأجرة؛ وإلا total = null
 *   وتعرض الشاشات نصاً واضحاً بأن الأجرة تُحسب عند التأكيد.
 */
export function useCartPricing() {
  const items = useCartStore((s) => s.items);
  const facilityId = useCartStore((s) => s.facilityId);
  const facilityName = useCartStore((s) => s.facilityName);
  const deliveryLat = useCartStore((s) => s.deliveryLat);
  const deliveryLng = useCartStore((s) => s.deliveryLng);
  const me = useMe();

  const isMember = !!me.data?.membership?.is_active;
  /* نسبة العضوية الفعلية من /me حصراً — لا ثابت ولا fallback تسعيري */
  const memberRate = me.data?.membership?.discount_rate ?? 0;

  const pricedItems: PricedCartItem[] = items.map((i) => {
    const base = parseFloat(i.price) || 0;
    const unit = isMember && memberRate > 0 ? base * (1 - memberRate / 100) : base;
    return { ...i, base, unit, lineTotal: unit * i.quantity };
  });

  const baseSubtotal = pricedItems.reduce((s, i) => s + i.base * i.quantity, 0);
  const subtotal = pricedItems.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount = baseSubtotal - subtotal;
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  /* أجرة التوصيل الديناميكية — تُقدَّر فقط عند توفر المتجر + الموقع المحفوظ
     (والطلب يتطلب جلسة عميل). بلا موقع: fee = null ونعرض نص الشفافية. */
  const estimate = useDeliveryEstimate(facilityId, deliveryLat, deliveryLng);
  const deliveryFee: number | null = estimate.data?.fee ?? null;
  const deliveryLoading = estimate.isFetching && deliveryFee == null;
  const total: number | null =
    deliveryFee == null ? null : subtotal + deliveryFee;

  return {
    items,
    pricedItems,
    facilityId,
    facilityName,
    totalCount,
    baseSubtotal,
    subtotal,
    /** ما خصمته العضوية فعلياً عن أصناف السلة (0 لغير الأعضاء أو بلا نسبة) */
    discountAmount,
    /** أجرة التوصيل المقدَّرة حسب المسافة — null قبل تحديد موقع/جلسة */
    deliveryFee,
    deliveryLoading,
    /** إجمالي مكتمل فقط عند توفر الأجرة — وإلا null (يحسمه الخادم عند التأكيد) */
    total,
    isMember,
    memberRate,
  };
}
