"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { useCartStore, type CartItem } from "@/store/cart.store";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useMe } from "@/hooks/useMe";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { DELIVERY_FEE, DISCOUNT_RATE } from "@/lib/site-config";
import type { OrderOut, PaymentMethod } from "@/types/api.generated";

/**
 * سلة الطلبات — الجولة 11 (ميزة جديدة: سلة متعددة الأصناف).
 *
 * قاعدة الخادم: كل الأصناف يجب أن تنتمي لنفس facility_id (مخزن السلة يطبّقها).
 * كل صنف له درجة كمية (stepper) — عند 0 يُحذف تلقائياً. الدفع نقداً أو محفظة،
 * العنوان اختياري (يمكن تحديد بالموقع). عند التأكيد: useCreateOrder بكل
 * الأصناف → فارغ السلة → توجيه لصفحة الطلب الجديد.
 *
 * يُفتح من زر السلة في MainHeader (CartButton).
 */
interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const items = useCartStore((s) => s.items);
  const facilityName = useCartStore((s) => s.facilityName);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const facilityId = useCartStore((s) => s.facilityId);

  const me = useMe();
  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;

  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [successOrder, setSuccessOrder] = useState<OrderOut | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createOrder = useCreateOrder();
  const isMobile = useIsMobile();

  // حساب الأسعار — خصم العضوية يُطبّق على كل صنف حسب سعره الأصلي
  const pricedItems = items.map((i) => {
    const base = parseFloat(i.price) || 0;
    const unit = isMember ? base * (1 - memberRate / 100) : base;
    return { ...i, unit, base, subtotal: unit * i.quantity };
  });
  const subtotal = pricedItems.reduce((s, i) => s + i.subtotal, 0);
  const delivery = DELIVERY_FEE;
  const total = subtotal + delivery;

  /* إعادة الضبط عند الإغلاق */
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setAddress("");
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
        delivery_address: address.trim() || null,
        payment_method: paymentMethod,
      },
      {
        onSuccess: (data) => {
          haptic("success");
          setSuccessOrder(data);
          clearCart();
          toast({
            title: `تم استلام طلبك بنجاح #${data.id}`,
            description: `${items.length} أصناف من ${facilityName}`,
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
              ? `${items.length} أصناف من ${facilityName}`
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

            {/* العنوان + طريقة الدفع */}
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="cart-address" className="text-xs font-bold">
                  عنوان التوصيل (اختياري)
                </Label>
                <Textarea
                  id="cart-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="الحي / الشارع / معلّم مميّز..."
                  className="min-h-[64px] resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">طريقة الدفع</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="grid grid-cols-2 gap-2"
                >
                  {[
                    { value: "cash", label: "نقداً عند الاستلام", icon: Banknote },
                    { value: "wallet", label: "محفظة جيب", icon: Wallet },
                  ].map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "native-tap flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold transition-colors",
                        paymentMethod === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {errorMsg && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>

            {/* ملخص الفاتورة + تأكيد */}
            <div className="border-t border-border/50 bg-card/50 p-4 space-y-3">
              <div className="space-y-1.5 text-sm" dir="rtl">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    المجموع الفرعي{isMember ? ` (بعد خصم ${memberRate}% عضوية)` : ""}
                  </span>
                  <span className="font-bold tabular-nums text-foreground" dir="ltr">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
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
  item: CartItem & { unit: number; base: number; subtotal: number };
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
          {formatCurrency(item.subtotal)}
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
