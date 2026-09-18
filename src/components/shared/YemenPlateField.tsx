"use client";

/**
 * YemenPlateField — حقل لوحة المركبة اليمنية (توفير — 2-a)
 * ═══════════════════════════════════════════════════════════════════
 * بديل حقل النص الواحد: ثلاثة أجزاء أفقية RTL:
 *   ① المحافظة (Select من YEMEN_PLATE_CITY_CODES — "1 · أمانة العاصمة")
 *   ② رقم اللوحة (Input رقمي 4-6 خانات، يمنع غير الأرقام والأرقام الهندية)
 *   ③ الحرف (Select من YEMEN_PLATE_LETTERS)
 *
 * • onChange يُستدعى بـ "الكود-الرقم-الحرف" (مثل "1-222156-أ") فقط عند
 *   اكتمال الأجزاء الثلاثة (الرقم 4-6 خانات) — وإلا يُستدعى بـ "".
 * • بطاقة معاينة بشكل لوحة يمنية (خلفية بيضاء بإطار داكن) تظهر عند
 *   الاكتمال — كل بيانات اللوحة إلزامية (required=true افتراضياً).
 * • مزامنة خارجية آمنة: القيمة القادمة من النموذج (تعديل/إعادة تعيين)
 *   تُفكَّك وتُعرض، دون أي مسّ لحالة الكتابة الجارية.
 */

