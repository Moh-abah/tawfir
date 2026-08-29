"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Flame,
  History,
  Loader2,
  Search,
  SearchX,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard, ProductCardSkeleton } from "@/components/public/ProductCard";
import {
  SpecialOfferCard,
  SpecialOfferCardSkeleton,
} from "@/components/public/SpecialOfferCard";
import {
  CheckoutSheet,
  type CheckoutProduct,
} from "@/components/public/CheckoutSheet";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { useFacilities } from "@/hooks/useFacilities";
import { useSpecialOffers } from "@/hooks/useSpecialOffers";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentSearchesStore } from "@/store/recent-searches.store";
import { TYPE_LABEL, TYPE_ICON } from "@/lib/constants";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import { resolveImageUrl, formatCurrency } from "@/lib/format";
import type {
  Facility,
  SpecialOfferOut,
} from "@/types/api.generated";

/* ─── تبويبات البحث ─────────────────────────────────── */
type SearchTab = "all" | "products" | "facilities" | "offers";

const TABS: { key: SearchTab; label: string; icon: typeof Search }[] = [
  { key: "all", label: "الكل", icon: Search },
  { key: "products", label: "وجبات", icon: UtensilsCrossed },
  { key: "facilities", label: "متاجر", icon: Store },
  { key: "offers", label: "عروض", icon: Flame },
];

