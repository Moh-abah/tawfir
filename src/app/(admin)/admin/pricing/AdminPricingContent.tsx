"use client";

/**
 * /admin/pricing — محرر إعدادات تسعير التوصيل (GET/PATCH /admin/pricing).
 * ═══════════════════════════════════════════════════════════════════
 * الحقول القابلة للتحرير (نطاقاتها من عقد PricingSettingsUpdate):
 *   سعر الكم (50-2000) · الحد الأدنى (0-2000) · سقف المسافة (0-100 كم)
 *   أجرة العنوان غير الدقيق (0-5000) · نافذة النداء (ث) · نصف قطر النداء
 *   (كم) · سقف الموجة · مهلة النبض (ث) · تعويض الإلغاء (نمط/قيمة)
 * أعلام الميزات (قراءة حصرية — يديرها الخادم) تُعرض كشرائح حالة.
 */

import { useMemo, useState } from "react";
import {
  Banknote,
  CircleDot,
  Loader2,
  Percent,
  Ruler,
  Save,
  Timer,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminPricing,
  useAdminPricingUpdate,
} from "@/hooks/useAdminDelivery";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

/* تعريف حقل رقمي: مفتاح + تسمية + نطاق + وحدة */
interface FieldDef {
  key: "price_per_km" | "min_delivery_fee" | "max_delivery_km" | "imprecise_address_fee" | "call_window_seconds" | "call_radius_km" | "wave_courier_cap" | "pulse_grace_seconds" | "cancel_compensation_value";
  label: string;
  hint: string;
  min: number;
  max: number;
  unit?: string;
  step?: number;
}

const FIELDS: FieldDef[] = [
  {
    key: "price_per_km",
    label: "سعر الكيلومتر",
    hint: "المعامل الحي في كل حسابات الأجرة",
    min: 50,
    max: 2000,
    unit: "ر.ي / كم",
  },
  {
    key: "min_delivery_fee",
    label: "الحد الأدنى للأجرة",
    hint: "لا تقل أجرة أي توصيلة عنها مهما قصرت المسافة",
    min: 0,
    max: 2000,
    unit: "ر.ي",
  },
  {
    key: "max_delivery_km",
    label: "سقف مسافة التوصيل",
    hint: "طلبات أبعد من هذا الحد تُرفض خارج النطاق",
    min: 0,
    max: 100,
    unit: "كم",
  },
  {
    key: "imprecise_address_fee",
    label: "أجرة العنوان غير المحدد",
    hint: "أجرة أساس عند غياب نقطة العميل الدقيقة",
    min: 0,
    max: 5000,
    unit: "ر.ي",
  },
  {
    key: "call_window_seconds",
    label: "نافذة النداء",
    hint: "مدة عرض بطاقة النداء على المندوب قبل انتهائها",
    min: 15,
    max: 300,
    unit: "ثانية",
  },
  {
    key: "call_radius_km",
    label: "نصف قطر النداء",
    hint: "المسافة التي يُبحث فيها عن مناديب حول المتجر",
    min: 1,
    max: 30,
    unit: "كم",
    step: 0.5,
  },
  {
    key: "wave_courier_cap",
    label: "سقف الموجة",
    hint: "أقصى عدد مناديب تناديهم الموجة الواحدة",
    min: 1,
    max: 50,
    unit: "مندوب",
  },
  {
    key: "pulse_grace_seconds",
    label: "مهلة النبض",
    hint: "يعتبر المندوب «متاحاً» خلالها بعد آخر نبض",
    min: 30,
    max: 600,
    unit: "ثانية",
  },
  {
    key: "cancel_compensation_value",
    label: "قيمة تعويض الإلغاء",
    hint: "نسبة مئوية أو مبلغ ثابت حسب النمط أدناه",
    min: 0,
    max: 5000,
  },
];

/* أعلام الميزات — قراءة حصرية */
const FLAGS: { key: string; label: string }[] = [
  { key: "couriers_enabled", label: "بوابة المناديب" },
  { key: "delivery_tasks_enabled", label: "مهام التوصيل" },
  { key: "live_pricing_enabled", label: "التسعير الحي" },
  { key: "code_delivery_enabled", label: "كود التسليم" },
  { key: "partner_gateway_enabled", label: "بوابة الشركاء" },
  { key: "mandatory_order_location_enabled", label: "إلزامية موقع الطلب" },
  { key: "dual_tasks_enabled", label: "المهام المزدوجة" },
];

