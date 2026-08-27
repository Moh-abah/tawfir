"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useReducedMotion, useInView } from "framer-motion";
import Link from "next/link";
import {  Phone, MapPin, Clock, Search, ExternalLink,
  UtensilsCrossed, Coffee, Landmark, ArrowRight, PackageOpen, ChevronLeft,
  Share2, Flag, Check, Heart, Copy, Twitter, MessageCircle, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DiscountBadge } from "@/components/shared/DiscountBadge";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useFacilityProducts, useAllFacilityProducts } from "@/hooks/useFacilityProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useFacilities } from "@/hooks/useFacilities";
import { useMe } from "@/hooks/useMe";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { TYPE_LABEL, SCHEMA_ORG_TYPE } from "@/lib/constants";
import { DISCOUNT_RATE } from "@/lib/site-config";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import type { FacilityType, Product } from "@/types/api.generated";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  CheckoutSheet,
  type CheckoutProduct,
  PLACEHOLDER_CHECKOUT_PRODUCT,
} from "@/components/public/CheckoutSheet";

function fallbackCopy(text: string, toastFn: (opts: { title: string; variant?: "destructive" }) => void) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toastFn({ title: "تم نسخ الرابط" });
  } catch {
    toastFn({ title: "تعذّر نسخ الرابط", variant: "destructive" });
  }
}

/* ─── Product Card ──────────────────────────────────── */
function ProductCard({ 
  product, 
  onClick, 
  onOrder,
  isMember,
  facilityRate,
}: {
  product: Product;
  onClick: () => void;
  onOrder: () => void;
  isMember: boolean;
  /** نسبة خصم المنشأة الفعلية (admin قابلة للتعديل 10-30) */
  facilityRate: number;
}) {
  const price = parseFloat(product.price);
  const memberRate = isMember ? facilityRate : 0;
  const finalPrice = isMember ? price * (1 - memberRate / 100) : price;
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
      }}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-2xl border bg-card overflow-hidden transition-all duration-200 card-glow",
        "hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
        !product.is_available && "opacity-60"
      )}
    >
      <div className="relative h-40 bg-muted">
        {product.image_url ? (
          <ImageWithSkeleton src={resolveImageUrl(product.image_url)} alt={product.name} fill className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/30">
            <UtensilsCrossed className="h-12 w-12" />
          </div>
        )}
        {!product.is_available && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            غير متاح حاليا
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground leading-snug">{product.name}</h3>
          {product.is_available && isMember && (
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
            >
              <DiscountBadge percentage={memberRate} />
            </motion.span>
          )}
        </div>
        {product.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          {product.is_available ? (
            <div className="flex flex-col gap-0.5">
              {isMember && (
                <span className="text-xs text-muted-foreground line-through" dir="ltr">
                  {formatCurrency(price)}
                </span>
              )}
              <span 
                className={cn(
                  "font-bold tabular-nums", 
                  isMember ? "text-primary" : "text-foreground"
                )} 
                dir="ltr"
              >
                {formatCurrency(finalPrice)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground" dir="ltr">{formatCurrency(price)}</span>
          )}
          <Button
            onClick={(e) => { 
              e.stopPropagation(); 
              onOrder(); 
            }}
            disabled={!product.is_available}
            size="sm"
            className="min-h-[44px] shrink-0 gap-1.5 rounded-full"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {product.is_available ? "اطلب" : "نفد"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Product Grid Skeleton ─────────────────────────── */
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card overflow-hidden">
          <Skeleton className="h-40 w-full" />
          <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-5 w-1/3" /></div>
        </div>
      ))}
    </div>
  );
}

/* ─── Enhanced Empty State (no products + no categories) ── */
function EnhancedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <PackageOpen className="h-24 w-24 text-muted-foreground/15" strokeWidth={1} />
        <div className="absolute inset-0 flex items-center justify-center">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground/25" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات بعد</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        هذه المنشأة لم تضف أي منتجات حتى الآن. ترقّب التحديثات القادمة!
      </p>
    </div>
  );
}

