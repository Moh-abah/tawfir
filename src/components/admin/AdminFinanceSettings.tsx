"use client";

/**
 * AdminFinanceSettings — تبويب «الإعدادات المالية» (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 * قرارات موثقة:
 *  - **حفظ فردي لكل حقل** (وليس جماعياً): المجموعات عشرة والمفاتيح 17+
 *    — الحفظ الفردي يعطي حالة pending لكل حقل على حدة ويمنع كتابة
 *    مفاتيح لم يغيرها الأدمن، ويعمل جيداً على الموبايل حيث تُرى مجموعة
 *    واحدة غالباً. مفتاح واحد = نداء PUT واحد كما يتوقع الخادم.
 *  - القيم نصوص من الخادم (FinanceSettingItem.value: string) — مقارنة
 *    الاتساخ (dirty) وحفظها نصاً حرفياً بلا تحويل أرقام.
 *  - PAYOUT_AUTO_AFTER_ASSIGN (Switch) يُحفظ فوراً عند التبديل بنمط
 *    «المحافظ» المعتمد في اللوحة — بقية الحقول بزر حفظ صغير.
 *  - YE_DEBT_CAP_COMMISSIONS الفارغ = بلا سقف (placeholder يوضح ذلك).
 *  - أي مفتاح غير معروف يظهر في «مفاتيح أخرى» — لا يُسقط ولا يُحجب.
 *  - بطاقة «التوصيل كما يراه العميل» فوق مجموعتي التوصيل: نص فقط
 *    يتحدث لحظياً مع الكتابة — بلا أي حسابات.
 *  - مزامنة قيم الخادم بنمط «key reset» (المحرر يُعاد تركيبه عند تغيّر
 *    المحتوى الفعلي) بدل setState داخل useEffect — قاعدة react-hooks
 *    set-state-in-effect. زر «تحديث» يعيد الجلب؛ تغيّر القيم = تركيب جديد
 *    بقيم الخادم (يلغي غير المحفوظ عمداً — موثق في tooltip الزر).
 */

