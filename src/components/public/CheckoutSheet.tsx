"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Wallet,
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
import {
  DeliveryFields,
  MISSING_LOCATION_MSG,
  type CheckoutMarket,
  type CheckoutPaymentMethod,
  type DeliveryMode,
} from "@/components/public/DeliveryFields";
import { useMe } from "@/hooks/useMe";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useDeliveryEstimate } from "@/hooks/useDeliveryEstimate";
import { useLocaleMe } from "@/hooks/useFinance";
import { isSaudiCountry, currencyFromCountry } from "@/services/locale.service";
import { MoneyText } from "@/components/finance/finance-ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import type { DeliveryEstimateOut } from "@/services/order.service";
import type { OrderOut } from "@/types/api.generated";

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
  /** السكمة الحية تجعلها اختيارية — تقبل undefined لتفادي تحويلات مصطنعة */
  image_url: string | null | undefined;
  is_available: boolean;
  available_quantity: number | null | undefined;
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
  market,
  electronic,
  onClose,
}: {
  order: OrderOut;
  /** سوق العميل — يحدد الخطوة التالية بعد النجاح. */
  market: CheckoutMarket;
  /** هل اختار العميل «دفع إلكتروني» عند تأكيد الطلب؟ */
  electronic: boolean;
  onClose: () => void;
}) {
  /* السوق اليمني: طلب محفظة → شاشة الدفع لرفع إشعار التحويل (كما هو) */
  const isWalletOrder = order.payment_method === "wallet";
  /* السوق السعودي + خيار إلكتروني: خطوة أخيرة — الدفع عبر مويسر.
     عقدًا: الطلب أُنشئ payment_method="cash" — الدفع الإلكتروني
     اختياري يُتمّ الآن أو لاحقاً من صفحة الطلب. */
  const showElectronicNext = market === "saudi" && electronic;

  if (showElectronicNext) {
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
        <div className="w-full max-w-xs rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-right">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-accent-ink">
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
            خطوة أخيرة — الدفع الإلكتروني
          </p>
          <p className="mt-1 text-xs leading-relaxed text-accent-ink/90">
            ادفع الآن بأمان عبر مويسر (بطاقة أو Apple Pay) — بيانات بطاقتك لا
            تلمس خوادمنا. يمكنك أيضاً الدفع كاش عند الاستلام.
          </p>
        </div>
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <Button
            asChild
            size="lg"
            className="min-h-[48px] w-full rounded-full"
            onClick={onClose}
          >
            <Link href={`/orders/${order.id}/pay`}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              ادفع الآن
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-[44px] w-full rounded-full"
            onClick={onClose}
          >
            كاش عند الاستلام — لاحقاً
          </Button>
        </div>
      </div>
    );
  }

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
      {isWalletOrder ? (
        <>
          <div className="w-full max-w-xs rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-right">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-accent-ink">
              <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
              خطوة أخيرة — إتمام الدفع
            </p>
            <p className="mt-1 text-xs leading-relaxed text-accent-ink/90">
              حوّل المبلغ المطلوب ({formatCurrency(order.total)}) إلى محفظة
              المتجر من شاشة الدفع، ثم ارفع صورة إشعار التحويل.
            </p>
          </div>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <Button
              asChild
              size="lg"
              className="min-h-[48px] w-full rounded-full"
              onClick={onClose}
            >
              <Link href={`/orders/${order.id}/payment`}>
                <Wallet className="h-4 w-4" aria-hidden="true" />
                الذهاب لشاشة الدفع
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full rounded-full"
              onClick={onClose}
            >
              لاحقاً — من صفحة طلباتي
            </Button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

/**
 * سطر «رسوم التوصيل» الحي — بلا أي رقم ميت (البرونزية-3):
 * قبل الموقع نص فقط، وبعده أجرة حية من GET /orders/delivery-estimate
 * مع breakdown حرفي من الخادم (شفافية الرقم سياسة المنصة).
 */
function DeliveryFeeRow({
  estimate,
  hasLocation,
  currency,
}: {
  estimate: {
    data?: DeliveryEstimateOut;
    isLoading: boolean;
    isError: boolean;
  };
  hasLocation: boolean;
  currency: string;
}) {
  const fee = estimate.data?.fee;
  const hasFee = typeof fee === "number";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">رسوم التوصيل</span>
        {!hasLocation ? (
          <span className="text-xs font-bold text-muted-foreground">
            تُحسب حسب المسافة بعد تحديد موقعك
          </span>
        ) : estimate.isLoading && !estimate.data ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            جارٍ حساب الأجرة…
          </span>
        ) : hasFee ? (
          <MoneyText
            amount={fee}
            currency={currency}
            className="font-bold text-foreground"
          />
        ) : (
          <span className="text-xs text-muted-foreground">تُحسب عند تأكيد الطلب</span>
        )}
      </div>

      {/* breakdown حرفي من الخادم — شفافية التسعير */}
      {hasFee && estimate.data?.breakdown && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {estimate.data.breakdown}
        </p>
      )}
      {estimate.data?.imprecise_address && (
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
          عنوان غير محدد بدقة
        </span>
      )}
      {estimate.data?.note && (
        <p className="text-[11px] leading-relaxed text-accent-foreground">
          {estimate.data.note}
        </p>
      )}
    </div>
  );
}

