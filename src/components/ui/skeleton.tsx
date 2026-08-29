import { cn } from "@/lib/utils"

/**
 * هيكل تحميل — الجولة 17: ترقية عالمية إلى shimmer متدرّج بلمسة العلامة
 * (skeleton-branded في globals.css: تدرّج يمرّ فوق خلفية muted بلون
 * primary خفيف) بدل النبض الباهت — يُحسّن كل حالات التحميل في التطبيق.
 * يحترم prefers-reduced-motion (قاعدة animation:none موثّقة هناك).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-branded rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
