"use client";

/**
 * WalletPickerList — منتقي محفظة المتجر داخل نموذج الطلب.
 *
 * يظهر عندما يختار العميل «محفظة / تحويل يدوي» — يعرض المحافظ النشطة
 * للمنشأة (GET /facilities/{id}/wallets) ليختار العميل واحدة منها؛
 * بيانات الحساب الكاملة (الرقم القابل للنسخ + رفع الإشعار) تظهر في
 * شاشة الدفع بعد تنفيذ الطلب — ليست هنا.
 */

import { Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFacilityWallets } from "@/hooks/useWallets";
import type { FacilityWalletOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

interface WalletPickerListProps {
  facilityId: number | null | undefined;
  /** المحفظة المختارة حالياً. */
  value: number | null;
  onChange: (walletId: number | null) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function WalletPickerList({
  facilityId,
  value,
  onChange,
  disabled = false,
  idPrefix = "",
}: WalletPickerListProps) {
  const { data, isLoading, isError, refetch } = useFacilityWallets(facilityId);
  const wallets: FacilityWalletOut[] = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center">
        <p className="text-xs text-destructive">
          تعذّر تحميل محافظ المتجر — تحقق من اتصالك
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-1 text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          لا توجد محافظ تحويل مفعّلة لدى هذا المتجر حالياً — اختر «نقداً عند
          الاستلام» أو تواصل مع المتجر.
        </p>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="اختر محفظة التحويل"
      className="space-y-2"
    >
      {wallets.map((w) => {
        const selected = value === w.id;
        const isPoint = w.account_type !== "phone";
        return (
          <label
            key={w.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors",
              selected
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/40",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <input
              type="radio"
              name={`${idPrefix}payment-wallet`}
              value={w.id}
              checked={selected}
              onChange={() => onChange(w.id)}
              disabled={disabled}
              className="sr-only"
              role="radio"
              aria-checked={selected}
            />
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {(w.provider_name ?? "م").slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">
                {w.provider_name ?? "محفظة"}
              </span>
              <span dir="ltr" className="block truncate text-xs text-muted-foreground">
                {w.account_label ?? (isPoint ? w.point_number : w.phone_number)}
              </span>
            </span>
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-2",
                selected ? "border-primary bg-primary" : "border-border"
              )}
              aria-hidden="true"
            />
          </label>
        );
      })}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        بعد تنفيذ الطلب ستظهر لك بيانات الحساب لتحويل المبلغ، ثم ترفع صورة
        إشعار التحويل في شاشة الدفع.
      </p>
    </div>
  );
}
