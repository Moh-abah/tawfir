"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeliveryFields } from "@/components/public/DeliveryFields";
import { useCartPricing, type PricedCartItem } from "@/hooks/useCartPricing";
import { useCartStore } from "@/store/cart.store";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import type { OrderOut, PaymentMethod } from "@/types/api.generated";

/**
 * صفحة السلة المخصّصة — الجولة 13 (ميزة جديدة).
 *
 * السلة كانت Sheet فقط (الجولة 11) — هذه الصفحة تضيف:
 * 1. تجربة ديسكتوب كاملة (عمودان: الأصناف + ملخص لاصق) + SEO
 * 2. اقتراح العضوية الذكي: غير العضو يرى «وفّر X ر.ي بهذا الطلب» بالاشتراك
 * 3. فاتورة تفصيلية: المجموع الأصلي − خصم العضوية + التوصيل = الإجمالي
 * 4. شاشة نجاح داخلية مع تتبّع مباشر
 *
 * الموبايل: عمود واحد + شريط تأكيد لاصق أسفل الشاشة فوق شريط التنقل.
 */

export function CartPageContent() {
  const router = useRouter();
  const {
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
    potentialSavings,
  } = useCartPricing();

  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const { accessToken, hydrated } = useCustomerAuth();
  const createOrder = useCreateOrder();

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [successOrder, setSuccessOrder] = useState<OrderOut | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isLoggedIn = hydrated && !!accessToken;

  const handleSubmit = () => {
    if (items.length === 0 || !facilityId) return;
    if (!isLoggedIn) {
      router.push("/login?next=/cart");
      return;
    }
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
          setErrorMsg(e.message?.trim() || "تعذّر إتمام الطلب. حاول مرة أخرى.");
        },
      },
    );
  };

  /* ─── شاشة النجاح بعد الطلب ─── */
  if (successOrder) {
    return <CartSuccessView order={successOrder} />;
  }

  /* ─── السلة الفارغة ─── */
  if (items.length === 0) {
    return (
      <>
        <ScreenHeader title="سلة الطلبات" fallbackHref="/" />
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <EmptyState
            icon={ShoppingCart}
            title="سلتك فارغة"
            description="أضف وجباتك المفضلة من المتاجر بالضغط على أيقونة السلة في كل وجبة، ثم أكمل الطلب دفعة واحدة من هنا."
            action={
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                  href="/facilities"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Store className="h-4 w-4" aria-hidden="true" />
                  تصفّح المتاجر
                </Link>
                <Link
                  href="/offers"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                >
                  <Sparkles className="h-4 w-4 text-accent-ink" aria-hidden="true" />
                  العروض الخاصة
                </Link>
              </div>
            }
          />
        </div>
      </>
    );
  }

  /* ─── صفحة السلة الممتلئة ─── */
  return (
    <>
      <ScreenHeader title="سلة الطلبات" fallbackHref="/" />
      <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {/* رأس المتجر */}
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card p-3.5 shadow-soft sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-foreground">
                {facilityName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {totalCount} {totalCount === 1 ? "صنف" : "أصناف"} في السلة
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {facilityId && (
              <Link
                href={`/facilities/${facilityId}`}
                className="native-tap hidden min-h-[40px] items-center gap-1 rounded-full border border-border/60 px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                زيارة المتجر
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                haptic("tick");
                clearCart();
                toast({ title: "تم إفراغ السلة" });
              }}
              className="native-tap inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive"
              aria-label="إفراغ السلة كاملة"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              إفراغ
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* العمود الرئيسي: الأصناف + بيانات الطلب */}
          <div className="space-y-4">
            {/* قائمة الأصناف */}
            <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft">
              <AnimatePresence initial={false}>
                {pricedItems.map((item) => (
                  <CartPageLine
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
              </AnimatePresence>
            </ul>

            {/* اقتراح العضوية — لغير الأعضاء فقط */}
            {!isMember && potentialSavings > 0 && (
              <MembershipUpsell savings={potentialSavings} />
            )}

            {/* بيانات التوصيل والدفع */}
            <section className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-soft sm:p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                بيانات الطلب
              </h2>

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
                variant="plain"
                idPrefix="page-cart-"
              />

              {!isLoggedIn && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs leading-relaxed text-foreground"
                  role="status"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p>
                    سجّل الدخول لإتمام الطلب — ستبقى أصناف سلتك محفوظة كما هي.
                    <Link
                      href="/login?next=/cart"
                      className="mr-1 font-bold text-primary underline underline-offset-2"
                    >
                      تسجيل الدخول
                    </Link>
                  </p>
                </div>
              )}

              {errorMsg && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
                  role="alert"
                >
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>{errorMsg}</p>
                </div>
              )}
            </section>
          </div>

          {/* العمود الجانبي: الفاتورة — لاصق على الديسكتوب */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4 shadow-soft sm:p-5">
              <h2 className="text-sm font-extrabold text-foreground">
                ملخص الفاتورة
              </h2>

              <div className="space-y-2 text-sm" dir="rtl">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    المجموع الأصلي ({totalCount}{" "}
                    {totalCount === 1 ? "صنف" : "أصناف"})
                  </span>
                  <span
                    className="font-bold tabular-nums text-foreground"
                    dir="ltr"
                  >
                    {formatCurrency(baseSubtotal)}
                  </span>
                </div>

                {isMember && memberSavings > 0 && (
                  <div className="flex items-center justify-between text-primary">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <CheckCircle2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      خصم العضوية {memberRate}%
                    </span>
                    <span className="font-bold tabular-nums" dir="ltr">
                      −{formatCurrency(memberSavings)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رسوم التوصيل</span>
                  <span
                    className="font-bold tabular-nums text-foreground"
                    dir="ltr"
                  >
                    {formatCurrency(delivery)}
                  </span>
                </div>

                <div className="my-2 h-px bg-border/40" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-foreground">
                    الإجمالي
                  </span>
                  <span
                    className="text-xl font-extrabold tabular-nums text-primary"
                    dir="ltr"
                  >
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* زر التأكيد — الديسكتوب (الموبايل له الشريط اللاصق أسفل) */}
              <Button
                type="button"
                onClick={() => {
                  haptic("light");
                  handleSubmit();
                }}
                disabled={createOrder.isPending}
                className="hidden min-h-[48px] w-full gap-2 rounded-full text-base font-extrabold shadow-soft lg:inline-flex"
                size="lg"
              >
                {createOrder.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                )}
                {createOrder.isPending
                  ? "جارٍ إرسال الطلب..."
                  : `تأكيد الطلب — ${formatCurrency(total)}`}
              </Button>

              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                بالضغط على «تأكيد الطلب» أنت توافق على شروط الاستخدام وسياسة
                الخصوصية.
              </p>
            </div>
          </aside>
        </div>

        {/* مسافة للشريط اللاصق أسفل الموبايل */}
        <div className="h-24 md:h-0" aria-hidden="true" />
      </div>

      {/* شريط تأكيد لاصق — الموبايل فقط (فوق شريط التنقل) */}
      <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
        <button
          type="button"
          onClick={() => {
            haptic("light");
            handleSubmit();
          }}
          disabled={createOrder.isPending}
          className="native-tap flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-soft-lg transition-transform active:scale-[0.98] disabled:opacity-70"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold">
            {createOrder.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            )}
            {createOrder.isPending ? "جارٍ الإرسال..." : "تأكيد الطلب"}
          </span>
          <span
            className="text-base font-extrabold tabular-nums"
            dir="ltr"
            aria-hidden="true"
          >
            {formatCurrency(total)}
          </span>
        </button>
      </div>
    </>
  );
}

/* ─── صف سلة واحد — نسخة الصفحة (أرحب من Sheet) ─── */
function CartPageLine({
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
  const prefersReduced = useReducedMotion();

  return (
    <motion.li
      layout={!prefersReduced}
      initial={prefersReduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex gap-3 p-3.5 sm:p-4">
        {/* الصورة */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
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
              <ShoppingBag
                className="h-8 w-8 text-muted-foreground/40"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* الاسم + السعر + درجة الكمية */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-bold text-foreground sm:text-base">
                {item.name}
              </p>
              <div className="mt-0.5 flex items-baseline gap-1.5" dir="ltr">
                {isMember && (
                  <span
                    className="text-[11px] tabular-nums text-muted-foreground line-through"
                    aria-hidden="true"
                  >
                    {formatCurrency(item.base)}
                  </span>
                )}
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(item.unit)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / للوحدة
                </span>
              </div>
            </div>
            {/* مجموع السطر */}
            <div className="shrink-0 text-left" dir="ltr">
              <p className="text-[10px] text-muted-foreground">المجموع</p>
              <p className="text-sm font-extrabold tabular-nums text-primary sm:text-base">
                {formatCurrency(item.lineTotal)}
              </p>
            </div>
          </div>

          {/* درجة الكمية + حذف */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onUpdate(Math.max(0, item.quantity - 1))}
                aria-label="إنقاص الكمية"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span
                className="min-w-[2rem] text-center text-base font-extrabold tabular-nums text-foreground"
                aria-live="polite"
              >
                {item.quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onUpdate(Math.min(max, item.quantity + 1))}
                disabled={item.quantity >= max}
                aria-label="زيادة الكمية"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="native-tap inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-destructive"
              aria-label={`حذف ${item.name} من السلة`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/* ─── اقتراح العضوية الذكي — لغير الأعضاء ─── */
function MembershipUpsell({ savings }: { savings: number }) {
  return (
    <Link
      href="/membership/subscribe"
      className="native-tap-card group flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-l from-accent/10 via-accent/5 to-transparent p-4 transition-shadow hover:shadow-soft-lg"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 transition-transform group-hover:scale-105">
          <Sparkles className="h-5 w-5 text-accent-ink" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-foreground">
            وفّر {formatCurrency(savings)} على هذا الطلب
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            اشترك بالعضوية واحصل على خصم حتى 30% على كل وجباتك.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full bg-accent px-3.5 py-2 text-xs font-extrabold text-accent-foreground shadow-sm transition-transform group-hover:scale-105">
        اشترك
      </span>
    </Link>
  );
}

/* ─── شاشة النجاح ─── */
function CartSuccessView({ order }: { order: OrderOut }) {
  const prefersReduced = useReducedMotion();
  return (
    <>
      <ScreenHeader title="سلة الطلبات" fallbackHref="/" />
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-success/15">
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
          <h2 className="text-2xl font-extrabold text-foreground">
            تم استلام طلبك
          </h2>
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
          تابع حالة طلبك لحظياً — سنُحدّثها عند تأكيد المتجر وتحضير الطلب
          ووصوله إليك.
        </motion.p>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button asChild size="lg" className="min-h-[48px] rounded-full">
            <Link href={`/orders/${order.id}`}>تتبّع الطلب</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-h-[44px] rounded-full"
          >
            <Link href="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
