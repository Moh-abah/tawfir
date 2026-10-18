"use client";

import { useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * جولة 49 — مرور مباشر للروابط المطلقة (إصلاح انهيار الصفحة):
 * كان next/image يرمي «Invalid src prop» أثناء الرسم نفسه لأي مضيف
 * خارجي غير مُدرج في remotePatterns — قبل أن يصل وقت onError — فتنهار
 * الصفحة كلها (حدود الخطأ) بمجرد أن يلصق تاجر رابط صورة من أي مضيف
 * آخر (z-cdn، imgur، دروببوكس...). الآن: الروابط المطلقة تُمرَّر كما
 * هي بلا تحقق مضيف (لا تحسين عبر وسيط _next/image وهو الصحيح لها)،
 * والمسارات المحلية (/uploads/...) تحافظ على مسار التحسين الكامل.
 */
function passthroughLoader({ src }: ImageLoaderProps): string {
  return src;
}

const ABSOLUTE_URL_RE = /^https?:\/\//i;

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  skeletonClassName?: string;
  fallbackIcon?: boolean;
  /** الجولة 15 — تحميل فوري (LCP) للصور فوق الطية (أول بطاقة في كل شبكة) */
  priority?: boolean;
  /** الجولة 26 — أحجام srcset في وضع fill (مثل "(max-width: 640px) 100vw, 560px") */
  sizes?: string;
}

export function ImageWithSkeleton({
  src,
  alt,
  fill,
  width,
  height,
  className,
  skeletonClassName,
  fallbackIcon = true,
  priority = false,
  sizes,
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    if (!fallbackIcon) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted/30",
          /* الجولة 26 — في وضع fill يجب أن يمتلئ البديل أيضاً (نفس إصلاح الغلاف) */
          fill && "absolute inset-0",
          className
        )}
        role="img"
        aria-label={alt}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    /* الجولة 26 — إصلاح «fill بارتفاع 0»: في وضع fill كان الغلاف relative بارتفاع
       تلقائي (0) فتصبح الصورة المطلقة داخله غير مرئية (صور عروض المالك). الآن
       الغلاف نفسه يملأ الأب absolute inset-0 — لا يعتمد على className من المستدعي. */
    <div
      className={cn(
        fill ? "absolute inset-0 overflow-hidden" : "relative overflow-hidden",
        className
      )}
    >
      {!loaded && (
        <div
          className={cn(
            "absolute inset-0 skeleton-shimmer rounded-md",
            skeletonClassName
          )}
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        loading={priority ? "eager" : undefined}
        sizes={fill ? sizes : undefined}
        loader={ABSOLUTE_URL_RE.test(src) ? passthroughLoader : undefined}
        className={cn(
          "object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
