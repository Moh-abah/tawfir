"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Hash,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { cn } from "@/lib/utils";
import { formatDate, resolveImageUrl } from "@/lib/format";
import {
  FinanceStatusBadge,
  MoneyText,
  NOTIFICATION_STATUS_AR,
} from "@/components/finance/finance-ui";
import {
  useOwnerYemenNotifications,
  useSubmitYemenNotification,
} from "@/hooks/useFinance";
import type { FinanceNotification } from "@/services/finance.service";

/* ═══════════════ فلترة محلية بسيطة ═══════════════ */

type FilterKey = "all" | "submitted" | "approved" | "rejected";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "submitted", label: "معلّق" },
  { key: "approved", label: "مقبول" },
  { key: "rejected", label: "مرفوض" },
];

/** صف معلومات صغير داخل بطاقة الإشعار (بنك/مرجع/تاريخ). */
function MetaRow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span dir="auto" className="min-w-0 truncate">
        {children}
      </span>
    </div>
  );
}

/* ═══════════════ بطاقة إشعار واحد ═══════════════ */

function NotificationCard({
  n,
  onZoomImage,
}: {
  n: FinanceNotification;
  onZoomImage: (src: string) => void;
}) {
  const rejected = String(n.status) === "rejected";
  const hasMeta = Boolean(n.bank_name || n.reference_no || n.transfer_date);
  const resolvedImage = resolveImageUrl(n.image_url);

  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <MoneyText
            amount={n.amount}
            currency={n.currency}
            strong
            className="text-lg text-foreground"
          />
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDate(n.created_at)}
          </p>
        </div>
        <FinanceStatusBadge
          status={n.status}
          dictionary={NOTIFICATION_STATUS_AR}
          className="shrink-0"
        />
      </div>

      {hasMeta && (
        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
          {n.bank_name && <MetaRow icon={Landmark}>{n.bank_name}</MetaRow>}
          {n.reference_no && <MetaRow icon={Hash}>{n.reference_no}</MetaRow>}
          {n.transfer_date && (
            <MetaRow icon={CalendarDays}>{n.transfer_date}</MetaRow>
          )}
        </div>
      )}

      {/* سبب الرفض — صندوق تحذيري بارز */}
      {rejected && n.review_note && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 dark:border-amber-400/30 dark:bg-amber-400/10"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <p className="min-w-0 break-words text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-300">
            سبب الرفض: {n.review_note}
          </p>
        </div>
      )}

      {/* صورة الإيصال — thumbnail قابل للتكبير */}
      {resolvedImage && (
        <button
          type="button"
          onClick={() => onZoomImage(resolvedImage)}
          className="group mt-3 inline-flex min-h-[44px] items-end gap-1.5"
          aria-label="اضغط لتكبير صورة الإيصال"
        >
          <span className="relative block overflow-hidden rounded-xl border border-border/60">
            <img
              src={resolvedImage}
              alt="صورة إيصال التحويل"
              loading="lazy"
              className="h-16 w-16 object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </span>
          <span className="inline-flex items-center gap-1 pb-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            تكبير
          </span>
        </button>
      )}
    </article>
  );
}

/* ═══════════════ هيكل تحميل القائمة ═══════════════ */

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="جارٍ تحميل الإشعارات">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ القسم الرئيسي ═══════════════ */

/**
 * إشعارات التسديد (اليمن حصراً) — POST/GET /finance/yemen/notifications.
 *
 * بوابة العرض: القسم يظهر فقط عندما يعيد الخادم card.currency === "YER"
 * (السوق اليمني ديناميكياً من البطاقة). في السوق السعودي يختفي القسم كلياً.
 */
