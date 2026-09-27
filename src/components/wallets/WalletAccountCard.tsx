"use client";

/**
 * WalletAccountCard — بطاقة بيانات حساب التحويل (شاشة دفع العميل).
 * الرقم قابل للنسخ حرفياً (point_number أو phone_number — وليس
 * account_label كاملاً) والاسم يُعرض تحته (قاعدة الربط §6-2).
 */

import { useState } from "react";
import { Check, Copy, MapPin, Phone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WalletAccountBase } from "@/types/api.generated";
import { cn } from "@/lib/utils";

interface WalletAccountCardProps {
  wallet: Pick<
    WalletAccountBase,
    | "provider_name"
    | "account_type"
    | "point_number"
    | "point_name"
    | "phone_number"
    | "account_name"
    | "account_label"
  >;
  /** المبلغ المطلوب تحويله (يُعرض في سطر مستقل). */
  amountDue?: number;
  className?: string;
}

export function WalletAccountCard({
  wallet,
  amountDue,
  className,
}: WalletAccountCardProps) {
  const [copied, setCopied] = useState(false);
  const isPoint = wallet.account_type !== "phone";
  const copyValue = isPoint ? wallet.point_number ?? "" : wallet.phone_number ?? "";
  const accountName = isPoint ? wallet.point_name ?? "" : wallet.account_name ?? "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
    } catch {
      /* احتياط للمتصفحات بلا Clipboard API (نوافذ WebView) */
      const ta = document.createElement("textarea");
      ta.value = copyValue;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-primary/25 bg-primary/5",
        className
      )}
    >
      {/* رأس البطاقة — اسم المحفظة */}
      <div className="flex items-center justify-between gap-2 border-b border-primary/15 bg-primary/10 px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-extrabold text-primary">
          <Wallet className="h-4 w-4" aria-hidden="true" />
          {wallet.provider_name ?? "محفظة"}
        </span>
        <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {isPoint ? "رقم نقطة" : "تحويل هاتفي"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* الرقم + زر النسخ */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {isPoint ? "رقم النقطة" : "رقم الهاتف"}
            </p>
            <p dir="ltr" className="truncate text-xl font-black tabular-nums text-foreground">
              {copyValue || "—"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={copy}
            disabled={!copyValue}
            className={cn(
              "min-h-[44px] shrink-0 gap-1.5 rounded-full px-4 text-xs font-bold",
              copied && "bg-success text-success-foreground hover:bg-success"
            )}
            aria-label={copied ? "تم النسخ" : "نسخ الرقم"}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                نسخ
              </>
            )}
          </Button>
        </div>

        {/* الاسم تحته */}
        {accountName && (
          <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
            {isPoint ? (
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">
                {isPoint ? "اسم النقطة" : "الاسم الظاهر في التحويل"}
              </p>
              <p className="truncate text-sm font-bold text-foreground">{accountName}</p>
            </div>
          </div>
        )}

        {/* المبلغ المطلوب */}
        {amountDue != null && (
          <div className="flex items-center justify-between rounded-xl bg-accent/15 px-4 py-3">
            <span className="text-xs font-bold text-accent-ink">
              المبلغ المطلوب تحويله
            </span>
            <span dir="ltr" className="text-lg font-black tabular-nums text-accent-ink">
              {amountDue.toLocaleString("en-US")} ر.ي
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
