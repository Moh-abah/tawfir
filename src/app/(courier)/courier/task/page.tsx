"use client";

/**
 * /courier/task — شاشة «مهمتي» (شاشة 6/11).
 * ═════════════════════════════════════════════════════════
 * السلسلة الإجبارية بالترتيب حصراً (عقد CourierTaskProgress):
 *   arrived_store → confirm_pickup → arrived_customer →
 *   complete_delivery (مع delivery_code) أو problem
 * next_actions من الخادم تحدد الأزرار المتاحة حرفياً — لا اجتهاد.
 *
 * بطاقة اتصال العميل (بعد الحجز حصراً — §6-2):
 *   الاسم + الهاتف كبيراً نقراً (اتصال مباشر) + العنوان +
 *   المسافة محسوبة داخلياً (الخادم) + زرّا «عرض موقع العميل» و
 *   «الملاحة إلى موقع العميل» ينقلان إلى تطبيق الخرائط المناسب
 *   لجهاز المندوب مع تمرير الإحداثيات والعنوان (توجيه المالك —
 *   لا خريطة داخل المنصة).
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Receipt,
  ShieldAlert,
  Store,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import { EmptyState } from "@/components/shared/EmptyState";
import { OpenInMapsButton } from "@/components/shared/OpenInMapsButton";
import { useCourierCurrentTask, useCourierTaskProgress } from "@/hooks/useCourier";
import type { CourierTask } from "@/services/courier-api-client";
import { haptic } from "@/lib/haptic";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* خريطة علامات السلسلة */
const CHAIN = [
  { action: "arrived_store", label: "وصلت للمتجر", icon: Store },
  { action: "confirm_pickup", label: "استلمت الطلب", icon: Package },
  { action: "arrived_customer", label: "وصلت للعميل", icon: MapPin },
  { action: "complete_delivery", label: "تم التسليم", icon: CheckCircle2 },
] as const;

const PROBLEM_TYPES = [
  { v: "customer_no_answer", l: "العميل لا يرد" },
  { v: "wrong_address", l: "العنوان خاطئ" },
  { v: "customer_refused", l: "العميل رفض الاستلام" },
  { v: "other", l: "سبب آخر" },
] as const;


