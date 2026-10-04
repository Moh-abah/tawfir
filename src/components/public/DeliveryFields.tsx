"use client";

/**
 * حقول التوصيل والدفع المشتركة — مصدر حقيقة واحد (2-c).
 *
 * نسخة زر تحميل الموقع (توجيه المالك — بلا خريطة داخل المنصة):
 * - «تحميل موقعي»: GPS يجلب الإحداثيات الحية (مع احتياط إدخال يدوي).
 * - سطر التسعير الحي يُحدَّث مع الموقع المحمّل (كم × س/ك = أجرة) —
 *   عرض حرفي لـ breakdown من الخادم (التقدير استرشادي — الحساب
 *   النهائي عند الإنشاء سيرفر-سايد §7-9).
 * - العنوان النصي المختصر إلزامي.
 * - الإحداثيات إلزامية: المستهلك (CheckoutSheet/CartSheet/cart)
 *   يعطّل زر الإرسال حتى وجود النقطة والعنوان معاً.
 *
 * جولة المحافظ اليمنية:
 * - «طريقة الاستلام»: التوصيل هو الافتراضي المحدد، و«تسليم يدوي/استلام
 *   من المتجر» خيار ثانٍ (UI فقط — بلا حقل خادم؛ التاجر يملك أصلاً
 *   إجراء «توصيل ذاتي»). عند الاستلام من المتجر تُخفّى إلزامية
 *   الموقع/العنوان والتسعير الحي.
 * - «طريقة الدفع» حسب السوق (جولة المالية v2):
 *   · يمني (الافتراضي للتوافق): كاش + «محفظة / تحويل يدوي» — ولا أي
 *     أثر للدفع الإلكتروني (السوق اليمني لا يرى بوابة دفع إطلاقاً).
 *   · سعودي: كاش + «دفع إلكتروني (بطاقة/Apple Pay)» — قيمة الاختيار
 *     "electronic" واجهة حصراً ولا تُرسل للخادم أبداً (الطلب يُنشأ
 *     cash والدفع الفعلي لاحقاً عبر مويسر من /orders/{id}/pay) —
 *     وتُخفّى محفظة التاجر لعدم وجودها في السوق السعودي.
 */

import { Banknote, CreditCard, Loader2, MapPin, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GeoLocationField } from "@/components/shared/GeoLocationField";
import { WalletPickerList } from "@/components/wallets/WalletPickerList";
import { useDeliveryEstimate } from "@/hooks/useDeliveryEstimate";
import { formatCurrency } from "@/lib/format";
import type { PaymentMethod } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/**
 * الحد الأقصى لطول العنوان والملاحظات — من سكيما OrderCreate (maxLength: 500).
 */
export const DELIVERY_TEXT_MAX = 500;

/**
 * الرسالة الحرفية عند طلب بلا موقع محمّل (عقد النصوص §7-7 — مواءمة
 * مع تفاعل زر التحميل بدل الخريطة).
 */
export const MISSING_LOCATION_MSG =
  "حمّل موقعك أولاً — المندوب يحتاجه لإيصال طلبك";

/** طريقة الاستلام — UI فقط (التوصيل افتراضي، والتسليم اليدوي خيار ثانٍ). */
export type DeliveryMode = "delivery" | "handover";

/**
 * طريقة الدفع في نموذج الطلب.
 * "electronic" قيمة واجهة حصراً (السوق السعودي) — لا تُرسل للخادم إطلاقاً؛
 * العقد: الطلب يُنشأ payment_method="cash" والدفع الفعلي عبر مويسر لاحقاً.
 */
export type CheckoutPaymentMethod = PaymentMethod | "electronic";

/** سوق المستخدم — يحدد بطاقات طريقة الدفع الظاهرة (برونزية السوقين). */
export type CheckoutMarket = "saudi" | "yemen";

