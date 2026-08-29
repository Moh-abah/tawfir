"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Store,
  MapPin,
  Timer,
  Truck,
  Receipt,
  CreditCard,
  StickyNote,
  CheckCircle2,
  XCircle,
  Clock,
  Soup,
  Loader2,
  Banknote,
  Wallet,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
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
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useOrderDetail } from "@/hooks/useOrderDetail";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import {
  ORDER_STATUS_LABEL,
  ORDER_TRACKING_FLOW,
  ORDER_STATUS_TONE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  OrderOut,
  OrderItemOut,
  OrderStatus,
  PaymentMethod,
} from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── أيقونات خطوات التتبّع ──────────────────────────── */
const STEP_ICON: Record<OrderStatus, LucideIcon> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: Soup,
  out_for_delivery: Truck,
  delivered: Package,
  cancelled: XCircle,
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "نقداً عند الاستلام",
  wallet: "محفظة جيب",
};

/* ─── الجولة 10 — الوقت المتوقع لكل حالة نشطة (تلميح لطيف) ── */
const ACTIVE_ETA_HINT: Partial<Record<OrderStatus, string>> = {
  pending: "بانتظار تأكيد المتجر — عادةً خلال دقائق قليلة",
  confirmed: "تم التأكيد! سيبدأ التحضير قريباً",
  preparing: "وجبتك قيد التحضير الآن 🍳 — المعتاد 15-30 دقيقة",
  out_for_delivery: "طلبك في الطريق إليك 🛵 — عادةً خلال 15-25 دقيقة",
};

