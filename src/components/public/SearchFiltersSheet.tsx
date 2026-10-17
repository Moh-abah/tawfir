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
import { useLang } from "@/lib/i18n";

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

/* مفاتيح القاموس — العرض عبر t() ليعمل بلغتين */
export const SORT_OPTIONS: {
  key: SortKey;
  labelKey: string;
  icon: typeof ListFilter;
}[] = [
  { key: "default", labelKey: "catalog.filters.sortDefault", icon: ListFilter },
  { key: "price_asc", labelKey: "catalog.filters.sortPriceAsc", icon: ArrowDownWideNarrow },
  { key: "price_desc", labelKey: "catalog.filters.sortPriceDesc", icon: ArrowDownWideNarrow },
  { key: "name", labelKey: "catalog.filters.sortName", icon: UtensilsCrossed },
];

export const PRICE_OPTIONS: {
  key: PriceRangeKey;
  labelKey: string;
}[] = [
  { key: "all", labelKey: "catalog.filters.priceAll" },
  { key: "lt500", labelKey: "catalog.filters.priceLt500" },
  { key: "r500to1000", labelKey: "catalog.filters.priceRange" },
  { key: "gt1000", labelKey: "catalog.filters.priceGt1000" },
];

/** خيارات التصنيف — ألوان هوية التصنيفات عبر توكنات --cat-* */
export const CATEGORY_OPTIONS: {
  key: CategoryKey;
  labelKey: string;
  icon: typeof Store;
  /** أصناف Tailwind للرقاقة النشطة (ألوان التصنيف) */
  activeClass: string;
}[] = [
  { key: "all", labelKey: "catalog.filters.catAll", icon: Store, activeClass: "border-primary bg-primary text-primary-foreground" },
  {
    key: "restaurant",
    labelKey: "catalog.filters.catRestaurants",
    icon: UtensilsCrossed,
    activeClass: "border-cat-restaurant bg-cat-restaurant text-white",
  },
  {
    key: "cafe",
    labelKey: "catalog.filters.catCafeterias",
    icon: Store,
    activeClass: "border-cat-cafe bg-cat-cafe text-white",
  },
];

export const DISTANCE_OPTIONS: {
  key: DistanceKey;
  labelKey: string;
}[] = [
  { key: "all", labelKey: "catalog.filters.distanceAll" },
  { key: "lt2", labelKey: "catalog.filters.distanceLt2" },
  { key: "lt5", labelKey: "catalog.filters.distanceLt5" },
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
  const { t } = useLang();
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
            {t("catalog.filters.title")}
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-primary-foreground">
                {activeCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-right text-xs text-muted-foreground">
            {t("catalog.filters.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-0">
          {/* ── الترتيب ── */}
          <section aria-label={t("catalog.filters.sortTitle")} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <ArrowDownWideNarrow className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("catalog.filters.sortTitle")}
            </h3>
            <div role="radiogroup" aria-label={t("catalog.filters.sortAria")} className="space-y-2">
              {SORT_OPTIONS.map((opt) => (
                <SortRow
                  key={opt.key}
                  label={t(opt.labelKey)}
                  icon={opt.icon}
                  selected={filters.sort === opt.key}
                  onSelect={() => onChange({ ...filters, sort: opt.key })}
                />
              ))}
            </div>
          </section>

          {/* ── التصنيف ── */}
          <section aria-label={t("catalog.filters.categoryTitle")} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <Store className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("catalog.filters.categoryTitle")}
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
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── نطاق السعر ── */}
          <section aria-label={t("catalog.filters.priceTitle")} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("catalog.filters.priceTitle")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={t(opt.labelKey)}
                  selected={filters.price === opt.key}
                  onSelect={() => onChange({ ...filters, price: opt.key })}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <BadgePercent className="ml-1 inline h-3 w-3" aria-hidden="true" />
              {t("catalog.filters.priceHint")}
            </p>
          </section>

          {/* ── المسافة ── */}
          <section aria-label={t("catalog.filters.distanceTitle")} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("catalog.filters.distanceTitle")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.key}
                  label={t(opt.labelKey)}
                  selected={filters.distance === opt.key}
                  onSelect={() => onChange({ ...filters, distance: opt.key })}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <MapPin className="ml-1 inline h-3 w-3" aria-hidden="true" />
              {t("catalog.filters.distanceHint")}
            </p>
          </section>

          {/* ── التوفر ── */}
          <section aria-label={t("catalog.filters.availabilityTitle")} className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <UtensilsCrossed className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("catalog.filters.availabilityTitle")}
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
                  {t("catalog.filters.availableOnly")}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t("catalog.filters.availableOnlyDesc")}
                </span>
              </span>
              <Switch
                checked={filters.availableOnly}
                onCheckedChange={(checked) => {
                  haptic("tick");
                  onChange({ ...filters, availableOnly: checked });
                }}
                aria-label={t("catalog.filters.availableOnly")}
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
              {t("catalog.filters.reset")}
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
              {resultCount > 0
                ? t("catalog.filters.showResultsCount", { count: resultCount })
                : t("catalog.filters.showResults")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
