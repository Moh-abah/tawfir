"use client";

import { useEffect, useMemo, useState } from "react";
import { History, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LiveElapsedBadge — الجولة 26 (ميزة جديدة)
 * ═══════════════════════════════════════════════════════
 * شارة «منذ X دقيقة» حيّة للطلبات النشطة — تخفف قلق انتظار
 * الطعام بإحساس مرور الوقت (نمط تطبيقات التوصيل العالمية:
 * Uber Eats / Jahez يعرضون elapsed منذ إنشاء الطلب).
 *
 *  • تحديث كل 30 ثانية (بلا دقة ميلي ثانية مضيعة)
 *  • صيغ عربية صحيحة: دقيقة / دقيقتين / دقائق / دقيقة
 *  • ساعات وأيام للم-duration الطويلة
 *  • suppressHydrationWarning: القيمة تختلف حتمًا بين
 *    الخادم والعميل (زمن لحظي) — React يتقبل نسخة العميل
 */

/** تنسيق عربي صحيح للمدة المنقضية (صيغ المفرد/المثنى/الجمع). */
export function formatElapsedAr(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) {
    if (mins === 1) return "منذ دقيقة";
    if (mins === 2) return "منذ دقيقتين";
    if (mins <= 10) return `منذ ${formatNum(mins)} دقائق`;
    return `منذ ${formatNum(mins)} دقيقة`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) {
    let h: string;
    if (hours === 1) h = "منذ ساعة";
    else if (hours === 2) h = "منذ ساعتين";
    else if (hours <= 10) h = `منذ ${formatNum(hours)} ساعات`;
    else h = `منذ ${formatNum(hours)} ساعة`;
    if (rem >= 3 && rem <= 10) return `${h} و${formatNum(rem)} دقائق`;
    return h;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${formatNum(days)} أيام`;
  return `منذ ${formatNum(days)} يوماً`;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("ar-EG").format(n);
}

export interface LiveElapsedBadgeProps {
  /** لحظة البدء (ISO أو Date) — عادة created_at للطلب */
  since: string | Date;
  /** أيقونة بديلة (افتراضي History) */
  icon?: LucideIcon;
  className?: string;
  /** نص ثابت إضافي بعد المدة (مثل «على طلبك») */
  suffix?: string;
}

export function LiveElapsedBadge({
  since,
  icon: Icon = History,
  className,
  suffix,
}: LiveElapsedBadgeProps) {
  const start = useMemo(() => new Date(since).getTime(), [since]);
  const [label, setLabel] = useState<string>(() =>
    Number.isNaN(start) ? "" : formatElapsedAr(Date.now() - start),
  );

  useEffect(() => {
    if (Number.isNaN(start)) return;
    /* تحديث كل 30 ثانية — دقة كافية للدقائق بلا مؤقتات مضيعة */
    const id = setInterval(
      () => setLabel(formatElapsedAr(Date.now() - start)),
      30_000,
    );
    /* تحديث فوري عند العودة للتبويب من الخلفية */
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setLabel(formatElapsedAr(Date.now() - start));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [start]);

  if (Number.isNaN(start) || !label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground",
        className,
      )}
      aria-live="off"
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span suppressHydrationWarning>
        {label}
        {suffix ? ` ${suffix}` : ""}
      </span>
    </span>
  );
}
