"use client";

import { useMemo } from "react";
import {
  ArrowDownWideNarrow,
  BadgePercent,
  Check,
  CircleDollarSign,
  ListFilter,
  MapPin,
  RotateCcw,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

/* ─── أنواع الفلاتر ─────────────────────────────────── */

export type SortKey = "default" | "price_asc" | "price_desc" | "name";
export type PriceRangeKey = "all" | "lt500" | "r500to1000" | "gt1000";
export type CategoryKey = "all" | "restaurant" | "cafe";
export type DistanceKey = "all" | "lt2" | "lt5";

export interface SearchFilters {
  sort: SortKey;
  price: PriceRangeKey;
  category: CategoryKey;
  distance: DistanceKey;
  availableOnly: boolean;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  sort: "default",
  price: "all",
  category: "all",
  distance: "all",
  availableOnly: true,
};

export const SORT_OPTIONS: {
  key: SortKey;
  label: string;
  icon: typeof ListFilter;
}[] = [
  { key: "default", label: "الافتراضي", icon: ListFilter },
  { key: "price_asc", label: "السعر: الأقل أولاً", icon: ArrowDownWideNarrow },
  { key: "price_desc", label: "السعر: الأعلى أولاً", icon: ArrowDownWideNarrow },
  { key: "name", label: "الاسم أ–ي", icon: UtensilsCrossed },
];

export const PRICE_OPTIONS: {
  key: PriceRangeKey;
  label: string;
}[] = [
  { key: "all", label: "كل الأسعار" },
  { key: "lt500", label: "أقل من ٥٠٠" },
  { key: "r500to1000", label: "٥٠٠ – ١٠٠٠" },
  { key: "gt1000", label: "أكثر من ١٠٠٠" },
];

/** خيارات التصنيف — ألوان هوية التصنيفات عبر توكنات --cat-* */
export const CATEGORY_OPTIONS: {
  key: CategoryKey;
  label: string;
  icon: typeof Store;
  /** أصناف Tailwind للرقاقة النشطة (ألوان التصنيف) */
  activeClass: string;
}[] = [
  { key: "all", label: "الكل", icon: Store, activeClass: "border-primary bg-primary text-primary-foreground" },
  {
    key: "restaurant",
    label: "مطاعم",
    icon: UtensilsCrossed,
    activeClass: "border-cat-restaurant bg-cat-restaurant text-white",
  },
  {
    key: "cafe",
    label: "مقاهي",
    icon: Store,
    activeClass: "border-cat-cafe bg-cat-cafe text-white",
  },
];

export const DISTANCE_OPTIONS: {
  key: DistanceKey;
  label: string;
}[] = [
  { key: "all", label: "كل المسافات" },
  { key: "lt2", label: "ضمن ٢ كم" },
  { key: "lt5", label: "ضمن ٥ كم" },
];

/** حدود نطاق السعر بالريال اليمني (تُطابق PRICE_OPTIONS) */
const PRICE_BOUNDS: Record<
  Exclude<PriceRangeKey, "all">,
  { min: number; max: number }
> = {
  lt500: { min: 0, max: 500 },
  r500to1000: { min: 500, max: 1000 },
  gt1000: { min: 1000, max: Number.POSITIVE_INFINITY },
};

/** حدود نطاق المسافة بالكيلومتر */
const DISTANCE_BOUNDS: Record<
  Exclude<DistanceKey, "all">,
  { max: number }
> = {
  lt2: { max: 2 },
  lt5: { max: 5 },
};

/** هل السعر داخل النطاق المحدد؟ */
export function isPriceInRange(price: number, range: PriceRangeKey): boolean {
  if (range === "all") return true;
  const b = PRICE_BOUNDS[range];
  return price >= b.min && price < b.max;
}

/**
 * هل المسافة داخل النطاق المحدد؟
 * القيم null (لا بيانات موقع) تُعرض فقط عند «كل المسافات».
 */
export function isDistanceInRange(
  distanceKm: number | null | undefined,
  range: DistanceKey
): boolean {
  if (range === "all") return true;
  if (distanceKm == null) return false;
  return distanceKm <= DISTANCE_BOUNDS[range].max;
}

/** عدد الفلاتر النشطة (غير الافتراضية) — لشارة زر الفلاتر */
export function countActiveFilters(f: SearchFilters): number {
  let n = 0;
  if (f.sort !== "default") n++;
  if (f.price !== "all") n++;
  if (f.category !== "all") n++;
  if (f.distance !== "all") n++;
  if (!f.availableOnly) n++;
  return n;
}

/* ─── صف خيار ترتيب ────────────────────────────────── */
function SortRow({
  label,
  selected,
  icon: Icon,
  onSelect,
}: {
  label: string;
  selected: boolean;
  icon: typeof ListFilter;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        haptic("tick");
        onSelect();
      }}
      className={cn(
        "native-tap flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-right transition-all duration-150",
        selected
          ? "border-primary/50 bg-primary/10 shadow-soft"
          : "border-border/50 bg-card hover:border-primary/30"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "flex-1 text-sm font-bold",
          selected ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150",
          selected
            ? "border-primary bg-primary"
            : "border-border"
        )}
        aria-hidden="true"
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </span>
    </button>
  );
}

