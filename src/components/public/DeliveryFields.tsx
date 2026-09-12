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
 */

import { Banknote, Loader2, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GeoLocationField } from "@/components/shared/GeoLocationField";
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

export interface DeliveryFieldsProps {
  /** خط عرض موقع التوصيل (null إن لم يُحمّل بعد). */
  lat: number | null;
  /** خط طول موقع التوصيل (null إن لم يحمّل بعد). */
  lng: number | null;
  /** يُستدعى عند نجاح تحميل الموقع (GPS أو إدخال يدوي). */
  onLocated: (lat: number, lng: number) => void;
  /** العنوان التفصيلي (delivery_address) — إلزامي (§6-3). */
  address: string;
  onAddressChange: (value: string) => void;
  /** ملاحظات الطلب (notes). */
  notes: string;
  onNotesChange: (value: string) => void;
  /** طريقة الدفع — cash فقط فعلياً (wallet يرفضه الخادم 422). */
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
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
   * معرّف المنشأة — للتسعير الحي (GET /orders/delivery-estimate).
   * null = بلا سطر تسعير (تصفح غير مسجل الدخول).
   */
  facilityId?: number | null;
  /** إظهار شارة إلزامية العنوان (حسب سياق المستدعي). */
  showAddressRequired?: boolean;
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
  disabled = false,
  variant = "sheet",
  idPrefix = "",
  facilityId = null,
  showAddressRequired = true,
}: DeliveryFieldsProps) {
  const wrapClass =
    variant === "sheet" ? "space-y-2 border-b border-border/50 p-4" : "space-y-2";

  /* التسعير الحي — يُحدَّث مع الموقع المحمّل (debounce داخلي 700ms) */
  const estimate = useDeliveryEstimate(facilityId, lat, lng);

  const addressId = `${idPrefix}address`;
  const notesId = `${idPrefix}notes`;
  const hasLocation = lat != null && lng != null;
  const addressMissing = showAddressRequired && address.trim().length === 0;

  return (
    <>
      {/* موقع التوصيل — زر تحميل الموقع (إلزامية الإحداثيات §6-3) */}
      <section className={wrapClass} aria-label="موقع التوصيل">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-sm font-bold">
            موقع التوصيل
            <span
              className="text-destructive"
              aria-hidden="true"
              title="إلزامي"
            >
              *
            </span>
          </Label>
          {hasLocation && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              موقعك محمّل
            </span>
          )}
        </div>

        <GeoLocationField
          value={hasLocation ? { lat, lng: lng! } : null}
          onLocated={(p) => onLocated(p.lat, p.lng)}
          disabled={disabled}
          idPrefix={idPrefix}
        />

        {/* سطر التسعير الحي — يُحدَّث مع الموقع المحمّل (§6-3) */}
        {facilityId != null && (
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
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
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
          aria-required="true"
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
          onValueChange={(v) => onPaymentMethodChange(v as PaymentMethod)}
          className="space-y-2"
        >
          <div className="flex items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <RadioGroupItem value="cash" id={`${idPrefix}pay-cash`} />
            <Label
              htmlFor={`${idPrefix}pay-cash`}
              className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
            >
              <Banknote className="h-5 w-5 text-foreground" aria-hidden="true" />
              نقداً عند الاستلام
            </Label>
          </div>
          <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border p-3 opacity-60">
            <RadioGroupItem value="wallet" id={`${idPrefix}pay-wallet`} disabled />
            <Label
              htmlFor={`${idPrefix}pay-wallet`}
              className="flex flex-1 items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Wallet className="h-5 w-5" aria-hidden="true" />
              محفظة جيب
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                قريباً
              </span>
            </Label>
          </div>
        </RadioGroup>
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
