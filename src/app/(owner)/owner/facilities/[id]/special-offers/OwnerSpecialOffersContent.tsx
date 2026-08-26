"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Plus,
  Flame,
  Tag,
  CalendarClock,
  Users,
  Ban,
  Trash2,
  Loader2,
  ImageOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveImageUrl, formatCurrency, formatDate } from "@/lib/format";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import {
  useOwnerSpecialOffers,
  useDeactivateSpecialOffer,
  useDeleteSpecialOffer,
} from "@/hooks/useSpecialOffers";
import { OwnerSpecialOfferForm } from "@/components/owner/OwnerSpecialOfferForm";
import type { SpecialOfferOut } from "@/types/api.generated";

/* ──────────────────────────────────────────────────────────── */
/*  مساعدات العرض                                              */
/* ──────────────────────────────────────────────────────────── */

/** يحوّل تاريخ ISO لعرض عربي مختصر (يوم/شهر/سنة). */
function formatEndsAt(iso: string | null): { text: string; isPermanent: boolean } {
  if (!iso) return { text: "دائم", isPermanent: true };
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { text: "دائم", isPermanent: true };
    const text = d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return { text, isPermanent: false };
  } catch {
    return { text: "دائم", isPermanent: true };
  }
}

/** يحسب نسبة التقدّم في الكمية المباعة. */
function computeProgress(offer: SpecialOfferOut): {
  sold: number;
  limit: number | null;
  percent: number;
  isFinished: boolean;
} {
  const sold = offer.quantity_sold ?? 0;
  const limit = offer.quantity_limit;
  if (limit == null || limit <= 0) {
    return { sold, limit: null, percent: 0, isFinished: false };
  }
  const percent = Math.min(100, Math.round((sold / limit) * 100));
  return { sold, limit, percent, isFinished: percent >= 100 };
}

/* ──────────────────────────────────────────────────────────── */
/*  البطاقة الواحدة (عرض خاص)                                  */
/* ──────────────────────────────────────────────────────────── */
interface OfferCardProps {
  offer: SpecialOfferOut;
  onDeactivate: (offer: SpecialOfferOut) => void;
  onAskDelete: (offer: SpecialOfferOut) => void;
  prefersReduced: boolean;
}

