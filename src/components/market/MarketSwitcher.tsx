"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import {
  useMarketStore,
  effectiveMarket,
  applyMarketSwitch,
  ALL_MARKETS,
  MARKET_META,
  MARKET_COUNTRY,
} from "@/store/market.store";
import { useSetLocaleMe } from "@/hooks/useFinance";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { cn } from "@/lib/utils";

/**
 * MarketSwitcher — مبدّل سوق الجلسة (جولة v5: الفصل الحقيقي للسوقين)
 * ═════════════════════════════════════════════════════════════════
 * أيقونة علم في الهيدر/القائمة تفتح قائمة السوقين. عند التبديل:
 *   1. يفرّغ قوائم الجيو (تصفير المنطقة + إبطال كاش react-query كله)
 *      فتُعاد الجلب بفلتر country_code للسوق الجديد.
 *   2. للمستخدم المسجل بجلسة عميل: يُمرَّر التحديث أيضاً إلى
 *      PUT /locale/me — دولتُه مصدر قوائمه الشخصية على كل جهاز
 *      (أُكملت useSetLocaleMe التي كانت معرّفة بلا مستهلك).
 *
 * آمن على الترطيب: قبل معرفة السوق يعرض العلم الافتراضي من فرع موحّد.
 */

export function MarketSwitcher({ className }: { className?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const market = useMarketStore((s) => s.market);
  const setLocaleMe = useSetLocaleMe();
  const accessToken = useCustomerAuthStore((s) => s.accessToken);

  /* فرع موحّد قبل الترطيب: الافتراضي — لا اختلاف ترطيب */
  const current = effectiveMarket(market);

  function switchTo(m: (typeof ALL_MARKETS)[number]) {
    setOpen(false);
    applyMarketSwitch(m, qc);
    /* المستخدم المسجل: دولتُه على الخادم مصدر قوائمه — تُزامَن فوراً.
       الفشل غير معرقِل (السوق المحلي بقي مفعّلاً). */
    if (accessToken) {
      setLocaleMe.mutate({ country_code: MARKET_COUNTRY[m] });
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`السوق الحالي: ${MARKET_META[current].name} — تغيير السوق`}
        className="native-tap flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 text-lg transition-colors hover:bg-muted sm:h-9 sm:min-h-9"
      >
        <span aria-hidden="true">{MARKET_META[current].flag}</span>
        <ChevronDown
          className="h-3 w-3 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {open && (
        <>
          {/* غطاء إغلاق — بلا خلفية */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="اختيار السوق"
            className="absolute left-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg"
          >
            <p className="border-b border-border/50 px-3 py-2 text-[11px] font-bold text-muted-foreground">
              سوق الجلسة — تُعرض قوائمه حصراً
            </p>
            {ALL_MARKETS.map((m) => {
              const meta = MARKET_META[m];
              const active = m === current;
              return (
                <button
                  key={m}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => switchTo(m)}
                  className={cn(
                    "native-tap flex min-h-[46px] w-full items-center justify-between px-3 py-2.5 text-right text-sm font-bold transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">
                      {meta.flag}
                    </span>
                    <span>
                      {meta.name}
                      <span className="ms-1.5 text-[10px] font-bold text-muted-foreground">
                        ({MARKET_COUNTRY[m]})
                      </span>
                    </span>
                  </span>
                  {active && (
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
