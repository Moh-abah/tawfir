"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  Coffee,
  History,
  Landmark,
  Loader2,
  MapPin,
  MapPinned,
  Navigation,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberCard } from "@/components/public/MemberCard";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/public/ProductCard";
import { SpecialOffersSection } from "@/components/public/SpecialOffersSection";
import { FavoritesSection } from "@/components/public/FavoritesSection";
import { RecentlyViewedSection } from "@/components/public/RecentlyViewedSection";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { SectionTitle } from "@/components/public/SectionTitle";
import { useFacilities } from "@/hooks/useFacilities";
import { useNearbyProducts } from "@/hooks/useNearbyProducts";
import { useProducts } from "@/hooks/useProducts";
import { useDebounce } from "@/hooks/useDebounce";
import { useRegionStore } from "@/store/region.store";
import { useRecentSearchesStore } from "@/store/recent-searches.store";
import { toast } from "@/hooks/use-toast";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { DISCOUNT_RATE } from "@/lib/site-config";
import { resolveImageUrl } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import type { Facility, FacilityType } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  التصنيفات الدائرية — فقط مطاعم وكافيهات                            */
/* ------------------------------------------------------------------ */
/* خيارات نطاق البحث «الأقرب إليك» — radius_km (الجولة 5) */
const RADIUS_OPTIONS = [3, 5, 10, 25] as const;

const CATEGORIES: ReadonlyArray<{
  key: FacilityType;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "restaurant", label: "مطاعم", icon: UtensilsCrossed },
  { key: "cafe", label: "كافيهات", icon: Coffee },
];

const CATEGORY_CIRCLE: Record<
  FacilityType,
  { active: string; idle: string }
> = {
  restaurant: {
    active: "bg-cat-restaurant text-white shadow-soft",
    idle: "bg-cat-restaurant-soft text-cat-restaurant",
  },
  cafe: {
    active: "bg-cat-cafe text-white shadow-soft",
    idle: "bg-cat-cafe-soft text-cat-cafe",
  },
};

