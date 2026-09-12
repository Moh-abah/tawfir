"use client";

/**
 * OpenInMapsButton — زر النقل إلى تطبيق الخرائط الخارجي (توجيه المالك).
 * ═══════════════════════════════════════════════════════════════════
 * المنصة لا تعرض خريطة داخلية — هذا الزر يخرج بالمستخدم من التطبيق
 * إلى تطبيق الخرائط المناسب لجهازه (Apple Maps على iOS · Google Maps
 * على غيره) مع تمرير الإحداثيات والتسمية.
 *
 * • SSR-safe: أول رسم (خادم + أول رسم عميل) يُظهر رابط Google
 *   (الكوني)؛ بعد التركيب يُعاد الحساب لمنصة الجهاز الفعلية.
 * • يفتح في تبويب/تطبيق جديد — لا يُفقد المستخدم جلسته عندنا.
 */

import { useSyncExternalStore, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { externalMapUrl } from "@/lib/external-maps";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export interface OpenInMapsButtonProps {
  /** خط عرض نقطة الهدف */
  lat: number;
  /** خط طول نقطة الهدف */
  lng: number;
  /** تسمية تظهر في تطبيق الخرائط (اسم العميل/المتجر أو العنوان) */
  label?: string;
  /** view = معاينة الدبوس · navigate = بدء الملاحة (الافتراضي view) */
  mode?: "view" | "navigate";
  /** محتوى الزر (نص + أيقونات) — يُعرض كما هو */
  children: ReactNode;
  /** أصناف Tailwind إضافية لزر shadcn */
  className?: string;
  /** حجم الزر (الافتراضي lg — لمس مريح 44px+) */
  size?: "default" | "sm" | "lg";
  /** variant الزر (الافتراضي default أساسي primary) */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** عنوان ARIA وصفي للزر */
  ariaLabel?: string;
  /** تعطيل الزر */
  disabled?: boolean;
}

export function OpenInMapsButton({
  lat,
  lng,
  label,
  mode = "view",
  children,
  className,
  size = "lg",
  variant = "default",
  ariaLabel,
  disabled = false,
}: OpenInMapsButtonProps) {
  /* كاشف التركيب بلا setState داخل effect (نمط useSyncExternalStore
     القياسي — متطابق بين الخادم والعميل في أول رسم ثم يتحدث) */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* الرابط: قبل التركيب Google (كوني ومطابق للـ SSR) · بعده منصة الجهاز */
  const href = mounted
    ? externalMapUrl({ lat, lng, label }, mode)
    : externalMapViewFallback({ lat, lng, label });

  return (
    <Button
      asChild
      type="button"
      size={size}
      variant={variant}
      disabled={disabled}
      className={cn("native-tap", className)}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        onClick={() => haptic("light")}
      >
        {children}
        <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
      </a>
    </Button>
  );
}

/** رابط Google الثابت — للرسم الخادمي (بلا navigator) */
function externalMapViewFallback(t: { lat: number; lng: number; label?: string }) {
  const query = t.label ? `${encodeURIComponent(t.label)}` : `${t.lat},${t.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