/** سطر الإجمالي + تنبيه التأكيد الخادمي (التقدير استرشادي §7-9). */
function TotalRow({
  total,
  currency,
}: {
  total: number;
  currency: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between border-t pt-2 text-base font-extrabold">
        <span className="text-foreground">الإجمالي</span>
        <MoneyText
          amount={total}
          currency={currency}
          strong
          className="text-primary"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        الإجمالي النهائي يؤكده الخادم عند إنشاء الطلب
      </p>
    </div>
  );
}

/**
 * كسر سعر العرض الخاص — 4-5 أسطر موضّحة (كل المبالغ بعملة السوق الحية):
 *  - السعر الأصلي (مشطوب)
 *  - خصم العرض الخاص
 *  - خصم العضوية (للعضو فقط)
 *  - رسوم التوصيل (حية — أو نص بلا رقم قبل تحديد الموقع)
 *  - الإجمالي
 */
function SpecialOfferPriceBreakdown({
  base,
  offerDiscountPerUnit,
  facilityDiscountPerUnit,
  isMember,
  quantity,
  subtotal,
  estimate,
  hasLocation,
  total,
  offerRate,
  facilityRate,
  currency,
}: {
  base: number;
  offerDiscountPerUnit: number;
  facilityDiscountPerUnit: number;
  isMember: boolean;
  quantity: number;
  subtotal: number;
  estimate: {
    data?: DeliveryEstimateOut;
    isLoading: boolean;
    isError: boolean;
  };
  hasLocation: boolean;
  total: number;
  offerRate: number;
  facilityRate: number;
  currency: string;
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
        <MoneyText
          amount={baseTotal}
          currency={currency}
          className="text-xs font-medium text-muted-foreground line-through"
        />
      </div>

      {/* خصم العرض الخاص */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">خصم العرض الخاص</span>
        <MoneyText
          amount={-offerDiscountTotal}
          currency={currency}
          className="font-bold text-primary"
        />
      </div>

      {/* خصم العضوية — للعضو فقط */}
      {isMember && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">خصم العضوية</span>
          <MoneyText
            amount={-facilityDiscountTotal}
            currency={currency}
            className="font-bold text-success"
          />
        </div>
      )}

      {/* الإجمالي الفرعي */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">الإجمالي الفرعي</span>
        <MoneyText
          amount={subtotal}
          currency={currency}
          className="font-bold text-foreground"
        />
      </div>

      {/* رسوم التوصيل — حية من الخادم أو نص بلا رقم */}
      <DeliveryFeeRow
        estimate={estimate}
        hasLocation={hasLocation}
        currency={currency}
      />

      {/* الإجمالي */}
      <TotalRow total={total} currency={currency} />
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
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("cash");
  const [paymentWalletId, setPaymentWalletId] = useState<number | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [successOrder, setSuccessOrder] = useState<OrderOut | null>(null);
  /* هل نية الطلب الأخيرة كانت «دفع إلكتروني»؟ — لبطاقة الخطوة الأخيرة */
  const [successElectronic, setSuccessElectronic] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* بوابة السوق — useLocaleMe مفعّل دائمًا داخل الشيت.
     عند فشل/تأخر الجلب: نعتبرها يمني (السلوك الحالي) — hook يعيد المحاولة مرة. */
  const localeMe = useLocaleMe(true);
  const market: CheckoutMarket =
    localeMe.isSuccess && localeMe.data != null && isSaudiCountry(localeMe.data.country_code)
      ? "saudi"
      : "yemen";
  const isSaudiMarket = market === "saudi";

  const isMember = !!me.data?.membership?.is_active;
  const priceNum = parseFloat(product.price) || 0;

  /* طريقة الاستلام قبل حساب السعر — وضع الاستلام بلا تسعير توصيل */
  const isHandover = deliveryMode === "handover";

  /* التسعير الحي للتوصيل — نفس استعلام DeliveryFields (مفتاح مشترك:
     طلب شبكة واحد مهما تعددت الأسطح). debounce 700ms داخل الـhook. */
  const estimate = useDeliveryEstimate(
    isHandover ? null : product.facility_id,
    isHandover ? null : lat,
    isHandover ? null : lng
  );
  const hasLocation = lat != null && lng != null;

  /* عملة السوق — من رد التسعير نفسه أولاً (v3.2.1: currency في delivery-estimate)،
     وإلا تُشتق من سوق جلسة العميل المسجل (locale/me) عبر الخدمة المشتركة */
  const currency =
    estimate.data?.currency ??
    currencyFromCountry(localeMe.data?.country_code);

  // حساب السعر — أسعار العرض الخاص إن وُجدت (حقول خادمية)، وإلا سعر الخادم الرسمي.
  // v3.2.1: لا حساب خصم محلي من /me — خصم المنشأة يطبقه الخادم عند إنشاء الطلب.
  const unitPrice = specialOffer
    ? isMember
      ? specialOffer.member_price
      : specialOffer.non_member_price
    : priceNum;
  const subtotal = unitPrice * quantity;
  /* أجرة التوصيل الحية عند توفرها — لا ثابت، ولا رقم افتراضي */
  const deliveryFee = isHandover ? null : (estimate.data?.fee ?? null);
  const total = subtotal + (deliveryFee ?? 0);

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

  /* §6-3 — الموقع والعنوان إلزاميان في وضع التوصيل (الافتراضي).
     الاستلام من المتجر (تسليم يدوي) يرفع الإلزامية — UI فقط. */
  const locationMissing = !isHandover && (lat == null || lng == null);
  const addressMissing = !isHandover && address.trim().length === 0;
  const deliveryIncomplete = locationMissing || addressMissing;
  /* المحفظة تتطلب اختيار محفظة المتجر أولاً (422: «اختر محفظة الدفع أولاً»)
     — السوق اليمني فقط (المحفظة مخفية في السعودية) */
  const walletMissing = paymentMethod === "wallet" && paymentWalletId == null;

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
      setPaymentWalletId(null);
      setDeliveryMode("delivery");
      setSuccessOrder(null);
      setSuccessElectronic(false);
      setErrorMsg(null);
    }, 250);
    return () => clearTimeout(t);
  }, [open]);

  const handleSubmit = () => {
    if (outOfStock) return;
    /* §6-3 — بوابة الإرسال: لا طلب بلا موقع محمّل وعنوان نصي */
    if (locationMissing) {
      setErrorMsg(MISSING_LOCATION_MSG);
      return;
    }
    if (addressMissing) {
      setErrorMsg("اكتب عنوانك النصي المختصر — يساعد المندوب عند وصوله لبابك");
      return;
    }
    if (walletMissing) {
      setErrorMsg("اختر محفظة الدفع أولاً — من قائمة محافظ المتجر");
      return;
    }
    setErrorMsg(null);
    /* عقد السوقين: "electronic" قيمة واجهة حصراً — الطلب يُرسل دائماً
       payment_method="cash" في المسار الإلكتروني، والدفع الفعلي يحدث
       لاحقاً عبر مويسر من /orders/{id}/pay (لا "electronic" للخادم). */
    const serverPaymentMethod = paymentMethod === "electronic" ? "cash" : paymentMethod;
    createOrder.mutate(
      {
        facility_id: product.facility_id,
        items: [{ product_id: product.id, quantity }],
        delivery_lat: isHandover && lat == null ? null : lat,
        delivery_lng: isHandover && lng == null ? null : lng,
        delivery_address: address.trim() || null,
        payment_method: serverPaymentMethod,
        payment_wallet_id:
          serverPaymentMethod === "wallet" ? paymentWalletId : null,
        notes: notes.trim() || null,
        special_offer_id: specialOffer?.id ?? null,
      },
      {
        onSuccess: (data) => {
          setSuccessOrder(data);
          setSuccessElectronic(paymentMethod === "electronic");
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
            ? "max-h-[85dvh] rounded-t-2xl pb-[max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px))]"
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
          <SuccessView
            order={successOrder}
            market={market}
            electronic={successElectronic}
            onClose={handleClose}
          />
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

            {/* حساب السعر — كل المبالغ بعملة السوق الحية (برونزية-3/5) */}
            <section className="space-y-3 border-b p-4" aria-label="حساب السعر">
              {specialOffer ? (
                <SpecialOfferPriceBreakdown
                  base={soBase}
                  offerDiscountPerUnit={soOfferDiscountPerUnit}
                  facilityDiscountPerUnit={soFacilityDiscountPerUnit}
                  isMember={isMember}
                  quantity={quantity}
                  subtotal={subtotal}
                  estimate={estimate}
                  hasLocation={hasLocation && !isHandover}
                  total={total}
                  offerRate={specialOffer.offer_discount_rate}
                  facilityRate={specialOffer.facility_discount_rate}
                  currency={currency}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">سعر الوحدة</span>
                    {/* v3.2.1 — سعر الخادم الرسمي بلا أي خصم وهمي محلي */}
                    <MoneyText
                      amount={unitPrice}
                      currency={currency}
                      className="font-bold text-foreground"
                    />
                  </div>

                  {isMember ? (
                    /* v3.2.1 — لا حساب خصم في العميل: الخادم يطبق خصم المنشأة
                       (إن فعّلها التاجر) عند تأكيد الطلب ويعيد الإجمالي النهائي. */
                    <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                      خصم المنشأة (إن فعّلها التاجر) يُطبَّق من الخادم عند تأكيد الطلب — والإجمالي النهائي من رد الطلب
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/account")}
                      className="flex w-full items-center justify-between rounded-lg bg-accent/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
                        اشترك في عضوية توفير لخصم حصري
                      </span>
                      <span className="font-bold text-accent-ink">اشترك</span>
                    </button>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الإجمالي الفرعي</span>
                    <MoneyText
                      amount={subtotal}
                      currency={currency}
                      className="font-bold text-foreground"
                    />
                  </div>
                  <DeliveryFeeRow
                    estimate={estimate}
                    hasLocation={hasLocation && !isHandover}
                    currency={currency}
                  />
                  <TotalRow total={total} currency={currency} />
                </>
              )}
            </section>

            {/* موقع التوصيل + طريقة الدفع + ملاحظات — حقول مشتركة (2-c)
                market يحدد بطاقات الدفع: سعودي → كاش + إلكتروني؛
                يمني → كاش + محفظة (بلا أي أثر إلكتروني) */}
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
              onPaymentMethodChange={(m) => {
                setPaymentMethod(m);
                /* تبديل الوسيلة يمسح اختيار المحفظة السابق */
                if (m !== "wallet") setPaymentWalletId(null);
              }}
              paymentWalletId={paymentWalletId}
              onPaymentWalletIdChange={setPaymentWalletId}
              deliveryMode={deliveryMode}
              onDeliveryModeChange={setDeliveryMode}
              disabled={outOfStock}
              facilityId={product.facility_id}
              market={market}
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

            {/* زر التأكيد — معطّل حتى تحميل الموقع وكتابة العنوان (§6-3) */}
            <div className="sticky bottom-0 mt-auto border-t bg-background p-4">
              {deliveryIncomplete && !outOfStock && !createOrder.isPending && (
                <p
                  role="note"
                  className="mb-2 text-center text-[11px] font-bold text-muted-foreground"
                >
                  {locationMissing
                    ? MISSING_LOCATION_MSG
                    : "اكتب عنوانك النصي المختصر لإتمام الطلب"}
                </p>
              )}
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={
                  outOfStock ||
                  deliveryIncomplete ||
                  walletMissing ||
                  createOrder.isPending
                }
                className="min-h-[48px] w-full gap-2 rounded-full"
                aria-disabled={
                  outOfStock ||
                  deliveryIncomplete ||
                  walletMissing ||
                  createOrder.isPending
                }
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    جارٍ التأكيد...
                  </>
                ) : outOfStock ? (
                  "غير متوفر حالياً"
                ) : paymentMethod === "wallet" ? (
                  <>
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    تأكيد الطلب والدفع بالمحفظة
                  </>
                ) : paymentMethod === "electronic" ? (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    تأكيد الطلب — الدفع بعد التأكيد
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    تأكيد الطلب
                  </>
                )}
              </Button>
              {walletMissing && (
                <p
                  role="note"
                  className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] font-bold text-accent-ink"
                >
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  اختر محفظة المتجر لإتمام الدفع بالتحويل
                </p>
              )}
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