export default function AdminPricingContent() {
  const { data, isLoading, isError, error, refetch } =
    useAdminPricing();
  const update = useAdminPricingUpdate();

  /* مسودة التحرير — تُهيأ من الرد مرة واحدة (وتُعاد عند إعادة الجلب
     بعد نجاح الحفظ عبر مزامنة الكاش) */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<string>("percent");
  const [hydratedFrom, setHydratedFrom] = useState<unknown>(null);

  if (data && hydratedFrom !== data) {
    setHydratedFrom(data);
    const d: Record<string, string> = {};
    for (const f of FIELDS) d[f.key] = String(data[f.key] ?? "");
    setDraft(d);
    setMode(data.cancel_compensation_mode ?? "percent");
  }

  const dirty = useMemo(
    () =>
      data != null &&
      (FIELDS.some((f) => {
        const raw = draft[f.key] ?? "";
        const num = Number.parseFloat(raw);
        return !Number.isFinite(num) || num !== (data[f.key] as number);
      }) ||
        mode !== data.cancel_compensation_mode),
    [data, draft, mode],
  );

  const save = () => {
    if (!data) return;
    const body: Record<string, number | string> = {};
    for (const f of FIELDS) {
      const raw = draft[f.key] ?? "";
      const num = Number.parseFloat(raw);
      if (!Number.isFinite(num)) continue;
      if (num !== (data[f.key] as number)) {
        body[f.key] = f.step ? Math.round(num * 10) / 10 : Math.round(num);
      }
    }
    if (mode !== data.cancel_compensation_mode) {
      body.cancel_compensation_mode = mode;
    }
    if (Object.keys(body).length === 0) return;
    haptic("success");
    update.mutate(body as never);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      <div className="mb-4">
        <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
          إعدادات تسعير التوصيل
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          القيم الحالية مطبقة فوراً على كل الحسابات الجارية
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" role="status">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <ErrorState
          title="تعذّر جلب إعدادات التسعير"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {/* الحقول الرقمية */}
          <section aria-label="حقول التسعير" className="space-y-3">
            {FIELDS.map((f) => {
              const raw = draft[f.key] ?? "";
              const num = Number.parseFloat(raw);
              const invalid =
                raw !== "" &&
                (!Number.isFinite(num) || num < f.min || num > f.max);
              const changed = data != null && num !== (data[f.key] as number);
              return (
                <div
                  key={f.key}
                  className="rounded-2xl border border-border/60 bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label
                      htmlFor={`f-${f.key}`}
                      className="flex items-center gap-1.5 text-sm font-bold text-foreground"
                    >
                      {(() => {
                        const I = FIELD_ICON[f.key];
                        return I ? (
                          <I className="h-4 w-4 text-primary" aria-hidden="true" />
                        ) : null;
                      })()}
                      {f.label}
                    </Label>
                    {changed && !invalid && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                        معدّل
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      id={`f-${f.key}`}
                      dir="ltr"
                      inputMode="decimal"
                      value={raw}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                      aria-invalid={invalid}
                      aria-describedby={`h-${f.key}`}
                      className={cn(
                        "h-12 rounded-xl text-center text-lg font-black tabular-nums",
                        invalid && "border-destructive/50",
                      )}
                    />
                    {f.unit && (
                      <span className="shrink-0 text-xs font-bold text-muted-foreground">
                        {f.unit}
                      </span>
                    )}
                  </div>
                  <p
                    id={`h-${f.key}`}
                    className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    {f.hint} · النطاق {f.min}–{f.max}
                  </p>
                  {invalid && (
                    <p role="alert" className="mt-1 text-[11px] font-bold text-destructive">
                      قيمة خارج النطاق المسموح ({f.min}–{f.max})
                    </p>
                  )}
                </div>
              );
            })}

            {/* نمط تعويض الإلغاء */}
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <Label className="text-sm font-bold text-foreground">
                نمط تعويض الإلغاء
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { v: "percent", l: "نسبة مئوية %" },
                  { v: "fixed", l: "مبلغ ثابت" },
                ].map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.v}
                    onClick={() => {
                      haptic("tick");
                      setMode(m.v);
                    }}
                    className={cn(
                      "native-tap min-h-[48px] rounded-xl border-2 px-3 text-sm font-bold transition-colors",
                      mode === m.v
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* أعلام الميزات — قراءة حصرية */}
          <section
            aria-label="أعلام الميزات (قراءة)"
            className="mt-5 rounded-2xl border border-border/60 bg-muted/30 p-4"
          >
            <p className="text-xs font-black text-muted-foreground">
              أعلام الميزات — حالة تشغيل الخادم (قراءة حصرية)
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {FLAGS.map((fl) => {
                const on = Boolean(
                  (data as unknown as Record<string, unknown>)[fl.key],
                );
                return (
                  <span
                    key={fl.key}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold",
                      on
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <CircleDot className="h-3 w-3" aria-hidden="true" />
                    {fl.label}
                  </span>
                );
              })}
            </div>
          </section>

          {/* زر الحفظ */}
          <div className="sticky bottom-0 mt-5 border-t bg-background/95 pt-4 pb-2 backdrop-blur">
            <Button
              size="lg"
              onClick={save}
              disabled={!dirty || update.isPending || FIELDS.some((f) => {
                const raw = draft[f.key] ?? "";
                const num = Number.parseFloat(raw);
                return raw !== "" && (!Number.isFinite(num) || num < f.min || num > f.max);
              })}
              className="h-14 w-full gap-3 rounded-2xl bg-primary text-base font-black text-primary-foreground native-tap"
              aria-label="حفظ إعدادات التسعير"
            >
              {update.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-5 w-5" aria-hidden="true" />
              )}
              {update.isPending ? "جارٍ الحفظ…" : dirty ? "حفظ التعديلات" : "لا تعديلات"}
            </Button>
            {dirty && !update.isPending && (
              <p className="mt-1.5 text-center text-[11px] font-bold text-muted-foreground">
                تُطبَّق القيم الجديدة على الحسابات الجارية فور الحفظ
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const FIELD_ICON: Partial<Record<FieldDef["key"], typeof Banknote>> = {
  price_per_km: Banknote,
  min_delivery_fee: Banknote,
  max_delivery_km: Ruler,
  imprecise_address_fee: Banknote,
  call_window_seconds: Timer,
  call_radius_km: Ruler,
  wave_courier_cap: Waves,
  pulse_grace_seconds: Timer,
  cancel_compensation_value: Percent,
};
