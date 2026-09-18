"use client";

/**
 * WorkingHoursSelector — محدد ساعات عمل المتجر (توفير — 2-a)
 * ═══════════════════════════════════════════════════════════════════
 * بديل حقل النص الحر: قوائم اختيار بدل الكتابة.
 *   • الأيام: شبكة أزرار (chips) من 7 أيام (السبت..الجمعة) بتحديد
 *     متعدد بأسلوب checkbox بصري + خيارات سريعة (كل الأيام /
 *     أيام العمل الرسمية السبت-الخميس).
 *   • الأوقات: قائمتا Select كل 30 دقيقة (00:00 → 23:30) بتنسيق HH:MM.
 *
 * • يبني نصاً متوافقاً مع الباك اند (working_hours ≤255) بصيغة
 *   "السبت-الخميس 08:00-23:00" — الأيام المتتالية تُدمج بنطاقات
 *   (حتى الدائرية مثل الجمعة-الأحد)، ويقرأه src/lib/facility-hours.ts
 *   (parseWorkingHours يدعم "HH:MM - HH:MM").
 * • القيمة القادمة تُفكَّك عند التركيب الأول (نموذج تعديل): القيم
 *   القديمة مثل "11ص - 11م" أو "08:00 - 23:00" تُستخرج أوقاتها،
 *   وإن لم تُفهم الأيام تُعتبر "كل الأيام" مبدئياً.
 * • إن لم يكتمل شيء (لا أيام مختارة) → onChange("").
 */