export interface DeliveryFieldsProps {
  /** خط عرض موقع التوصيل (null إن لم يُحمّل بعد). */
  lat: number | null;
  /** خط طول موقع التوصيل (null إن لم يحمّل بعد). */
  lng: number | null;
  /** يُستدعى عند نجاح تحميل الموقع (GPS أو إدخال يدوي). */
  onLocated: (lat: number, lng: number) => void;
  /** العنوان التفصيلي (delivery_address) — إلزامي في وضع التوصيل (§6-3). */
  address: string;
  onAddressChange: (value: string) => void;
  /** ملاحظات الطلب (notes). */
  notes: string;
  onNotesChange: (value: string) => void;
  /** طريقة الدفع — cash (افتراضي) | wallet | electronic (واجهة سعودية حصراً). */
  paymentMethod: CheckoutPaymentMethod;
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void;
  /** معرّف محفظة المتجر المختارة (مطلوب مع wallet). */
  paymentWalletId: number | null;
  onPaymentWalletIdChange: (walletId: number | null) => void;
  /** طريقة الاستلام — delivery (افتراضي) | handover (استلام من المتجر). */
  deliveryMode?: DeliveryMode;
  onDeliveryModeChange?: (mode: DeliveryMode) => void;
  /** تعطيل كل الحقول (نفد المخزون مثلاً). */
  disabled?: boolean;
  /**
   * شكل العرض:
   * - sheet (افتراضي): أقسام مفصولة بحدود — داخل Sheet قابل للتمرير.
   * - plain: كتل متجاورة بلا حدود — داخل بطاقة صفحة (مثل /cart).
   */
  variant?: "sheet" | "plain";
  /** بادئة لمعرّفات الحقول لتفادي تصادم DOM عند تعدد النماذج. */
  idPrefix?: string;
  /**
   * معرّف المنشأة — للتسعير الحي (GET /orders/delivery-estimate)
   * ولجلب محافظ المتجر (GET /facilities/{id}/wallets).
   * null = بلا سطر تسعير (تصفح غير مسجل الدخول).
   */
  facilityId?: number | null;
  /** إظهار شارة إلزامية العنوان (حسب سياق المستدعي). */
  showAddressRequired?: boolean;
  /**
   * سوق المستخدم — يحدد بطاقات الدفع:
   * saudi → كاش + دفع إلكتروني (بلا محفظة تاجر)؛
   * yemen (الافتراضي للتوافق مع بقية المستدعين) → كاش + محفظة
   * وبلا أي أثر للدفع الإلكتروني.
   */
  market?: CheckoutMarket;
}

