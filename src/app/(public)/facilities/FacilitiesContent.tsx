"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Search, UtensilsCrossed, Coffee, Landmark, MapPin, SearchX, ArrowUpDown, Clock, Eye, X, Building2, Grid3X3, MapPinned, Package, BadgePercent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscountBadge } from "@/components/shared/DiscountBadge";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFacilities } from "@/hooks/useFacilities";
import { useRegions } from "@/hooks/useRegions";
import { useRegionStore } from "@/store/region.store";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { resolveImageUrl } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import type { FacilityType, Facility } from "@/types/api.generated";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const TYPE_CONFIG: { key: FacilityType | "all"; label: string; icon: typeof UtensilsCrossed }[] = [
  { key: "all", label: "الكل", icon: Landmark },
  { key: "restaurant", label: "مطاعم", icon: UtensilsCrossed },
  { key: "cafe", label: "كافيهات", icon: Coffee },
];

type SortKey = "default" | "newest" | "alpha";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "الافتراضي" },
  { key: "newest", label: "الأحدث" },
  { key: "alpha", label: "الأبجدي" },
];

const TYPE_BADGE_CLASS: Record<FacilityType, string> = {
  restaurant: "bg-secondary/15 text-secondary border-secondary/20",
  cafe: "bg-accent/15 text-accent border-accent/20",
  public_facility: "bg-secondary/15 text-secondary border-secondary/20",
};