function OfferCard({
  offer,
  onDeactivate,
  onAskDelete,
  prefersReduced,
}: OfferCardProps) {
  const progress = computeProgress(offer);
  const ends = formatEndsAt(offer.ends_at);
  const isActive = offer.is_active && !progress.isFinished;

  const productName = offer.product?.name ?? `منتج #${offer.product_id}`;
  const productImage = offer.product?.image_url ?? null;

  return (
    <motion.div
      layout
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? undefined : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "gap-0 overflow-hidden pt-0",
          !isActive && "opacity-75"
        )}
      >
        {/* الرأس: الصورة + الحالة */}
        <div className="relative h-32 w-full bg-muted sm:h-40">
          {productImage ? (
            <ImageWithSkeleton
              src={resolveImageUrl(productImage)}
              alt={`صورة ${productName}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* شارة النشاط */}
          <div className="absolute top-3 right-3">
            {isActive ? (
              <Badge className="bg-emerald-600 text-white border-transparent shadow-md">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                نشط
              </Badge>
            ) : (
              <Badge variant="secondary" className="shadow-md">
                منتهٍ
              </Badge>
            )}
          </div>

          {/* شارة الخصم */}
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-primary text-primary-foreground border-transparent shadow-md">
              <Tag className="h-3 w-3" />
              خصم {offer.offer_discount_rate}%
            </Badge>
          </div>

          {/* اسم المنتج */}
          <div className="absolute bottom-3 right-3 max-w-[60%]">
            <span className="block truncate text-sm font-medium text-white drop-shadow">
              {productName}
            </span>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start gap-2">
            <Flame className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <CardTitle className="text-base leading-snug">
              {offer.title}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* الأسعار */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/40 p-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                سعر العضو
              </p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {formatCurrency(offer.member_price)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-2.5 text-center">
              <p className="text-xs text-muted-foreground">سعر الزبون</p>
              <p className="mt-0.5 text-sm font-semibold">
                {formatCurrency(offer.non_member_price)}
              </p>
            </div>
          </div>

          {/* تقدّم الكمية */}
          {progress.limit != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">المبيع:</span>
                <span className="font-medium">
                  {progress.sold} / {progress.limit}
                </span>
              </div>
              <Progress
                value={progress.percent}
                className={cn(
                  "h-2",
                  progress.isFinished && "opacity-70"
                )}
              />
              {progress.isFinished && (
                <p className="text-xs text-muted-foreground">
                  تم استيفاد الكمية المحددة — سيُنهى العرض تلقائياً.
                </p>
              )}
            </div>
          )}

          {/* تاريخ الانتهاء */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>
              {ends.isPermanent ? (
                <>ينتهي: <span className="font-medium text-foreground">دائم</span></>
              ) : (
                <>
                  ينتهي في: <span className="font-medium text-foreground">{ends.text}</span>
                </>
              )}
            </span>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full min-h-[40px] flex-1"
              disabled={!isActive}
              onClick={() => onDeactivate(offer)}
            >
              <Ban className="h-3.5 w-3.5" />
              إنهاء
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[40px]"
              onClick={() => onAskDelete(offer)}
              aria-label={`حذف عرض ${offer.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  حالة فارغة                                                  */
/* ──────────────────────────────────────────────────────────── */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">لا توجد عروض خاصة بعد</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          أنشئ عرضك الأول — سيُشعِر كل أعضاء توفير فور نشره. مثلاً: «عرض حصري —
          10 دجاجات بخصم 30%».
        </p>
      </div>
      <Button
        className="gap-2 rounded-full min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" />
        إنشاء عرض خاص
      </Button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  هيكل التحميل                                               */
/* ──────────────────────────────────────────────────────────── */
function LoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="gap-0 overflow-hidden pt-0">
          <Skeleton className="h-32 w-full rounded-none sm:h-40" />
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2 pt-2 border-t">
              <Skeleton className="h-9 flex-1 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  الصفحة الرئيسية                                            */
/* ──────────────────────────────────────────────────────────── */
export default function OwnerSpecialOffersContent() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const prefersReduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<SpecialOfferOut | null>(null);

  const activeOnly = activeTab === "active";
  const { data, isLoading, isFetching } = useOwnerSpecialOffers(
    facilityId,
    activeOnly
  );
  const deactivateMutation = useDeactivateSpecialOffer();
  const deleteMutation = useDeleteSpecialOffer();

  const offers = useMemo(() => data?.items ?? [], [data]);

  const handleDeactivate = (offer: SpecialOfferOut) => {
    deactivateMutation.mutate({ facilityId, offerId: offer.id });
  };

  const handleConfirmDelete = () => {
    if (!offerToDelete) return;
    deleteMutation.mutate(
      { facilityId, offerId: offerToDelete.id },
      {
        onSuccess: () => {
          setOfferToDelete(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* الرأس */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full min-h-[44px] min-w-[44px]"
            asChild
          >
            <Link href={`/owner/facilities/${facilityId}`} aria-label="رجوع">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Flame className="h-6 w-6 text-primary" />
              العروض الخاصة
            </h1>
            <p className="text-sm text-muted-foreground">
              أنشئ عروضاً حصرية لأعضاء توفير على منتجاتك المختارة.
            </p>
          </div>
        </div>
        <Button
          className="hidden sm:inline-flex gap-2 rounded-full min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="h-4 w-4" />
          إنشاء عرض خاص
        </Button>
      </header>

      {/* الفلاتر */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "all" | "active")}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="flex-1 min-h-[36px]">
            الكل
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 min-h-[36px]">
            النشطة فقط
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* عدّاد */}
      {!isLoading && offers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          عرض <span className="font-semibold text-foreground">{offers.length}</span>{" "}
          {activeOnly ? "عرض نشط" : "عرض"}
        </p>
      )}

      {/* القائمة */}
      {isLoading || (isFetching && offers.length === 0) ? (
        <LoadingSkeletons />
      ) : offers.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onDeactivate={handleDeactivate}
                onAskDelete={setOfferToDelete}
                prefersReduced={prefersReduced}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* زر عائم على الجوال */}
      <Button
        className="fixed bottom-20 left-4 z-30 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 lg:hidden"
        onClick={() => setFormOpen(true)}
        aria-label="إنشاء عرض خاص"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* النموذج (Dialog) */}
      <OwnerSpecialOfferForm
        facilityId={facilityId}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* تأكيد الحذف — AlertDialog (ديسكتوب) / BottomSheet (موبايل) الجولة 4 */}
      {isMobile ? (
        <Sheet
          open={!!offerToDelete}
          onOpenChange={(open) => !open && setOfferToDelete(null)}
        >
          <SheetContent
            side="bottom"
            className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="bottom-sheet-grip mt-1" aria-hidden="true" />
            <SheetHeader className="text-right">
              <SheetTitle className="flex items-center gap-2 text-right text-base">
                <Trash2 className="h-5 w-5 text-destructive" />
                حذف العرض الخاص
              </SheetTitle>
              <SheetDescription className="text-right">
                هل أنت متأكد من حذف العرض «{offerToDelete?.title}»؟ لا يمكن
                التراجع عن هذا الإجراء، وستُحذف كل البيانات المرتبطة به.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-row-reverse gap-2 px-4 pb-4">
              <Button
                type="button"
                className="native-tap min-h-[44px] flex-1 gap-2 rounded-full bg-destructive text-white hover:bg-destructive/90"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حذف
              </Button>
              <Button
                type="button"
                variant="outline"
                className="native-tap min-h-[44px] flex-1 rounded-full"
                disabled={deleteMutation.isPending}
                onClick={() => setOfferToDelete(null)}
              >
                إلغاء
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <AlertDialog
          open={!!offerToDelete}
          onOpenChange={(open) => !open && setOfferToDelete(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                حذف العرض الخاص
              </AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف العرض &quot;{offerToDelete?.title}&quot;؟ لا
                يمكن التراجع عن هذا الإجراء، وستُحذف كل البيانات المرتبطة به.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                className="rounded-full bg-destructive text-white hover:bg-destructive/90 min-h-[44px] gap-2"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حذف
              </AlertDialogAction>
              <AlertDialogCancel
                className="rounded-full min-h-[44px]"
                disabled={deleteMutation.isPending}
              >
                إلغاء
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