export function OwnerYemenNotifications({
  currency,
}: {
  currency: string | null | undefined;
}) {
  const isYemenMarket = String(currency ?? "").toUpperCase() === "YER";

  /* ── الحالة ── */
  const [filter, setFilter] = useState<FilterKey>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  /* ── البيانات ── */
  const notifications = useOwnerYemenNotifications(isYemenMarket);
  const submit = useSubmitYemenNotification();

  /* الأحدث أولًا + فلترة محلية */
  const list = useMemo(() => {
    const items = notifications.data ?? [];
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (filter === "all") return sorted;
    return sorted.filter((n) => String(n.status) === filter);
  }, [notifications.data, filter]);

  /* ═══ بوابة العرض — السوق اليمني فقط ═══ */
  if (!isYemenMarket) return null;

  function resetForm() {
    setAmount("");
    setBankName("");
    setReferenceNo("");
    setTransferDate("");
    setImageUrl("");
    setFormError(null);
  }

  function openDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed < 1) {
      setFormError("أدخل مبلغاً صحيحاً لا يقل عن 1 ر.ي");
      return;
    }
    submit.mutate(
      {
        amount: parsed,
        bank_name: bankName.trim() || undefined,
        reference_no: referenceNo.trim() || undefined,
        transfer_date: transferDate.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
          /* الإشعار الجديد حالته «مقدَّم» — نُظهر فلتر الكل ليراه فوراً */
          setFilter("all");
        },
      }
    );
  }

  const serverError =
    submit.isError && submit.error instanceof Error
      ? submit.error.message
      : null;
  const listError =
    notifications.isError && notifications.error instanceof Error
      ? notifications.error.message
      : "تعذّر تحميل إشعارات التسديد. تحقق من اتصالك ثم أعد المحاولة.";

  return (
    <section aria-label="إشعارات التسديد اليمنية" className="space-y-3">
      {/* ترويسة القسم */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            إشعارات التسديد
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            حوالاتك البنكية لعمولاتك — يراجعها فريق المنصة ثم تُخصم من ذمتك.
          </p>
        </div>
        <Button
          type="button"
          onClick={openDialog}
          className="min-h-[44px] gap-1.5 rounded-full px-4"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          رفع إشعار
        </Button>
      </div>

      {/* شرائح الفلترة */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="فلترة الإشعارات بالحالة"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-full border px-4 text-xs font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* القائمة — ثلاث حالات: تحميل / خطأ / بيانات */}
      {notifications.isLoading ? (
        <ListSkeleton />
      ) : notifications.isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                تعذّر تحميل الإشعارات
              </p>
              <p className="break-words text-xs leading-relaxed text-destructive/90">
                {listError}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void notifications.refetch()}
                disabled={notifications.isFetching}
                className="min-h-[44px] gap-1.5 rounded-full border-destructive/40 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    notifications.isFetching && "animate-spin"
                  )}
                  aria-hidden="true"
                />
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={filter === "all" ? "لا توجد إشعارات بعد" : "لا توجد إشعارات بهذه الحالة"}
          description="حوّل عمولاتك بنكياً ثم ارفع إشعار التسديد ليُخصم المبلغ من ذمتك بعد المراجعة."
          action={
            filter === "all" ? (
              <Button
                type="button"
                variant="outline"
                onClick={openDialog}
                className="min-h-[44px] gap-1.5 rounded-full px-4"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                رفع أول إشعار
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto pe-1">
          {list.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              onZoomImage={(src) => setLightboxSrc(src)}
            />
          ))}
        </div>
      )}

      {/* ═══ حوار رفع إشعار جديد ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رفع إشعار تسديد جديد</DialogTitle>
            <DialogDescription>
              سجّل حوالتك البنكية لعمولاتك — سيراجعها فريق المنصة ثم يُخصم
              المبلغ من ذمتك المالية.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* المبلغ — إلزامي ≥ 1 */}
            <div className="space-y-1.5">
              <Label htmlFor="notif-amount">المبلغ (ر.ي) *</Label>
              <Input
                id="notif-amount"
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(formError)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                المبلغ المُحوّل فعلياً لعمولاتك
              </p>
            </div>

            {/* اسم البنك — اختياري */}
            <div className="space-y-1.5">
              <Label htmlFor="notif-bank">اسم البنك</Label>
              <Input
                id="notif-bank"
                type="text"
                placeholder="مثال: بنك الكريمي"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* رقم المرجع — اختياري */}
            <div className="space-y-1.5">
              <Label htmlFor="notif-ref">رقم المرجع / الحوالة</Label>
              <Input
                id="notif-ref"
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* تاريخ التحويل — اختياري */}
            <div className="space-y-1.5">
              <Label htmlFor="notif-date">تاريخ التحويل</Label>
              <Input
                id="notif-date"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            {/* صورة الإيصال — رفع حقيقي (ضغط + تقدم + إعادة) مع بديل لصق رابط */}
            <ImageUploader
              id="notif-receipt"
              label="صورة الإيصال"
              hint="يُستخدم كدليل على التحويل أثناء المراجعة"
              folder="facilities"
              value={imageUrl}
              onChange={(v) => setImageUrl(v)}
              disabled={submit.isPending}
            />

            {/* خطأ التحقق المحلي */}
            {formError && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {formError}
              </p>
            )}

            {/* خطأ الخادم — detail عربي كما هو */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-destructive"
              >
                <AlertCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">{serverError}</span>
              </div>
            )}

            <DialogFooter className="flex-row-reverse gap-2">
              <Button
                type="submit"
                disabled={submit.isPending}
                className="min-h-[44px] flex-1 gap-2 rounded-full"
              >
                {submit.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    جارٍ الرفع...
                  </>
                ) : (
                  <>
                    <ReceiptText className="h-4 w-4" aria-hidden="true" />
                    إرسال الإشعار
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submit.isPending}
                className="min-h-[44px] rounded-full"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* عارض الإيصال المكبّر — قرص للتكبير + سحب لإغلاق */}
      <ImageLightbox
        src={lightboxSrc ?? ""}
        alt="إيصال التحويل"
        open={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
      />
    </section>
  );
}