import { useState } from "react";
import {
  BadgePercent,
  Calculator,
  Coins,
  CreditCard,
  Eye,
  Gauge,
  Info,
  KeyRound,
  Loader2,
  Percent,
  RefreshCw,
  Save,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/ErrorState";
import { useFinanceSettings, useUpdateFinanceSetting } from "@/hooks/useFinance";
import type { FinanceSettingItem } from "@/services/finance.service";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─── تعريف الحقول والمجموعات ─────────────────────────────── */

interface SettingField {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "switch";
  /** فراغ الحقل له معنى موثق — مثل سقف الذمة (فارغ = بلا سقف) */
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
}

interface SettingGroup {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  fields: SettingField[];
}

const ACCOUNT_MODE_OPTIONS = [
  { value: "direct", label: "مباشر" },
  { value: "aggregation", label: "تجميع" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "embedded", label: "نموذج مدمج" },
  { value: "direct", label: "مباشر" },
];

const GROUPS: SettingGroup[] = [
  {
    id: "sa-commission",
    title: "عمولة السعودية",
    description: "عمولة المنصة على طلبات السوق السعودي (قيم بالريال — تُحفظ نصاً كما تُكتب).",
    icon: Percent,
    tone: "bg-primary/15 text-primary",
    fields: [
      { key: "SA_COMMISSION_FLAT_SAR", label: "العمولة الثابتة (ر.س)" },
      { key: "SA_COMMISSION_THRESHOLD_SAR", label: "حد تطبيق العمولة (ر.س)" },
    ],
  },
  {
    id: "ye-commission",
    title: "عمولة اليمن",
    description: "عمولة الفاتورة اليمنية دون/فوق الحد — قيم نصية من الخادم.",
    icon: Coins,
    tone: "bg-secondary/20 text-secondary-foreground",
    fields: [
      { key: "YE_INVOICE_COMMISSION_BELOW_THRESHOLD", label: "عمولة الفاتورة دون الحد" },
      { key: "YE_INVOICE_COMMISSION_THRESHOLD", label: "حد الفاتورة" },
      { key: "YE_INVOICE_COMMISSION", label: "نسبة العمولة" },
    ],
  },
  {
    id: "ye-debt-cap",
    title: "سقف الذمة اليمني",
    description: "أقصى ذمة متراكمة مسموح للتاجر اليمني قبل إيقاف طلباته.",
    icon: Gauge,
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    fields: [
      {
        key: "YE_DEBT_CAP_COMMISSIONS",
        label: "سقف الذمة",
        placeholder: "اتركه فارغاً = بلا سقف",
        hint: "الفارغ يعني بلا سقف — الذمة تتراكم بلا حد.",
      },
    ],
  },
  {
    id: "account-mode",
    title: "نمط الحساب",
    description: "كيف تُحسب العمولات على مستوى المنصة.",
    icon: Calculator,
    tone: "bg-accent/20 text-accent-ink",
    fields: [
      {
        key: "ACCOUNT_MODE",
        label: "نمط الحساب",
        type: "select",
        options: ACCOUNT_MODE_OPTIONS,
      },
    ],
  },
  {
    id: "payouts",
    title: "الصرف للمندوبين",
    description: "الصرف التلقائي عند الإسناد وفترة تحديث بطاقات المالية.",
    icon: Wallet,
    tone: "bg-primary/15 text-primary",
    fields: [
      {
        key: "PAYOUT_AUTO_AFTER_ASSIGN",
        label: "صرف تلقائي بعد إسناد الطلب",
        type: "switch",
        hint: "التبديل يحفظ فوراً — true يعني أمر صرف تلقائي بعد إسناد كل طلب.",
      },
      { key: "FINANCE_POLLING_SECONDS", label: "ثواني التحديث الدوري", type: "number" },
    ],
  },
  {
    id: "discount",
    title: "الخصم الأقصى",
    description: "سقف نسبة الخصم المسموح به على المنصة.",
    icon: BadgePercent,
    tone: "bg-destructive/10 text-destructive",
    fields: [{ key: "DISCOUNT_MAX_PCT", label: "أقصى نسبة خصم %" }],
  },
  {
    id: "sa-delivery",
    title: "التوصيل — السعودية",
    description: "أجرة الأساس والمسافة المشمولة وأجرة الكيلومتر الإضافي (ر.س).",
    icon: Truck,
    tone: "bg-primary/15 text-primary",
    fields: [
      { key: "SA_DELIVERY_BASE_FEE", label: "أجرة الأساس (ر.س)" },
      { key: "SA_DELIVERY_BASE_KM", label: "الكيلومترات المشمولة" },
      { key: "SA_DELIVERY_PER_KM", label: "أجرة الكم الإضافي (ر.س)" },
    ],
  },
  {
    id: "ye-delivery",
    title: "التوصيل — اليمن",
    description: "أجرة الأساس والمسافة المشمولة وأجرة الكيلومتر الإضافي (ر.ي).",
    icon: Truck,
    tone: "bg-secondary/20 text-secondary-foreground",
    fields: [
      { key: "YE_DELIVERY_BASE_FEE", label: "أجرة الأساس (ر.ي)" },
      { key: "YE_DELIVERY_BASE_KM", label: "الكيلومترات المشمولة" },
      { key: "YE_DELIVERY_PER_KM", label: "أجرة الكم الإضافي (ر.ي)" },
    ],
  },
  {
    id: "payment-mode",
    title: "نمط الدفع",
    description: "نموذج بوابة الدفع المعروض للعملاء في السوق السعودي.",
    icon: CreditCard,
    tone: "bg-accent/20 text-accent-ink",
    fields: [
      {
        key: "PAYMENT_MODE",
        label: "نمط الدفع",
        type: "select",
        options: PAYMENT_MODE_OPTIONS,
      },
    ],
  },
];

const KNOWN_KEYS = new Set(GROUPS.flatMap((g) => g.fields.map((f) => f.key)));

/* ─── مكوّن الشاشة ─────────────────────────────────────────── */

/** خريطة items → (key→value) — القيم نصوص كما تعيدها الاستجابة */
function toValueMap(items: FinanceSettingItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) map[item.key] = item.value ?? "";
  return map;
}

function toStampMap(items: FinanceSettingItem[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const item of items) map[item.key] = item.updated_at;
  return map;
}

