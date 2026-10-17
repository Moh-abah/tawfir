"use client";

/**
 * StoreLocationPicker — محدد موقع المتجر بخيارين (توفير — 2-a)
 * ═══════════════════════════════════════════════════════════════════
 * بطاقتا اختيار كبيرتان (شكل radiogroup بصري):
 *
 *  أ) «أنا داخل المتجر الآن» — زر «تحميل موقعي الحالي» (Crosshair):
 *     نفس منطق GeoLocationField — داخل الـAPK عبر getNativeLocationPosition
 *     (نافذة السماح الأصلية + معالجة NativeLocationError + زر فتح
 *     الإعدادات عند الرفض النهائي)، وعلى الويب navigator.geolocation.
 *     النجاح → onChange({ source: "gps", lat, lng, accuracy }).
 *
 *  ب) «أنا بعيد عن المتجر» — زر «حدد الموقع من الخريطة» (MapPin):
 *     يفتح تطبيق خرائط الجهاز (Apple Maps على iOS عبر
 *     isAppleMapsPlatform — وGoogle Maps على غيره) عند مركز المدينة.
 *     خطوات المستخدم: ١- افتح الخريطة ٢- اضغط مطولاً على موقع متجرك
 *     ٣- انسخ الإحداثيات ٤- ارجع هنا والصقها — زر «الصق من الخريطة»
 *     يقرأ الحافظة ويستخرج أول إحداثيين عشريين (lat,lng)، مع حقلي
 *     إدخال دقيق وزر «تأكيد الموقع». داخل الـAPK: زر إضافي «افتح
 *     الخريطة والتقط الموقع» يفتح الخريطة ثم يقرأ الحافظة تلقائياً
 *     عند عودة المستخدم (visibilitychange).
 *     (التسليم التلقائي الكامل عبر deep link يتطلب App Links + خريطة
 *     داخلية — موثّق كمقترح في تقرير الباك اند.)
 *
 * • وضع التأكيد: بطاقة زمردية بالإحداثيات والمصدر والدقة + زر إعادة
 *   التحديد + رابط «عرض على الخريطة» (externalMapViewUrl) للتحقق البصري.
 * • مسودة الإحداثيات تُحفظ في sessionStorage عند فتح الخريطة كي تُستعاد
 *   إن أُغلق التطبيق أثناء تحديد الموقع (ترتبط بمسار العودة mapReturnPath).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Crosshair,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  RotateCcw,
  Settings,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { isNativePlatform } from "@/lib/capacitor";
import {
  externalMapViewUrl,
  isAppleMapsPlatform,
} from "@/lib/external-maps";
import {
  getNativeLocationPosition,
  NativeLocationError,
  openNativeAppSettings,
} from "@/lib/native-permissions";

/* ─── الأنواع العامة ───────────────────────────────────────────── */

export interface StoreLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  source: "gps" | "map";
  /** وصف/عنوان مختار من الخريطة إن توفر */
  label?: string;
}

export interface StoreLocationPickerProps {
  value: StoreLocation | null;
  onChange: (loc: StoreLocation | null) => void;
  disabled?: boolean;
  /** مسار العودة بعد اختيار الموقع من الخريطة (افتراضي /owner/register) */
  mapReturnPath?: string;
  /** بادئة معرفات الحقول — تفادي تصادم DOM عند تعدد النماذج */
  idPrefix?: string;
}

/* ─── ثوابت وأدوات ─────────────────────────────────────────────── */

/** مفتاح مسودة الإحداثيات في sessionStorage (تُستعاد إن أُغلق التطبيق) */
const DRAFT_KEY = "tawfir_store_location_draft";
const DRAFT_TTL_MS = 30 * 60 * 1000;

/** أول إحداثيين عشريين في نص (لصق من الخرائط): "15.3694, 44.1910" */
const COORDS_RE = /-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+/;

/**
 * استخراج الإحداثيات من رابط خرائط قوقل (طلب المالك: لصق الرابط يستخرج
 * الموقع كاملاً) — تغطي كل الصيغ الشائعة:
 *   1) !3dLAT!4dLNG — روابط place/المشاركة
 *   2) @LAT,LNG — روابط /maps/@ (الأكثر شيوعاً)
 *   3) ?q=/query=/destination=/center=/ll=  (بفواصل عادية أو %2C)
 *   4) نص إحداثيات خام "15.3694, 44.1910" (السلوك القديم)
 */