/* ─── رقاقة عامة (سعر/مسافة) ────────────────────────── */
function FilterChip({
  label,
  selected,
  onSelect,
  selectedClass,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  selectedClass?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => {
        haptic("tick");
        onSelect();
      }}
      className={cn(
        "native-tap min-h-[44px] rounded-full border px-4 py-1.5 text-sm font-bold transition-all duration-150 active:scale-95",
        selected
          ? selectedClass ??
              "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/* ─── الـ Sheet الرئيسي ─────────────────────────────── */
interface SearchFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  resultCount: number;
}

/**
 * Sheet فلاتر البحث — الترتيب / نطاق السعر / التصنيف / المسافة / التوفر.
 * الألوان كاملة عبر توكنات الهوية (primary/accent/--cat-*) — Sheet من shadcn.
 */
export function SearchFiltersSheet({
  open,
  onOpenChange,
  filters,
  onChange,
  resultCount,
}: SearchFiltersSheetProps) {
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "inset-x-0 mx-auto max-w-lg rounded-t-3xl px-5 pb-8 pt-3",
          "max-h-[85dvh] overflow-y-auto"
        )}
      >
        {/* مقبض السحب — بصمة Native */}
        <div
          className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border"
          aria-hidden="true"
        />

        <SheetHeader className="px-0 pb-1 pt-0 text-right">
          <SheetTitle className="flex items-center gap-2 text-right text-base font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent/15">
              <ListFilter className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            </span>
            تصفية النتائج
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-primary-foreground">
                {activeCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-right text-xs text-muted-foreground">
            اشمل النتائج أو رتّبها بما يناسبك — الفلاتر تُطبَّق فوراً
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-0">
          {/* ── الترتيب ── */}
          <section aria-label="الترتيب" className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <ArrowDownWideNarrow className="h-4 w-4 text-primary" aria-hidden="true" />
              الترتيب
            </h3>
            <div role="radiogroup" aria-label="خيارات الترتيب" className="space-y-2">
              {SORT_OPTIONS.map((opt) => (
                <SortRow
                  key={opt.key}
                  label={opt.label}
                  icon={opt.icon}
                  selected={filters.sort === opt.key}
                  onSelect={() => onChange({ ...filters, sort: opt.key })}
                />
              ))}
            </div>
          </section>

          {/* ── التصنيف ── */}
          <section aria-label="التصنيف" className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <Store className="h-4 w-4 text-primary" aria-hidden="true" />
              التصنيف
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = filters.category === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      haptic("tick");
                      onChange({ ...filters, category: opt.key });
                    }}
                    className={cn(
                      "native-tap inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition-all duration-150 active:scale-95",
                      selected
                        ? opt.activeClass + " shadow-soft"
                        : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── نطاق السعر ── */}
          <section aria-label="نطاق السعر" className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden="true" />
              نطاق السعر
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  selected={filters.price === opt.key}
                  onSelect={() => onChange({ ...filters, price: opt.key })}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <BadgePercent className="ml-1 inline h-3 w-3" aria-hidden="true" />
              الأسعار بالريال اليمني — النطاق يطبَّق على نتائج الوجبات
            </p>
          </section>

          {/* ── المسافة ── */}
          <section aria-label="المسافة" className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              المسافة
            </h3>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={opt.label}
                  selected={filters.distance === opt.key}
                  onSelect={() => onChange({ ...filters, distance: opt.key })}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <MapPin className="ml-1 inline h-3 w-3" aria-hidden="true" />
              تُطبَّق عند توفر بيانات الموقع للوجبات القريبة منك
            </p>
          </section>

          {/* ── التوفر ── */}
          <section aria-label="التوفر" className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" />
              التوفر
            </h3>
            <label
              className={cn(
                "flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                filters.availableOnly
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/50 bg-card"
              )}
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-foreground">
                  المتاح فقط
                </span>
                <span className="text-[11px] text-muted-foreground">
                  إخفاء الوجبات النافدة من النتائج
                </span>
              </span>
              <Switch
                checked={filters.availableOnly}
                onCheckedChange={(checked) => {
                  haptic("tick");
                  onChange({ ...filters, availableOnly: checked });
                }}
                aria-label="المتاح فقط"
              />
            </label>
          </section>

          {/* ── الأزرار ── */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                haptic("tick");
                onChange({ ...DEFAULT_SEARCH_FILTERS });
              }}
              disabled={activeCount === 0}
              className={cn(
                "native-tap inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-border/60 bg-card px-4 text-sm font-bold transition-all",
                activeCount === 0
                  ? "cursor-not-allowed text-muted-foreground/50"
                  : "text-muted-foreground hover:border-destructive/40 hover:text-destructive"
              )}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              إعادة تعيين
            </button>
            <button
              type="button"
              onClick={() => {
                haptic("success");
                onOpenChange(false);
              }}
              className="native-tap inline-flex min-h-[48px] flex-[2] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              عرض {resultCount > 0 ? `${resultCount} نتيجة` : "النتائج"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
