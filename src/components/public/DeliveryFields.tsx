"use client";

import { useState } from "react";
import { Banknote, Loader2, MapPin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types/api.generated";

/**
 * الحد الأقصى لطول العنوان والملاحظات — من سكيما OrderCreate (maxLength: 500).
 */
export const DELIVERY_TEXT_MAX = 500;

export interface DeliveryFieldsProps {
  /** خط عرض موقع التوصيل المحدد (null إن لم يُحدد بعد). */
  lat: number | null;
  /** خط طول موقع التوصيل المحدد (null إن لم يُحدد بعد). */
  lng: number | null;
  /** يُستدعى عند نجاح تحديد الموقع. */
  onLocated: (lat: number, lng: number) => void;
  /** العنوان التفصيلي (delivery_address). */
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
}

/**
 * حقول التوصيل والدفع المشتركة — مصدر حقيقة واحد (2-c).
 *
 * المدخلات مطابقة حرفياً لسكيما OrderCreate في openapi_live.json:
 * - delivery_lat / delivery_lng: تحديد عبر geolocation (اختياري).
 * - delivery_address: نص ≤ 500 حرفاً (اختياري).
 * - notes: نص ≤ 500 حرفاً (اختياري).
 * - payment_method: نقداً فقط — «wallet غير متاح حالياً» (وثّق الخادم ذلك
 *   بوصف الحقل + يرجع 422 «الدفع عبر المحفظة غير متاح حالياً») لذا خيار
 *   المحفظة معطّل بشارة «قريباً».
 *
 * يستعمله CheckoutSheet و CartSheet وصفحة /cart — أي تعديل مستقبلي
 * على هذه المدخلات يتم هنا مرة واحدة.
 */
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
}: DeliveryFieldsProps) {
  const [locating, setLocating] = useState(false);

  const wrapClass =
    variant === "sheet" ? "space-y-2 border-b border-border/50 p-4" : "space-y-2";

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({
        title: "غير مدعوم",
        description: "متصفحك لا يدعم تحديد الموقع.",
        variant: "destructive",
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocated(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast({ title: "تم تحديد موقعك" });
      },
      (err) => {
        setLocating(false);
        toast({
          title: "تعذّر تحديد موقعك",
          description: err.message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  const addressId = `${idPrefix}address`;
  const notesId = `${idPrefix}notes`;

  return (
    <>
      {/* موقع التوصيل */}
      <section
        className={wrapClass}
        aria-label="موقع التوصيل"
      >
        <Label className="text-sm font-bold">موقع التوصيل</Label>
        <Button
          type="button"
          variant="outline"
          onClick={handleLocate}
          disabled={locating || disabled}
          className="min-h-[44px] w-full justify-center gap-2"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden="true" />
          )}
          {lat != null && lng != null ? "تم تحديد موقعك" : "حدد موقعي"}
        </Button>
        {lat != null && lng != null && (
          <p
            className="text-left text-[11px] tabular-nums text-muted-foreground"
            dir="ltr"
          >
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        )}
        <Label htmlFor={addressId} className="text-xs text-muted-foreground">
          العنوان التفصيلي
        </Label>
        <Textarea
          id={addressId}
          placeholder="الحي، الشارع، أقرب نقطة دالة..."
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          maxLength={DELIVERY_TEXT_MAX}
          rows={3}
          disabled={disabled}
          className="resize-none"
        />
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
              className="flex flex-1 cursor-not-allowed items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <Wallet className="h-5 w-5" aria-hidden="true" />
              محفظة
            </Label>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              قريباً
            </span>
          </div>
        </RadioGroup>
      </section>

      {/* ملاحظات */}
      <section
        className={cn(
          wrapClass,
          variant === "sheet" && "border-b-0",
          variant === "plain" && "pt-4"
        )}
        aria-label="ملاحظات"
      >
        <Label htmlFor={notesId} className="text-sm font-bold">
          ملاحظات (اختياري)
        </Label>
        <Textarea
          id={notesId}
          placeholder="أي ملاحظات على طلبك (مثال: بدون بصل، توابل إضافية...)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          maxLength={DELIVERY_TEXT_MAX}
          rows={3}
          disabled={disabled}
          className="resize-none"
        />
        <p className="text-left text-[11px] text-muted-foreground" dir="ltr">
          {notes.length}/{DELIVERY_TEXT_MAX}
        </p>
      </section>
    </>
  );
}
