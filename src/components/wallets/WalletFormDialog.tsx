"use client";

/**
 * WalletFormDialog — نموذج إضافة/تعديل محفظة (مشترك: التاجر + المندوب).
 *
 * نوعا المحفظة (لا خلاف عليهما):
 *  - point: رقم النقطة + اسم النقطة  (مثال: 12345 — فرع حدة)
 *  - phone: رقم الهاتف + الاسم الظاهر في التحويل
 *
 * التحقق مطابق للخادم حرفياً: point يتطلب الرقم + الاسم معاً، وphone
 * يتطلب الهاتف + الاسم معاً. سقوف الخادم: 10 محافظ للمنشأة، 5 للمندوب.
 */

import { useMemo, useState } from "react";
import { Loader2, MapPin, Phone, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWalletProviders } from "@/hooks/useWallets";
import type { FacilityWalletOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

export type WalletAccountType = "point" | "phone";

interface WalletFormValues {
  provider_id: number;
  account_type: WalletAccountType;
  point_number: string;
  point_name: string;
  phone_number: string;
  account_name: string;
  is_active: boolean;
}

const EMPTY_FORM: WalletFormValues = {
  provider_id: 0,
  account_type: "point",
  point_number: "",
  point_name: "",
  phone_number: "",
  account_name: "",
  is_active: true,
};

function walletToForm(w?: FacilityWalletOut | null): WalletFormValues {
  if (!w) return EMPTY_FORM;
  return {
    provider_id: w.provider_id,
    account_type: (w.account_type === "phone" ? "phone" : "point") as WalletAccountType,
    point_number: w.point_number ?? "",
    point_name: w.point_name ?? "",
    phone_number: w.phone_number ?? "",
    account_name: w.account_name ?? "",
    is_active: w.is_active,
  };
}

interface WalletFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** محفظة للتعديل — null/undefined = إضافة. */
  wallet?: FacilityWalletOut | null;
  /** إظهار مفتاح التفعيل. */
  showActiveToggle?: boolean;
  submitting?: boolean;
  onSubmit: (values: {
    provider_id: number;
    account_type: WalletAccountType;
    point_number?: string;
    point_name?: string;
    phone_number?: string;
    account_name?: string;
    is_active?: boolean;
  }) => void;
  /** رسالة خطأ من الخادم (detail عربي) تُعرض أعلى زر الحفظ. */
  serverError?: string | null;
}