export function DeliveryFields({
  lat,
  lng,
  onLocated,
  address,
  onAddressChange,
  notes,
  onNotesChange,
  paymentMethod,
  onPaymentMethodChange,
  paymentWalletId,
  onPaymentWalletIdChange,
  deliveryMode = "delivery",
  onDeliveryModeChange,
  disabled = false,
  variant = "sheet",
  idPrefix = "",
  facilityId = null,
  showAddressRequired = true,
  market = "yemen",
}: DeliveryFieldsProps) {
  const isSaudiMarket = market === "saudi";
  const wrapClass =
    variant === "sheet" ? "space-y-2 border-b border-border/50 p-4" : "space-y-2";

  /* التسعير الحي — يُحدَّث مع الموقع المحمّل (debounce داخلي 700ms).
     في وضع الاستلام من المتجر لا تسعير ولا إلزامية موقع. */
  const isHandover = deliveryMode === "handover";
  const estimate = useDeliveryEstimate(
    isHandover ? null : facilityId,
    isHandover ? null : lat,
    isHandover ? null : lng
  );

  const addressId = `${idPrefix}address`;
  const notesId = `${idPrefix}notes`;
  const hasLocation = lat != null && lng != null;
  const addressMissing = showAddressRequired && !isHandover && address.trim().length === 0;

  return (
    <>
      {/* طريقة الاستلام — التوصيل افتراضي والتسليم اليدوي خيار ثانٍ */}
      {onDeliveryModeChange && (
        <section className={wrapClass} aria-label="طريقة الاستلام">
          <Label className="text-sm font-bold">طريقة الاستلام</Label>
          <RadioGroup
            value={deliveryMode}
            onValueChange={(v) => onDeliveryModeChange(v as DeliveryMode)}
            className="grid grid-cols-2 gap-2"
          >
            <label
              className={cn(
                "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold transition-colors",
                deliveryMode === "delivery"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40"
              )}
            >
              <RadioGroupItem value="delivery" className="sr-only" />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  توصيل
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  الافتراضي — المندوب يوصل إليك
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold transition-colors",
                deliveryMode === "handover"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40"
              )}
            >
              <RadioGroupItem value="handover" className="sr-only" />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                  تسليم يدوي
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  استلام من المتجر
                </span>
              </span>
            </label>
          </RadioGroup>
        </section>
      )}

      {/* موقع التوصيل — زر تحميل الموقع (إلزامية الإحداثيات §6-3) */}
      <section
        className={cn(wrapClass, isHandover && "opacity-60")}
        aria-label="موقع التوصيل"
      >
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-sm font-bold">
            موقع التوصيل
            {!isHandover && (
              <span
                className="text-destructive"
                aria-hidden="true"
                title="إلزامي"
              >
                *
              </span>
            )}
            {isHandover && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                غير مطلوب — استلام من المتجر
              </span>
            )}
          </Label>
          {hasLocation && !isHandover && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              موقعك محمّل
            </span>
          )}
        </div>

        <GeoLocationField
          value={hasLocation ? { lat, lng: lng! } : null}
          onLocated={(p) => onLocated(p.lat, p.lng)}
          disabled={disabled || isHandover}
          idPrefix={idPrefix}
        />

        {/* سطر التسعير الحي — يُحدَّث مع الموقع المحمّل (§6-3) */}
        {!isHandover && facilityId != null && (
          <div
            aria-live="polite"
            className={cn(
              "rounded-xl border border-dashed px-3.5 py-2.5",
              hasLocation
                ? estimate.isError
                  ? "border-border bg-muted/40"
                  : "border-primary/35 bg-primary/5"
                : "border-border bg-muted/40",
            )}
          >
            {!hasLocation ? (
              <p className="text-center text-[11px] font-medium text-muted-foreground">
                حمّل موقعك لعرض تقدير أجرة التوصيل
              </p>
            ) : estimate.isLoading && !estimate.data ? (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                جارٍ حساب الأجرة من مسافة موقعك…
              </p>
            ) : estimate.isError ? (
              <p className="text-center text-[11px] text-muted-foreground">
                تعذّر حساب الأجرة الآن — ستُحسب بدقة عند تأكيد الطلب
              </p>
            ) : estimate.data ? (
              <div className="space-y-0.5 text-center">
                <p className="text-sm font-black text-primary">
                  أجرة التوصيل التقديرية: {formatCurrency(estimate.data.fee)}
                </p>
                <p
                  className="text-[11px] font-medium text-muted-foreground"
                  dir="rtl"
                >
                  {estimate.data.breakdown}
                </p>
                {estimate.data.note && (
                  <p className="text-[11px] text-accent-foreground">
                    {estimate.data.note}
                  </p>
                )}
                {estimate.data.exceeds_cap && (
                  <p className="text-[11px] font-bold text-destructive">
                    {estimate.data.distance_display} — خارج نطاق التوصيل
                    (الحد الأقصى {estimate.data.max_km_applied} كم)
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  تقدير استرشادي — الحساب النهائي عند تأكيد الطلب
                </p>
              </div>
            ) : null}
          </div>
        )}

        <Label
          htmlFor={addressId}
          className={cn(
            "flex items-center gap-1 text-xs",
            addressMissing ? "font-bold text-foreground" : "text-muted-foreground",
          )}
        >
          العنوان التفصيلي
          {!isHandover && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {isHandover && (
            <span className="text-[10px]">(اختياري في الاستلام من المتجر)</span>
          )}
        </Label>
        <Textarea
          id={addressId}
          placeholder="الحي، الشارع، أقرب نقطة دالة..."
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          maxLength={DELIVERY_TEXT_MAX}
          rows={3}
          disabled={disabled}
          className={cn(
            "resize-none",
            addressMissing && "border-destructive/40 focus-visible:ring-destructive/30",
          )}
          aria-required={!isHandover}
          aria-invalid={addressMissing}
        />
        {addressMissing && (
          <p role="note" className="text-[11px] text-destructive">
            العنوان النصي مختصراً إلزامي — يساعد المندوب عند وصوله لبابك
          </p>
        )}
        <p className="text-left text-[11px] text-muted-foreground" dir="ltr">
          {address.length}/{DELIVERY_TEXT_MAX}
        </p>
      </section>

      {/* طريقة الدفع */}
      <section
        className={cn(wrapClass, variant === "plain" && "pt-4")}
        aria-label="طريقة الدفع"
      >
        <Label className="text-sm font-bold">طريقة الدفع</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(v) => onPaymentMethodChange(v as CheckoutPaymentMethod)}
          className="space-y-2"
        >
          {/* كاش — الافتراضي في السوقين */}
          <div className="flex items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <RadioGroupItem value="cash" id={`${idPrefix}pay-cash`} disabled={disabled} />
            <Label
              htmlFor={`${idPrefix}pay-cash`}
              className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
            >
              <Banknote className="h-5 w-5 text-foreground" aria-hidden="true" />
              الدفع عند الاستلام (كاش)
            </Label>
          </div>

          {/* السوق السعودي: دفع إلكتروني (بطاقة/Apple Pay) —
              "electronic" قيمة واجهة حصراً ولا تُرسل للخادم أبداً؛
              الطلب يُنشأ cash والدفع الفعلي عبر مويسر لاحقاً */}
          {isSaudiMarket && (
            <div className="flex items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem
                value="electronic"
                id={`${idPrefix}pay-electronic`}
                disabled={disabled}
              />
              <Label
                htmlFor={`${idPrefix}pay-electronic`}
                className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
              >
                <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span>دفع إلكتروني (بطاقة/Apple Pay)</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    تدفع الآن بأمان عبر مويسر بعد تأكيد الطلب
                  </span>
                </span>
              </Label>
            </div>
          )}

          {/* محفظة / تحويل يدوي — السوق اليمني حصراً (جولة المحافظ)؛
              تُخفى في السعودية لعدم وجودها في سوقها */}
          {!isSaudiMarket && (
            <div className="flex items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem
                value="wallet"
                id={`${idPrefix}pay-wallet`}
                disabled={disabled}
              />
              <Label
                htmlFor={`${idPrefix}pay-wallet`}
                className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
              >
                <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span>محفظة / تحويل يدوي</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    حوّل من محفظتك وارفع صورة الإشعار
                  </span>
                </span>
              </Label>
            </div>
          )}
        </RadioGroup>

        {/* منتقي محفظة المتجر — يظهر عند اختيار «محفظة / تحويل يدوي» */}
        {paymentMethod === "wallet" && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
            <p className="mb-2 text-xs font-bold text-foreground">
              اختر محفظة المتجر التي ستحوّل إليها
            </p>
            <WalletPickerList
              facilityId={facilityId}
              value={paymentWalletId}
              onChange={onPaymentWalletIdChange}
              disabled={disabled}
              idPrefix={idPrefix}
            />
          </div>
        )}
      </section>

      {/* ملاحظات */}
      <section className={wrapClass} aria-label="ملاحظات الطلب">
        <Label htmlFor={notesId} className="text-xs text-muted-foreground">
          ملاحظات (اختياري)
        </Label>
        <Textarea
          id={notesId}
          placeholder="مثلاً: بلا فلفل حار..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={DELIVERY_TEXT_MAX}
          rows={2}
          disabled={disabled}
          className="resize-none"
        />
      </section>
    </>
  );
}
