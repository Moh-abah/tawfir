"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * مؤشر حالة الاتصال — الجولة 21 (webDevReview):
 * نقطة خضراء نابضة عند الاتصال، نقطة حمراء عند الانقطاع.
 * تُظهر التطبيق يهتم بحالة الشبكة (إحساس Native وليس ويب).
 * يختفي بعد 3 ثوانٍ من عودة الاتصال (لا يزعج المستخدم).
 *
 * الموضع: يُركّب في الهيدر بجانب عناصر التحكم.
 */
export function NetworkStatusIndicator({
  className,
  compact = true,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [online, setOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      // أظهر "متصل" لمدة 3 ثوانٍ ثم اخفِ
      setShowOffline(false);
      const t = setTimeout(() => setShowOffline(false), 3000);
      return () => clearTimeout(t);
    };
    const onOffline = () => {
      setOnline(false);
      setShowOffline(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // إن بدأ offline (مثلاً APK أُطلق بلا اتصال)
    if (!navigator.onLine) setShowOffline(true);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // على الويب العادي + متصل: لا نعرض شيء (لتفادي الضوضاء البصرية)
  if (online && !showOffline) return null;

  if (!online) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive",
          className,
        )}
        role="status"
        aria-label="غير متصل"
      >
        <WifiOff className="h-3 w-3" aria-hidden="true" />
        {!compact && "غير متصل"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary",
        className,
      )}
      role="status"
      aria-label="متصل"
    >
      <Wifi className="h-3 w-3" aria-hidden="true" />
      {!compact && "متصل"}
    </span>
  );
}