export function WalletFormDialog({
  open,
  onOpenChange,
  wallet,
  showActiveToggle = true,
  submitting = false,
  onSubmit,
  serverError,
}: WalletFormDialogProps) {
  const isMobile = useIsMobile();
  const providersQuery = useWalletProviders(open);
  const [form, setForm] = useState<WalletFormValues>(() => walletToForm(wallet));
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* إعادة التعبئة عند فتح النموذج — نمط React الرسمي «ضبط الحالة عند
     تغيّر الخصائص» أثناء التصيير (بلا تأثير جانبي في Effect) */
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = open ? `open-${wallet?.id ?? "new"}` : "closed";
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (open) {
      setForm(walletToForm(wallet));
      setErrors({});
    }
  }

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);

  const set = <K extends keyof WalletFormValues>(key: K, value: WalletFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.provider_id) next.provider_id = "اختر محفظة الدفع (جوالي، جيب...)";
    if (form.account_type === "point") {
      if (!form.point_number.trim()) next.point_number = "أدخل رقم النقطة";
      if (!form.point_name.trim()) next.point_name = "أدخل اسم النقطة";
    } else {
      if (!form.phone_number.trim()) next.phone_number = "أدخل رقم الهاتف";
      if (!form.account_name.trim()) next.account_name = "أدخل الاسم الظاهر في التحويل";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const base = {
      provider_id: form.provider_id,
      account_type: form.account_type,
    };
    if (form.account_type === "point") {
      onSubmit({
        ...base,
        point_number: form.point_number.trim(),
        point_name: form.point_name.trim(),
        is_active: showActiveToggle ? form.is_active : undefined,
      });
    } else {
      onSubmit({
        ...base,
        phone_number: form.phone_number.trim(),
        account_name: form.account_name.trim(),
        is_active: showActiveToggle ? form.is_active : undefined,
      });
    }
  };

  const body = (
    <div className="space-y-4">
      {/* اختيار المحفظة (provider_id) */}
      <div className="space-y-2">
        <Label htmlFor="wallet-provider" className="text-sm font-bold">
          المحفظة *
        </Label>
        <Select
          value={form.provider_id ? String(form.provider_id) : ""}
          onValueChange={(v) => set("provider_id", Number(v))}
          dir="rtl"
        >
          <SelectTrigger id="wallet-provider" className="w-full min-h-[44px]">
            <SelectValue placeholder="اختر المحفظة (جوالي، محفظة جيب...)" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                <span className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.provider_id && (
          <p className="text-xs text-destructive" role="alert">
            {errors.provider_id}
          </p>
        )}
      </div>

      {/* نوع الحساب: نقطة أو هاتف */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">نوع الحساب *</Label>
        <RadioGroup
          value={form.account_type}
          onValueChange={(v) => set("account_type", v as WalletAccountType)}
          className="grid grid-cols-2 gap-2"
        >
          <label
            className={cn(
              "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold transition-colors",
              form.account_type === "point"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/40"
            )}
          >
            <RadioGroupItem value="point" className="sr-only" />
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            رقم نقطة
          </label>
          <label
            className={cn(
              "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold transition-colors",
              form.account_type === "phone"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/40"
            )}
          >
            <RadioGroupItem value="phone" className="sr-only" />
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            رقم هاتف
          </label>
        </RadioGroup>
      </div>

      {/* حقول النقطة */}
      {form.account_type === "point" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wallet-point-number" className="text-sm font-bold">
              رقم النقطة *
            </Label>
            <Input
              id="wallet-point-number"
              dir="ltr"
              inputMode="numeric"
              maxLength={50}
              placeholder="12345"
              value={form.point_number}
              onChange={(e) => set("point_number", e.target.value)}
              className="min-h-[44px]"
            />
            {errors.point_number && (
              <p className="text-xs text-destructive" role="alert">
                {errors.point_number}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-point-name" className="text-sm font-bold">
              اسم النقطة *
            </Label>
            <Input
              id="wallet-point-name"
              maxLength={100}
              placeholder="فرع حدة"
              value={form.point_name}
              onChange={(e) => set("point_name", e.target.value)}
              className="min-h-[44px]"
            />
            {errors.point_name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.point_name}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wallet-phone" className="text-sm font-bold">
              رقم الهاتف *
            </Label>
            <Input
              id="wallet-phone"
              dir="ltr"
              inputMode="tel"
              maxLength={30}
              placeholder="777999888"
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              className="min-h-[44px]"
            />
            {errors.phone_number && (
              <p className="text-xs text-destructive" role="alert">
                {errors.phone_number}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-account-name" className="text-sm font-bold">
              الاسم الظاهر في التحويل *
            </Label>
            <Input
              id="wallet-account-name"
              maxLength={100}
              placeholder="أحمد محمد"
              value={form.account_name}
              onChange={(e) => set("account_name", e.target.value)}
              className="min-h-[44px]"
            />
            {errors.account_name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.account_name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* مفتاح التفعيل — المعطلة تختفي عن العملاء */}
      {showActiveToggle && (
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-xl border px-3">
          <span className="text-sm font-medium text-foreground">
            محفظة مفعّلة (ظاهرة للعملاء)
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--primary)]"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
          />
        </label>
      )}

      {serverError && (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          role="alert"
        >
          {serverError}
        </p>
      )}
    </div>
  );

  const footer = (
    <div className="flex flex-row-reverse gap-2">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || providersQuery.isLoading}
        className="min-h-[44px] flex-1 rounded-full"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {wallet ? "حفظ التعديلات" : "إضافة المحفظة"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="min-h-[44px] flex-1 rounded-full"
      >
        إلغاء
      </Button>
    </div>
  );

  const title = wallet ? "تعديل محفظة التحويل" : "إضافة محفظة تحويل";
  const description = wallet
    ? "حدّث بيانات الحساب الذي يستلم تحويلات عملائك"
    : "اختر المحفظة وأدخل بيانات الحساب الذي يستلم تحويلات عملائك";

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="scroll-area-thin max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[max(env(safe-area-inset-bottom,0px),var(--cap-safe-bottom,0px))]"
        >
          <div className="bottom-sheet-grip mt-1" aria-hidden="true" />
          <SheetHeader className="text-right">
            <SheetTitle className="text-right">{title}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">{body}</div>
          <div className="px-4 pb-4">{footer}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