/* ─── Breadcrumbs ────────────────────────────────────── */
function Breadcrumbs({ facilityName }: { facilityName: string }) {
const prefersReduced = usePrefersReducedMotion();
  const containerVariants = prefersReduced
    ? { hidden: {}, visible: {} }
    : {
        hidden: { opacity: 0, y: -6 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
      };

  return (
    <nav aria-label="مسار التصفح" className="animate-page-enter">
      <motion.ol
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-1.5 text-sm"
      >
        <li>
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            الرئيسية
          </Link>
        </li>
        <li>
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
        </li>
        <li>
          <Link
            href="/facilities"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            المنشآت
          </Link>
        </li>
        <li>
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/50" />
        </li>
        <li>
          <span className="font-medium text-foreground line-clamp-1 max-w-[200px] sm:max-w-xs">
            {facilityName}
          </span>
        </li>
      </motion.ol>
    </nav>
  );
}

/* ─── Report Dialog ────────────────────────────────── */
const REPORT_CATEGORIES = [
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "wrong_info", label: "معلومات خاطئة" },
  { value: "closed", label: "منشأة مغلقة" },
  { value: "other", label: "أخرى" },
] as const;

function ReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!category.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      toast({ title: "تم إرسال البلاغ بنجاح. شكرًا لك" });
      setCategory("");
      setDescription("");
      setIsSubmitting(false);
      onOpenChange(false);
    }, 600);
  }, [category, toast, onOpenChange]);

  const handleClose = useCallback(() => {
    setCategory("");
    setDescription("");
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إبلاغ عن منشأة</DialogTitle>
          <DialogDescription>سيتم مراجعة البلاغ واتخاذ الإجراء المناسب</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="report-category" className="text-sm font-medium text-foreground">نوع البلاغ</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="report-category" className="w-full min-h-[44px]">
                <SelectValue placeholder="اختر نوع البلاغ" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="min-h-[44px]">{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="report-desc" className="text-sm font-medium text-foreground">تفاصيل البلاغ</label>
            <Textarea
              id="report-desc"
              placeholder="اشرح المشكلة التي واجهتها..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="min-h-[44px]"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!category.trim() || isSubmitting}
            className="min-h-[44px]"
          >
            {isSubmitting ? "جارٍ الإرسال..." : "إرسال البلاغ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Content ──────────────────────────────────── */
export default function FacilityDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { toast } = useToast();
  const facilityId = Number(params.id);
  const [activeCategory, setActiveCategory] = useState<string>("الكل");
  const [search, setSearch] = useState("");
const prefersReduced = usePrefersReducedMotion();
  const coverRef = useRef<HTMLDivElement>(null);

  const { data: facilities, isLoading: facLoading, error: facError, refetch: facRefetch } = useFacilities();
  const { data: categories, isLoading: catLoading } = useProductCategories(facilityId);
  const { data: products, isLoading: prodLoading, error: prodError, refetch: prodRefetch } = useFacilityProducts(facilityId, {
    category: activeCategory !== "الكل" ? activeCategory : undefined,
    search: search.trim() || undefined,
  });
  const { data: allProducts } = useAllFacilityProducts(facilityId);
  const me = useMe();
  const { accessToken, hydrated } = useCustomerAuth();
  const isMember = !!me.data?.membership?.is_active;

  const facility = useMemo(
    () => (facilities ?? []).find((f) => f.id === facilityId) ?? null,
    [facilities, facilityId]
  );

  /* ─── Open CheckoutSheet (auth-checked) ─────────── */
  const handleOrder = useCallback((p: Product) => {
    if (!hydrated) return;
    if (!accessToken) {
      toast({
        title: "سجّل الدخول أولاً",
        description: "يجب تسجيل الدخول لإتمام الطلب.",
      });
      router.push("/login");
      return;
    }
    setSelectedProduct(null);
    setCheckoutProduct(p);
    setCheckoutOpen(true);
  }, [hydrated, accessToken, toast, router]);

  const checkoutEffectiveProduct: CheckoutProduct = checkoutProduct
    ? {
        id: checkoutProduct.id,
        facility_id: checkoutProduct.facility_id,
        name: checkoutProduct.name,
        description: checkoutProduct.description,
        price: checkoutProduct.price,
        image_url: checkoutProduct.image_url,
        is_available: checkoutProduct.is_available,
        available_quantity: checkoutProduct.available_quantity,
      }
    : PLACEHOLDER_CHECKOUT_PRODUCT;

  /* ─── Parallax scroll effect (CSS variable, no re-renders) ── */
  useEffect(() => {
    if (prefersReduced) return;
    const el = coverRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const scale = 1 + Math.min(scrollY / 800, 0.12);
      el.style.setProperty("--cover-scale", String(scale));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [prefersReduced]);

  /* ─── Share handlers ──────────────────────────────── */
  const handleCopyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: "تم نسخ الرابط" });
      }).catch(() => {
        fallbackCopy(url, toast);
      });
    } else {
      fallbackCopy(url, toast);
    }
  }, [toast]);

  const handleShareTwitter = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تعرف على ${facility?.name ?? "هذه المنشأة"} على توفير`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }, [facility?.name, toast]);

  const handleShareWhatsApp = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`تعرف على ${facility?.name ?? "هذه المنشأة"} على توفير`);
    window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  }, [facility?.name, toast]);

  /* ─── Reading progress ────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = Math.min(scrollTop / docHeight, 1);
      setScrollProgress(progress * 100);
    };
    let ticking = false;
    const rafHandler = () => {
      onScroll();
      ticking = false;
    };
    const scrollListener = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(rafHandler);
      }
    };
    onScroll();
    window.addEventListener("scroll", scrollListener, { passive: true });
    return () => window.removeEventListener("scroll", scrollListener);
  }, []);

  /* ─── Category product counts ──────────────────────── */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { "الكل": 0 };
    if (allProducts) {
      counts["الكل"] = allProducts.length;
      for (const p of allProducts) {
        counts[p.category] = (counts[p.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [allProducts]);

  /* ─── Facility loading / error ─────────────────────── */
  if (facLoading || catLoading) {
    return (
      <div>
        <Skeleton className="h-56 w-full" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
          <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
          <div className="flex gap-2"><Skeleton className="h-10 w-20 rounded-full" /><Skeleton className="h-10 w-20 rounded-full" /><Skeleton className="h-10 w-20 rounded-full" /></div>
          <ProductGridSkeleton />
        </div>
      </div>
    );
  }

  if (facError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState title="تعذّر تحميل المنشأة" message="حدث خطأ أثناء جلب بيانات المنشأة" onRetry={() => facRefetch()} />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Landmark className="h-20 w-20 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">المنشأة غير موجودة</h3>
          <p className="text-sm text-muted-foreground mb-4">لم نتمكن من العثور على هذه المنشأة</p>
          <Link href="/facilities" className="text-sm text-secondary hover:underline min-h-[44px] inline-flex items-center">العودة للمنشآت</Link>
        </div>
      </div>
    );
  }

  const googleMapsUrl = facility.latitude && facility.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`
    : null;

  const allCategories = ["الكل", ...(categories ?? [])];
  const hasNoProductsAndNoCategories = !products?.length && !categories?.length;
  const totalProducts = products?.length ?? 0;

  const staggerVariants = prefersReduced
    ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
    : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <div>
      {/* Reading Progress Bar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-0.5",
          scrollProgress > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: `${scrollProgress}%`,
          background: "var(--primary)",
          transition: prefersReduced ? "none" : "width 0.1s linear",
        }}
        aria-hidden="true"
      />

      {/* Breadcrumbs */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <Breadcrumbs facilityName={facility.name} />
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": SCHEMA_ORG_TYPE[facility.type],
            name: facility.name,
            description: facility.description ?? "",
            address: facility.address ?? "",
            telephone: facility.phone ?? "",
            image: facility.image_url ?? "",
            servesCuisine: TYPE_LABEL[facility.type],
          }),
        }}
      />

      {/* Hero Cover */}
      <div className="relative h-56 overflow-hidden sm:h-80">
        <div
          ref={coverRef}
          className="absolute inset-0 will-change-transform"
          style={{ transform: "scale(var(--cover-scale, 1))" }}
        >
          {facility.image_url ? (
            <ImageWithSkeleton src={resolveImageUrl(facility.image_url)} alt={facility.name} fill className="h-full w-full" />
          ) : (
              <div className="flex h-full items-center justify-center bg-primary-deep">
              <Landmark className="h-16 w-16 text-white/20" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white sm:text-3xl">{facility.name}</h1>
                <span className="mt-2 inline-block rounded-full bg-secondary/90 px-3 py-1 text-xs font-medium text-white">
                  {TYPE_LABEL[facility.type]}
                </span>
              </div>
              <DiscountBadge percentage={facility.discount_rate ?? DISCOUNT_RATE} />
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar — pill cards */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          {facility.working_hours && (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-muted-foreground min-h-[44px]">
              <Clock className="h-4 w-4 shrink-0 text-foreground/60" />{facility.working_hours}
            </span>
          )}
          {facility.phone && (
            <a href={`tel:${facility.phone}`} className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-secondary hover:bg-muted/80 min-h-[44px] transition-colors">
              <Phone className="h-4 w-4 shrink-0" />{facility.phone}
            </a>
          )}
          {facility.address && (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-muted-foreground min-h-[44px]">
              <MapPin className="h-4 w-4 shrink-0 text-foreground/60" />{facility.address}
            </span>
          )}
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-secondary hover:bg-muted/80 min-h-[44px] transition-colors">
              <ExternalLink className="h-4 w-4 shrink-0" />افتح في الخرائط
            </a>
          )}
          <div className="mr-auto flex items-center gap-2">
            <button
              onClick={() => {
                setIsFavorite((prev) => {
                  const next = !prev;
                  toast({ title: next ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة" });
                  return next;
                });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm min-h-[44px] transition-colors hover:bg-muted/80"
              aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              <motion.span
                key={isFavorite ? "filled" : "outline"}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
              >
                <Heart className={cn("h-4 w-4 shrink-0 transition-colors", isFavorite ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary")} />
              </motion.span>
              {isFavorite ? "مفضلة" : "تفضيل"}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm min-h-[44px] transition-colors",
                    "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  مشاركة
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="min-h-[44px] gap-3 cursor-pointer"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  <span>نسخ الرابط</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-[44px] gap-3 cursor-pointer"
                  onClick={handleShareTwitter}
                >
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                  <span>مشاركة على X</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-[44px] gap-3 cursor-pointer"
                  onClick={handleShareWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span>مشاركة عبر واتساب</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-destructive min-h-[44px] transition-colors"
            >
              <Flag className="h-4 w-4 shrink-0" />
              إبلاغ
            </button>
          </div>
          <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />
        </div>
      </div>

      {/* Product Quick View Modal */}
      <Dialog open={selectedProduct !== null} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="sm:max-w-md">
          {selectedProduct && (
            <motion.div
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative h-56 overflow-hidden rounded-xl bg-muted mb-4">
                {selectedProduct.image_url ? (
                  <ImageWithSkeleton src={resolveImageUrl(selectedProduct.image_url)} alt={selectedProduct.name} fill className="h-full w-full" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/30">
                    <UtensilsCrossed className="h-12 w-12" />
                  </div>
                )}
              </div>
              <DialogHeader className="text-right">
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-xl font-bold">{selectedProduct.name}</DialogTitle>
                  <span className="shrink-0 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {selectedProduct.category}
                  </span>
                </div>
                <DialogDescription className="sr-only">عرض تفاصيل المنتج</DialogDescription>
              </DialogHeader>
              {selectedProduct.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {selectedProduct.description}
                </p>
              )}
              <div className="mt-4 flex items-baseline gap-3">
                {isMember ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through" dir="ltr">
                      {formatCurrency(parseFloat(selectedProduct.price))}
                    </span>
                    <span className="text-2xl font-extrabold text-primary" dir="ltr">
                      {formatCurrency(parseFloat(selectedProduct.price) * (1 - DISCOUNT_RATE / 100))}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold text-foreground" dir="ltr">
                    {formatCurrency(parseFloat(selectedProduct.price))}
                  </span>
                )}
              </div>
              <DialogFooter className="mt-6">
                <Button 
                  onClick={() => handleOrder(selectedProduct)}
                  disabled={!selectedProduct.is_available}
                  className="w-full rounded-full min-h-[44px] gap-2"
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  {selectedProduct.is_available ? "اطلب الآن" : "غير متوفر"}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Category Chips - Sticky */}
        <div className="sticky top-14 z-30 -mx-4 border-b bg-background/95 backdrop-blur-md px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="scroll-area-thin mb-2 flex snap-x snap-mandatory gap-2 overflow-x-auto">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 snap-start rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px] inline-flex items-center gap-2",
                  activeCategory === cat
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {cat}
                {categoryCounts[cat] !== undefined && (
                  <span className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-none",
                    activeCategory === cat
                      ? "bg-white/20 text-secondary-foreground"
                      : "bg-foreground/10 text-muted-foreground"
                  )}>
                    {categoryCounts[cat]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full pr-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-6">
          {prodLoading ? (
            <ProductGridSkeleton />
          ) : prodError ? (
            <ErrorState title="تعذّر تحميل المنتجات" message="حدث خطأ أثناء جلب المنتجات" onRetry={() => prodRefetch()} />
          ) : hasNoProductsAndNoCategories ? (
            <EnhancedEmptyState />
          ) : !products || products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">لا توجد منتجات</h3>
              <p className="text-sm text-muted-foreground max-w-sm">لا توجد منتجات متاحة في هذه الفئة حاليًا</p>
            </div>
          ) : (
            <>
              {/* Product count */}
              <p className="mb-4 text-sm text-muted-foreground">
                عدد المنتجات: {totalProducts}
              </p>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerVariants}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {products.map((p) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onClick={() => setSelectedProduct(p)}
                    onOrder={() => handleOrder(p)}
                    isMember={isMember}
                    facilityRate={facility?.discount_rate ?? DISCOUNT_RATE}
                  />
                ))}
              </motion.div>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-8 mb-20 md:mb-0">
          <Link href="/facilities" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:underline min-h-[44px]">
            <ArrowRight className="h-4 w-4" />العودة لقائمة المنشآت
          </Link>
        </div>
      </div>

      {/* Sticky Bottom Bar - Mobile — ثلاث حالات صحيحة (إصلاح لغم الجولة الختامية):
          زائر: دعوة لطيفة للتسجيل | مسجل بلا عضوية: دعوة اشتراك | عضو نشط: لا شريط إطلاقاً */}
      {!(hydrated && accessToken && isMember) && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                {hydrated && accessToken
                  ? "خصم حتى 30% مع عضوية توفير"
                  : "سجّل واحصل على خصم حتى 30%"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hydrated && accessToken
                  ? "اشترك في العضوية واستمتع بالخصم الفوري على طلباتك"
                  : "أنشئ حساباً مجاناً واستمتع بالخصم الفوري"}
              </p>
            </div>
            <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 min-h-[44px] shrink-0">
              <Link href={hydrated && accessToken ? "/membership/subscribe" : "/register"}>
                {hydrated && accessToken ? "اشترك الآن" : "تسجيل"}
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* شاشة الطلب — تُفتح من زر «اطلب» على أي منتج */}
      <CheckoutSheet
        key={checkoutEffectiveProduct.id}
        product={checkoutEffectiveProduct}
        facilityName={facility?.name ?? null}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      />
    </div>
  );
}