import { useState } from "react";
import { CalendarDays, Check, Clock, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export interface WorkingHoursSelectorProps {
  /** النص المتوافق مع الباك اند (مثل "السبت-الخميس 08:00-23:00") */
  value: string;
  /** يُستدعى بالنص المنسّق عند أي تغيير — أو "" عند عدم الاكتمال */
  onChange: (formatted: string) => void;
  disabled?: boolean;
}

/* ─── أيام الأسبوع (الأسبوع اليمني يبدأ السبت) ─────────────────── */

/** أسماء العرض — الفهرس 0=السبت … 6=الجمعة */
const WEEK_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

/** مرادفات إملائية للتحليل (الإثنين/الاثنين) */
const WEEK_DAY_VARIANTS: ReadonlyArray<ReadonlyArray<string>> = [
  ["السبت"],
  ["الأحد"],
  ["الاثنين", "الإثنين"],
  ["الثلاثاء"],
  ["الأربعاء"],
  ["الخميس"],
  ["الجمعة"],
];

const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "23:00";

/* ─── خيارات الوقت: كل 30 دقيقة من 00:00 إلى 23:30 ─────────────── */

const TIME_OPTIONS: readonly string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30] as const) {
      out.push(`${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
    }
  }
  return out;
})();

/* ─── أدوات التحويل ────────────────────────────────────────────── */

/** تحويل ساعة 12 (مع ص/م أو AM/PM) إلى 24 */
function to24Hour(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const m = meridiem.toLowerCase();
  if (m === "ص" || m === "am") return hour === 12 ? 0 : hour;
  if (m === "م" || m === "pm") return hour === 12 ? 12 : hour + 12;
  return hour;
}

/** دقائق منذ منتصف الليل → أقرب خيار قائمة (مضاعفات 30) "HH:MM" */
function minutesToOption(mins: number): string {
  const rounded = Math.min(Math.max(Math.round(mins / 30) * 30, 0), 23 * 60 + 30);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
}

/** "08:00" → 480 دقيقة */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => Number.parseInt(x, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** استخراج أول زمنَي فتح/إغلاق من نص حر — يدعم ص/م وAM/PM وHH:MM */
function parseTimes(text: string): { open: string; close: string } | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|AM|PM)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|AM|PM)?/,
  );
  if (!m) return null;
  const [, oh, om, omer, ch, cm, cmer] = m;
  if (!oh || !ch) return null;
  const openMin = to24Hour(Number.parseInt(oh, 10), omer) * 60 + Number.parseInt(om ?? "0", 10);
  const closeMin = to24Hour(Number.parseInt(ch, 10), cmer) * 60 + Number.parseInt(cm ?? "0", 10);
  return { open: minutesToOption(openMin), close: minutesToOption(closeMin) };
}

/** التقاط أيام الأسبوع المذكورة في نص (نطاقات وأيام مفردة) — null = لا أسماء */
function parseDays(text: string): boolean[] | null {
  const days = [false, false, false, false, false, false, false];
  const found: { idx: number; start: number; end: number }[] = [];
  WEEK_DAY_VARIANTS.forEach((variants, idx) => {
    for (const name of variants) {
      let pos = text.indexOf(name);
      while (pos !== -1) {
        found.push({ idx, start: pos, end: pos + name.length });
        pos = text.indexOf(name, pos + name.length);
      }
    }
  });
  if (found.length === 0) return null;
  found.sort((a, b) => a.start - b.start);

  found.forEach((cur, i) => {
    days[cur.idx] = true;
    const next = found[i + 1];
    if (!next) return;
    const between = text.slice(cur.end, next.start);
    /* فاصل شرطة فقط بين اسمين → نطاق (يشمل الالتفاف الدائري: الجمعة-الأحد) */
    if (/^[\s]*[-–—][\s]*$/.test(between)) {
      let idx = cur.idx;
      while (idx !== next.idx) {
        days[idx] = true;
        idx = (idx + 1) % 7;
      }
      days[next.idx] = true;
    }
  });
  return days;
}

interface ParsedIncoming {
  days: boolean[];
  open: string;
  close: string;
}

/**
 * تفكيك قيمة قادمة للوضع المرئي (نموذج التعديل):
 * الأوقات تُستخرج من أي صيغة قديمة، والأيام إن لم تُفهم → "كل الأيام".
 */
function parseIncomingValue(value: string): ParsedIncoming {
  const text = (value ?? "").trim();
  if (!text) {
    return {
      days: [false, false, false, false, false, false, false],
      open: DEFAULT_OPEN,
      close: DEFAULT_CLOSE,
    };
  }

  const allDaysExplicit =
    text.includes("كل الأيام") ||
    text.includes("كامل الأسبوع") ||
    text.includes("طوال الأسبوع") ||
    text.includes("يومياً") ||
    text.includes("يوميا");

  let days = parseDays(text);
  if (allDaysExplicit || days == null) {
    days = [true, true, true, true, true, true, true];
  }

  const times = parseTimes(text);
  return {
    days,
    open: times?.open ?? DEFAULT_OPEN,
    close: times?.close ?? DEFAULT_CLOSE,
  };
}

/* ─── بناء النص النهائي ────────────────────────────────────────── */

/** النطاقات المتتالية المختارة (دائرية) — [بداية، نهاية] أو [يوم] */
function runsOfSelected(days: boolean[]): number[][] {
  if (!days.some(Boolean)) return [];
  if (days.every(Boolean)) return [[0, 6]];
  const firstGap = days.indexOf(false);
  const runs: number[][] = [];
  let current: number[] = [];
  for (let step = 1; step <= 7; step++) {
    const idx = (firstGap + step) % 7;
    if (days[idx]) {
      current.push(idx);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/** أيام → نص عربي: الكل → "كل الأيام" · متتالية → "السبت-الخميس" (بدمج النطاقات) */
function daysToText(days: boolean[]): string | null {
  if (!days.some(Boolean)) return null;
  if (days.every(Boolean)) return "كل الأيام";
  return runsOfSelected(days)
    .map((run) =>
      run.length === 1
        ? WEEK_DAYS[run[0]]
        : `${WEEK_DAYS[run[0]]}-${WEEK_DAYS[run[run.length - 1]]}`,
    )
    .join(" و");
}

/**
 * بناء نص ساعات العمل النهائي — "السبت-الخميس 08:00-23:00"
 * (نص فارغ عند عدم اختيار أي أيام).
 */
export function buildWorkingHoursText(
  days: boolean[],
  open: string,
  close: string,
): string {
  const daysText = daysToText(days);
  if (!daysText) return "";
  return `${daysText} ${open}-${close}`;
}

/* ─── المكوّن ───────────────────────────────────────────────────── */

export function WorkingHoursSelector({
  value,
  onChange,
  disabled = false,
}: WorkingHoursSelectorProps) {
  const [days, setDays] = useState<boolean[]>(() => parseIncomingValue(value).days);
  const [openTime, setOpenTime] = useState<string>(() => parseIncomingValue(value).open);
  const [closeTime, setCloseTime] = useState<string>(() => parseIncomingValue(value).close);

  /* آخر قيمة مزامَنة مع الأعلى — تُحدَّث عند البث وعند الاستقبال
     (نمط «ضبط الحالة عند تغيّر الخاصية» الرسمي — بلا effects) */
  const [syncedValue, setSyncedValue] = useState(value);

  /* مزامنة خارجية (نموذج تعديل يُحمّل متأخراً / إعادة تعيين) بلا مسّ الكتابة:
     بثّنا الذاتي يُحدّث syncedValue أولاً فيظل الشرط خاطئاً أثناء التعديل */
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = parseIncomingValue(value);
    setDays(parsed.days);
    setOpenTime(parsed.open);
    setCloseTime(parsed.close);
  }

  /* البث عند كل تغيير */
  const emit = (nextDays: boolean[], nextOpen: string, nextClose: string) => {
    const text = buildWorkingHoursText(nextDays, nextOpen, nextClose);
    setSyncedValue(text);
    onChange(text);
  };

  const toggleDay = (idx: number) => {
    if (disabled) return;
    haptic("tick");
    const next = days.map((d, i) => (i === idx ? !d : d));
    setDays(next);
    emit(next, openTime, closeTime);
  };

  const applyPreset = (preset: "all" | "workweek") => {
    if (disabled) return;
    haptic("light");
    const next =
      preset === "all"
        ? [true, true, true, true, true, true, true]
        : [true, true, true, true, true, true, false];
    setDays(next);
    emit(next, openTime, closeTime);
  };

  const changeOpen = (v: string) => {
    if (disabled) return;
    haptic("tick");
    setOpenTime(v);
    emit(days, v, closeTime);
  };

  const changeClose = (v: string) => {
    if (disabled) return;
    haptic("tick");
    setCloseTime(v);
    emit(days, openTime, v);
  };

  /* الملخص الحي */
  const daysText = daysToText(days);
  const overnight =
    daysText != null && timeToMinutes(closeTime) < timeToMinutes(openTime);
  const equalTimes =
    daysText != null && closeTime === openTime;

  const openId = "wh-open";
  const closeId = "wh-close";

  return (
    <div className="space-y-3">
      {/* أيام العمل */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            أيام العمل
          </Label>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => applyPreset("all")}
              className="h-11 min-h-[44px] native-tap rounded-xl px-3 text-[11px] font-bold"
              aria-label="اختيار كل أيام الأسبوع"
            >
              كل الأيام
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => applyPreset("workweek")}
              className="h-11 min-h-[44px] native-tap rounded-xl px-3 text-[11px] font-bold"
              aria-label="اختيار أيام العمل الرسمية من السبت إلى الخميس"
            >
              أيام العمل الرسمية (السبت-الخميس)
            </Button>
          </div>
        </div>

        <div
          role="group"
          aria-label="أيام عمل المتجر — اضغط للاختيار أو الإلغاء"
          className="grid grid-cols-4 gap-1.5 sm:grid-cols-7"
        >
          {WEEK_DAYS.map((name, idx) => {
            const active = days[idx];
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => toggleDay(idx)}
                className={cn(
                  "native-tap flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* أوقات الفتح والإغلاق */}
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={openId}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            وقت الفتح
          </Label>
          <Select value={openTime} onValueChange={changeOpen} disabled={disabled}>
            <SelectTrigger
              id={openId}
              aria-label="وقت فتح المتجر"
              className="h-11 min-h-[44px] w-full native-tap rounded-xl text-sm font-bold tabular-nums"
            >
              <SelectValue placeholder="08:00" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  <span dir="ltr" className="tabular-nums">{t}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={closeId}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
            وقت الإغلاق
          </Label>
          <Select value={closeTime} onValueChange={changeClose} disabled={disabled}>
            <SelectTrigger
              id={closeId}
              aria-label="وقت إغلاق المتجر"
              className="h-11 min-h-[44px] w-full native-tap rounded-xl text-sm font-bold tabular-nums"
            >
              <SelectValue placeholder="23:00" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  <span dir="ltr" className="tabular-nums">{t}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* الملخص الحي */}
      <div role="status" className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed">
        {daysText ? (
          <p className="font-bold text-foreground">
            مفتوح {daysText} من{" "}
            <span dir="ltr" className="tabular-nums">{openTime}</span> إلى{" "}
            <span dir="ltr" className="tabular-nums">{closeTime}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            اختر أيام العمل أولاً ليكتمل ملخص ساعات العمل
          </p>
        )}
        {overnight && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <MoonStar className="h-3 w-3 shrink-0" aria-hidden="true" />
            وقت الإغلاق بعد منتصف الليل — يُحسب العمل ممتداً لليوم التالي
          </p>
        )}
        {equalTimes && !overnight && daysText && (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            وقتا الفتح والإغلاق متساويان — تأكد من صحة الأوقات
          </p>
        )}
      </div>

      <p role="note" className="text-[10px] leading-relaxed text-muted-foreground">
        تُحفظ بصيغة نصية مثل «السبت-الخميس 08:00-23:00» — الأيام المتتالية
        تُدمج تلقائياً في نطاقات
      </p>
    </div>
  );
}
