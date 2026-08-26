"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  skeletonClassName?: string;
  fallbackIcon?: boolean;
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
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    if (!fallbackIcon) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted/30",
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
    <div className={cn("relative overflow-hidden", className)}>
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
