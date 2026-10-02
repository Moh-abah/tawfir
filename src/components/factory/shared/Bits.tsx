"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/lib/factory/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com";
/** مؤشر حالة الخادم الحي — فحص /health/live (على جذر النطاق لا تحت /api/v1) */
export function BackendStatus() {
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const probe = async () => {
      const r = await api<Record<string, unknown>>("https://api.tawfir.giize.com/health/live", {
        method: "GET",
      });
      if (alive) setUp(r.ok);
    };
    probe();
    const t = setInterval(probe, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        up === null && "border-stone-300 bg-stone-50 text-stone-500",
        up === true && "border-emerald-200 bg-emerald-50 text-emerald-700",
        up === false && "border-rose-200 bg-rose-50 text-rose-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          up === null && "bg-stone-400 animate-pulse",
          up === true && "bg-emerald-500",
          up === false && "bg-rose-500"
        )}
      />
      {up === null ? "جارٍ فحص الخادم…" : up ? "الخادم الحي متصل" : "الخادم غير مستجيب"}
      <span className="hidden sm:inline text-[10px] font-normal opacity-70">api.tawfir.giize.com</span>
    </Badge>
  );
}

/** تنبيه وضع الاختبار المطلق — يظهر حين يعيد الباك dev_code */
export function TestModeNote({ devCode }: { devCode?: string | null }) {
  if (!devCode) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <span className="text-lg leading-none">🧪</span>
      <span>
        <strong>وضع الاختبار</strong> — الكود <code className="rounded bg-amber-100 px-1.5 py-0.5 font-bold tracking-widest" dir="ltr">{devCode}</code> — صفر انتظار على إعادة الإرسال
      </span>
    </div>
  );
}

/** صندوق عرض أخطاء الباك إند بالعربية كما وردت */
export function ErrorBox({ error, errors }: { error?: string | null; errors?: string[] }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
      <p className="font-semibold">{error}</p>
      {errors && errors.length > 0 && (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-rose-700">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** شريط تقدم الاكتمال — percent + missing كما يردان حرفياً من الرد */
export function CompletenessMeter({
  percent,
  missing,
  compact,
}: {
  percent: number;
  missing?: string[];
  compact?: boolean;
}) {
  const tone =
    percent >= 100
      ? "bg-emerald-500"
      : percent >= 60
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-stone-600">اكتمال الهوية</span>
        <span className={cn("font-bold", percent >= 100 ? "text-emerald-700" : "text-stone-700")}>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      {!compact && missing && missing.length > 0 && (
        <p className="text-xs text-stone-500">
          الناقص: {missing.join(" · ")}
        </p>
      )}
      {!compact && missing && missing.length === 0 && (
        <p className="text-xs font-semibold text-emerald-700">الهوية مكتملة 100% — جاهزة للإصدار</p>
      )}
    </div>
  );
}

export { API_BASE };
