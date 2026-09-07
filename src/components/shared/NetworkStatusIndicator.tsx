"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * مؤشر حالة الاتصال — الجولة 21 (webDevReview) + إصلاح lint الجولة 22:
 * نقطة خضراء نابضة عند الاتصال، نقطة حمراء عند الانقطاع.
 * تُظهر التطبيق يهتم بحالة الشبكة (إحساس Native وليس ويب).
 * تختفي بعد 3 ثوانٍ من عودة الاتصال (لا يزعج المستخدم).
 *
 * إصلاح قاعدة react-hooks/set-state-in-effect (الجولة 22):
 * كان يُستدعى setOnline/setShowOffline مباشرة في جسم useEffect (ممنوع —
 * يسبب cascade renders). أُعيدت الهيكلة إلى النمط الموصى به:
 *  • setState داخل مستمعي الأحداث فقط (online/offline = نظام خارجي).
 *  • المزامنة الأولية (إن بدأ التطبيق offline) عبر queueMicrotask —
 *    callback وليست استدعاءً متزامناً في جسم التأثير.
 *  • حالة ثلاثية: idle (لا شيء) | online (بإخضر مؤقت بعد العودة) |
 *    offline (بالأحمر) — أُزيلت حالة showOffline المنفصلة.
 *
 * الموضع: يُركّب في الهيدر بجانب عناصر التحكم.
 */
type ConnStatus = "idle" | "online" | "offline";

export function NetworkStatusIndicator({
  className,
  compact = true,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<ConnStatus>("idle");

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const onOnline = () => {
      /* عاد الاتصال → نقطة خضراء 3 ثوانٍ ثم اختفاء صامت */
      setStatus("online");
      window.setTimeout(() => {
        setStatus((cur) => (cur === "online" ? "idle" : cur));
      }, 3000);
    };
    const onOffline = () => setStatus("offline");

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    /* إن بدأ التطبيق offline (مثلاً APK أُطلق بلا اتصال) — عبر microtask
       (callback) لا استدعاءً متزامناً في جسم التأثير */
    if (!navigator.onLine) queueMicrotask(onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /* على الويب العادي + متصل: لا نعرض شيئاً (تفادي الضوضاء البصرية) */
  if (status === "idle") return null;

  if (status === "offline") {
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