function extractCoordsFromMapLink(
  text: string,
): { lat: number; lng: number } | null {
  const t = text.trim();
  if (!t) return null;
  const m34 = t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (m34) {
    const lat = Number.parseFloat(m34[1]);
    const lng = Number.parseFloat(m34[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const mAt = t.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (mAt) {
    const lat = Number.parseFloat(mAt[1]);
    const lng = Number.parseFloat(mAt[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const mQ = t.match(
    /[?&](?:q|query|destination|center|ll|mlat|mlng)=(-?\d{1,2}\.\d+)(?:%2C|,|\s)+(-?\d{1,3}\.\d+)/i,
  );
  if (mQ) {
    const lat = Number.parseFloat(mQ[1]);
    const lng = Number.parseFloat(mQ[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return extractCoords(t);
}

/** هل النص يشبه رابط خرائط (مطلوب لحل المختصرة maps.app.goo.gl) */
function looksLikeMapUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

/** رابط Google الثابت — للرسم الخادمي (بلا navigator) */
function googleViewFallback(lat: number, lng: number, label?: string): string {
  const query = label ? `${encodeURIComponent(label)}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function extractCoords(text: string): { lat: number; lng: number } | null {
  const m = text.match(COORDS_RE);
  if (!m) return null;
  const [latPart, lngPart] = m[0].split(",");
  const lat = Number.parseFloat(latPart.trim());
  const lng = Number.parseFloat(lngPart.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** تحقق عام من نطاقات الإحداثيات — يُرجع رسالة عربية أو null */
function validateCoords(lat: number, lng: number): string | null {
  if (lat < -90 || lat > 90) return "خط العرض يجب أن يكون بين 90- و90 درجة";
  if (lng < -180 || lng > 180) return "خط الطول يجب أن يكون بين 180- و180 درجة";
  return null;
}

/** حالة الوضع: اختيار الطريقة · مسار GPS · مسار الخريطة · تم */
type PickerMode = "choose" | "gps" | "map" | "done";

/* ─── المكوّن ───────────────────────────────────────────────────── */

export function StoreLocationPicker({
  value,
  onChange,
  disabled = false,
  mapReturnPath = "/owner/register",
  idPrefix = "store-loc",
}: StoreLocationPickerProps) {
  const [mode, setMode] = useState<PickerMode>(() => (value ? "done" : "choose"));
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  /* رفض نهائي داخل الـAPK — زر فتح إعدادات التطبيق للتعافي */
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  /* رابط خرائط قوقل (طلب المالك): لصق الرابط → استخراج الموقع كاملاً */
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  /* جارٍ جلب الموقع الحالي قبل فتح الخريطة (طلب المالك: افتحها على موقعي) */
  const [mapOpening, setMapOpening] = useState(false);
  /* منع النوافذ المنبثقة (انتهت تفعيلة النقر أثناء انتظار GPS) —
     نعرض الرابط في بطاقة قابلة للنقر داخل المكوّن بدل الصمت */
  const [mapFallbackUrl, setMapFallbackUrl] = useState<string | null>(null);

  /* التقاط الحافظة عند العودة من الخريطة (APK) */
  const captureArmedRef = useRef(false);
  const captureCleanupRef = useRef<(() => void) | null>(null);

  /* كاشف التركيب (SSR-safe) — لاكتشاف منصة الخرائط بعد التركيب */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* مزامنة الوضع مع القيمة الخارجية (تعيين/إعادة تعيين من النموذج) —
     نمط «ضبط الحالة عند تغيّر الخاصية» الرسمي (بلا effects) */
  if (value == null) {
    if (mode === "done") setMode("choose");
  } else if (mode === "choose") {
    setMode("done");
  }

  /* استعادة مسودة الإحداثيات إن عاد المستخدم بعد إغلاق التطبيق */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { openedAt?: number; lat?: string; lng?: string };
      if (!draft.openedAt || Date.now() - draft.openedAt > DRAFT_TTL_MS) return;
      if (draft.lat && draft.lng) {
        /* requestAnimationFrame: يفكّ التزامن setState-in-effect (خطأ
           react-hooks/set-state-in-effect) — بلا أي تغيير سلوك */
        const raf = requestAnimationFrame(() => {
          setLatInput(draft.lat!);
          setLngInput(draft.lng!);
        });
        return () => cancelAnimationFrame(raf);
      }
    } catch {
      /* مسودة غير صالحة — تجاهل صامت */
    }
  }, []);

  /* تنظيف مستمعي الالتقاط عند الفك */
  useEffect(() => () => captureCleanupRef.current?.(), []);

  const saveDraft = () => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          path: mapReturnPath,
          openedAt: Date.now(),
          lat: latInput,
          lng: lngInput,
        }),
      );
    } catch {
      /* التخزين غير متاح — صامت */
    }
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* صامت */
    }
  };

  /* ─── المسار أ: GPS ─────────────────────────────────────────── */

  const startGps = () => {
    if (disabled) return;
    haptic("light");
    setGpsError(null);
    setShowSettingsBtn(false);

    /* APK (Capacitor): الإضافة الأصلية — نافذة السماح الحقيقية */
    if (isNativePlatform()) {
      setGpsLoading(true);
      void (async () => {
        try {
          const pos = await getNativeLocationPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
          if (!pos) {
            /* الإضافة غير متاحة (APK قديم) */
            throw new NativeLocationError(
              "unavailable",
              "تعذّر تحديد موقعك الآن — حدّث التطبيق ثم أعد المحاولة",
            );
          }
          setGpsLoading(false);
          haptic("success");
          onChange({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, source: "gps" });
          setMode("done");
        } catch (err) {
          setGpsLoading(false);
          const msg =
            err instanceof NativeLocationError
              ? err.message
              : "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع (GPS) ثم أعد المحاولة";
          setShowSettingsBtn(
            err instanceof NativeLocationError && err.code === "permission-denied",
          );
          setGpsError(msg);
          toast({ title: "تعذّر جلب موقع متجرك", description: msg, variant: "destructive" });
        }
      })();
      return;
    }

    /* الويب/PWA */
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("متصفحك لا يدعم تحديد الموقع — استخدم خيار «حدد الموقع من الخريطة»");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        haptic("success");
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy:
            pos.coords.accuracy != null && pos.coords.accuracy > 0
              ? pos.coords.accuracy
              : null,
          source: "gps",
        });
        setMode("done");
      },
      (err) => {
        setGpsLoading(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "صلاحية الموقع مرفوضة — فعّلها من إعدادات جهازك ثم أعد المحاولة"
            : "تعذّر تحديد موقعك الآن — تأكد من تشغيل خدمة الموقع (GPS) ثم أعد المحاولة";
        setGpsError(msg);
        toast({ title: "تعذّر جلب موقع متجرك", description: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

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

  /* ─── المسار ب: الخريطة الخارجية ────────────────────────────── */

  const armReturnCapture = () => {
    captureArmedRef.current = true;
    let wasHidden = false;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        return;
      }
      if (document.visibilityState !== "visible" || !wasHidden) return;
      if (!captureArmedRef.current) return;
      captureArmedRef.current = false;
      cleanup();
      /* مهلة قصيرة بعد العودة قبل محاولة قراءة الحافظة */
      window.setTimeout(() => void pasteFromClipboard(true), 600);
    };
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      captureCleanupRef.current = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    captureCleanupRef.current = cleanup;
  };

  /** فتح تطبيق الخرائط — على موقع المستخدم الحالي لا على مركز ثابت (شكوى
   * المالك: «يوجهني دائماً إلى صنعاء ومفروض أن يفتح موقعي الحالي»):
   * نجاح الموقع → مركز الخريطة عنده · فشله/رفضه → الخريطة العامة
   * (تفتح على الأجهزة قرب آخر موقع معروف للمستخدم) مع إرشاد واضح. */
  const openExternalMap = (withCapture: boolean) => {
    if (disabled || mapOpening) return;
    haptic("light");
    saveDraft();
    if (withCapture) armReturnCapture();
    setMapOpening(true);
    setMapFallbackUrl(null);
    void (async () => {
      const here = await getCurrentPositionLoose();
      setMapOpening(false);
      const url = here
        ? externalMapViewUrl(here)
        : isAppleMapsPlatform()
          ? "https://maps.apple.com/"
          : "https://www.google.com/maps/";
      let opened: Window | null = null;
      try {
        opened = window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        opened = null;
      }
      if (!opened) {
        /* المتصفح منع النافذة (انتهت تفعيلة النقر أثناء انتظار الموقع) —
           بطاقة رابط مباشرة داخل المكوّن بدل فشل صامت */
        setMapFallbackUrl(url);
        toast({
          title: "منع المتصفح فتح الخريطة تلقائياً",
          description: "اضغط الرابط الظاهر بالأسفل لفتح الخريطة",
          variant: "destructive",
        });
        return;
      }
      toast(
        here
          ? {
              title: "فتحنا الخريطة على موقعك الحالي",
              description:
                "اضغط مطولاً على موقع متجرك، انسخ الإحداثيات ثم عد هنا والصقها",
            }
          : {
              title: "لم نستطع تحديد موقعك الحالي",
              description:
                "فتحنا الخريطة العامة — ابحث عن منطقة متجرك، اضغط مطولاً على موقعه وانسخ الإحداثيات",
            },
      );
    })();
  };

  /** جلب موضع تقريبي متسامح لتمركز الخريطة (بلا دقة عالية — مهلة قصيرة
   * وكاش 5 دقائق يكفيان للتمركز) — يُرجع null عند أي فشل بدل الاستثناء */
  function getCurrentPositionLoose(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      /* APK (Capacitor): الإضافة الأصلية بلا نافذة دقة عالية */
      if (isNativePlatform()) {
        void (async () => {
          try {
            const pos = await getNativeLocationPosition({
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 300000,
            });
            resolve(pos ? { lat: pos.lat, lng: pos.lng } : null);
          } catch {
            resolve(null);
          }
        })();
        return;
      }
      /* الويب/PWA */
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    });
  }

  /** تطبيق إحداثيات مستخرجة: تحقق ثم تعبئة الحقول مع توست نجاح */
  const applyParsedCoords = (parsed: { lat: number; lng: number }): boolean => {
    const err = validateCoords(parsed.lat, parsed.lng);
    if (err) {
      setCoordError(err);
      toast({ title: "إحداثيات غير صالحة", description: err, variant: "destructive" });
      return false;
    }
    setCoordError(null);
    setLatInput(String(parsed.lat));
    setLngInput(String(parsed.lng));
    haptic("tick");
    toast({
      title: "تم استخراج موقع متجرك",
      description: "راجعه ثم اضغط «تأكيد الموقع»",
    });
    return true;
  };

  /** حل رابط مختصر (maps.app.goo.gl) خادمياً — يُعيد الرابط النهائي مع الإحداثيات/الاسم إن استُخرجت */
  const resolveShortLink = async (
    url: string,
  ): Promise<{ finalUrl: string; lat?: number; lng?: number; name?: string | null } | null> => {
    try {
      const res = await fetch("/api/utils/resolve-map-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        finalUrl?: string;
        lat?: number;
        lng?: number;
        name?: string | null;
      };
      if (!data.finalUrl) return null;
      return { finalUrl: data.finalUrl, lat: data.lat, lng: data.lng, name: data.name };
    } catch {
      return null;
    }
  };

  /** استخراج الموقع من حقل الرابط (يتابع الروابط المختصرة تلقائياً) */
  const extractFromLink = async () => {
    if (disabled || linkBusy) return;
    const text = linkInput.trim();
    if (!text) {
      setCoordError("الصق رابط موقعك من خرائط قوقل أولاً");
      return;
    }
    setLinkBusy(true);
    try {
      let candidate = text;
      let parsed = extractCoordsFromMapLink(candidate);
      let resolvedName: string | null = null;
      if (!parsed && looksLikeMapUrl(candidate)) {
        const resolved = await resolveShortLink(candidate);
        if (resolved) {
          candidate = resolved.finalUrl;
          parsed = extractCoordsFromMapLink(candidate);
          /* الخادم استخرج الإحداثيات بنفسه (Plus Code) — نستخدمها مباشرة */
          if (!parsed && resolved.lat !== undefined && resolved.lng !== undefined) {
            parsed = { lat: resolved.lat, lng: resolved.lng };
            resolvedName = resolved.name ?? null;
          } else if (parsed) {
            resolvedName = resolved.name ?? null;
          }
        }
      }
      if (!parsed) {
        setCoordError(
          "لم أجد موقعاً في الرابط — تأكد أن الرابط من خرائط قوقل ويشير إلى متجرك",
        );
        toast({
          title: "لم أجد الإحداثيات في الرابط",
          description:
            "افتح الرابط في خرائط قوقل ثم شاركه مجدداً (شارك ← نسخ الرابط) وحاول مرة أخرى",
          variant: "destructive",
        });
        return;
      }
      applyParsedCoords(parsed);
      if (resolvedName) {
        toast({
          title: "تم استخراج موقع متجرك",
          description: resolvedName,
        });
      }
    } finally {
      setLinkBusy(false);
    }
  };

  /** قراءة الحافظة واستخراج الإحداثيات/الرابط (يدوياً أو تلقائياً بعد العودة) */
  const pasteFromClipboard = async (auto: boolean) => {
    if (disabled) return;
    let text: string | null = null;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = null;
    }
    if (!text) {
      toast({
        title: auto ? "عدت من الخريطة" : "تعذّر قراءة الحافظة",
        description:
          "انسخ الإحداثيات من تطبيق الخرائط (ضغطة مطولة على الموقع) ثم اضغط «الصق من الخريطة»",
        variant: auto ? "default" : "destructive",
      });
      return;
    }
    const parsed = extractCoordsFromMapLink(text);
    if (!parsed) {
      /* الرابط المختصر بلا إحداثيات → حله خادمياً (قد يستخرجها من Plus Code) ثم حاول مرة أخرى */
      if (looksLikeMapUrl(text)) {
        const resolved = await resolveShortLink(text);
        const reparsed = resolved
          ? extractCoordsFromMapLink(resolved.finalUrl) ??
            (resolved.lat !== undefined && resolved.lng !== undefined
              ? { lat: resolved.lat, lng: resolved.lng }
              : null)
          : null;
        if (reparsed && applyParsedCoords(reparsed)) {
          if (resolved?.name) {
            toast({ title: "تم استخراج موقع متجرك", description: resolved.name });
          }
          return;
        }
      }
      setCoordError(
        "لم أجد إحداثيات في الحافظة — الصق رابط الموقع من خرائط قوقل أو الإحداثيات بصيغة 15.3694, 44.1910",
      );
      toast({
        title: "لم أجد إحداثيات في الحافظة",
        description:
          "في خرائط قوقل: شارك ← نسخ الرابط، أو اضغط مطولاً على الموقع وانسخ الإحداثيات",
        variant: "destructive",
      });
      return;
    }
    applyParsedCoords(parsed);
  };

  const confirmCoords = () => {
    if (disabled) return;
    const latRaw = latInput.trim();
    const lngRaw = lngInput.trim();
    if (!latRaw || !lngRaw) {
      setCoordError("أدخل خط العرض وخط الطول — أو الصقهما من الخريطة");
      return;
    }
    const lat = Number.parseFloat(latRaw);
    const lng = Number.parseFloat(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCoordError("الإحداثيات يجب أن تكون أرقاماً عشرية — مثل 15.3694 و44.1910");
      return;
    }
    const err = validateCoords(lat, lng);
    if (err) {
      setCoordError(err);
      return;
    }
    setCoordError(null);
    haptic("success");
    onChange({ lat, lng, accuracy: null, source: "map" });
    setMode("done");
    clearDraft();
    toast({
      title: "تم تحديد موقع متجرك",
      description: "تأكد بصرياً عبر زر «عرض على الخريطة»",
    });
  };

  const resetSelection = () => {
    if (disabled) return;
    haptic("light");
    onChange(null);
    setMode("choose");
    setCoordError(null);
  };

  /* تلميح معكوسية الإحداثيات (خط العرض في اليمن 12-19 والطول 42-54) */
  const latNum = Number.parseFloat(latInput);
  const lngNum = Number.parseFloat(lngInput);
  const swappedHint =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= 20 &&
    latNum <= 60 &&
    lngNum >= 12 &&
    lngNum <= 19
      ? "يبدو أن الإحداثيات معكوسة — خط العرض في اليمن بين 12 و19 وخط الطول بين 42 و54"
      : null;

  /* رابط المعاينة: قبل التركيب Google (مطابق للـSSR) · بعده منصة الجهاز.
     بلا تسمية — الدبوس الحرفي عند الإحداثيات؛ التسمية النصية مثل
     «موقع متجرك» تجعل قوقل يبحث عن الكلمات نفسها بدل إظهار النقطة */
  const viewUrl = value
    ? mounted
      ? externalMapViewUrl({ lat: value.lat, lng: value.lng })
      : googleViewFallback(value.lat, value.lng)
    : "";

  /* زر الرجوع لاختيار طريقة أخرى */
  const BackToChoose = (
    <button
      type="button"
      onClick={() => setMode("choose")}
      disabled={disabled}
      className="native-tap inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      aria-label="الرجوع لخيارات تحديد الموقع"
    >
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
      تغيير الطريقة
    </button>
  );

  return (
    <div className="space-y-3">
      {mode === "done" && value ? (
        /* ─── وضع التأكيد: بطاقة زمردية ─── */
        <div
          role="status"
          className="space-y-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-foreground">
                تم تحديد موقع متجرك
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {value.source === "gps"
                  ? value.accuracy
                    ? `موقع مباشر عبر GPS — دقة التقدير ~${Math.round(value.accuracy)} متر`
                    : "موقع مباشر عبر GPS"
                  : "موقع محدد من الخريطة"}
              </p>
              <p
                dir="ltr"
                className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/80"
              >
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetSelection}
              disabled={disabled}
              className="h-11 min-h-[44px] gap-1.5 rounded-xl font-bold native-tap"
              aria-label="تحديث موقع المتجر أو إعادة التحديد"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              تحديث / إعادة التحديد
            </Button>
            <Button
              asChild
              type="button"
              variant="secondary"
              size="sm"
              className="h-11 min-h-[44px] gap-1.5 rounded-xl font-bold native-tap"
            >
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="عرض موقع متجرك على الخريطة للتأكد بصرياً"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                عرض على الخريطة
              </a>
            </Button>
          </div>
        </div>
      ) : mode === "gps" ? (
        /* ─── مسار GPS: التحميل والأخطاء والتعافي ─── */
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Crosshair className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="truncate text-sm font-black text-foreground">
                أنا داخل المتجر الآن
              </p>
            </div>
            {BackToChoose}
          </div>

          {gpsLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4"
            >
              <Loader2
                className="h-6 w-6 shrink-0 animate-spin text-primary"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-bold text-foreground">
                  جارٍ تحديد موقع متجرك…
                </p>
                <p className="text-[11px] text-muted-foreground">
                  اسمح للتطبيق بالوصول لموقعك إذا طلب منك
                </p>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={startGps}
              disabled={disabled}
              className="h-14 w-full gap-3 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
              aria-label="تحميل موقعي الحالي لتحديد موقع المتجر عبر GPS"
            >
              <Crosshair className="h-6 w-6 shrink-0" aria-hidden="true" />
              تحميل موقعي الحالي
            </Button>
          )}

          {gpsError && !gpsLoading && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-3.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <ShieldQuestion className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-bold leading-relaxed text-destructive">
                  {gpsError}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startGps}
                    disabled={disabled}
                    className="h-10 gap-2 rounded-xl border-destructive/40 font-bold native-tap"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    إعادة المحاولة
                  </Button>
                  {showSettingsBtn && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleOpenSettings()}
                      disabled={disabled}
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

          {!gpsError && !gpsLoading && (
            <p
              role="note"
              className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
            >
              <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              كن داخل المتجر عند الضغط — هكذا تصل الطلبات والمندوبون إلى
              باب متجرك بدقة
            </p>
          )}
        </div>
      ) : mode === "map" ? (
        /* ─── مسار الخريطة: الخطوات + فتح الخريطة + الإدخال ─── */
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="truncate text-sm font-black text-foreground">
                أنا بعيد عن المتجر — من الخريطة
              </p>
            </div>
            {BackToChoose}
          </div>

          {/* الخطوات الأربع */}
          <ol className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
            <li>١- افتح تطبيق الخرائط (زر «افتح الخريطة» أدناه)</li>
            <li>٢- اضغط مطولاً على موقع متجرك حتى تظهر الإحداثيات</li>
            <li>٣- انسخ الإحداثيات من الخريطة</li>
            <li>٤- ارجع هنا والصقها بضغطة واحدة</li>
          </ol>

          {/* أزرار فتح الخريطة — تنتظر أولاً جلب الموقع الحالي (طلب المالك:
              افتح الخريطة على موقعي لا على مركز ثابت) */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openExternalMap(false)}
              disabled={disabled || mapOpening}
              className="h-12 min-h-[44px] gap-2 rounded-xl font-bold native-tap"
              aria-label="فتح تطبيق الخرائط على موقعك الحالي لتحديد موقع المتجر"
            >
              {mapOpening ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
              )}
              {mapOpening ? "جارٍ تحديد موقعك…" : "افتح الخريطة"}
            </Button>
            {isNativePlatform() && (
              <Button
                type="button"
                onClick={() => openExternalMap(true)}
                disabled={disabled || mapOpening}
                className="h-12 min-h-[44px] gap-2 rounded-xl font-bold native-tap"
                aria-label="فتح تطبيق الخرائط على موقعك الحالي والتقاط الموقع تلقائياً عند العودة"
              >
                {mapOpening ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                )}
                افتح الخريطة والتقط الموقع
              </Button>
            )}
          </div>

          {/* منع النوافذ المنبثقة — رابط مباشر قابل للنقر (بديل الفشل الصامت) */}
          {mapFallbackUrl && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                منع المتصفح فتح الخريطة تلقائياً — اضغط الزر لفتحها يدوياً:
              </p>
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="h-11 gap-2 rounded-xl border-amber-500/50 font-bold"
              >
                <a
                  href={mapFallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  افتح الخريطة الآن
                </a>
              </Button>
            </div>
          )}

          {/* ─── لصق رابط خرائط قوقل مباشرة (طلب المالك) ───
              افتح خرائط قوقل ← ابحث عن متجرك ← شارك ← نسخ الرابط —
              ثم الصقه هنا ونستخرج الموقع كاملاً (يتابع الروابط
              المختصرة maps.app.goo.gl تلقائياً خادمياً) */}
          <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
            <Label
              htmlFor={`${idPrefix}-maplink`}
              className="flex items-center gap-1.5 text-xs font-bold text-foreground"
            >
              <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
              أو الصق رابط موقعك من خرائط قوقل
            </Label>
            <div className="flex gap-2">
              <Input
                id={`${idPrefix}-maplink`}
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setCoordError(null);
                }}
                disabled={disabled || linkBusy}
                type="url"
                dir="ltr"
                inputMode="url"
                autoComplete="off"
                placeholder="https://maps.app.goo.gl/…"
                className="h-11 min-w-0 flex-1 rounded-xl text-[13px]"
                aria-describedby={coordError ? `${idPrefix}-coord-error` : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void extractFromLink();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void extractFromLink()}
                disabled={disabled || linkBusy || !linkInput.trim()}
                className="h-11 shrink-0 gap-1.5 rounded-xl px-4 font-bold native-tap"
                aria-label="استخراج الموقع من الرابط"
              >
                {linkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                )}
                استخراج
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              خرائط قوقل ← ابحث عن متجرك ← <span className="font-bold">شارك</span> ←
              نسخ الرابط — والصقه هنا وسنستخرج الموقع تلقائياً
            </p>
          </div>

          {/* إدخال الإحداثيات الدقيق */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={`${idPrefix}-lat`}
                  className="text-xs font-bold text-muted-foreground"
                >
                  خط العرض (Lat)
                </Label>
                <Input
                  id={`${idPrefix}-lat`}
                  value={latInput}
                  onChange={(e) => {
                    setLatInput(e.target.value);
                    setCoordError(null);
                  }}
                  disabled={disabled}
                  type="text"
                  dir="ltr"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="15.3694"
                  aria-describedby={coordError ? `${idPrefix}-coord-error` : undefined}
                  className="h-11 min-h-[44px] native-tap rounded-xl text-center text-sm tabular-nums"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={`${idPrefix}-lng`}
                  className="text-xs font-bold text-muted-foreground"
                >
                  خط الطول (Lng)
                </Label>
                <Input
                  id={`${idPrefix}-lng`}
                  value={lngInput}
                  onChange={(e) => {
                    setLngInput(e.target.value);
                    setCoordError(null);
                  }}
                  disabled={disabled}
                  type="text"
                  dir="ltr"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="44.1910"
                  aria-describedby={coordError ? `${idPrefix}-coord-error` : undefined}
                  className="h-11 min-h-[44px] native-tap rounded-xl text-center text-sm tabular-nums"
                />
              </div>
            </div>

            {swappedHint && (
              <p
                role="note"
                className="text-[11px] font-medium leading-relaxed text-amber-600 dark:text-amber-400"
              >
                {swappedHint}
              </p>
            )}
            {coordError && (
              <p
                id={`${idPrefix}-coord-error`}
                role="alert"
                className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-destructive"
              >
                <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {coordError}
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void pasteFromClipboard(false)}
                disabled={disabled}
                className="h-12 min-h-[44px] gap-2 rounded-xl font-bold native-tap"
                aria-label="لصق الإحداثيات من الحافظة"
              >
                <ClipboardPaste className="h-5 w-5" aria-hidden="true" />
                الصق من الخريطة
              </Button>
              <Button
                type="button"
                onClick={confirmCoords}
                disabled={disabled}
                className="h-12 min-h-[44px] gap-2 rounded-xl font-black native-tap"
                aria-label="تأكيد موقع المتجر من الإحداثيات المدخلة"
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                تأكيد الموقع
              </Button>
            </div>
          </div>

          <p
            role="note"
            className="text-[10px] leading-relaxed text-muted-foreground"
          >
            نحفظ مسودة إحداثياتك مؤقتاً — إن أُغلق التطبيق أثناء الخريطة
            ستعود إلى {mapReturnPath} وتجدها هنا محفوظة. التسليم التلقائي
            عبر deep link يتطلب تكامل App Links (مقترح موثّق لتقرير الباك اند).
          </p>
        </div>
      ) : (
        /* ─── الوضع الابتدائي: بطاقتا الاختيار ─── */
        <div
          role="group"
          aria-label="طريقة تحديد موقع المتجر"
          className="grid gap-3 sm:grid-cols-2"
        >
          {/* البطاقة أ: GPS */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMode("gps");
              startGps();
            }}
            className="native-tap-card group flex flex-col rounded-2xl border-2 border-border bg-card p-4 text-right transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="أنا داخل المتجر الآن — تحديد الموقع عبر GPS"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Crosshair className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-black text-foreground">
                أنا داخل المتجر الآن
              </span>
            </span>
            <span className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              حدّد موقع متجرك تلقائياً عبر GPS وأنت بداخله — الأدق والأسرع
            </span>
            <span className="mt-3 inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-xs transition-colors group-hover:bg-primary/90">
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              تحميل موقعي الحالي
            </span>
          </button>

          {/* البطاقة ب: الخريطة الخارجية */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMode("map");
              openExternalMap(false);
            }}
            className="native-tap-card group flex flex-col rounded-2xl border-2 border-border bg-card p-4 text-right transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="أنا بعيد عن المتجر — تحديد الموقع من تطبيق الخرائط"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-black text-foreground">
                أنا بعيد عن المتجر
              </span>
            </span>
            <span className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              نفتح لك تطبيق الخرائط على موقعك الحالي — اضغط مطولاً على
              موقع متجرك، انسخ الإحداثيات ثم ألصقها هنا (أو الصق رابط
              متجرك من قوقل ماب مباشرة)
            </span>
            <span className="mt-3 inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-xs transition-colors group-hover:bg-primary/90">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              حدد الموقع من الخريطة
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
