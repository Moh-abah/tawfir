"use client";

/**
 * GeoLocationField — زر «تحميل موقعي» (بديل الخريطة المدمجة — توجيه المالك).
 * ═══════════════════════════════════════════════════════════════════
 * العميل عند الطلب لا يرى خريطة داخل المنصة — بل زراً واحداً كبيراً
 * يضغطه فيُحمّل بيانات موقعه الحي (Geolocation API):
 *
 *   • نجاح → بطاقة تأكيد زمردية: «تم تحميل موقعك» + دقة التقدير
 *     بالمتر + الإحداثيات صغيرة LTR + زر «تحديث الموقع».
 *   • فشل (رفض الإذن/شبكة) → بطاقة توجيه + إعادة المحاولة +
 *     إدخال الإحداثيات يدوياً (احتياط لا يتوقف عنده الطلب).
 *
 * الإحداثيات إلزامية لعملية الطلب (عقد OrderCreate) — المستهلك
 * (DeliveryFields) يعطّل زر الإرسال حتى وجودها مع العنوان النصي.
 */

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Loader2,
  LocateFixed,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLocationFieldProps {
  /** النقطة الحالية (null = لم تُحمّل بعد) */
  value: GeoPoint | null;
  /** يُستدعى عند نجاح التحميل أو التثبيت اليدوي */
  onLocated: (point: GeoPoint) => void;
  /** تعطيل كامل (نفد المخزون مثلاً) */
  disabled?: boolean;
  /** بادئة معرفات الحقول (تفادي تصادم DOM عند تعدد النماذج) */
  idPrefix?: string;
}

export function GeoLocationField({
  value,
  onLocated,
  disabled = false,
  idPrefix = "",
}: GeoLocationFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  /* دقة الموقع (متر) من آخر تحميل GPS ناجح — لعرضها طمأنةً للعميل */
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const load = () => {
    if (disabled) return;
    haptic("light");
    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setError("متصفحك لا يدعم تحديد الموقع — أدخل الإحداثيات يدوياً");
      setManualOpen(true);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        setAccuracy(
          pos.coords.accuracy != null && pos.coords.accuracy > 0
            ? pos.coords.accuracy
            : null,
        );
        onLocated({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        haptic("success");
      },
      (err) => {
        setLoading(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "صلاحية الموقع مرفوضة — فعّلها من إعدادات المتصفح أو أدخل الإحداثيات يدوياً"
            : "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع أو أدخل الإحداثيات يدوياً";
        setError(msg);
        setManualOpen(true);
        toast({
          title: "تعذّر جلب موقعك الحي",
          description: msg,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  /* ─── الإدخال اليدوي (احتياط) ─── */
  const manualLatNum = Number.parseFloat(manualLat);
  const manualLngNum = Number.parseFloat(manualLng);
  const latValid =
    Number.isFinite(manualLatNum) && manualLatNum >= -90 && manualLatNum <= 90;
  const lngValid =
    Number.isFinite(manualLngNum) && manualLngNum >= -180 && manualLngNum <= 180;
  const manualValid =
    manualLat.trim() !== "" && manualLng.trim() !== "" && latValid && lngValid;

  const submitManual = () => {
    if (!manualValid) return;
    onLocated({ lat: manualLatNum, lng: manualLngNum });
    setAccuracy(null);
    setError(null);
    setManualOpen(false);
    haptic("success");
  };

  const latId = `${idPrefix}manual-lat`;
  const lngId = `${idPrefix}manual-lng`;

  return (
    <div className="space-y-2">
      {/* الحالة: محمّل */}
      {value && !loading ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-foreground">
              تم تحميل موقعك بنجاح
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {accuracy
                ? `دقة التقدير ~${Math.round(accuracy)} متر — وصل المندوب إلى هذه النقطة`
                : "سيصل المندوب إلى هذه النقطة حصراً"}
            </p>
            <p
              className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/80"
              dir="ltr"
            >
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            disabled={disabled}
            className="h-10 gap-1.5 rounded-xl native-tap"
            aria-label="تحديث موقعي الحالي"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            تحديث
          </Button>
        </div>
      ) : loading ? (
        /* الحالة: جارٍ التحميل */
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4"
        >
          <Loader2
            className="h-6 w-6 shrink-0 animate-spin text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold text-foreground">
              جارٍ تحديد موقعك الحالي…
            </p>
            <p className="text-[11px] text-muted-foreground">
              اسمح للمتصفح بالوصول لموقعك إذا طلب منك
            </p>
          </div>
        </div>
      ) : (
        /* الحالة: البداية — الزر الكبير */
        <Button
          type="button"
          size="lg"
          onClick={load}
          disabled={disabled}
          className="h-14 w-full gap-3 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
          aria-label="تحميل موقعي الحالي لتحديد نقطة التوصيل"
        >
          <Crosshair className="h-6 w-6 shrink-0" aria-hidden="true" />
          تحميل موقعي
        </Button>
      )}

      {/* الخطأ + الاحتياط اليدوي */}
      {error && !value && !loading && (
        <p role="alert" className="text-[11px] leading-relaxed text-destructive">
          {error}
        </p>
      )}

      {manualOpen && !value && (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-xs font-bold text-muted-foreground native-tap"
            aria-expanded={manualOpen}
            aria-controls={`${idPrefix}manual-fields`}
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              إدخال الإحداثيات يدوياً (احتياط)
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                manualOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
          <div id={`${idPrefix}manual-fields`} className="mt-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={latId} className="text-[11px]">
                  خط العرض
                </Label>
                <Input
                  id={latId}
                  dir="ltr"
                  inputMode="decimal"
                  placeholder="15.3547"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  aria-invalid={manualLat !== "" && !latValid}
                  className="h-11 rounded-xl text-center tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={lngId} className="text-[11px]">
                  خط الطول
                </Label>
                <Input
                  id={lngId}
                  dir="ltr"
                  inputMode="decimal"
                  placeholder="44.2066"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  aria-invalid={manualLng !== "" && !lngValid}
                  className="h-11 rounded-xl text-center tabular-nums"
                />
              </div>
            </div>
            {(manualLat !== "" && !latValid) ||
            (manualLng !== "" && !lngValid) ? (
              <p role="alert" className="text-[11px] text-destructive">
                خط العرض بين ‎-90 و 90 · خط الطول بين ‎-180 و 180
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={submitManual}
              disabled={!manualValid}
              className="h-11 w-full gap-2 rounded-xl font-bold native-tap"
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              تثبيت الإحداثيات
            </Button>
          </div>
        </div>
      )}

      {/* تلميح الحالة الابتدائية */}
      {!value && !loading && !error && (
        <p
          role="note"
          className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          اضغط الزر وانتظر ثوانٍ — حمّل موقعك وأنت عند باب الاستلام ليصل
          المندوب إلى نقاطك بدقة
        </p>
      )}
    </div>
  );
}
