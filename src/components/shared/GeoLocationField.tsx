"use client";

/**
 * GeoLocationField — زر «تحميل موقعي» (بديل الخريطة المدمجة — توجيه المالك).
 * ═══════════════════════════════════════════════════════════════════
 * العميل عند الطلب لا يرى خريطة داخل المنصة — بل زراً واحداً كبيراً
 * يضغطه فيُحمّل بيانات موقعه الحي:
 *
 *   • داخل الـAPK (Capacitor): عبر @capacitor/geolocation الأصلية —
 *     نافذة السماح بالموقع تظهر فعلياً عند أول ضغط (إصلاح أذونات APK
 *     — داخل WebView كان الطلب يُرفض بلا أي نافذة)، وإن رُفض الإذن
 *     نهائياً نعرض زر «افتح إعدادات التطبيق» للتعافي.
 *   • على الويب/PWA: Geolocation API المعتاد.
 *
 *   • نجاح → بطاقة تأكيد زمردية: «تم تحميل موقعك» + دقة التقدير
 *     بالمتر + الإحداثيات صغيرة LTR + زر «تحديث الموقع».
 *   • فشل (رفض الإذن/شبكة) → بطاقة توجيه + إعادة المحاولة فقط
 *     (حُذف الإدخال اليدوي للإحداثيات بقرار المالك — الزر لا يعرض
 *     أي حقول إدخال يدوية).
 *
 * الإحداثيات إلزامية لعملية الطلب (عقد OrderCreate) — المستهلك
 * (DeliveryFields) يعطّل زر الإرسال حتى وجودها مع العنوان النصي.
 */

import { useState } from "react";
import {
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  RotateCcw,
  Settings,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { isNativePlatform } from "@/lib/capacitor";
import {
  getNativeLocationPosition,
  NativeLocationError,
  openNativeAppSettings,
} from "@/lib/native-permissions";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLocationFieldProps {
  /** النقطة الحالية (null = لم تُحمّل بعد) */
  value: GeoPoint | null;
  /** يُستدعى عند نجاح التحميل */
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
}: GeoLocationFieldProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* دقة الموقع (متر) من آخر تحميل GPS ناجح — لعرضها طمأنةً للعميل */
  const [accuracy, setAccuracy] = useState<number | null>(null);
  /* رفض نهائي داخل الـAPK — نعرض زر فتح إعدادات التطبيق للتعافي */
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);

  const load = () => {
    if (disabled) return;
    haptic("light");
    setError(null);
    setShowSettingsBtn(false);

    /* ─── مسار الـAPK الأصلي: الإضافة الأصلية (نافذة السماح الحقيقية) ─── */
    if (isNativePlatform()) {
      setLoading(true);
      void (async () => {
        try {
          const pos = await getNativeLocationPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
          if (!pos) {
            /* الإضافة غير متاحة (APK قديم) — سقط لمسار الويب أدناه */
            throw new NativeLocationError(
              "unavailable",
              "تعذّر تحديد موقعك الآن — حدّث التطبيق ثم أعد المحاولة",
            );
          }
          setLoading(false);
          setAccuracy(pos.accuracy);
          onLocated({ lat: pos.lat, lng: pos.lng });
          haptic("success");
        } catch (err) {
          setLoading(false);
          const msg =
            err instanceof NativeLocationError
              ? err.message
              : "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع (GPS) ثم أعد المحاولة";
          const isPermDenied =
            err instanceof NativeLocationError &&
            err.code === "permission-denied";
          setShowSettingsBtn(isPermDenied);
          setError(msg);
          toast({
            title: "تعذّر جلب موقعك الحي",
            description: msg,
            variant: "destructive",
          });
        }
      })();
      return;
    }

    /* ─── مسار الويب/PWA ─── */
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setError("متصفحك لا يدعم تحديد الموقع — جرّب متصفحاً آخر أو حدّث تطبيقك");
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
            ? "صلاحية الموقع مرفوضة — فعّلها من إعدادات جهازك ثم أعد المحاولة"
            : "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع (GPS) ثم أعد المحاولة";
        setError(msg);
        toast({
          title: "تعذّر جلب موقعك الحي",
          description: msg,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  /* زر التعافي: فتح إعدادات التطبيق لتفعيل الموقع يدوياً */
  const handleOpenSettings = async () => {
    haptic("light");
    const opened = await openNativeAppSettings();
    if (!opened) {
      toast({
        title: "تعذّر فتح الإعدادات",
        description: "فعّل صلاحية الموقع من إعدادات جهازك يدوياً",
        variant: "destructive",
      });
    }
  };

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
              اسمح للتطبيق بالوصول لموقعك إذا طلب منك
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

      {/* الخطأ + إعادة المحاولة (بلا أي إدخال يدوي) */}
      {error && !value && !loading && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <ShieldQuestion className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-bold leading-relaxed text-destructive">
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={load}
                disabled={disabled}
                className="h-10 gap-2 rounded-xl border-destructive/40 font-bold native-tap"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                إعادة المحاولة
              </Button>
              {/* داخل الـAPK فقط: فتح إعدادات التطبيق لتفعيل الصلاحية */}
              {showSettingsBtn && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="h-10 gap-2 rounded-xl font-bold native-tap"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  افتح إعدادات التطبيق
                </Button>
              )}
            </div>
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