export default function CourierTaskPage() {
  const { data: task, isLoading, isError, error, refetch, isRefetching } =
    useCourierCurrentTask();
  const progress = useCourierTaskProgress();

  /* حوار: كود التسليم */
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");

  /* حوار: مشكلة تسليم */
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemType, setProblemType] = useState<string>("customer_no_answer");
  const [problemDesc, setProblemDesc] = useState("");

  const chainIndex = useMemo(() => {
    if (!task) return -1;
    const done = CHAIN.filter((c) => task.next_actions.includes(c.action)).length;
    return done;
  }, [task]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <div className="flex h-64 items-center justify-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <CourierScreenHeader title="مهمتي" icon={Package} />
        <WaitMode
          reason={error instanceof Error ? error.message : "تعذّر تحميل مهمتك"}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </main>
    );
  }

  if (!task || !task.task_id) {
    return (
      <main className="mx-auto max-w-lg space-y-6 p-4">
        <CourierScreenHeader title="مهمتي" icon={Package} />
        <EmptyState
          icon={Package}
          title="لا مهمة جارية حالياً"
          description="عند قبولك نداءً من الرئيسية ستظهر مهمتك هنا بكل تفاصيلها"
        />
      </main>
    );
  }

  const isClosed = task.status === "completed" || task.status === "cancelled";
  const customer = task.customer;

  const runAction = (
    action: string,
    extra?: Record<string, unknown>,
  ) => {
    haptic("success");
    progress.mutate(
      { taskId: task.task_id, body: { action, ...extra } as never },
      {
        onSuccess: (updated: CourierTask) => {
          toast({
            title: updated.status_ar,
            description: updated.breakdown,
          });
          setCodeOpen(false);
          setProblemOpen(false);
          setCode("");
          setProblemDesc("");
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر تنفيذ الخطوة",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-8">
      <CourierScreenHeader
        title="مهمتي"
        subtitle={`${task.status_ar} · طلب #${task.order_id}`}
        icon={Package}
      />

      {/* بطاقة المتجر + المسافة + الأجرة */}
      <section
        aria-label="تفاصيل المهمة"
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-foreground">
                {task.facility_name ?? "المتجر"}
              </p>
              <p className="text-xs text-muted-foreground">
                {task.distance_display} · أجرة {formatCurrency(task.fee)}
              </p>
            </div>
          </div>
          <span className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
            {task.status_ar}
          </span>
        </div>

        {/* سطر التسعير الحرفي من الخادم */}
        <p
          className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-center text-xs font-bold text-muted-foreground"
          dir="rtl"
        >
          {task.breakdown}
        </p>

        {/* موقع المتجر — زر خارجي (إحداثيات الخادم + تسمية المتجر) */}
        {task.facility_lat != null && task.facility_lng != null && (
          <OpenInMapsButton
            lat={task.facility_lat}
            lng={task.facility_lng}
            label={task.facility_name ?? "المتجر"}
            mode="navigate"
            variant="outline"
            size="sm"
            className="mt-3 h-11 w-full gap-2 rounded-2xl font-bold"
            aria-label="فتح الملاحة نحو موقع المتجر في تطبيق الخرائط"
          >
            <Navigation className="h-4.5 w-4.5" aria-hidden="true" />
            الملاحة إلى المتجر
          </OpenInMapsButton>
        )}

        {/* المبلغ المحصَّل نقداً */}
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-dashed border-accent/50 bg-accent/5 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Banknote className="h-4.5 w-4.5 text-accent-foreground" aria-hidden="true" />
            تحصّل نقداً من العميل
          </span>
          <span className="text-lg font-black text-foreground">
            {formatCurrency(task.total_collect)}
          </span>
        </div>
      </section>

      {/* السلسلة الإجبارية */}
      {!isClosed && (
        <section
          aria-label="خطوات المهمة"
          className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
        >
          <h2 className="mb-4 text-sm font-extrabold text-foreground">
            مسار التسليم — سلسلة إجبارية بالترتيب
          </h2>
          <ol className="space-y-1">
            {CHAIN.map((step, i) => {
              const done = i < chainIndex;
              const isNext = i === chainIndex;
              const available = task.next_actions.includes(step.action);
              return (
                <li key={step.action} className="flex items-start gap-3">
                  {/* الخط الرابط */}
                  {i > 0 && (
                    <span
                      className={cn(
                        "mx-auto my-0.5 block h-3 w-0.5",
                        done ? "bg-primary" : "bg-border",
                      )}
                      style={{ marginInline: "1.375rem" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="flex w-full items-center gap-3">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : isNext
                            ? "border-primary/50 bg-primary/5 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-bold",
                          done
                            ? "text-primary"
                            : isNext
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </p>
                      {isNext && available && (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (step.action === "complete_delivery") {
                              setCodeOpen(true);
                            } else {
                              runAction(step.action);
                            }
                          }}
                          disabled={progress.isPending}
                          className="mt-2 h-11 gap-2 rounded-xl bg-primary px-5 font-black text-primary-foreground native-tap"
                          aria-label={`تأكيد: ${step.label}`}
                        >
                          {progress.isPending ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
                          )}
                          تأكيد
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* زر المشكلة متاح دائماً في السلسلة النشطة */}
          {task.next_actions.includes("problem") && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setProblemOpen(true)}
              className="mt-4 h-12 w-full gap-2 rounded-2xl border-destructive/40 text-destructive native-tap"
              aria-label="الإبلاغ عن مشكلة تسليم"
            >
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              بلّغ عن مشكلة تسليم
            </Button>
          )}
        </section>
      )}

      {/* بطاقة اتصال العميل — بعد الحجز حصراً (الخادم يركّبها للحائز فقط) */}
      {customer && !isClosed && (
        <section
          aria-label="بيانات تواصل العميل"
          className="rounded-3xl border border-primary/35 bg-primary/[0.04] p-5 shadow-soft"
        >
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <UserRound className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            تواصل مع العميل
          </h2>

          {/* الاسم + الهاتف كبيراً نقراً (اتصال مباشر) */}
          <a
            href={`tel:${customer.customer_phone}`}
            className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft native-tap-card"
            aria-label={`اتصال بالعميل ${customer.customer_name} على ${customer.customer_phone}`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Phone className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {customer.customer_name}
              </span>
              {/* رقم الاتصال كبيراً — نقراً مباشراً */}
              <span
                dir="ltr"
                className="block text-xl font-black tracking-wide text-primary"
              >
                {customer.customer_phone}
              </span>
            </span>
          </a>

          {/* العنوان النصي */}
          {customer.delivery_address && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-card p-4">
              <MapPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground">
                {customer.delivery_address}
              </p>
            </div>
          )}

          {/* ملاحظات العميل */}
          {customer.notes && (
            <div className="mt-3 rounded-2xl bg-muted/60 p-4">
              <p className="text-[11px] font-bold text-muted-foreground">
                ملاحظات العميل
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {customer.notes}
              </p>
            </div>
          )}

          {/* زر «عرض موقع العميل» — نقل مباشر إلى تطبيق الخرائط مع
              تمرير الإحداثيات والعنوان (توجيه المالك — بلا خريطة داخلية) */}
          {customer.customer_location_available &&
            customer.delivery_lat != null &&
            customer.delivery_lng != null && (
              <div className="mt-3 space-y-2">
                <OpenInMapsButton
                  lat={customer.delivery_lat}
                  lng={customer.delivery_lng}
                  label={customer.delivery_address ?? customer.customer_name}
                  mode="view"
                  size="lg"
                  className="h-13 w-full gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground"
                  aria-label="عرض موقع العميل في تطبيق الخرائط مع تمرير الإحداثيات"
                >
                  <MapPin className="h-5.5 w-5.5" aria-hidden="true" />
                  عرض موقع العميل
                </OpenInMapsButton>
                <OpenInMapsButton
                  lat={customer.delivery_lat}
                  lng={customer.delivery_lng}
                  label={customer.delivery_address ?? "موقع العميل"}
                  mode="navigate"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full gap-2 rounded-2xl font-bold"
                  aria-label="فتح الملاحة نحو موقع العميل في تطبيق الخرائط"
                >
                  <Navigation className="h-5 w-5" aria-hidden="true" />
                  الملاحة إلى موقع العميل
                </OpenInMapsButton>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  يُنقلك الزر إلى تطبيق الخرائط على جهازك مع إحداثيات نقطة
                  استلام العميل — عاينها ثم انطلق
                </p>
              </div>
            )}
        </section>
      )}

      {/* الأصناف */}
      <section
        aria-label="أصناف الطلب"
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Receipt className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
          أصناف الطلب ({task.items.length})
        </h2>
        <ul className="max-h-64 space-y-2 overflow-y-auto scroll-area-thin" dir="rtl">
          {task.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                {item.product_name ?? "صنف"}
                <span className="ms-1.5 text-xs font-medium text-muted-foreground">
                  ×{item.quantity}
                </span>
              </span>
              <span className="shrink-0 text-sm font-black text-foreground">
                {formatCurrency(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══ حوار: كود التسليم ═══ */}
      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              كود التسليم
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              اطلب من العميل قراءة كود التسليم الظاهر في تطبيقه —٤ أرقام
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivery-code">كود التسليم (٤ أرقام)</Label>
            <Input
              id="delivery-code"
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
              placeholder="----"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="h-16 rounded-2xl text-center text-3xl font-black tracking-[0.5em]"
              aria-invalid={code.length > 0 && code.length !== 4}
              autoComplete="one-time-code"
            />
            {code.length > 0 && code.length !== 4 && (
              <p role="alert" className="text-xs text-destructive">
                الكود أربعة أرقام بالضبط
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCodeOpen(false)}
              className="h-12 flex-1 rounded-2xl native-tap"
            >
              إلغاء
            </Button>
            <Button
              onClick={() => runAction("complete_delivery", { delivery_code: code })}
              disabled={code.length !== 4 || progress.isPending}
              className="h-12 flex-1 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              {progress.isPending && (
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              )}
              تأكيد التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار: مشكلة تسليم ═══ */}
      <Dialog open={problemOpen} onOpenChange={setProblemOpen}>
        <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-black text-foreground">
              الإبلاغ عن مشكلة تسليم
            </DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              سيصل بلاغك للإدارة والمتجر فوراً لاتخاذ القرار المناسب
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>نوع المشكلة</Label>
              <Select value={problemType} onValueChange={setProblemType} dir="rtl">
                <SelectTrigger className="h-12 rounded-xl" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {PROBLEM_TYPES.map((t) => (
                    <SelectItem key={t.v} value={t.v}>
                      {t.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="problem-desc">التفاصيل (اختياري)</Label>
              <Textarea
                id="problem-desc"
                value={problemDesc}
                onChange={(e) => setProblemDesc(e.target.value.slice(0, 500))}
                placeholder="اشرح المشكلة بإيجاز ليتخذ القرار مَن يعنيه الأمر"
                className="min-h-24 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setProblemOpen(false)}
              className="h-12 flex-1 rounded-2xl native-tap"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                runAction("problem", {
                  problem_type: problemType,
                  problem_description: problemDesc || null,
                })
              }
              disabled={progress.isPending}
              className="h-12 flex-1 gap-2 rounded-2xl font-black native-tap"
            >
              {progress.isPending && (
                <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
              )}
              إرسال البلاغ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مهمة مكتملة/ملغاة */}
      {isClosed && (
        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "rounded-3xl border p-6 text-center",
            task.status === "completed"
              ? "border-primary/40 bg-primary/5"
              : "border-destructive/30 bg-destructive/5",
          )}
        >
          <p className="text-lg font-black text-foreground">{task.status_ar}</p>
          {task.completed_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              أُغلقت في{" "}
              {new Date(task.completed_at).toLocaleString("ar", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
          <p className="mt-2 text-sm font-bold text-primary">
            {task.status === "completed"
              ? `أُضيفت أجرة ${formatCurrency(task.fee)} إلى أرباحك`
              : "يمكنك استقبال نداء جديد من الرئيسية"}
          </p>
        </motion.section>
      )}
    </main>
  );
}
