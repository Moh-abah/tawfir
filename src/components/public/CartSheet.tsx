"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { useCartStore } from "@/store/cart.store";
import { useCartPricing, type PricedCartItem } from "@/hooks/useCartPricing";
import { DeliveryFields } from "@/components/public/DeliveryFields";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import type { OrderOut, PaymentMethod } from "@/types/api.generated";

/**
 * سلة الطلبات — الجولة 11 + مطابقة 2-c.
 *
 * قاعدة الخادم: كل الأصناف يجب أن تنتمي لنفس facility_id (مخزن السلة يطبّقها).
 * مدخلات الطلب مطابقة الآن لCheckoutSheet عبر مكون DeliveryFields المشترك
 * (موقع lat/lng + عنوان ≤ 500 + ملاحظات ≤ 500 + دفع نقدي — wallet يرفضه
 * الخادم 422) والتسعير من useCartPricing (مصدر الحقيقة الوحيد):
 * المجموع الأصلي − خصم العضوية + توصيل 300 = الإجمالي.
 *
 * يُفتح من زر السلة في MainHeader (CartButton) ومن StickyMiniCart.
 */
interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  /* التسعير — مصدر الحقيقة الوحيد useCartPricing (2-c) */
  const {
    items,
    pricedItems,
    facilityId,
    facilityName,
    totalCount,
    baseSubtotal,
    memberSavings,
    delivery,
    total,
    isMember,
    memberRate,
  } = useCartPricing();

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [successOrder, setSuccessOrder] = useState<OrderOut | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createOrder = useCreateOrder();
  const isMobile = useIsMobile();

  /* إعادة الضبط عند الإغلاق */
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setLat(null);
      setLng(null);
      setAddress("");
      setNotes("");
      setPaymentMethod("cash");
      setSuccessOrder(null);
      setErrorMsg(null);
    }, 250);
    return () => clearTimeout(t);
  }, [open]);

  const handleSubmit = () => {
    if (items.length === 0 || !facilityId) return;
    setErrorMsg(null);
    createOrder.mutate(
      {
        facility_id: facilityId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address.trim() || null,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (data) => {
          haptic("success");
          setSuccessOrder(data);
          clearCart();
          toast({
            title: `تم استلام طلبك بنجاح #${data.id}`,
            description: `${totalCount} أصناف من ${facilityName}`,
          });
        },
        onError: (err) => {
          const e = err as { message?: string; status?: number };
          haptic("light");
          if (e.status === 0 || /اتصال|شبكة|internet/i.test(e.message ?? "")) {
            setErrorMsg("يتطلب هذا الإجراء اتصالاً بالإنترنت.");
            return;
          }
          setErrorMsg(
            e.message?.trim() || "تعذّر إتمام الطلب. حاول مرة أخرى."
          );
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile
            ? "max-h-[88dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            : "w-full sm:max-w-md"
        )}
      >
        {isMobile && (
          <div className="bottom-sheet-grip pt-3" aria-hidden="true" />
        )}
        <SheetHeader className="border-b p-4 text-right">
          <SheetTitle className="flex items-center justify-between gap-2 text-right text-lg font-extrabold">
            <span className="inline-flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
              سلة الطلبات
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  haptic("tick");
                  clearCart();
                }}
                className="native-tap inline-flex min-h-[44px] items-center gap-1 rounded-full px-2 text-xs font-bold text-muted-foreground hover:text-destructive"
                aria-label="إفراغ السلة"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                إفراغ
              </button>
            )}
          </SheetTitle>
          <SheetDescription className="text-right">
            {items.length > 0
              ? `${totalCount} ${totalCount === 1 ? "صنف" : "أصناف"} من ${facilityName}`
              : "سلتك فارغة حالياً"}
          </SheetDescription>
        </SheetHeader>

        {successOrder ? (
          <CartSuccessView order={successOrder} />
        ) : items.length === 0 ? (
          <EmptyCartView onClose={() => onOpenChange(false)} />
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto no-mobile-scrollbar">
            {/* قائمة الأصناف */}
            <ul className="divide-y divide-border/40 p-3">
              {pricedItems.map((item) => (
                <CartLine
                  key={item.product_id}
                  item={item}
                  isMember={isMember}
                  onUpdate={(qty) => {
                    haptic("tick");
                    updateQuantity(item.product_id, qty);
                  }}
                  onRemove={() => {
                    haptic("tick");
                    removeItem(item.product_id);
                  }}
                />
              ))}
            </ul>

            {/* موقع التوصيل + طريقة الدفع + ملاحظات — نفس حقول CheckoutSheet (2-c) */}
            <DeliveryFields
              lat={lat}
              lng={lng}
              onLocated={(la, ln) => {
                setLat(la);
                setLng(ln);
              }}
              address={address}
              onAddressChange={setAddress}
              notes={notes}
              onNotesChange={setNotes}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              idPrefix="cart-"
            />

            {/* رسالة الخطأ */}
            {errorMsg && (
              <div className="p-4">
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              </div>
            )}

            {/* ملخص الفاتورة + تأكيد — نفس منطق useCartPricing في صفحة /cart */}
            <div className="border-t border-border/50 bg-card/50 p-4 space-y-3">
              <div className="space-y-1.5 text-sm" dir="rtl">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    المجموع الأصلي ({totalCount} {totalCount === 1 ? "صنف" : "أصناف"})
                  </span>
                  <span className="font-bold tabular-nums text-foreground" dir="ltr">
                    {formatCurrency(baseSubtotal)}
                  </span>
                </div>
                {isMember && memberSavings > 0 && (
                  <div className="flex items-center justify-between text-primary">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      خصم العضوية {memberRate}%
                    </span>
                    <span className="font-bold tabular-nums" dir="ltr">
                      −{formatCurrency(memberSavings)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span className="font-bold tabular-nums text-foreground" dir="ltr">
                    {formatCurrency(delivery)}
                  </span>
                </div>
                <div className="my-1.5 h-px bg-border/40" />
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-foreground">الإجمالي</span>
                  <span
                    className="text-lg font-extrabold tabular-nums text-primary"
                    dir="ltr"
                  >
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  haptic("light");
                  handleSubmit();
                }}
                disabled={createOrder.isPending}
                className="w-full min-h-[48px] gap-2 rounded-full text-base font-extrabold shadow-soft"
                size="lg"
              >
                {createOrder.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                )}
                {createOrder.isPending ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── صف سلة واحد ──────────────────────────────────── */
function CartLine({
  item,
  isMember,
  onUpdate,
  onRemove,
}: {
  item: PricedCartItem;
  isMember: boolean;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
}) {
  const max = item.available_quantity == null ? 99 : item.available_quantity;
  return (
    <li className="flex gap-3 py-3">
      {/* صورة */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.image_url ? (
          <ImageWithSkeleton
            src={resolveImageUrl(item.image_url)}
            alt={item.name}
            fill
            className="h-full w-full object-cover"
            skeletonClassName="rounded-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* اسم + سعر */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold text-foreground">{item.name}</p>
        <p className="text-[10px] text-muted-foreground line-clamp-1">
          {item.facility_name}
        </p>
        <div className="mt-1 flex items-center gap-1.5" dir="ltr">
          {isMember && (
            <span
              className="text-[10px] tabular-nums text-muted-foreground line-through"
              aria-hidden="true"
            >
              {formatCurrency(item.base)}
            </span>
          )}
          <span className="text-xs font-bold tabular-nums text-foreground">
            {formatCurrency(item.unit)}
          </span>
        </div>

        {/* درجة الكمية */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onUpdate(Math.max(0, item.quantity - 1))}
              aria-label="إنقاص الكمية"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <span
              className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums text-foreground"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onUpdate(Math.min(max, item.quantity + 1))}
              disabled={item.quantity >= max}
              aria-label="زيادة الكمية"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="native-tap inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/60 hover:text-destructive"
            aria-label={`حذف ${item.name} من السلة`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* مجموع الصنف */}
      <div className="shrink-0 text-left" dir="ltr">
        <p className="text-[10px] text-muted-foreground">المجموع</p>
        <p className="text-sm font-extrabold tabular-nums text-foreground">
          {formatCurrency(item.lineTotal)}
        </p>
      </div>
    </li>
  );
}

/* ─── حالة فارغة ──────────────────────────────────── */
function EmptyCartView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-extrabold text-foreground">سلتك فارغة</p>
        <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          أضف وجباتك المفضلة من المتاجر بالضغط على أيقونة السلة في كل وجبة،
          ثم أكمل الطلب دفعة واحدة.
        </p>
      </div>
      <Button
        asChild
        className="native-tap min-h-[44px] gap-2 rounded-full"
        onClick={onClose}
      >
        <Link href="/">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          تصفّح الوجبات
        </Link>
      </Button>
    </div>
  );
}

/* ─── شاشة نجاح الطلب — الجولة 12: أنيميشن spring احتفالي ─── */
function CartSuccessView({ order }: { order: OrderOut }) {
  const prefersReduced = useReducedMotion();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto no-mobile-scrollbar p-6 text-center">
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
        {/* هالة نابضة خلف علامة النجاح */}
        {!prefersReduced && (
          <motion.span
            className="absolute inset-0 rounded-full bg-success/20"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: [1, 1.35, 1.35], opacity: [0.8, 0, 0] }}
            transition={{ duration: 1.2, ease: "easeOut", times: [0, 0.6, 1] }}
            aria-hidden="true"
          />
        )}
        <motion.span
          initial={prefersReduced ? false : { scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="flex h-full w-full items-center justify-center"
        >
          <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
        </motion.span>
      </span>
      <motion.div
        className="space-y-1"
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: prefersReduced ? 0 : 0.15, duration: 0.3 }}
      >
        <h3 className="text-xl font-extrabold text-foreground">تم استلام طلبك</h3>
        <p className="text-sm text-muted-foreground">
          رقم الطلب:{" "}
          <span dir="ltr" className="font-bold tabular-nums text-foreground">
            #{order.id}
          </span>
        </p>
      </motion.div>
      <motion.p
        className="max-w-xs text-xs leading-relaxed text-muted-foreground"
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: prefersReduced ? 0 : 0.3, duration: 0.3 }}
      >
        تابع حالة طلبك في صفحة طلباتي. سنُحدّث الحالة لحظياً عند تأكيد المتجر
        وتحضير الطلب ووصوله إليك.
      </motion.p>
      <Button asChild size="lg" className="min-h-[44px] w-full max-w-xs rounded-full">
        <Link href={`/orders/${order.id}`}>تتبّع الطلب</Link>
      </Button>
    </div>
  );
}