import { useState } from "react";
import { Car, Hash, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { haptic } from "@/lib/haptic";
import {
  buildYemenPlate,
  parseYemenPlate,
  toEnglishDigits,
  YEMEN_PLATE_CITY_CODES,
  YEMEN_PLATE_LETTERS,
} from "@/lib/yemen";

export interface YemenPlateFieldProps {
  /** قيمة اللوحة الكاملة "1-222156-أ" أو "" */
  value: string;
  /** يُستدعى عند اكتمال الأجزاء الثلاثة فقط (وإلا بـ "") */
  onChange: (plate: string) => void;
  disabled?: boolean;
  /** كل بيانات اللوحة إلزامية (افتراضي true) */
  required?: boolean;
  /** بادئة معرفات الحقول — تفادي تصادم DOM عند تعدد النماذج */
  idPrefix?: string;
}

/** الرقم يكتمل بين 4 و6 خانات (لوحات يمنية واقعية). */
const MIN_DIGITS = 4;
const MAX_DIGITS = 6;

function digitsComplete(digits: string): boolean {
  return new RegExp(`^\\d{${MIN_DIGITS},${MAX_DIGITS}}$`).test(digits);
}

/** هل الكود من فواصل المحافظات المعروفة؟ (لعرضه في الـSelect) */
function isValidCityCode(code: number | null): code is number {
  return code != null && YEMEN_PLATE_CITY_CODES.some((c) => c.code === code);
}

export function YemenPlateField({
  value,
  onChange,
  disabled = false,
  required = true,
  idPrefix = "plate",
}: YemenPlateFieldProps) {
  /* الحالة الداخلية للأجزاء الثلاثة — تُهيّأ من قيمة اللوحة الحالية */
  const [cityCode, setCityCode] = useState<string>(() => {
    const parsed = parseYemenPlate(value);
    return isValidCityCode(parsed.cityCode) ? String(parsed.cityCode) : "";
  });
  const [digits, setDigits] = useState<string>(
    () => parseYemenPlate(value).digits ?? "",
  );
  const [letter, setLetter] = useState<string>(
    () => parseYemenPlate(value).letter ?? "",
  );

  /* آخر قيمة مزامَنة مع الأعلى — تُحدَّث عند البث وعند الاستقبال
     (نمط «ضبط الحالة عند تغيّر الخاصية» الرسمي — بلا effects) */
  const [syncedValue, setSyncedValue] = useState(value);

  /* مزامنة خارجية (نموذج تعديل يُحمّل متأخراً / إعادة تعيين) بلا مسّ الكتابة:
     بثّنا الذاتي يُحدّث syncedValue أولاً فيظل الشرط خاطئاً أثناء الكتابة */
  if (value !== syncedValue) {
    setSyncedValue(value);
    const parsed = parseYemenPlate(value);
    setCityCode(isValidCityCode(parsed.cityCode) ? String(parsed.cityCode) : "");
    setDigits(parsed.digits ?? "");
    setLetter(parsed.letter ?? "");
  }

  /* البث: الكامل "1-222156-أ" — وإلا "" */
  const emit = (nextCity: string, nextDigits: string, nextLetter: string) => {
    const complete =
      nextCity !== "" && digitsComplete(nextDigits) && nextLetter !== "";
    const plate = complete
      ? buildYemenPlate(Number(nextCity), nextDigits, nextLetter)
      : "";
    setSyncedValue(plate);
    onChange(plate);
  };

  const handleCityChange = (v: string) => {
    if (disabled) return;
    haptic("tick");
    setCityCode(v);
    emit(v, digits, letter);
  };

  const handleDigitsChange = (raw: string) => {
    if (disabled) return;
    const clean = toEnglishDigits(raw).replace(/\D/g, "").slice(0, MAX_DIGITS);
    setDigits(clean);
    emit(cityCode, clean, letter);
  };

  const handleLetterChange = (v: string) => {
    if (disabled) return;
    haptic("tick");
    setLetter(v);
    emit(cityCode, digits, v);
  };

  const complete =
    cityCode !== "" && digitsComplete(digits) && letter !== "";
  const previewPlate = complete
    ? buildYemenPlate(Number(cityCode), digits, letter)
    : "";

  return (
    <div className="space-y-2">
      {/* الأجزاء الثلاثة — أفقية RTL: المحافظة ثم الرقم ثم الحرف */}
      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-2">
        {/* ① المحافظة */}
        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-city`}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <Car className="h-3.5 w-3.5" aria-hidden="true" />
            المحافظة
          </Label>
          <Select
            value={cityCode}
            onValueChange={handleCityChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${idPrefix}-city`}
              aria-label="محافظة لوحة المركبة"
              className="h-11 min-h-[44px] w-full native-tap rounded-xl text-sm font-bold"
            >
              <SelectValue placeholder="المحافظة" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {YEMEN_PLATE_CITY_CODES.map((c) => (
                <SelectItem key={c.code} value={String(c.code)}>
                  <span className="tabular-nums">{c.code} · {c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ② رقم اللوحة */}
        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-digits`}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <Hash className="h-3.5 w-3.5" aria-hidden="true" />
            رقم اللوحة
          </Label>
          <Input
            id={`${idPrefix}-digits`}
            value={digits}
            onChange={(e) => handleDigitsChange(e.target.value)}
            disabled={disabled}
            type="text"
            inputMode="numeric"
            dir="ltr"
            maxLength={MAX_DIGITS}
            autoComplete="off"
            placeholder="222156"
            aria-describedby={`${idPrefix}-hint`}
            className="h-11 min-h-[44px] native-tap rounded-xl text-center text-base font-black tabular-nums tracking-widest"
          />
        </div>

        {/* ③ الحرف */}
        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-letter`}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground"
          >
            <Type className="h-3.5 w-3.5" aria-hidden="true" />
            الحرف
          </Label>
          <Select
            value={letter}
            onValueChange={handleLetterChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${idPrefix}-letter`}
              aria-label="حرف لوحة المركبة"
              className="h-11 min-h-[44px] w-full native-tap rounded-xl text-sm font-bold"
            >
              <SelectValue placeholder="الحرف" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {YEMEN_PLATE_LETTERS.map((l) => (
                <SelectItem key={l} value={l}>
                  <span className="text-base font-bold">{l}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* معاينة اللوحة — بشكل لوحة يمنية حقيقية (بيضاء بإطار داكن) */}
      {complete && (
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            معاينة اللوحة
          </span>
          <div
            role="img"
            aria-label={`لوحة المركبة: ${previewPlate}`}
            dir="ltr"
            className="flex w-full max-w-[280px] items-center justify-center rounded-xl border-[3px] border-zinc-900 bg-white px-5 py-3 shadow-sm"
          >
            <span className="text-2xl font-black tabular-nums tracking-wider text-zinc-900">
              {previewPlate}
            </span>
          </div>
        </div>
      )}

      {/* النص المساعد */}
      <p
        id={`${idPrefix}-hint`}
        role="note"
        className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      >
        <Car className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {required
          ? "بيانات اللوحة كاملة إلزامية — المحافظة والرقم والحرف"
          : `بيانات اللوحة (اختيارية) — المحافظة والرقم (${MIN_DIGITS}-${MAX_DIGITS} خانات) والحرف`}
      </p>
    </div>
  );
}
