"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { OrderTrackingCard } from "@/components/public/OrderTrackingCard";
import { LiveElapsedBadge } from "@/components/shared/LiveElapsedBadge";
import { GeoLocationField } from "@/components/shared/GeoLocationField";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
import {
  WalletPickerList,
} from "@/components/wallets/WalletPickerList";
import { useFacilityWallets } from "@/hooks/useWallets";
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
/* جولة المالية v2 — السوق والدفعات الإلكترونية (طبقة الأساس المشتركة) */
import { useFinanceOrderPayments, useLocaleMe } from "@/hooks/useFinance";
import { isSaudiCountry, currencyFromCountry } from "@/services/locale.service";
import {
  FinanceStatusBadge,
  formatMoney,
  MoneyText,
} from "@/components/finance/finance-ui";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptic";
import { useLang } from "@/lib/i18n";
import {
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

/* الترجمة عبر i18n — القيم المرسلة للخادم لا تُلمس (عرض حصراً) */
const PAYMENT_STATUS_KEYS: Record<string, string> = {
  pending: "orders.receiptStatus.pending",
  approved: "orders.receiptStatus.approved",
  rejected: "orders.receiptStatus.rejected",
  partial_requested: "orders.receiptStatus.partial_requested",
};

/* ─── الجولة 10 — الوقت المتوقع لكل حالة نشطة (مفاتيح i18n) ── */
const ACTIVE_ETA_KEY: Partial<Record<OrderStatus, string>> = {
  pending: "orders.eta.pending",
  confirmed: "orders.eta.confirmed",
  preparing: "orders.eta.preparing",
  out_for_delivery: "orders.eta.out_for_delivery",
};

/* ─── الجولة 26 — الحالات النشطة (تُظهر شارة الوقت المنقضي الحيّة) ── */
const ACTIVE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

/* ─── الجولة 12 — إعادة الطلب بتأكيد ذكي (Sheet كامل) ── */
interface ReorderLine {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

function ReOrderSection({
  order,
  autoOpen = false,
}: {
  order: OrderOut;
  autoOpen?: boolean;
}) {
  const { t } = useLang();
  const createOrder = useCreateOrder();
  const router = useRouter();
  /* جولة تدقيق الفصل: السوق السعودي بلا محفظة تاجر — قائمة إعادة الطلب
     كانت ثابتة [كاش، محفظة] فيكل الأسواق فكان السعودي يختار محفظة
     لا وجود لها في سوقه. الاستنباط نفسه المتبع في CheckoutSheet. */
  const localeMe = useLocaleMe();
  const isSaudi =
    localeMe.isSuccess && localeMe.data != null && isSaudiCountry(localeMe.data.country_code);

  /* الجولة 12: تعبئة مسبقة من الطلب القديم (موقع/عنوان/ملاحظات/دفع).
   * الجولة 27 — عند القدوم من زر «أعد الطلب» في قائمة الطلبات
   * (?reorder=1): تُفتح الورقة معبّأة مسبقاً منذ أول تركيب عبر
   * مُهيّئات حالة مباشرة — بلا تأثيرات جانبية ولا setState داخل
   * effect (متوافق مع قواعد React Compiler الصارمة). */
  const [open, setOpen] = useState(autoOpen);
  const [lines, setLines] = useState<ReorderLine[]>(() =>
    autoOpen
      ? order.items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name ?? t("orders.itemFallback"),
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      : []
  );
  /* موقع بابك من الطلب السابق — يظهر محمّلاً (حدّثه بزر تحميل موقعي
     إن تحركت) — §6-3 الإحداثيات إلزامية دائماً */
  const [lat, setLat] = useState<number | null>(() =>
    autoOpen ? (order.delivery_lat ?? null) : null
  );
  const [lng, setLng] = useState<number | null>(() =>
    autoOpen ? (order.delivery_lng ?? null) : null
  );
  const [address, setAddress] = useState(() =>
    autoOpen ? order.delivery_address ?? "" : ""
  );
  const [notes, setNotes] = useState(() =>
    autoOpen ? order.notes ?? "" : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => (autoOpen ? order.payment_method : "cash")
  );
  /* محفظة إعادة الطلب — طلب جديد يتطلب اختيار محفظة من جديد */
  const [paymentWalletId, setPaymentWalletId] = useState<number | null>(null);
  /* السعودية: أي محفظة موروثة من الطلب القديم تنقلب كاشاً صامتاً */
  const shownMethod: PaymentMethod =
    isSaudi && paymentMethod === "wallet" ? "cash" : paymentMethod;

  const openSheet = () => {
    haptic("tick");
    setLines(
      order.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name ?? t("orders.itemFallback"),
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    );
    /* موقع بابك من الطلب السابق — يظهر محمّلاً (حدّثه بزر تحميل موقعي
       إن تحركت) — §6-3 الإحداثيات إلزامية دائماً */
    setLat(order.delivery_lat ?? null);
    setLng(order.delivery_lng ?? null);
    setAddress(order.delivery_address ?? "");
    setNotes(order.notes ?? "");
    setPaymentMethod(order.payment_method);
    /* طلب جديد = إيصالة جديدة — المحفظة تُختار من جديد */
    setPaymentWalletId(null);
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
    if (lat == null || lng == null) {
      toast({
        title: t("cart.missingLocation"),
        variant: "destructive",
      });
      return;
    }
    if (address.trim().length === 0) {
      toast({
        title: t("orders.writeAddressTitle"),
        description: t("orders.addressHelp"),
        variant: "destructive",
      });
      return;
    }
    if (shownMethod === "wallet" && paymentWalletId == null) {
      toast({
        title: t("orders.pickWalletTitle"),
        description: t("orders.pickWalletDesc"),
        variant: "destructive",
      });
      return;
    }
    createOrder.mutate(
      {
        facility_id: order.facility_id,
        items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
        })),
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address.trim() || null,
        payment_method: shownMethod,
        payment_wallet_id:
          shownMethod === "wallet" ? paymentWalletId : null,
        notes: notes.trim() || null,
      },
      {
        onSuccess: (newOrder) => {
          haptic("success");
          toast({
            title: t("orders.reorderSuccess", { id: newOrder.id }),
            description:
              newOrder.payment_method === "wallet"
                ? t("orders.reorderWalletDesc")
                : t("orders.reorderCashDesc"),
          });
          setOpen(false);
          /* طلب محفظة → شاشة الدفع مباشرة؛ غيره → تفاصيل الطلب */
          router.push(
            newOrder.payment_method === "wallet"
              ? `/orders/${newOrder.id}/payment`
              : `/orders/${newOrder.id}`
          );
        },
        onError: (err) => {
          const e = err as { message?: string; status?: number };
          toast({
            title: t("orders.reorderFailed"),
            description:
              e.message?.trim() || t("orders.reorderFailedDesc"),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <section aria-label={t("orders.reorderTitle")}>
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
        {createOrder.isPending ? t("cart.sending") : t("orders.reorderSame")}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[88dvh] flex-col gap-0 rounded-t-2xl p-0 pb-[max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px))]"
        >
          <div className="bottom-sheet-grip pt-3" aria-hidden="true" />
          <SheetHeader className="border-b p-4 text-right">
            <SheetTitle className="flex items-center gap-2 text-right text-lg font-extrabold">
              <RotateCcw className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("orders.reorderTitle")}
            </SheetTitle>
            <SheetDescription className="text-right">
              {t("orders.reorderDesc", {
                facility: order.facility_name ?? t("orders.store"),
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto no-mobile-scrollbar p-4">
            {/* الأصناف مع درجات الكمية */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {t("orders.itemsCount", { count: lines.length })}
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
                        aria-label={t("orders.decQtyAria", { name: line.product_name })}
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
                        aria-label={t("orders.incQtyAria", { name: line.product_name })}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.product_id)}
                      className="native-tap inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-destructive"
                      aria-label={t("orders.removeAria", { name: line.product_name })}
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {lines.length === 0 && (
                  <li className="p-4 text-center text-xs text-muted-foreground">
                    {t("orders.allRemoved")}
                  </li>
                )}
              </ul>
            </div>

            {/* موقع التوصيل — زر تحميل الموقع (مُعبّأ مسبقاً من طلبك
                السابق — حدّثه إن تحركت) — §6-3 إلزامي */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">
                {t("cart.deliveryLocation")}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <GeoLocationField
                value={
                  lat != null && lng != null
                    ? { lat, lng }
                    : null
                }
                onLocated={(p) => {
                  setLat(p.lat);
                  setLng(p.lng);
                }}
                idPrefix="reorder-"
              />
              <p
                role="note"
                className="text-[10px] leading-relaxed text-muted-foreground"
              >
                {lat != null
                  ? t("orders.fromPrevOrder")
                  : t("orders.loadLocation")}
              </p>
            </div>

            {/* عنوان التوصيل — معبّأ مسبقاً من الطلب القديم */}
            <div className="space-y-2">
              <Label htmlFor="reorder-address" className="text-xs font-bold">
                {t("orders.addressLabel")}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Textarea
                id="reorder-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("orders.addressPlaceholder")}
                className="min-h-[64px] resize-none"
                rows={2}
                aria-required="true"
              />
            </div>

            {/* ملاحظات — معبّأة مسبقاً */}
            <div className="space-y-2">
              <Label htmlFor="reorder-notes" className="text-xs font-bold">
                {t("cart.notes")}
              </Label>
              <Input
                id="reorder-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("orders.notesPlaceholder")}
                className="min-h-[44px]"
              />
            </div>

            {/* طريقة الدفع — محدّدة مسبقاً من الطلب القديم */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("cart.paymentMethod")}</Label>
              <RadioGroup
                value={shownMethod}
                onValueChange={(v) => {
                  const next = v as PaymentMethod;
                  setPaymentMethod(next);
                  if (next !== "wallet") setPaymentWalletId(null);
                }}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { value: "cash", label: t("orders.payMethod.cash"), icon: Banknote },
                  /* السعودية بلا محفظة تاجر (تدقيق الفصل) */
                  ...(isSaudi
                    ? []
                    : [{ value: "wallet", label: t("orders.payMethod.wallet"), icon: Wallet }]),
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

            {/* منتقي محفظة المتجر — يظهر عند اختيار الدفع بالمحفظة */}
            {paymentMethod === "wallet" && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                <p className="mb-2 text-xs font-bold text-foreground">
                  {t("cart.chooseWallet")}
                </p>
                <WalletPickerList
                  facilityId={order.facility_id}
                  value={paymentWalletId}
                  onChange={setPaymentWalletId}
                />
              </div>
            )}
          </div>

          {/* ملخص تقديري + تأكيد */}
          <div className="space-y-3 border-t border-border/50 bg-card/50 p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("cart.subtotalPlain")}</span>
                <span
                  className="font-bold tabular-nums text-foreground"
                  dir="ltr"
                >
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("cart.deliveryFeeLabel")}</span>
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
                  {t("orders.estimatedTotal")}
                </span>
                <span
                  className="text-lg font-extrabold tabular-nums text-primary"
                  dir="ltr"
                >
                  {formatCurrency(total)}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {t("orders.repriceNote")}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                haptic("light");
                handleConfirm();
              }}
              disabled={
                createOrder.isPending ||
                lines.length === 0 ||
                lat == null ||
                lng == null ||
                address.trim().length === 0
              }
              className="w-full min-h-[48px] gap-2 rounded-full text-base font-extrabold shadow-soft"
              size="lg"
            >
              {createOrder.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
              {createOrder.isPending ? t("cart.sending") : t("orders.confirmReorder")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ─── الجولة 14 — احتفال التوصيل ────────────────────── */
function DeliveredCelebration({ order }: { order: OrderOut }) {
  const { t } = useLang();
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
      aria-label={t("orders.deliveredAria")}
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
        {t("orders.deliveredTitle")}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t("orders.fromStore", { facility: order.facility_name ?? t("orders.store") })}{" "}
        — {t("cart.total")}{" "}
        <span dir="ltr" className="font-bold tabular-nums text-foreground">
          {formatCurrency(order.total)}
        </span>
        {durationMin != null && (
          <>
            {" "}· {t("orders.tookPrefix")}{" "}
            <span className="font-bold text-foreground">
              {t("orders.deliveryMinutes", { minutes: durationMin })}
            </span>
          </>
        )}
      </p>

      {/* الجولة 15 — زران: إعادة الطلب (أساسي) + الإيصال (ثانوي) */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          asChild
          className="min-h-[44px] w-full gap-2 rounded-full font-extrabold sm:w-auto sm:px-8"
        >
          <a href="#reorder" aria-label={t("orders.orderAgain")}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("orders.orderAgain")}
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] w-full gap-2 rounded-full font-bold sm:w-auto sm:px-8"
        >
          <Link href={`/orders/${order.id}/receipt`} aria-label={t("orders.receiptAria")}>
            <Receipt className="h-4 w-4" aria-hidden="true" />
            {t("orders.receipt")}
          </Link>
        </Button>
      </div>
    </motion.section>
  );
}

/* ─── شريط التتبّع (الحالة العادية) ──────────────────── */
function TrackingFlow({ currentStatus }: { currentStatus: OrderStatus }) {
  const { t } = useLang();
  const prefersReduced = usePrefersReducedMotion();
  const currentIndex = ORDER_TRACKING_FLOW.indexOf(currentStatus);
  /* الحالة بعد المكتملة (delivered) — كل الخطوات ممتلئة */
  const reachedDelivered = currentStatus === "delivered";

  return (
    <ol
      className="relative flex items-start justify-between"
      aria-label={t("orders.trackAria")}
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
              {t(`orders.status.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── حالة الإلغاء (مسار منفصل) ─────────────────────── */
function CancelledNotice() {
  const { t } = useLang();
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
        {t("orders.status.cancelled")}
      </span>
      <p className="text-xs text-muted-foreground">
        {t("orders.cancelledNote")}
      </p>
    </div>
  );
}

/* ─── صفّ صنف ──────────────────────────────────────── */
function OrderItemRow({ item }: { item: OrderItemOut }) {
  const { t } = useLang();
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-foreground line-clamp-2">
            {item.product_name ?? t("orders.itemFallback")}
          </p>
          {item.discount_applied && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              {t("orders.discountApplied")}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t("orders.qtyLabel")} <span className="font-bold text-foreground">{item.quantity}</span>
          </span>
          <span className="tabular-nums">
            {t("orders.unitPriceLabel")} {formatCurrency(item.unit_price)}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-left" dir="ltr">
        <p className="text-[10px] text-muted-foreground">{t("cart.lineTotal")}</p>
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
/* ─── جولة المحافظ — بطاقة حالة الدفع بالمحفظة ───────────── */
function WalletPaymentCard({ order }: { order: OrderOut }) {
  const { t } = useLang();
  const status = order.payment_status ?? null;
  const receipt = order.payment_receipt ?? null;
  const approved = status === "approved";
  const showCTA =
    !approved &&
    order.status !== "cancelled" &&
    (status === null || status === "pending" || status === "rejected" || status === "partial_requested");

  const tone =
    status === "approved"
      ? "border-success/30 bg-success/10"
      : status === "rejected"
        ? "border-destructive/30 bg-destructive/5"
        : "border-accent/40 bg-accent/10";

  return (
    <section
      className={cn("rounded-2xl border-2 p-5", tone)}
      aria-label={t("orders.walletStatusAria")}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("orders.walletPayment")}
        </h2>
        {status ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold",
              status === "approved"
                ? "border-success/30 text-success"
                : status === "rejected"
                  ? "border-destructive/30 text-destructive"
                  : "border-accent/40 text-accent-ink"
            )}
          >
            {PAYMENT_STATUS_KEYS[status] ? t(PAYMENT_STATUS_KEYS[status]) : status}
          </span>
        ) : (
          <span className="rounded-full border border-accent/40 bg-background/60 px-2.5 py-1 text-xs font-extrabold text-accent-ink">
            {t("orders.awaitingTransfer")}
          </span>
        )}
      </div>

      {order.payment_wallet_label && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("orders.walletLabel")}{" "}
          <span className="font-bold text-foreground" dir="ltr">
            {order.payment_wallet_label}
          </span>
        </p>
      )}

      {status === "partial_requested" && (
        <p className="mt-2 rounded-lg bg-background/70 px-3 py-2 text-xs font-bold leading-relaxed text-accent-ink">
          {t("orders.partialNeeded", {
            amount: formatCurrency(receipt?.remaining_amount ?? 0),
          })}
        </p>
      )}

      {status === "rejected" && receipt?.rejection_reason && (
        <p className="mt-2 text-xs font-bold text-destructive">
          {t("orders.rejectionReason", { reason: receipt.rejection_reason })}
        </p>
      )}

      {status === "pending" && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {(order as OrderOut & { payment_is_completion?: boolean | null })
            .payment_is_completion || receipt?.is_completion
            ? t("orders.completionUnderReview")
            : t("orders.receiptUnderReview")}
        </p>
      )}

      {showCTA && (
        <Button asChild className="mt-3 min-h-[44px] w-full rounded-full" size="lg">
          <Link href={`/orders/${order.id}/payment`}>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {status === null
              ? t("orders.completePayment", { total: formatCurrency(order.total) })
              : status === "partial_requested"
                ? t("orders.transferRemaining")
                : t("orders.viewPayScreen")}
          </Link>
        </Button>
      )}

      {approved && (
        <p className="mt-2 text-xs text-success">
          {t("orders.transferReceived", {
            amount: formatCurrency(receipt?.amount ?? order.total),
          })}
        </p>
      )}
    </section>
  );
}

/* ─── جولة المالية v2 — قسم الدفع الإلكتروني (السوق السعودي حصراً) ───
 * يظهر دائماً للسوق السعودي حتى لو الطلب كاش — الدفع الإلكتروني
 * اختياري للعميل. دفعة paid → شارة «مدفوعة» وإخفاء زر الدفع.
 * السوق اليمني لا يرى هذا القسم إطلاقاً (برونزية السوقين). */
function OrderElectronicPaymentSection({ orderId }: { orderId: number }) {
  const { t } = useLang();
  const paymentsQuery = useFinanceOrderPayments(orderId);
  const hasPaid =
    paymentsQuery.data?.some((p) => p.status === "paid") ?? false;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
      aria-label={t("payment.electronic")}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("orders.paymentHeading")}
        </h2>
        {paymentsQuery.isPending ? (
          <Skeleton className="h-6 w-24 rounded-full" />
        ) : hasPaid ? (
          <FinanceStatusBadge status="paid" />
        ) : paymentsQuery.isError ? (
          <button
            type="button"
            onClick={() => paymentsQuery.refetch()}
            className="min-h-[44px] text-xs font-bold text-destructive"
          >
            {t("orders.payStatusFailed")}
          </button>
        ) : null}
      </div>

      {hasPaid ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("orders.paidConfirmed")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t("orders.payNowHint")}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-3 min-h-[44px] w-full gap-2 rounded-full"
          >
            <Link href={`/orders/${orderId}/pay`}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {t("orders.payNowElectronic")}
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}

function OrderView({
  order,
  reorderRequested = false,
}: {
  order: OrderOut;
  reorderRequested?: boolean;
}) {
  const { t } = useLang();
  const prefersReduced = usePrefersReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelMutation = useCancelOrder(order.id);
  /* جولة المالية v2 — تحديد السوق لعملة عرض المبالغ وقسم الدفع */
  const localeMe = useLocaleMe(true);
  const isSaudiMarket =
    localeMe.isSuccess &&
    localeMe.data != null &&
    isSaudiCountry(localeMe.data.country_code);
  /* عملة المبالغ من سوق جلسة العميل (locale/me من الخادم) — v3.2.1 */
  const orderCurrency = currencyFromCountry(localeMe.data?.country_code);
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
          <p className="text-xs text-muted-foreground">{t("orders.orderNo")}</p>
          <h2 className="text-2xl font-extrabold text-foreground tabular-nums sm:text-3xl">
            #{order.id}
          </h2>
          {/* الجولة 26 — شارة الوقت المنقضي الحيّة للطلبات النشطة */}
          {ACTIVE_ORDER_STATUSES.has(order.status) && (
            <div className="mt-2">
              <LiveElapsedBadge
                since={order.created_at}
                suffix={t("orders.elapsedSuffix")}
                className="bg-primary/10 text-primary"
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* الجولة 15 — زر الإيصال (متاح لكل الحالات) */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t("orders.receiptAria")}
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
            {t(`orders.status.${order.status}`)}
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
        aria-label={t("orders.trackAria")}
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

        {/* بطاقة الحالة المنقحة — الوسم المركب + كود التسليم الضخم +
            المدة عند الإغلاق (حرفياً من /orders/{id}/tracking — صفر
            بيان مندوب §6-1). تسكت رشيقًا عند غياب البيانات. */}
        {!isCancelled && (
          <div className="mt-4">
            <OrderTrackingCard orderId={order.id} status={order.status} />
          </div>
        )}

        {/* الجولة 10 — تلميح الوقت المتوقع للطلبات النشطة (تحت شريط التتبّع) */}
        {!isCancelled && ACTIVE_ETA_KEY[order.status] && (
          <p
            className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-muted/60 px-3 py-2 text-center text-xs font-medium text-muted-foreground"
            role="status"
          >
            <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(ACTIVE_ETA_KEY[order.status] as string)}
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
              {cancelMutation.isPending ? t("orders.cancelling") : t("orders.cancelOrder")}
            </Button>
          </div>
        )}
      </section>

      {/* جولة المحافظ — بطاقة الدفع بالمحفظة (طلبات المحفظة فقط — السوق اليمني) */}
      {order.payment_method === "wallet" && (
        <WalletPaymentCard order={order} />
      )}

      {/* جولة المالية v2 — قسم الدفع الإلكتروني (السوق السعودي حصراً؛
          اليمني لا يظهر له أي خيار دفع إلكتروني إطلاقاً) */}
      {isSaudiMarket && <OrderElectronicPaymentSection orderId={order.id} />}

      {/* حوار تأكيد الإلغاء */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.cancelDesc", {
                id: order.id,
                facility: order.facility_name ?? t("orders.store"),
              })}
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
              {t("orders.cancelYes")}
            </AlertDialogAction>
            <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
              {t("orders.cancelNo")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الأصناف */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label={t("orders.itemsAria")}
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
          <Soup className="h-5 w-5 text-secondary" aria-hidden="true" />
          {t("orders.itemsHeading", { count: order.items.length })}
        </h2>
        <ul className="space-y-2.5">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </ul>
        <Separator className="my-4" />
        {/* ملخص الفاتورة — المبالغ الوطنية بعملة السوق من الخادم (برونزية-5) */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.subtotalPlain")}</span>
            <MoneyText
              amount={order.subtotal}
              currency={orderCurrency}
              className="font-bold text-foreground"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("cart.deliveryFeeLabel")}</span>
            <MoneyText
              amount={order.delivery_fee}
              currency={orderCurrency}
              className="font-bold text-foreground"
            />
          </div>
          {/* شفافية أجرة التوصيل الوطنية — أرقام حية من الطلب إن وُجدت */}
          {(order.distance_km != null ||
            order.billed_km != null ||
            order.per_km_price != null) && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("orders.feeTransparency")}{" "}
              {order.distance_km != null && (
                <span dir="ltr" className="tabular-nums">
                  {t("orders.kmWithVal", { km: order.distance_km })}
                </span>
              )}
              {order.billed_km != null && (
                <span dir="ltr" className="tabular-nums">
                  {" "}{t("orders.billedAs", { km: order.billed_km })}
                </span>
              )}
              {order.per_km_price != null && (
                <span dir="ltr" className="tabular-nums">
                  {" "}{t("orders.perKmSuffix", { price: order.per_km_price })}
                </span>
              )}
            </p>
          )}
          {order.address_imprecise ? (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {t("cart.impreciseAddress")}
            </span>
          ) : null}
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">{t("cart.total")}</span>
            <MoneyText
              amount={order.total}
              currency={orderCurrency}
              strong
              className="text-base text-foreground"
            />
          </div>
        </div>
      </section>

      {/* معلومات الطلب */}
      <section
        className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
        aria-label={t("orders.infoAria")}
      >
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-foreground">
          <Receipt className="h-5 w-5 text-secondary" aria-hidden="true" />
          {t("orders.infoHeading")}
        </h2>
        <div className="divide-y divide-border/40">
          <InfoRow
            icon={Store}
            label={t("orders.store")}
            value={order.facility_name ?? t("orders.storeFallback")}
          />
          {order.delivery_address && (
            <InfoRow
              icon={MapPin}
              label={t("orders.addressLabel")}
              value={order.delivery_address}
            />
          )}
          <InfoRow
            icon={Truck}
            label={t("cart.deliveryFeeLabel")}
            value={formatMoney(order.delivery_fee, orderCurrency)}
          />
          <InfoRow
            icon={CreditCard}
            label={t("cart.paymentMethod")}
            value={t(`orders.payMethod.${order.payment_method}`)}
          />
          <InfoRow
            icon={Clock}
            label={t("orders.dateLabel")}
            value={formatDate(order.created_at)}
          />
          {order.notes && (
            <InfoRow
              icon={StickyNote}
              label={t("orders.notesLabel")}
              value={order.notes}
            />
          )}
        </div>
      </section>

      {/* الجولة 10 — إعادة الطلب: للطلبات المكتملة أو الملغاة فقط
          (الطلبات النشطة قيد المعالجة أصلاً — لا معنى لتكرارها).
          الجولة 27: autoOpen يفتح الـSheet تلقائياً عند القدوم من
          زر «أعد الطلب» في قائمة الطلبات (?reorder=1). */}
      {(order.status === "delivered" || order.status === "cancelled") &&
        order.items.length > 0 && (
          <div id="reorder" className="scroll-mt-20">
            <ReOrderSection order={order} autoOpen={reorderRequested} />
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
  const { t } = useLang();
  const { accessToken, hydrated } = useCustomerAuth();
  const numericId = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderId]);

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
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
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title={t("orders.loginDetailTitle")}
            description={t("orders.loginDetailDesc")}
            action={
              <Link
                href={`/login?next=/orders/${orderId}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("common.signIn")}
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
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title={t("orders.invalidId")}
            message={t("orders.cantDetermine")}
          />
        </div>
      </>
    );
  }

  return (
    <Suspense fallback={null}>
      <OrderDetailInner id={numericId} />
    </Suspense>
  );
}

function OrderDetailInner({ id }: { id: number }) {
  const { t } = useLang();
  const { data, isLoading, isError, error, refetch } = useOrderDetail(id);

  /* الجولة 27 — طلب فتح «أعد الطلب» تلقائياً عند القدوم من قائمة
   * الطلبات (?reorder=1). useSearchParams يقرأ من حالة الراوتر لا من
   * window.location — متاح فوراً أثناء التنقل الناعم (على عكس
   * window.location الذي لا يتحدّث إلا بعد الالتزام)، ومغلّف بـSuspense
   * أعلاه كما في صفحة الدخول (نمط Next الرسمي). */
  const searchParams = useSearchParams();
  const reorderRequested = searchParams.get("reorder") === "1";

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
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
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
        : t("orders.detailLoadFailed");
    return (
      <>
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ErrorState
            title={t("orders.loadFailedTitle")}
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
        <ScreenHeader title={t("orders.detailTitle")} fallbackHref="/orders" />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <EmptyState
            icon={Package}
            title={t("orders.notFound")}
            description={t("orders.notFoundDesc")}
            action={
              <Link
                href="/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("orders.backToOrders")}
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
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6">
        <OrderView order={data} reorderRequested={reorderRequested} />

        {/* ذيل سفلي — زر تصفّح الوجبات */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("cart.browseMeals")}
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