export default function AdminFinanceSettings() {
  const settings = useFinanceSettings();

  /* ── حالات: هيكل / خطأ ── */
  if (settings.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="جارٍ تحميل الإعدادات المالية">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <ErrorState
        title="تعذّر تحميل الإعدادات المالية"
        message={
          settings.error instanceof Error
            ? settings.error.message
            : "لم نتمكن من جلب مفاتيح الإعدادات. أعد المحاولة."
        }
        onRetry={() => settings.refetch()}
      />
    );
  }

  /* محرر يُعاد تركيبه عند أي تغيّر حقيقي في قيم الخادم — نمط
     "key reset" بدل setState داخل effect (قاعدة set-state-in-effect).
     مفتاح dataKey يعتمد على المحتوى (key=value) لا على مرجع المصفوفة،
     فلا يُفقد أي تعديل محلي عند إعادة جلب بلا تغيّر فعلي. */
  const dataKey = settings.data.map((i) => `${i.key}=${i.value}`).join("&");

  return (
    <SettingsEditor
      key={dataKey}
      items={settings.data}
      onRefresh={() => settings.refetch()}
      fetching={settings.isFetching}
    />
  );
}

function SettingsEditor({
  items,
  onRefresh,
  fetching,
}: {
  items: FinanceSettingItem[];
  onRefresh: () => void;
  fetching: boolean;
}) {
  const updateSetting = useUpdateFinanceSetting();

  /* قيم محلية نصية + قيم الخادم لآخر مزامنة (أساس مقارنة الاتساخ) —
     تُهيأ مرة واحدة من items، وأي تحديث من الخادم يعيد تركيب المكوّن */
  const [values, setValues] = useState<Record<string, string>>(() =>
    toValueMap(items)
  );
  const [serverValues] = useState<Record<string, string>>(() =>
    toValueMap(items)
  );
  const [updatedAt] = useState<Record<string, string | null>>(() =>
    toStampMap(items)
  );

  /* المفتاح الجاري حفظه (لحالة pending لكل حقل) */
  const savingKey = updateSetting.isPending ? updateSetting.variables?.key : null;

  /* مفاتيح من الخادم غير مصنّفة في المجموعات المعروفة (مستقبلية) */
  const unknownKeys = items.map((i) => i.key).filter((k) => !KNOWN_KEYS.has(k));

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isDirty = (key: string) =>
    (values[key] ?? "") !== (serverValues[key] ?? "");

  const saveField = (key: string) => {
    if (!isDirty(key)) return;
    updateSetting.mutate({ key, value: values[key] ?? "" });
  };

  const toggleSwitch = (key: string, checked: boolean) => {
    /* قيم الـswitch نصوص "true"/"false" — تُقارن وتُحفظ نصاً */
    if ((values[key] ?? "") === String(checked)) return;
    updateSetting.mutate({ key, value: String(checked) });
  };

  const saveButton = (key: string, dirty: boolean, saving: boolean) => (
    <Button
      type="button"
      size="sm"
      variant={dirty ? "default" : "outline"}
      disabled={!dirty || saving}
      onClick={() => saveField(key)}
      className="min-h-[44px] gap-1.5 self-start rounded-full px-4 sm:self-end"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Save className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {saving ? "جارٍ الحفظ..." : "حفظ"}
    </Button>
  );

  const fieldRow = (field: SettingField) => {
    const dirty = isDirty(field.key);
    const saving = savingKey === field.key;
    const stamp = updatedAt[field.key];

    return (
      <div
        key={field.key}
        className="rounded-xl border border-border/50 bg-muted/20 p-3"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={`set-${field.key}`} className="text-xs font-bold text-foreground">
                {field.label}
              </Label>
              <span
                dir="ltr"
                className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {field.key}
              </span>
            </div>

            {field.type === "switch" ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-2.5">
                <span className="text-sm font-bold">
                  {(values[field.key] ?? "") === "true" ? "مفعّل" : "معطّل"}
                </span>
                <Switch
                  checked={(values[field.key] ?? "") === "true"}
                  disabled={saving}
                  onCheckedChange={(checked) => toggleSwitch(field.key, checked)}
                  aria-label={field.label}
                />
              </div>
            ) : field.type === "select" ? (
              <Select
                value={values[field.key] ?? ""}
                onValueChange={(v) => setValue(field.key, v)}
              >
                <SelectTrigger
                  id={`set-${field.key}`}
                  className="min-h-[44px] w-full bg-background"
                  dir="rtl"
                >
                  <SelectValue placeholder="اختر القيمة" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`set-${field.key}`}
                value={values[field.key] ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder ?? "القيمة من الخادم"}
                inputMode={field.type === "number" ? "decimal" : "text"}
                dir="ltr"
                className="min-h-[44px] bg-background text-left"
              />
            )}

            {field.hint && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">{field.hint}</p>
            )}
            {stamp && (
              <p className="text-[10px] text-muted-foreground/70">
                آخر تحديث: {formatDate(stamp)}
              </p>
            )}
          </div>

          {field.type !== "switch" && saveButton(field.key, dirty, saving)}
          {field.type === "switch" && saving && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground sm:mb-2" aria-hidden="true" />
          )}
        </div>
      </div>
    );
  };

  const groupCard = (group: SettingGroup, fields: SettingField[]) => {
    if (fields.length === 0) return null;
    const Icon = group.icon;
    return (
      <Card key={group.id} className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", group.tone)}>
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            {group.title}
          </CardTitle>
          <CardDescription>{group.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">{fields.map(fieldRow)}</CardContent>
        {group.id === "payment-mode" && (
          <CardContent className="pt-0">
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2.5 text-[11px] font-bold leading-relaxed text-amber-700 dark:text-amber-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              تنبيه: direct = شاشة الدفع تعرض «تحت الصيانة» للعملاء — نمط «نموذج مدمج»
              (embedded) هو الذي يعرض بوابة Moyasar المدمجة.
            </p>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* رأس مع زر تحديث — يعيد الجلب ويستعيد قيم الخادم */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          أي حفظ يسري فوراً على المنصة بلا إعادة نشر — القيم نصوص من الخادم
          وتُحفظ كما تُكتب.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={fetching}
          title="يعيد الجلب ويستعيد قيم الخادم (يلغي التعديلات غير المحفوظة)"
          className="min-h-[44px] gap-1.5 self-start rounded-full sm:self-center"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", fetching && "animate-spin")}
            aria-hidden="true"
          />
          تحديث
        </Button>
      </div>

      {/* ── بطاقة المعاينة الحية — نص فقط بلا حسابات ── */}
      <Card className="rounded-2xl border-primary/30 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Eye className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            التوصيل كما يراه العميل — معاينة حية
          </CardTitle>
          <CardDescription>
            تتحدث لحظياً أثناء الكتابة (نص كما سيُعرض — بلا حسابات).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <span className="mb-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              السعودية
            </span>
            <p className="text-sm font-bold leading-7 text-foreground">
              {`${values["SA_DELIVERY_BASE_FEE"]?.trim() || "—"} ر.س لأول ${
                values["SA_DELIVERY_BASE_KM"]?.trim() || "—"
              } كم + ${values["SA_DELIVERY_PER_KM"]?.trim() || "—"} ر.س لكل كم إضافي`}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
            <span className="mb-1.5 inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
              اليمن
            </span>
            <p className="text-sm font-bold leading-7 text-foreground">
              {`${values["YE_DELIVERY_BASE_FEE"]?.trim() || "—"} ر.ي لأول ${
                values["YE_DELIVERY_BASE_KM"]?.trim() || "—"
              } كم + ${values["YE_DELIVERY_PER_KM"]?.trim() || "—"} ر.ي لكل كم إضافي`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── المجموعات المرئية ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((group) =>
          groupCard(
            group,
            group.fields.filter((f) => f.key in values)
          )
        )}
      </div>

      {/* ── مفاتيح أخرى (مستقبلية — لا تُسقط) ── */}
      {unknownKeys.length > 0 && (
        <Card className="rounded-2xl border-dashed border-border/60 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <KeyRound className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              مفاتيح أخرى
            </CardTitle>
            <CardDescription>
              مفاتيح من الخادم غير مصنّفة في المجموعات أعلاه — تُعرض وتُحفظ كما هي.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {unknownKeys.map((key) =>
              fieldRow({ key, label: key })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