function CategoryCircles({
  active,
  onChange,
}: {
  active: FacilityType | null;
  onChange: (key: FacilityType | null) => void;
}) {
  return (
    <div
      className="scroll-area-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label="تصفية العروض حسب الفئة"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className="flex min-h-[44px] w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-2 transition-transform duration-150 active:scale-95"
      >
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-xs font-extrabold transition-all duration-200",
            active === null
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-muted text-muted-foreground"
          )}
        >
          الكل
        </span>
        <span
          className={cn(
            "text-xs leading-tight",
            active === null
              ? "font-bold text-foreground"
              : "font-medium text-foreground"
          )}
        >
          الكل
        </span>
      </button>
      {CATEGORIES.map((category) => {
        const Icon = category.icon;
        const isActive = active === category.key;
        return (
          <button
            key={category.key}
            type="button"
            onClick={() => onChange(isActive ? null : category.key)}
            aria-pressed={isActive}
            className="flex min-h-[44px] w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-2 transition-transform duration-150 active:scale-95"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200",
                isActive
                  ? CATEGORY_CIRCLE[category.key].active
                  : CATEGORY_CIRCLE[category.key].idle
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            <span
              className={cn(
                "text-xs leading-tight text-foreground",
                isActive ? "font-bold" : "font-medium"
              )}
            >
              {category.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  قسم Hero/CTA — MemberCard يعرض العضوية أو دعوة التسجيل             */
/* ------------------------------------------------------------------ */
function HeroSection() {
  return (
    <section
      className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10"
      aria-label="بطاقة العضوية"
    >
      <MemberCard />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  قسم العروض الحصرية + التصنيفات + البحث الأخير                       */
/* ------------------------------------------------------------------ */
function OffersSection() {
  const [activeType, setActiveType] = useState<FacilityType | null>(null);
  /* الجولة 9 (المهمة 9.1): searchInput هو المصدر الوحيد للحقيقة للعرض،
   * debouncedSearch هو نسخة مؤجّلة فقط للاستعلام — لا تُكتب برمجياً على searchInput
   * أبداً (لا مزامنة عكسية من نتائج الاستعلام إلى الحقل). الـ trim يحدث
   * downstream فقط للاستعلام والعرض، لا قبل useDebounce (حتى لا يُفقد
   * المستخدم المؤقت لحالات Unicode/RTL بين الكتابة والحذف). */
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const trimmedSearch = debouncedSearch.trim();
  /* الجولة 10 — «بحثك الأخير»: حفظ الكلمة عند اكتمال البحث (debounced غير فارغ)
   * + عرض رقائق قابلة للنقر عندما يكون الحقل فارغاً. */
  const recentSearches = useRecentSearchesStore((s) => s.searches);
  const addRecentSearch = useRecentSearchesStore((s) => s.addRecentSearch);
  const removeRecentSearch = useRecentSearchesStore((s) => s.removeRecentSearch);

  useEffect(() => {
    if (trimmedSearch.length >= 2) addRecentSearch(trimmedSearch);
  }, [trimmedSearch, addRecentSearch]);

  const { data, isLoading, error, refetch } = useProducts({
    only_available: true,
    type: activeType ?? undefined,
    search: trimmedSearch || undefined,
  });

  const products = data?.items ?? [];
  const filteredCount = products.length;

  return (
    <section id="offers" className="space-y-6" aria-label="أحدث الوجبات">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          eyebrow={<TawfirPillBadge />}
          icon={Sparkles}
          title="عروض حصرية"
          description="اكتشف أحدث الوجبات من مطاعمنا وكافيهاتنا المشتركة"
        />
        {(activeType || trimmedSearch) && (
          <button
            type="button"
            onClick={() => {
              setActiveType(null);
              setSearchInput("");
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border/60 px-4 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            إلغاء التصفية
          </button>
        )}
      </div>

      {/* بحث الوجبات — بارامتر search في GET /products (الجولة 5) */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث عن وجبة بالاسم..."
          aria-label="البحث في الوجبات"
          className="min-h-[44px] rounded-full pr-10"
          inputMode="search"
        />
      </div>

      {/* الجولة 10 — رقائق «بحثك الأخير» (تظهر فقط عندما يكون الحقل فارغاً) */}
      {searchInput.trim() === "" && recentSearches.length > 0 && (
        <div
          className="-mt-3 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="بحثك الأخير"
        >
          <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          {recentSearches.map((term) => (
            <span key={term} className="group/chip relative">
              <button
                type="button"
                onClick={() => {
                  haptic("tick");
                  setSearchInput(term);
                }}
                className="min-h-[36px] rounded-full border border-border/60 bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {term}
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("tick");
                  removeRecentSearch(term);
                }}
                aria-label={`إزالة ${term} من البحث الأخير`}
                className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <CategoryCircles active={activeType} onChange={setActiveType} />

      {error ? (
        <ErrorState
          title="تعذّر تحميل العروض"
          message="حدث خطأ أثناء جلب الوجبات. حاول مرة أخرى."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCount === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="لا توجد وجبات مطابقة"
          description={
            trimmedSearch
              ? `لا توجد وجبات تطابق «${trimmedSearch}»${activeType ? ` في ${TYPE_LABEL[activeType]}` : ""}. جرّب كلمة أخرى.`
              : activeType
                ? `لا توجد ${TYPE_LABEL[activeType]} متاحة الآن. جرّب فئة أخرى أو عُد لاحقاً.`
                : "ترقّب المزيد من الوجبات قريباً من مطاعمنا المشتركة."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {activeType || trimmedSearch ? (
                <Button
                  variant="outline"
                  className="rounded-full min-h-[44px]"
                  onClick={() => {
                    setActiveType(null);
                    setSearchInput("");
                  }}
                >
                  عرض كل الوجبات
                </Button>
              ) : null}
              {/* الجولة 12 — تحويل للبحث الموحّد (متاجر + عروض) عند تعذّر إيجاد وجبة */}
              {trimmedSearch.length >= 2 && (
                <Button asChild className="rounded-full min-h-[44px]">
                  <Link href={`/search?q=${encodeURIComponent(trimmedSearch)}`}>
                    ابحث في المتاجر والعروض
                  </Link>
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  قسم الأقرب إليك — زر جيو + شبكة بالمسافة                            */
/* ------------------------------------------------------------------ */
function NearbySection() {
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [enabled, setEnabled] = useState(false);
  // نطاق البحث — بارامتر radius_km في GET /products/nearby (الجولة 5)
  const [radiusKm, setRadiusKm] = useState(10);

  const { data, isLoading, error, refetch } = useNearbyProducts(
    coords?.lat ?? null,
    coords?.lng ?? null,
    radiusKm,
    enabled
  );

  const products = data?.items ?? [];

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({
        title: "غير مدعوم",
        description: "متصفحك لا يدعم تحديد الموقع.",
        variant: "destructive",
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEnabled(true);
        setLocating(false);
        toast({ title: "تم تحديد موقعك" });
      },
      (err) => {
        setLocating(false);
        // err.PERMISSION_DENIED = 1, err.POSITION_UNAVAILABLE = 2, err.TIMEOUT = 3
        const friendly =
          err.code === err.PERMISSION_DENIED
            ? "لم نتمكن من تحديد موقعك — يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح."
            : err.code === err.POSITION_UNAVAILABLE
              ? "الموقع غير متاح حالياً — تحقّق من اتصالك بالشبكة أو حاول لاحقاً."
              : err.code === err.TIMEOUT
                ? "انتهت مهلة تحديد الموقع — حاول مرة أخرى."
                : "تعذّر تحديد موقعك. حاول مرة أخرى.";
        toast({
          title: "تعذّر تحديد موقعك",
          description: friendly,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };

  return (
    <section className="space-y-6" aria-label="الأقرب إليك">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          icon={Navigation}
          title="الأقرب إليك"
          description="وجبات على بُعد بضعة كيلومترات من موقعك الحالي"
        />
        <Button
          type="button"
          variant={enabled ? "outline" : "default"}
          onClick={handleLocate}
          disabled={locating}
          className="min-h-[44px] shrink-0 gap-2 rounded-full"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Navigation className="h-4 w-4" aria-hidden="true" />
          )}
          {enabled ? "إعادة تحديد الموقع" : "حدد موقعي"}
        </Button>
      </div>

      {/* منتقي نطاق البحث — يظهر بعد تحديد الموقع */}
      {enabled && (
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="نطاق البحث بالكيلومتر"
        >
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              aria-pressed={radiusKm === r}
              className={cn(
                "min-h-[36px] shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
                radiusKm === r
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {r} كم
            </button>
          ))}
        </div>
      )}

      {!enabled ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center">
          <MapPinned
            className="mx-auto h-10 w-10 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            اضغط «حدد موقعي» لعرض الوجبات الأقرب إليك مرتبة بالمسافة.
          </p>
        </div>
      ) : error ? (
        <ErrorState
          title="تعذّر تحميل الوجبات القريبة"
          message="حدث خطأ أثناء جلب الوجبات من حولك. حاول مرة أخرى."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
          aria-busy="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="لا توجد وجبات قريبة"
          description={`لا توجد وجبات متاحة في نطاق ${radiusKm} كم من موقعك حالياً — جرّب توسيع النطاق.`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  قسم المتاجر — كروت متاجر                                            */
/* ------------------------------------------------------------------ */
function FacilityCard({ facility }: { facility: Facility }) {
  const PlaceholderIcon = TYPE_ICON[facility.type];
  const maxDiscount = facility.cards.length
    ? Math.max(...facility.cards.map((c) => c.discount_rate))
    : DISCOUNT_RATE;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg">
      <div className="relative aspect-video overflow-hidden">
        {facility.image_url ? (
          <ImageWithSkeleton
            src={resolveImageUrl(facility.image_url)}
            alt={facility.name}
            fill
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            skeletonClassName="rounded-none"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-muted"
            role="img"
            aria-label={facility.name}
          >
            <PlaceholderIcon
              className="h-12 w-12 text-muted-foreground/40"
              aria-hidden="true"
            />
          </div>
        )}
        {/* الجولة 12 — تدرّج سفلي خفيف يبرز شارة الخصم ويضيف عمقاً بصرياً */}
        {maxDiscount > 0 && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent"
            aria-hidden="true"
          />
        )}
        {maxDiscount > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-accent-foreground shadow-soft">
            خصم حتى {maxDiscount}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-bold leading-snug text-foreground">
              {facility.name}
            </h3>
            {facility.discount_rate != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <BadgePercent className="h-3 w-3" aria-hidden="true" />
                خصم {facility.discount_rate}%
              </span>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-secondary/15 px-2.5 py-1 text-[11px] font-bold text-secondary">
            {TYPE_LABEL[facility.type]}
          </span>
        </div>
        {facility.address && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{facility.address}</span>
          </p>
        )}
        <Button
          asChild
          variant="outline"
          className="mt-auto min-h-[44px] w-full rounded-full"
        >
          <Link href={`/facilities/${facility.id}`}>
            تصفّح المنتجات
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function FacilityCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-soft">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-auto h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

function FacilitiesSection() {
  const { data, isLoading, error, refetch } = useFacilities();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const facilities = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.display_order - b.display_order || a.id - b.id),
    [data]
  );

  return (
    <section className="space-y-6" aria-label="المتاجر">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle
          icon={Landmark}
          title="المتاجر المشتركة"
          description="استعرض المطاعم والكافيهات المشتركة في منطقتك"
        />
        <Button
          asChild
          variant="ghost"
          className="min-h-[44px] shrink-0 gap-1 rounded-full text-secondary"
        >
          <Link href="/facilities">
            عرض الكل
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {error ? (
        <ErrorState
          title="تعذّر تحميل المتاجر"
          message="حدث خطأ أثناء جلب المتاجر. حاول مرة أخرى."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <FacilityCardSkeleton key={i} />
          ))}
        </div>
      ) : !selectedRegionId ? (
        <EmptyState
          icon={Landmark}
          title="اختر منطقتك لعرض المتاجر"
          description="حدد منطقتك من القائمة في الأعلى لاستعراض المتاجر المشتركة قربك."
        />
      ) : facilities.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="لا توجد متاجر في منطقتك بعد"
          description="جرّب منطقة أخرى أو عُد لاحقاً — نضيف متاجر جديدة باستمرار."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.slice(0, 9).map((f) => (
            <FacilityCard key={f.id} facility={f} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  الصفحة الرئيسية                                                    */
/* ------------------------------------------------------------------ */

/** منطق السحب للتحديث — إبطال استعلامات الصفحة الرئيسية (الجولة 4). */
function HomeRefreshWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const onRefresh = useCallback(async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["products-nearby"] }),
      queryClient.invalidateQueries({ queryKey: ["special-offers"] }),
      queryClient.invalidateQueries({ queryKey: ["facilities"] }),
      queryClient.invalidateQueries({ queryKey: ["cards"] }),
    ]);
  }, [queryClient]);
  return (
    <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>
  );
}

export default function HomePage() {
  return (
    <HomeRefreshWrapper>
      <div className="w-full">
        <HeroSection />
        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-14">
          <OffersSection />
          <SpecialOffersSection />
          {/* الجولة 10 — مفضلتي (تظهر فقط عند وجود مفضلات محلية) */}
          <FavoritesSection />
          {/* الجولة 13 — شاهدت مؤخراً (تظهر فقط عند وجود مشاهدات محلية) */}
          <RecentlyViewedSection />
          <NearbySection />
          <FacilitiesSection />
        </div>
      </div>
    </HomeRefreshWrapper>
  );
}