/* ─── الجولة 12 — إعادة الطلب بتأكيد ذكي (Sheet كامل) ── */
interface ReorderLine {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

function ReOrderSection({ order }: { order: OrderOut }) {
  const [open, setOpen] = useState(false);
  const createOrder = useCreateOrder();
  const router = useRouter();

  /* الجولة 12: تعبئة مسبقة من الطلب القديم (عنوان/ملاحظات/طريقة دفع) */
  const [lines, setLines] = useState<ReorderLine[]>([]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const openSheet = () => {
    haptic("tick");
    setLines(
      order.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name ?? "صنف",
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    );
    setAddress(order.delivery_address ?? "");
    setNotes(order.notes ?? "");
    setPaymentMethod(order.payment_method);
    setOpen(true);
  };

  const updateQty = (productId: number, delta: number) => {
    haptic("tick");
    setLines((prev) =>
      prev.map((l) =>
        l.product_id === productId
          ? { ...l, quantity: Math.max(1, l.quantity + delta) }
          : l
      )
    );
  };
  const removeLine = (productId: number) => {
    haptic("tick");
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  };

  /* تقدير الفاتورة من أسعار الطلب القديم (الخادم يُعيد الحساب الفعلي) */
  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const total = subtotal + order.delivery_fee;

  const handleConfirm = () => {
    if (lines.length === 0) return;
    createOrder.mutate(
      {
        facility_id: order.facility_id,
        items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
        })),
        delivery_address: address.trim() || null,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (newOrder) => {
          haptic("success");
          toast({
            title: `تم استلام طلبك الجديد #${newOrder.id}`,
            description: "نفس وجبات طلبك السابق — تابع حالته الآن",
          });
          setOpen(false);
          router.push(`/orders/${newOrder.id}`);
        },
        onError: (err) => {
          const e = err as { message?: string; status?: number };
          toast({
            title: "تعذّر إعادة الطلب",
            description:
              e.message?.trim() ||
              "قد يكون أحد الأصناف غير متوفر الآن — جرّب الطلب يدوياً.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <section aria-label="إعادة الطلب">
      <Button
        type="button"
        onClick={openSheet}
        disabled={createOrder.isPending}
        className="w-full min-h-[48px] gap-2 rounded-full text-base font-extrabold shadow-soft"
        size="lg"
      >
        {createOrder.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        )}
        {createOrder.isPending ? "جارٍ إرسال الطلب..." : "أعد الطلب نفسه"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[88dvh] flex-col gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <div className="bottom-sheet-grip pt-3" aria-hidden="true" />
          <SheetHeader className="border-b p-4 text-right">
            <SheetTitle className="flex items-center gap-2 text-right text-lg font-extrabold">
              <RotateCcw className="h-5 w-5 text-primary" aria-hidden="true" />
              إعادة الطلب
            </SheetTitle>
            <SheetDescription className="text-right">
              من {order.facility_name ?? "المتجر"} — عدّل الكميات والعنوان ثم أكّد
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto no-mobile-scrollbar p-4">
            {/* الأصناف مع درجات الكمية */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                الأصناف ({lines.length})
              </Label>
              <ul className="divide-y divide-border/40 rounded-xl border border-border/50">
                {lines.map((line) => (
                  <li
                    key={line.product_id}
                    className="flex items-center gap-2 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {line.product_name}
                      </p>
                      <p
                        className="text-xs tabular-nums text-muted-foreground"
                        dir="ltr"
                      >
                        {formatCurrency(line.unit_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(line.product_id, -1)}
                        disabled={line.quantity <= 1}
                        aria-label={`إنقاص كمية ${line.product_name}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <span
                        className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-foreground"
                        aria-live="polite"
                      >
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(line.product_id, 1)}
                        aria-label={`زيادة كمية ${line.product_name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.product_id)}
                      className="native-tap inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-destructive"
                      aria-label={`إزالة ${line.product_name}`}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {lines.length === 0 && (
                  <li className="p-4 text-center text-xs text-muted-foreground">
                    أزلت كل الأصناف — أضف أصنافاً من المتجر لإعادة الطلب.
                  </li>
                )}
              </ul>
            </div>

            {/* عنوان التوصيل — معبّأ مسبقاً من الطلب القديم */}
            <div className="space-y-2">
              <Label htmlFor="reorder-address" className="text-xs font-bold">
                عنوان التوصيل (اختياري)
              </Label>
              <Textarea
                id="reorder-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="الحي / الشارع / معلّم مميّز..."
                className="min-h-[64px] resize-none"
                rows={2}
              />
            </div>

            {/* ملاحظات — معبّأة مسبقاً */}
            <div className="space-y-2">
              <Label htmlFor="reorder-notes" className="text-xs font-bold">
                ملاحظات (اختياري)
              </Label>
              <Input
                id="reorder-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: بلا صلصة حارة..."
                className="min-h-[44px]"
              />
            </div>

            {/* طريقة الدفع — محدّدة مسبقاً من الطلب القديم */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">طريقة الدفع</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { value: "cash", label: "نقداً عند الاستلام", icon: Banknote },
                  { value: "wallet", label: "محفظة جيب", icon: Wallet },
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={cn(
                      "native-tap flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold transition-colors",
                      paymentMethod === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <RadioGroupItem value={value} className="sr-only" />
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          {/* ملخص تقديري + تأكيد */}
          <div className="space-y-3 border-t border-border/50 bg-card/50 p-4">
            <div className="space-y-1.5 text-sm" dir="rtl">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span
                  className="font-bold tabular-nums text-foreground"
                  dir="ltr"
                >
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">رسوم التوصيل</span>
                <span
                  className="font-bold tabular-nums text-foreground"
                  dir="ltr"
                >
                  {formatCurrency(order.delivery_fee)}
                </span>
              </div>
              <div className="my-1.5 h-px bg-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-foreground">
                  الإجمالي التقديري
                </span>
                <span
                  className="text-lg font-extrabold tabular-nums text-primary"
                  dir="ltr"
                >
                  {formatCurrency(total)}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                تُعاد حساب الأسعار النهائية حسب توفّر الأصناف وخصم عضويتك
                الحالي عند التأكيد.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                haptic("light");
                handleConfirm();
              }}
              disabled={createOrder.isPending || lines.length === 0}
              className="w-full min-h-[48px] gap-2 rounded-full text-base font-extrabold shadow-soft"
              size="lg"
            >
              {createOrder.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
              {createOrder.isPending
                ? "جارٍ إرسال الطلب..."
                : "تأكيد إعادة الطلب"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ─── الجولة 14 — احتفال التوصيل ────────────────────── */
function DeliveredCelebration({ order }: { order: OrderOut }) {
  const prefersReduced = usePrefersReducedMotion();

  /* مدة التوصيل الفعلية من بيانات الخادم: created_at → updated_at */
  const durationMin = useMemo(() => {
    const start = new Date(order.created_at).getTime();
    const end = new Date(order.updated_at ?? order.created_at).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    return Math.max(1, Math.round((end - start) / 60000));
  }, [order.created_at, order.updated_at]);

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border-2 border-success/30 bg-gradient-to-b from-success/15 via-success/5 to-transparent p-5 text-center shadow-soft"
      aria-label="تم التوصيل بنجاح"
    >
      {/* شرارات زخرفية — تُخفى مع تقليل الحركة */}
      {!prefersReduced && (
        <>
          <motion.span
            className="absolute right-6 top-4 h-2 w-2 rounded-full bg-accent/70"
            animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.span
            className="absolute left-8 top-8 h-1.5 w-1.5 rounded-full bg-secondary/70"
            animate={{ y: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            aria-hidden="true"
          />
          <motion.span
            className="absolute left-5 top-4 h-1.5 w-1.5 rotate-45 bg-primary/60"
            animate={{ rotate: [45, 90, 45], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </>
      )}

      <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
        {!prefersReduced && (
          <motion.span
            className="absolute inset-0 rounded-full bg-success/20"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: [1, 1.3, 1.3], opacity: [0.7, 0, 0] }}
            transition={{ duration: 1.4, ease: "easeOut", times: [0, 0.6, 1] }}
            aria-hidden="true"
          />
        )}
        <motion.span
          initial={prefersReduced ? false : { scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          className="flex h-full w-full items-center justify-center"
        >
          <CheckCircle2 className="h-9 w-9 text-success" aria-hidden="true" />
        </motion.span>
      </span>

      <h3 className="mt-3 text-lg font-extrabold text-foreground">
        وصل طلبك بنجاح، بالعافية!
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        من {order.facility_name ?? "المتجر"} — الإجمالي{" "}
        <span dir="ltr" className="font-bold tabular-nums text-foreground">
          {formatCurrency(order.total)}
        </span>
        {durationMin != null && (
          <>
            {" "}· استغرق التوصيل{" "}
            <span className="font-bold text-foreground">{durationMin} دقيقة</span>
          </>
        )}
      </p>

      {/* الجولة 15 — زران: إعادة الطلب (أساسي) + الإيصال (ثانوي) */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          asChild
          className="min-h-[44px] w-full gap-2 rounded-full font-extrabold sm:w-auto sm:px-8"
        >
          <a href="#reorder" aria-label="اطلب مرة أخرى">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            اطلب مرة أخرى
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] w-full gap-2 rounded-full font-bold sm:w-auto sm:px-8"
        >
          <Link href={`/orders/${order.id}/receipt`} aria-label="عرض إيصال الطلب">
            <Receipt className="h-4 w-4" aria-hidden="true" />
            الإيصال
          </Link>
        </Button>
      </div>
    </motion.section>
  );
}

/* ─── شريط التتبّع (الحالة العادية) ──────────────────── */
function TrackingFlow({ currentStatus }: { currentStatus: OrderStatus }) {
  const prefersReduced = usePrefersReducedMotion();
  const currentIndex = ORDER_TRACKING_FLOW.indexOf(currentStatus);
  /* الحالة بعد المكتملة (delivered) — كل الخطوات ممتلئة */
  const reachedDelivered = currentStatus === "delivered";

  return (
    <ol
      className="relative flex items-start justify-between"
      aria-label="تتبّع حالة الطلب"
    >
      {/* الخط الأفقي خلف النقاط */}
      <div
        className="absolute top-5 right-5 left-5 h-0.5 bg-muted"
        aria-hidden="true"
      />
      <motion.div
        className="absolute top-5 right-5 h-0.5 bg-secondary"
        aria-hidden="true"
        initial={prefersReduced ? { width: "0%" } : { width: 0 }}
        animate={{
          width:
            currentIndex > 0 && currentIndex < ORDER_TRACKING_FLOW.length
              ? `${(currentIndex / (ORDER_TRACKING_FLOW.length - 1)) * 100}%`
              : reachedDelivered
                ? "100%"
                : "0%",
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ maxWidth: "calc(100% - 2.5rem)" }}
      />

      {ORDER_TRACKING_FLOW.map((step, idx) => {
        const Icon = STEP_ICON[step];
        const isCompleted =
          reachedDelivered ||
          (currentIndex > -1 && idx < currentIndex) ||
          (idx === currentIndex && idx === ORDER_TRACKING_FLOW.length - 1);
        const isCurrent = !reachedDelivered && idx === currentIndex;
        const isFuture = !reachedDelivered && idx > currentIndex;

        return (
          <li
            key={step}
            className="relative z-10 flex flex-1 flex-col items-center gap-1.5"
          >
            <motion.div
              initial={prefersReduced ? { scale: 1 } : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25, delay: prefersReduced ? 0 : idx * 0.08 }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors",
                isCompleted &&
                  "border-secondary bg-secondary text-secondary-foreground",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground shadow-soft-lg",
                isFuture && "border-border bg-card text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </motion.div>
            <span
              className={cn(
                "text-center text-[10px] font-medium leading-tight sm:text-xs",
                isCompleted || isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── حالة الإلغاء (مسار منفصل) ─────────────────────── */
function CancelledNotice() {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center"
      role="status"
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
          ORDER_STATUS_TONE.cancelled
        )}
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        {ORDER_STATUS_LABEL.cancelled}
      </span>
      <p className="text-xs text-muted-foreground">
        تم إلغاء هذا الطلب ولن يُنفَّذ. لأي استفسار تواصل مع المتجر.
      </p>
    </div>
  );
}

/* ─── صفّ صنف ──────────────────────────────────────── */
function OrderItemRow({ item }: { item: OrderItemOut }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-foreground line-clamp-2">
            {item.product_name ?? "صنف"}
          </p>
          {item.discount_applied && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              خصم مطبّق
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            الكمية: <span className="font-bold text-foreground">{item.quantity}</span>
          </span>
          <span className="tabular-nums">
            سعر الوحدة: {formatCurrency(item.unit_price)}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-left" dir="ltr">
        <p className="text-[10px] text-muted-foreground">المجموع</p>
        <p className="text-sm font-extrabold text-foreground tabular-nums">
          {formatCurrency(item.subtotal)}
        </p>
      </div>
    </li>
  );
}

/* ─── بطاقة معلومات ──────────────────────────────────── */
function InfoRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          dir={dir}
          className={cn(
            "text-sm font-bold text-foreground",
            dir === "ltr" && "text-left"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── هيكل التحميل ──────────────────────────────────── */
function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

/* ─── العرض الكامل لطلب ──────────────────────────────── */
function OrderView({ order }: { order: OrderOut }) {
  const prefersReduced = usePrefersReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelMutation = useCancelOrder(order.id);
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  const isCancelled = order.status === "cancelled";

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* رأس الصفحة */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">طلب رقم</p>
          <h2 className="text-2xl font-extrabold text-foreground tabular-nums sm:text-3xl">
            #{order.id}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* الجولة 15 — زر الإيصال (متاح لكل الحالات) */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="عرض إيصال الطلب"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Link href={`/orders/${order.id}/receipt`}>
              <Receipt className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold",
              ORDER_STATUS_TONE[order.status],
            )}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* الجولة 14 — احتفال التوصيل: بطاقة نجاح احتفالية فوق شريط التتبّع */}
      {order.status === "delivered" && (
        <DeliveredCelebration order={order} />
      )}

      {/* شريط التتبّع */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="تتبّع حالة الطلب"
      >
        {/* الجولة 9 (المهمة 9.3) — وميض لطيف عند تغيّر الحالة (1s).
            يُعاد تشغيل الأنيميشن عبر key={status} — إحساس «حي».
            يُعطَّل بالكامل إن فضّل المستخدم تقليل الحركة. */}
        {!prefersReduced && (
          <motion.div
            key={`status-flash-${order.status}`}
            className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/15"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            aria-hidden="true"
          />
        )}

        {isCancelled ? (
          <CancelledNotice />
        ) : (
          <TrackingFlow currentStatus={order.status} />
        )}

        {/* الجولة 10 — تلميح الوقت المتوقع للطلبات النشطة (تحت شريط التتبّع) */}
        {!isCancelled && ACTIVE_ETA_HINT[order.status] && (
          <p
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-muted/60 px-3 py-2 text-center text-xs font-medium text-muted-foreground"
            role="status"
          >
            <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {ACTIVE_ETA_HINT[order.status]}
          </p>
        )}

        {/* زر الإلغاء — يظهر فقط أثناء انتظار تأكيد المتجر (pending) */}
        {order.status === "pending" && (
          <div className="mt-5 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-4 w-4" aria-hidden="true" />
              )}
              {cancelMutation.isPending ? "جارٍ الإلغاء..." : "إلغاء الطلب"}
            </Button>
          </div>
        )}
      </section>

      {/* حوار تأكيد الإلغاء */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من إلغاء طلبك؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُلغى الطلب #{order.id} من {order.facility_name ?? "المتجر"} وتُسترجع
              الكميات للمخزون. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="min-h-[44px] flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                cancelMutation.mutate(undefined, {
                  onSettled: () => setConfirmOpen(false),
                })
              }
            >
              نعم، إلغاء الطلب
            </AlertDialogAction>
            <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
              إبقاء الطلب
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الأصناف */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="أصناف الطلب"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
          <Soup className="h-5 w-5 text-secondary" aria-hidden="true" />
          أصناف الطلب ({order.items.length})
        </h2>
        <ul className="space-y-2.5">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </ul>
        <Separator className="my-4" />
        {/* ملخص الفاتورة */}
        <div className="space-y-2 text-sm" dir="rtl">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(order.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">رسوم التوصيل</span>
            <span className="font-bold text-foreground tabular-nums">
              {formatCurrency(order.delivery_fee)}
            </span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">الإجمالي</span>
            <span
              className="text-base font-extrabold text-foreground tabular-nums"
              dir="ltr"
            >
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </section>

      {/* معلومات الطلب */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label="معلومات التوصيل والدفع"
      >
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
          <Receipt className="h-5 w-5 text-secondary" aria-hidden="true" />
          معلومات الطلب
        </h2>
        <div className="divide-y divide-border/40">
          <InfoRow
            icon={Store}
            label="المتجر"
            value={order.facility_name ?? "متجر"}
          />
          {order.delivery_address && (
            <InfoRow
              icon={MapPin}
              label="عنوان التوصيل"
              value={order.delivery_address}
            />
          )}
          <InfoRow
            icon={Truck}
            label="رسوم التوصيل"
            value={formatCurrency(order.delivery_fee)}
          />
          <InfoRow
            icon={CreditCard}
            label="طريقة الدفع"
            value={PAYMENT_LABEL[order.payment_method]}
          />
          <InfoRow
            icon={Clock}
            label="تاريخ الطلب"
            value={formatDate(order.created_at)}
          />
          {order.notes && (
            <InfoRow
              icon={StickyNote}
              label="ملاحظات"
              value={order.notes}
            />
          )}
        </div>
      </section>

      {/* الجولة 10 — إعادة الطلب: للطلبات المكتملة أو الملغاة فقط
          (الطلبات النشطة قيد المعالجة أصلاً — لا معنى لتكرارها) */}
      {(order.status === "delivered" || order.status === "cancelled") &&
        order.items.length > 0 && (
          <div id="reorder" className="scroll-mt-20">
            <ReOrderSection order={order} />
          </div>
        )}
    </motion.div>
  );
}

/* ─── المكون الرئيسي ────────────────────────────────── */
export default function OrderDetailContent({
  orderId,
}: {
  orderId: string;
}) {
  const { accessToken, hydrated } = useCustomerAuth();
  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <OrderDetailSkeleton />
        </div>
      </>
    );
  }

  /* غير مسجّل → إعادة توجيه لطيفة لشاشة الدخول */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title="سجّل الدخول لعرض تفاصيل الطلب"
            description="لا يمكن عرض تفاصيل الطلب دون تسجيل الدخول."
            action={
              <Link
                href={`/login?next=/orders/${orderId}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                تسجيل الدخول
              </Link>
            }
          />
        </div>
      </>
    );
  }

  /* معرّف غير صالح */
  if (numericId === null) {
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title="معرّف الطلب غير صالح"
            message="تعذّر تحديد الطلب المطلوب."
          />
        </div>
      </>
    );
  }

  return <OrderDetailInner id={numericId} />;
}

function OrderDetailInner({ id }: { id: number }) {
  const { data, isLoading, isError, error, refetch } = useOrderDetail(id);

  /* الجولة 17 — اهتزاز لمسي عند تغيّر حالة الطلب أثناء المراقبة:
   * polling كل 15 ثانية للطلبات النشطة — عند انتقال الحالة (تأكيد/تحضير/
   * توصيل) ينبض الجهاز كإشعار Native. أول تحميل لا يُنبض (لا حالة سابقة). */
  const prevStatusRef = useRef<OrderStatus | null>(null);
  useEffect(() => {
    if (!data) return;
    if (
      prevStatusRef.current !== null &&
      prevStatusRef.current !== data.status
    ) {
      haptic("light");
    }
    prevStatusRef.current = data.status;
  }, [data]);

  /* الجولة 9 (المهمة 9.3) — عند عودة اتصال الإنترنت (online)،
     * نُجلب تفاصيل الطلب فوراً بدل انتظار polling القادم. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      refetch();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <OrderDetailSkeleton />
        </div>
      </>
    );
  }

  if (isError) {
    const msg =
      error instanceof Error
        ? error.message
        : "تعذّر تحميل تفاصيل الطلب. تحقق من اتصالك بالإنترنت.";
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title="تعذّر تحميل الطلب"
            message={msg}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title="الطلب غير موجود"
            description="ربما حُذف هذا الطلب أو لا تملك صلاحية الوصول إليه."
            action={
              <Link
                href="/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                العودة لطلباتي
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="تفاصيل الطلب" fallbackHref="/orders" />
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6" dir="rtl">
        <OrderView order={data} />

        {/* ذيل سفلي — زر تصفّح الوجبات */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            تصفّح الوجبات
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