/* ------------------------------------------------------------------ */
/*  FacilityCard (upgraded)                                            */
/* ------------------------------------------------------------------ */
function FacilityCard({ facility, productCount }: { facility: Facility; productCount?: number }) {
  const Icon = TYPE_ICON[facility.type];
  return (
    <Link href={`/facilities/${facility.id}`} className="block">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-lg"
      >
        <div className="relative h-44 sm:h-52 bg-muted">
          {facility.image_url ? (
            <ImageWithSkeleton src={resolveImageUrl(facility.image_url)} alt={facility.name} fill className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Icon className="h-14 w-14 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <DiscountBadge percentage={30} />
            {typeof productCount === "number" && productCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Package className="h-3 w-3" />
                {productCount} منتج
              </span>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{facility.name}</h3>
              {facility.discount_rate != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  <BadgePercent className="h-3 w-3" aria-hidden="true" />
                  خصم {facility.discount_rate}%
                </span>
              )}
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", TYPE_BADGE_CLASS[facility.type])}>
              {TYPE_LABEL[facility.type]}
            </span>
          </div>
          {facility.address ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{facility.address}</span>
            </p>
          ) : null}
        </div>
        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{TYPE_LABEL[facility.type]}</span>
            {facility.working_hours && (
              <>
                <span className="mx-1 text-border">|</span>
                <Clock className="h-3.5 w-3.5" />
                <span className="line-clamp-1 max-w-[140px]">{facility.working_hours}</span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
            <Eye className="h-3 w-3" />
            عرض المنتجات
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty search result illustration                                   */
/* ------------------------------------------------------------------ */
function EmptySearchIllustration() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">لا توجد نتائج</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          جرّب تغيير كلمة البحث أو اختر فلترًا مختلفًا للعثور على ما تبحث عنه
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Searches Hook                                               */
/* ------------------------------------------------------------------ */
const RECENT_KEY = "tawfir_recent_searches";
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (stored) {
      const parsed: string[] = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  const saveSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  return { recentSearches, saveSearch, removeSearch, clearAll };
}

/* ------------------------------------------------------------------ */
/*  Animated Counter Hook                                              */
/* ------------------------------------------------------------------ */
function useSmallCounter(target: number, duration = 1200) {
const prefersReduced = usePrefersReducedMotion();
  const [count, setCount] = useState(prefersReduced ? target : 0);

  useEffect(() => {
    if (prefersReduced) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, prefersReduced]);

  return count;
}

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */
function StatsBar({ facilities }: { facilities: Facility[] }) {
  const { data: regions } = useRegions();
  const totalFacilities = useSmallCounter(facilities.length);
  const uniqueTypes = useSmallCounter(new Set(facilities.map((f) => f.type)).size);
  const regionCount = useSmallCounter(regions?.length ?? 0);

  const stats = [
    { icon: Building2, label: "منشأة متاحة", value: totalFacilities, color: "text-primary", bgColor: "bg-primary/10" },
    { icon: Grid3X3, label: "نوع منشأة", value: uniqueTypes, color: "text-secondary", bgColor: "bg-secondary/10" },
    { icon: MapPinned, label: "منطقة", value: regionCount, color: "text-accent", bgColor: "bg-accent/10" },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 flex flex-wrap items-stretch gap-3"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl bg-card/50 border p-3 card-glow"
        >
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", stat.bgColor)}>
            <stat.icon className={cn("h-5 w-5", stat.color)} />
          </div>
          <div>
            <p className={cn("text-lg font-black leading-tight", stat.color)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  FacilitiesGrid                                                     */
/* ------------------------------------------------------------------ */
function FacilitiesGrid() {
  const { data, isLoading, error, refetch } = useFacilities();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const [typeFilter, setTypeFilter] = useState<FacilityType | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const debouncedSearch = useDebounce(searchInput, 300);
  const prefersReduced = usePrefersReducedMotion();
    const { recentSearches, saveSearch, removeSearch, clearAll } = useRecentSearches();

  const handleSearchSubmit = useCallback(() => {
    if (searchInput.trim()) {
      saveSearch(searchInput);
    }
  }, [searchInput, saveSearch]);

  const allFacilities = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [data]
  );

  const filtered = useMemo(() => {
    let result = allFacilities;
    if (typeFilter !== "all") result = result.filter((f) => f.type === typeFilter);
    if (debouncedSearch.trim()) result = result.filter((f) => f.name.includes(debouncedSearch.trim()));

    if (sortKey === "newest") {
      result = [...result].sort((a, b) => b.id - a.id);
    } else if (sortKey === "alpha") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    }

    return result;
  }, [allFacilities, typeFilter, debouncedSearch, sortKey]);

  /* Product counts per facility */
  const [productCounts, setProductCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    if (filtered.length === 0) return;
    const fetchCounts = async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        filtered.slice(0, 9).map(async (f) => {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/facilities/${f.id}/products`);
            if (res.ok) {
              const data = await res.json();
              counts[f.id] = Array.isArray(data) ? data.length : 0;
            }
          } catch {
            // ignore
          }
        })
      );
      setProductCounts(counts);
    };
    fetchCounts();
  }, [filtered.map((f) => f.id).join(",")]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card overflow-hidden">
            <Skeleton className="h-44 w-full" />
            <div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState title="تعذّر تحميل المنشآت" message="حدث خطأ أثناء جلب المنشآت" onRetry={() => refetch()} />;
  }

  if (!selectedRegionId) {
    return <EmptyState icon={Landmark} title="اختر منطقة لعرض المنشآت" description="حدد منطقتك من القائمة أعلى الصفحة" />;
  }

  if (allFacilities.length === 0) {
    return <EmptyState icon={Landmark} title="لا توجد منشآت في هذه المنطقة" description="ترقّب المزيد من المنشآت قريبًا" />;
  }

  const staggerVariants = prefersReduced
    ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
    : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <div>
      {/* Prominent search bar - always visible */}
      <div className="mb-6">
        <div className="relative max-w-lg">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث عن منشأة..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
            className="h-11 min-h-[44px] pr-11 rounded-full text-base"
          />
          <AnimatePresence>
            {searchInput === "" && isSearchFocused && recentSearches.length > 0 && (
              <motion.div
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-x-0 top-full z-20 mt-2"
              >
                <div className="glass-card rounded-xl border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchInput(term)}
                        onMouseDown={(e) => e.preventDefault()}
                        className="group inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 transition-colors min-h-[44px]"
                      >
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{term}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`حذف البحث: ${term}`}
                          onClick={(e) => { e.stopPropagation(); removeSearch(term); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeSearch(term); } }}
                          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={clearAll}
                    className="mt-2 text-xs text-secondary hover:underline min-h-[44px] inline-flex items-center"
                  >
                    مسح الكل
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar facilities={allFacilities} />

      {/* Filter Chips + Sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="scroll-area-thin flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {TYPE_CONFIG.map((cfg) => (
            <button
              key={cfg.key}
              onClick={() => setTypeFilter(cfg.key)}
              className={cn(
                "shrink-0 snap-start rounded-full px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center gap-2",
                typeFilter === cfg.key
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <cfg.icon className="h-4 w-4" />
              {cfg.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[44px]",
                sortKey === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results counter */}
      <p className="mb-4 text-sm text-muted-foreground">
        {filtered.length} منشأة
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptySearchIllustration />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          key={`${typeFilter}-${debouncedSearch}-${sortKey}`}
          variants={staggerVariants}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((f) => (
            <motion.div
              key={f.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
              }}
            >
              <FacilityCard facility={f} productCount={productCounts[f.id]} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function FacilitiesContent() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">المنشآت</h1>
        <p className="mt-1 text-sm text-muted-foreground">استعرض المطاعم والكافيهات والمرافق العامة المتاحة</p>
      </div>
      <FacilitiesGrid />
    </div>
  );
}
