"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { DeliveryFields } from "@/components/public/DeliveryFields";
import { useMe } from "@/hooks/useMe";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { DELIVERY_FEE, DISCOUNT_RATE } from "@/lib/site-config";
import type { OrderOut, PaymentMethod } from "@/types/api.generated";

/**
 * نموذج منتج مُختصر لشاشة الطلب — يتوافق مع Product و ProductDetailOut
 * و ProductWithFacilityOut (كلها تشترك في هذه الحقول).
 */
export interface CheckoutProduct {
  id: number;
  facility_id: number;
  name: string;
  description?: string | null;
  price: string;
  image_url: string | null;
  is_available: boolean;
  available_quantity: number | null;
}

/**
 * ملخّص العرض الخاص لاستخدامه في CheckoutSheet.
 * يُمرّر من SpecialOffersSection أو ProductDetailContent.
 */
export interface CheckoutSpecialOffer {
  id: number;
  offer_discount_rate: number;
  base_price: number;
  member_price: number;
  non_member_price: number;
  facility_discount_rate: number;
}

interface CheckoutSheetProps {
  product: CheckoutProduct;
  facilityName?: string | null;
  /** إن وُجد، يُستعمل سعر العرض المُحسب خادمياً ويُمرّر special_offer_id للطلب. */
  specialOffer?: CheckoutSpecialOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QuantityStepper({
  quantity,
  max,
  disabled,
  onChange,
}: {
  quantity: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  const dec = () => onChange(Math.max(1, quantity - 1));
  const inc = () => onChange(Math.min(max, quantity + 1));
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-full"
        onClick={dec}
        disabled={disabled || quantity <= 1}
        aria-label="إنقاص الكمية"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span
        className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums text-foreground"
        aria-live="polite"
      >
        {quantity}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-full"
        onClick={inc}
        disabled={disabled || quantity >= max}
        aria-label="زيادة الكمية"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function SuccessView({
  order,
  onClose,
}: {
  order: OrderOut;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto no-mobile-scrollbar p-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="text-xl font-extrabold text-foreground">تم استلام طلبك</h3>
        <p className="text-sm text-muted-foreground">
          رقم الطلب:{" "}
          <span dir="ltr" className="font-bold tabular-nums text-foreground">
            #{order.id}
          </span>
        </p>
      </div>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        ستظهر حالة طلبك في صفحة طلباتي. تابع الاستلام لإتمام الطلب عند وصوله.
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <Button
          asChild
          size="lg"
          className="min-h-[44px] w-full rounded-full"
          onClick={onClose}
        >
          <Link href="/orders">
            <ListOrdered className="h-4 w-4" aria-hidden="true" />
            طلباتي
          </Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="min-h-[44px] w-full rounded-full"
          onClick={onClose}
        >
          تصفّح المزيد
        </Button>
      </div>
    </div>
  );
}

/**
 * كسر سعر العرض الخاص — 4-5 أسطر موضّحة:
 *  - السعر الأصلي (مشطوب)
 *  - خصم العرض الخاص
 *  - خصم العضوية (للعضو فقط)
 *  - رسوم التوصيل
 *  - الإجمالي
 */
function SpecialOfferPriceBreakdown({
  base,
  offerDiscountPerUnit,
  facilityDiscountPerUnit,
  isMember,
  quantity,
  subtotal,
  delivery,
  total,
  offerRate,
  facilityRate,
}: {
  base: number;
  offerDiscountPerUnit: number;
  facilityDiscountPerUnit: number;
  isMember: boolean;
  quantity: number;
  subtotal: number;
  delivery: number;
  total: number;
  offerRate: number;
  facilityRate: number;
}) {
  const baseTotal = base * quantity;
  const offerDiscountTotal = offerDiscountPerUnit * quantity;
  const facilityDiscountTotal = facilityDiscountPerUnit * quantity;

  return (
    <div className="space-y-3">
      {/* شارة عرض خاص */}
      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        <span className="inline-flex items-center gap-1 font-extrabold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          عرض خاص — خصم {offerRate}%
        </span>
        {isMember && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
            + خصم عضوية {facilityRate}%
          </span>
        )}
      </div>

      {/* السعر الأصلي */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">السعر الأصلي</span>
        <span
          className="text-xs font-medium text-muted-foreground line-through tabular-nums"
          dir="ltr"
        >
          {formatCurrency(baseTotal)}
        </span>
      </div>

      {/* خصم العرض الخاص */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">خصم العرض الخاص</span>
        <span
          className="font-bold text-primary tabular-nums"
          dir="ltr"
        >
          −{formatCurrency(offerDiscountTotal)}
        </span>
      </div>

      {/* خصم العضوية — للعضو فقط */}
      {isMember && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">خصم العضوية</span>
          <span
            className="font-bold text-success tabular-nums"
            dir="ltr"
          >
            −{formatCurrency(facilityDiscountTotal)}
          </span>
        </div>
      )}

      {/* الإجمالي الفرعي */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">الإجمالي الفرعي</span>
        <span className="font-bold text-foreground tabular-nums" dir="ltr">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* رسوم التوصيل */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">رسوم التوصيل</span>
        <span className="font-bold text-foreground tabular-nums" dir="ltr">
          {formatCurrency(delivery)}
        </span>
      </div>

      {/* الإجمالي */}
      <div className="flex items-center justify-between border-t pt-2 text-base font-extrabold">
        <span className="text-foreground">الإجمالي</span>
        <span className="text-primary tabular-nums" dir="ltr">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

export function CheckoutSheet({
  product,
  facilityName,
  specialOffer,
  open,
  onOpenChange,
}: CheckoutSheetProps) {
  const router = useRouter();
  const me = useMe();
  const createOrder = useCreateOrder();
  const isMobile = useIsMobile();

  const [quantity, setQuantity] = useState(1);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [successOrder, setSuccessOrder] = useState<OrderOut | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMember = !!me.data?.membership?.is_active;
  const memberRate = me.data?.membership?.discount_rate ?? DISCOUNT_RATE;
  const priceNum = parseFloat(product.price) || 0;

  // حساب السعر — يستعمل أسعار العرض الخاص إن وُجدت
  const unitPrice = specialOffer
    ? isMember
      ? specialOffer.member_price
      : specialOffer.non_member_price
    : isMember
      ? priceNum * (1 - memberRate / 100)
      : priceNum;
  const subtotal = unitPrice * quantity;
  const delivery = DELIVERY_FEE;
  const total = subtotal + delivery;

  // قيم العرض الخاصة لكسر السعر (لكل وحدة)
  const soBase = specialOffer?.base_price ?? 0;
  const soOfferDiscountPerUnit =
    specialOffer != null
      ? (soBase * specialOffer.offer_discount_rate) / 100
      : 0;
  const soFacilityDiscountPerUnit =
    specialOffer != null && isMember
      ? (soBase * specialOffer.facility_discount_rate) / 100
      : 0;

  const outOfStock =
    !product.is_available || product.available_quantity === 0;

  const maxQty =
    product.available_quantity && product.available_quantity > 0
      ? product.available_quantity
      : 99;

  /* إعادة الضبط عند الإغلاق (بعد انتهاء أنميشن الخروج) */
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setQuantity(1);
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
    if (outOfStock) return;
    setErrorMsg(null);
    createOrder.mutate(
      {
        facility_id: product.facility_id,
        items: [{ product_id: product.id, quantity }],
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address.trim() || null,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
        special_offer_id: specialOffer?.id ?? null,
      },
      {
        onSuccess: (data) => {
          setSuccessOrder(data);
          /* الجولة 17 — اهتزاز نجاح مزدوج (إحساس Native عند تأكيد الطلب) */
          haptic("success");
          toast({ title: "تم استلام طلبك بنجاح" });
        },
        onError: (err) => {
          const e = err as { message?: string; status?: number };
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

  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* BottomSheet على الموبايل / لوحة يمينية على الديسكتوب — الجولة 4 */}
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile
            ? "max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            : "w-full sm:max-w-md"
        )}
      >
        {isMobile && (
          <div className="bottom-sheet-grip pt-3" aria-hidden="true" />
        )}
        <SheetHeader className="border-b p-4 text-right">
          <SheetTitle className="text-right text-lg font-extrabold">
            اطلب الآن
          </SheetTitle>
          <SheetDescription className="text-right">
            أكمل بياناتك لتأكيد الطلب
          </SheetDescription>
        </SheetHeader>

        {successOrder ? (
          <SuccessView order={successOrder} onClose={handleClose} />
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto no-mobile-scrollbar">
            {/* ملخص الوجبة */}
            <section className="flex gap-3 border-b p-4" aria-label="ملخص الوجبة">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {product.image_url ? (
                  <ImageWithSkeleton
                    src={resolveImageUrl(product.image_url)}
                    alt={product.name}
                    fill
                    className="h-full w-full"
                    skeletonClassName="rounded-none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag
                      className="h-6 w-6 text-muted-foreground/40"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="line-clamp-1 font-bold text-foreground">
                  {product.name}
                </h3>
                {facilityName && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {facilityName}
                  </p>
                )}
                {outOfStock ? (
                  <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                    نفد
                  </span>
                ) : product.available_quantity === null ? (
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                    متوفر
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                    الكمية: {product.available_quantity}
                  </span>
                )}
              </div>
            </section>

            {/* اختيار الكمية */}
            <section className="space-y-2 border-b p-4" aria-label="اختيار الكمية">
              <Label htmlFor="qty-stepper" className="text-sm font-bold">
                الكمية
              </Label>
              <div id="qty-stepper">
                <QuantityStepper
                  quantity={quantity}
                  max={maxQty}
                  disabled={outOfStock}
                  onChange={setQuantity}
                />
              </div>
            </section>

            {/* حساب السعر */}
            <section className="space-y-3 border-b p-4" aria-label="حساب السعر">
              {specialOffer ? (
                <SpecialOfferPriceBreakdown
                  base={soBase}
                  offerDiscountPerUnit={soOfferDiscountPerUnit}
                  facilityDiscountPerUnit={soFacilityDiscountPerUnit}
                  isMember={isMember}
                  quantity={quantity}
                  subtotal={subtotal}
                  delivery={delivery}
                  total={total}
                  offerRate={specialOffer.offer_discount_rate}
                  facilityRate={specialOffer.facility_discount_rate}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">سعر الوحدة</span>
                    {isMember ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="text-xs text-muted-foreground line-through"
                          dir="ltr"
                        >
                          {formatCurrency(priceNum)}
                        </span>
                        <span
                          className="font-bold text-foreground"
                          dir="ltr"
                        >
                          {formatCurrency(unitPrice)}
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-foreground" dir="ltr">
                        {formatCurrency(priceNum)}
                      </span>
                    )}
                  </div>

                  {isMember ? (
                    <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        خصم {memberRate}%
                      </span>
                      <span className="font-bold" dir="ltr">
                        −{formatCurrency(priceNum - unitPrice)}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/account")}
                      className="flex w-full items-center justify-between rounded-lg bg-accent/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
                        اشترك في عضوية توفير لخصم {DISCOUNT_RATE}%
                      </span>
                      <span className="font-bold text-accent-ink">اشترك</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الإجمالي الفرعي</span>
                    <span className="font-bold text-foreground" dir="ltr">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">رسوم التوصيل</span>
                    <span className="font-bold text-foreground" dir="ltr">
                      {formatCurrency(delivery)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-base font-extrabold">
                    <span className="text-foreground">الإجمالي</span>
                    <span className="text-primary" dir="ltr">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </>
              )}
            </section>

            {/* موقع التوصيل + طريقة الدفع + ملاحظات — حقول مشتركة (2-c) */}
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
              disabled={outOfStock}
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

            {/* زر التأكيد */}
            <div className="sticky bottom-0 mt-auto border-t bg-background p-4">
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={outOfStock || createOrder.isPending}
                className="min-h-[48px] w-full gap-2 rounded-full"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    جارٍ التأكيد...
                  </>
                ) : outOfStock ? (
                  "غير متوفر حالياً"
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    تأكيد الطلب
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * منتج نائب لاستخدامه عند إغلاق الشيت — قيم محايدة لتفادي NaN.
 * يُستعمل فقط عندما لا يكون هناك منتج مُحدّد.
 */
export const PLACEHOLDER_CHECKOUT_PRODUCT: CheckoutProduct = {
  id: 0,
  facility_id: 0,
  name: "",
  description: null,
  price: "0",
  image_url: null,
  is_available: false,
  available_quantity: null,
};