/* ─── صف متجر مدمج (نتيجة بحث) ─────────────────────── */
function FacilityResultRow({ facility }: { facility: Facility }) {
  const TypeIcon = TYPE_ICON[facility.type] ?? Store;
  return (
    <Link
      href={`/facilities/${facility.id}`}
      className="native-tap group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 transition-all duration-150 hover:border-primary/30 hover:shadow-soft active:scale-[0.98]"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {facility.image_url ? (
          <ImageWithSkeleton
            src={resolveImageUrl(facility.image_url)}
            alt={facility.name}
            fill
            className="h-full w-full object-cover"
            skeletonClassName="rounded-none"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <TypeIcon className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {facility.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <TypeIcon className="h-3 w-3" aria-hidden="true" />
          {TYPE_LABEL[facility.type] ?? "متجر"}
          {facility.address != null && facility.address.trim() !== "" && (
            <span className="truncate">· {facility.address}</span>
          )}
        </p>
      </div>
      {facility.discount_rate != null && facility.discount_rate > 0 && (
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold text-accent-foreground">
          خصم {facility.discount_rate}%
        </span>
      )}
      <ChevronLeft
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

/* ─── هيكل قسم نتائج ───────────────────────────────── */
function ResultSection({
  title,
  count,
  icon: Icon,
  onShowAll,
  children,
}: {
  title: string;
  count: number;
  icon: typeof Search;
  onShowAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
          <span
            className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground"
            aria-label={`${count} نتيجة`}
          >
            {count}
          </span>
        </h2>
        {onShowAll && count > 0 && (
          <button
            type="button"
            onClick={() => {
              haptic("tick");
              onShowAll();
            }}
            className="native-tap inline-flex min-h-[36px] items-center gap-0.5 rounded-full px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
          >
            عرض الكل
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─── الشاشة الرئيسية للبحث الموحّد ─────────────────── */
export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* searchInput هو المصدر الوحيد للحقيقة للعرض (الجولة 9 — 9.1):
   * لا تُكتب قيمة الحقل برمجياً أبداً إلا بفعل المستخدم (رقاقة/مسح). */
  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const debouncedSearch = useDebounce(searchInput, 350);
  const trimmedSearch = debouncedSearch.trim();
  const isSearching = trimmedSearch.length >= 1;

  /* بحثك الأخير — مشترك مع الرئيسية (الجولة 10) */
  const recentSearches = useRecentSearchesStore((s) => s.searches);
  const addRecentSearch = useRecentSearchesStore((s) => s.addRecentSearch);
  const removeRecentSearch = useRecentSearchesStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useRecentSearchesStore((s) => s.clearRecentSearches);

  /* حفظ الكلمة عند استقرار البحث (نفس نمط الرئيسية) */
  useEffect(() => {
    if (trimmedSearch.length >= 2) addRecentSearch(trimmedSearch);
  }, [trimmedSearch, addRecentSearch]);

  /* الاستعلامات الثلاثة — تُفعَّل فقط عند وجود كلمة بحث */
  const productsQuery = useProducts({
    search: isSearching ? trimmedSearch : undefined,
  });
  const facilitiesQuery = useFacilities();
  const offersQuery = useSpecialOffers(1, 50);

  /* فلترة المتاجر والعروض محلياً (نفس API المستخدم في صفحاتهما) */
  const products = useMemo(
    () => productsQuery.data?.items ?? [],
    [productsQuery.data]
  );
  const matchedFacilities = useMemo(() => {
    const all = facilitiesQuery.data ?? [];
    if (!isSearching) return [];
    return all
      .filter((f) => f.is_visible)
      .filter((f) => f.name.includes(trimmedSearch))
      .sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  }, [facilitiesQuery.data, trimmedSearch, isSearching]);
  const matchedOffers = useMemo(() => {
    const all = offersQuery.data?.items ?? [];
    if (!isSearching) return [];
    const q = trimmedSearch;
    return all.filter(
      (o) =>
        o.title.includes(q) ||
        (o.product?.name ?? "").includes(q) ||
        (o.facility?.name ?? "").includes(q)
    );
  }, [offersQuery.data, trimmedSearch, isSearching]);

  const productsLoading = isSearching && productsQuery.isLoading;
  const facilitiesLoading = isSearching && facilitiesQuery.isLoading;
  const offersLoading = isSearching && offersQuery.isLoading;
  const anyLoading =
    (activeTab === "all" || activeTab === "products") && productsLoading;
  const totalResults =
    products.length + matchedFacilities.length + matchedOffers.length;

  /* ═══ الجولة 17 — اقتراحات ذكية عند فراغ النتائج ═══
   * عند عدم وجود أي نتائج: نستعلم عن الوجبات المتاحة (بلا كلمة بحث)
   * لاشتقاق رقائق اقتراح + شريط «متاح الآن» — نهاية مسدودة → لحظة اكتشاف.
   * enabled يمنع الاستدعاء إلا عند الحاجة الفعلية (فراغ مؤكد). */
  const noResultsConfirmed =
    isSearching &&
    !anyLoading &&
    !facilitiesLoading &&
    !offersLoading &&
    totalResults === 0 &&
    !productsQuery.error;
  const discoveryQuery = useProducts(
    { only_available: true, page_size: 12 },
    noResultsConfirmed
  );

  /* رقائق الاقتراح: الكلمة الأولى من أسماء الوجبات المتاحة
   * (مندي/مدبي/حنيذ/سلتة...) — مُفرَّدة وبلا تكرار وبلا الكلمة الحالية */
  const suggestionTerms = useMemo(() => {
    if (!noResultsConfirmed) return [];
    const items = discoveryQuery.data?.items ?? [];
    const terms = new Set<string>();
    for (const p of items) {
      const first = p.name.trim().split(/\s+/)[0];
      if (
        first &&
        first.length >= 2 &&
        first !== trimmedSearch &&
        !trimmedSearch.includes(first)
      ) {
        terms.add(first);
      }
      if (terms.size >= 6) break;
    }
    return Array.from(terms).slice(0, 6);
  }, [noResultsConfirmed, discoveryQuery.data, trimmedSearch]);

  /* الوجبات المتاحة للاكتشاف — حتى 8 بطاقات مصغّرة */
  const discoveryProducts = useMemo(
    () =>
      noResultsConfirmed
        ? (discoveryQuery.data?.items ?? []).slice(0, 8)
        : [],
    [noResultsConfirmed, discoveryQuery.data]
  );

  /* CheckoutSheet للعروض الخاصة من نتائج البحث */
  const [selectedOffer, setSelectedOffer] = useState<SpecialOfferOut | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const checkoutProduct: CheckoutProduct = selectedOffer
    ? {
        id: selectedOffer.product?.id ?? 0,
        facility_id: selectedOffer.facility_id,
        name: selectedOffer.product?.name ?? selectedOffer.title,
        description: null,
        price: String(
          selectedOffer.base_price ?? selectedOffer.product?.price ?? 0
        ),
        image_url: selectedOffer.product?.image_url ?? null,
        is_available: (selectedOffer.quantity_remaining ?? 1) > 0,
        available_quantity: selectedOffer.quantity_remaining,
      }
    : {
        id: 0,
        facility_id: 0,
        name: "",
        description: null,
        price: "0",
        image_url: null,
        is_available: false,
        available_quantity: null,
      };
  const checkoutSpecialOffer = selectedOffer
    ? {
        id: selectedOffer.id,
        offer_discount_rate: selectedOffer.offer_discount_rate,
        base_price: selectedOffer.base_price,
        member_price: selectedOffer.member_price,
        non_member_price: selectedOffer.non_member_price,
        facility_discount_rate: selectedOffer.facility_discount_rate,
      }
    : null;

  /* عدد النتائج لكل تبويب (للشارات) */
  const tabCounts: Record<SearchTab, number> = {
    all: totalResults,
    products: products.length,
    facilities: matchedFacilities.length,
    offers: matchedOffers.length,
  };

  return (
    <>
      <ScreenHeader title="البحث" fallbackHref="/" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        {/* حقل البحث — كبير وثابت أعلى الشاشة */}
        <div className="sticky top-14 z-30 -mx-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث عن وجبة أو متجر أو عرض..."
              aria-label="البحث في توفير"
              className="min-h-[52px] rounded-2xl pr-12 text-base font-medium shadow-soft"
              inputMode="search"
              autoFocus
            />
            {searchInput.trim() !== "" && (
              <button
                type="button"
                onClick={() => {
                  haptic("tick");
                  setSearchInput("");
                }}
                aria-label="مسح البحث"
                className="native-tap absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* تبويبات النتائج — segmented control (تظهر أثناء البحث فقط) */}
          <AnimatePresence initial={false}>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                role="tablist"
                aria-label="نوع نتائج البحث"
                className="mt-2.5 flex gap-1.5 overflow-x-auto no-mobile-scrollbar"
              >
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        haptic("tick");
                        setActiveTab(tab.key);
                      }}
                      className={cn(
                        "native-tap inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all duration-150",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-soft"
                          : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {tab.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] tabular-nums",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {tabCounts[tab.key]}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ حالة عدم البحث: بحثك الأخير + تلميح ═══ */}
        {!isSearching ? (
          <div className="space-y-6 pt-2">
            {recentSearches.length > 0 && (
              <section aria-label="بحثك الأخير">
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                    <History className="h-4 w-4 text-primary" aria-hidden="true" />
                    بحثك الأخير
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      haptic("tick");
                      clearRecentSearches();
                    }}
                    className="native-tap inline-flex min-h-[36px] items-center rounded-full px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive"
                  >
                    مسح الكل
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <span key={term} className="group/chip relative">
                      <button
                        type="button"
                        onClick={() => {
                          haptic("tick");
                          setSearchInput(term);
                        }}
                        className="native-tap min-h-[40px] rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
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
              </section>
            )}

            {/* تلميح البداية */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-primary/10 to-accent/10">
                <Sparkles className="h-8 w-8 text-primary/70" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="text-base font-extrabold text-foreground">
                  ابحث في كل شيء
                </p>
                <p className="max-w-[300px] text-xs leading-relaxed text-muted-foreground">
                  وجباتك المفضلة، المطاعم والكافيهات القريبة، وعروض توفير
                  الحصرية — كلها من حقل بحث واحد.
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
                <span className="rounded-full bg-card px-2.5 py-1">مندي</span>
                <span className="rounded-full bg-card px-2.5 py-1">قهوة</span>
                <span className="rounded-full bg-card px-2.5 py-1">بروست</span>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ حالة البحث: النتائج ═══ */
          <div className="space-y-6 pt-1">
            {/* خطأ عام في الوجبات */}
            {productsQuery.error && activeTab !== "facilities" && activeTab !== "offers" && (
              <EmptyState
                icon={SearchX}
                title="تعذّر إكمال البحث"
                description="حدث خطأ أثناء جلب النتائج. تحقّق من اتصالك وحاول مرة أخرى."
                action={
                  <button
                    type="button"
                    onClick={() => productsQuery.refetch()}
                    className="native-tap inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    إعادة المحاولة
                  </button>
                }
              />
            )}

            {/* ── تبويب: الكل ── */}
            {activeTab === "all" && (
              <div className="space-y-7">
                {/* الوجبات (أقصى 6) */}
                <ResultSection
                  title="وجبات"
                  count={products.length}
                  icon={UtensilsCrossed}
                  onShowAll={() => setActiveTab("products")}
                >
                  {anyLoading ? (
                    <div
                      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
                      aria-busy="true"
                    >
                      {Array.from({ length: 4 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <p className="rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      لا توجد وجبات تطابق «{trimmedSearch}»
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                      {products.slice(0, 6).map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  )}
                </ResultSection>

                {/* المتاجر (أقصى 3) */}
                <ResultSection
                  title="متاجر"
                  count={matchedFacilities.length}
                  icon={Store}
                  onShowAll={() => setActiveTab("facilities")}
                >
                  {facilitiesLoading ? (
                    <div className="space-y-2" aria-busy="true">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
                      ))}
                    </div>
                  ) : matchedFacilities.length === 0 ? (
                    <p className="rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      لا توجد متاجر تطابق «{trimmedSearch}»
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matchedFacilities.slice(0, 3).map((f) => (
                        <FacilityResultRow key={f.id} facility={f} />
                      ))}
                    </div>
                  )}
                </ResultSection>

                {/* العروض الخاصة (أقصى 4) */}
                <ResultSection
                  title="عروض خاصة"
                  count={matchedOffers.length}
                  icon={Flame}
                  onShowAll={() => setActiveTab("offers")}
                >
                  {offersLoading ? (
                    <div
                      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
                      aria-busy="true"
                    >
                      {Array.from({ length: 2 }).map((_, i) => (
                        <SpecialOfferCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : matchedOffers.length === 0 ? (
                    <p className="rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                      لا توجد عروض خاصة تطابق «{trimmedSearch}» حالياً
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                      {matchedOffers.slice(0, 4).map((offer) => (
                        <SpecialOfferCard
                          key={offer.id}
                          specialOffer={offer}
                          onOrder={(o) => {
                            setSelectedOffer(o);
                            setCheckoutOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </ResultSection>

                {/* لا نتائج إطلاقاً — الجولة 17: اقتراحات ذكية + اكتشاف */}
                {noResultsConfirmed && (
                  <div className="space-y-6">
                    <EmptyState
                      icon={SearchX}
                      title={`لا نتائج لـ «${trimmedSearch}»`}
                      description="جرّب كلمة أقصر أو تهجئة مختلفة — أو اكتشف المتاح الآن بالأسفل."
                    />

                    {/* رقائق اقتراح — كلمات مشتقة من وجبات حقيقية متاحة */}
                    {suggestionTerms.length > 0 && (
                      <section aria-label="اقتراحات بحث">
                        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                          <Sparkles
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          جرّب البحث عن
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {suggestionTerms.map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => {
                                haptic("tick");
                                setSearchInput(term);
                              }}
                              className="native-tap min-h-[40px] rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-bold text-primary transition-all duration-150 hover:border-primary/40 hover:bg-primary/10 active:scale-95"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* بحثك الأخير — إعادة الوصول السريع */}
                    {recentSearches.length > 0 && (
                      <section aria-label="بحثك الأخير">
                        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                          <History
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          بحثك الأخير
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.slice(0, 5).map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => {
                                haptic("tick");
                                setSearchInput(term);
                              }}
                              className="native-tap min-h-[40px] rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* متاح الآن — شريط اكتشاف أفقي */}
                    {discoveryQuery.isLoading ? (
                      <div
                        className="flex gap-3 overflow-hidden"
                        aria-busy="true"
                      >
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[132px] shrink-0 space-y-2 rounded-xl border border-border/30 bg-card p-2"
                          >
                            <Skeleton className="aspect-square w-full rounded-lg" />
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-2.5 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : discoveryProducts.length > 0 ? (
                      <section aria-label="وجبات متاحة الآن">
                        <div className="mb-2.5 flex items-center justify-between">
                          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                            <UtensilsCrossed
                              className="h-4 w-4 text-primary"
                              aria-hidden="true"
                            />
                            متاح الآن — قد يعجبك
                          </h3>
                          <Link
                            href="/"
                            className="native-tap inline-flex min-h-[36px] items-center gap-0.5 rounded-full px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
                          >
                            الرئيسية
                            <ChevronLeft
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                        <div className="no-mobile-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                          {discoveryProducts.map((p) => (
                            <Link
                              key={p.id}
                              href={`/products/${p.id}`}
                              className="native-tap-card group w-[132px] shrink-0 snap-start rounded-xl border border-border/30 bg-card p-2 shadow-sm transition-all duration-150 hover:border-primary/30 hover:shadow-md"
                            >
                              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
                                {p.image_url ? (
                                  <ImageWithSkeleton
                                    src={resolveImageUrl(p.image_url)}
                                    alt={p.name}
                                    fill
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    skeletonClassName="rounded-lg"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center">
                                    <UtensilsCrossed
                                      className="h-6 w-6 text-muted-foreground/40"
                                      aria-hidden="true"
                                    />
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 line-clamp-1 text-xs font-bold text-foreground">
                                {p.name}
                              </p>
                              <p className="line-clamp-1 text-[10px] text-muted-foreground">
                                {p.facility.name}
                              </p>
                              <p
                                className="mt-0.5 text-xs font-bold tabular-nums text-primary"
                                dir="ltr"
                              >
                                {formatCurrency(parseFloat(p.price) || 0)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* ── تبويب: وجبات ── */}
            {activeTab === "products" && (
              <div>
                {anyLoading ? (
                  <div
                    className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
                    aria-busy="true"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <EmptyState
                    icon={UtensilsCrossed}
                    title="لا توجد وجبات مطابقة"
                    description={`لا توجد وجبات تطابق «${trimmedSearch}». جرّب كلمة أخرى.`}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                    {products.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── تبويب: متاجر ── */}
            {activeTab === "facilities" && (
              <div>
                {facilitiesLoading ? (
                  <div className="space-y-2" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
                    ))}
                  </div>
                ) : matchedFacilities.length === 0 ? (
                  <EmptyState
                    icon={Store}
                    title="لا توجد متاجر مطابقة"
                    description={`لا توجد متاجر تطابق «${trimmedSearch}» في منطقتك الحالية.`}
                    action={
                      <Link
                        href="/facilities"
                        className="native-tap inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
                      >
                        كل المتاجر
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {matchedFacilities.map((f) => (
                      <FacilityResultRow key={f.id} facility={f} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── تبويب: عروض ── */}
            {activeTab === "offers" && (
              <div>
                {offersLoading ? (
                  <div
                    className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6"
                    aria-busy="true"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SpecialOfferCardSkeleton key={i} />
                    ))}
                  </div>
                ) : matchedOffers.length === 0 ? (
                  <EmptyState
                    icon={Flame}
                    title="لا توجد عروض مطابقة"
                    description={`لا توجد عروض خاصة تطابق «${trimmedSearch}» حالياً — عُد لاحقاً لعروض جديدة.`}
                    action={
                      <Link
                        href="/offers"
                        className="native-tap inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
                      >
                        كل العروض
                      </Link>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                    {matchedOffers.map((offer) => (
                      <SpecialOfferCard
                        key={offer.id}
                        specialOffer={offer}
                        onOrder={(o) => {
                          setSelectedOffer(o);
                          setCheckoutOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CheckoutSheet مشترك لعروض البحث */}
      <CheckoutSheet
        product={checkoutProduct}
        facilityName={selectedOffer?.facility?.name ?? undefined}
        specialOffer={checkoutSpecialOffer}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />
    </>
  );
}

export default SearchContent;
