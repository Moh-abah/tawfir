"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MARKET_META,
  type MarketKey,
} from "@/store/market.store";

/**
 * MarketUnavailableGuard — حارس «غير متوفر في سوقك» (جولة v6.1)
 * ═══════════════════════════════════════════════════════════════
 * مع v3.1 الخادم يُخفي أهداف السوق الآخر كلياً (404 «غير متاح في سوقك
 * الحالي») — الحارس يعالج الحالة الودودة: رابط متجر من سوق آخر
 * (بحث قديم/مشاركة) لا يظهر في قائمة سوق الجلسة.
 *
 * جولة v6.1 — الفصل تلقائي خالص: لا أعلام ولا زر تبديل — النظام
 * يتعرف على سوق المستخدم من بياناته/مكانه، ورابط سوق آخر يُستقبل
 * برسالة ودودة + عودة للرئيسية. لا تسريب لهوية العنصر للمسجّل،
 * وللزائر يُسمّى المتجر فقط (عبر قائمة السوق الآخر برأس X-Market).
 *
 * القواعد (الملحق v5.1): لا رسالة خطأ تقنية، لا إعادة محاولة ولا
 * معاملات لتجاوز 404 — الخادم مصمم لعدم الكشف عن وجود العنصر أصلاً.
 */

interface MarketUnavailableGuardProps {
  /** سوق الجلسة الحالي — يُذكر اسمه في الرسالة (بلا علم). */
  sessionMarket: MarketKey;
  /** اسم المتجر (عُثر عليه في قائمة السوق الآخر — زائر). */
  facilityName?: string | null;
  /** سوق المتجر الفعلي (من البحث العابر — زائر). */
  facilityMarket?: MarketKey | null;
  /** رسالة الخادم إن وصلت (detail عربي من 404). */
  serverMessage?: string | null;
}

export function MarketUnavailableGuard({
  sessionMarket,
  facilityName,
  facilityMarket,
  serverMessage,
}: MarketUnavailableGuardProps) {
  const router = useRouter();
  const mine = MARKET_META[sessionMarket];

  /** الهوية الخصمية للعرض: نعرف سوق المتجر (زائر) أم رسالة عامة؟ */
  const otherMarket: MarketKey | null =
    facilityMarket ??
    (facilityName ? (sessionMarket === "saudi" ? "yemen" : "saudi") : null);
  const other = otherMarket ? MARKET_META[otherMarket] : null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="متجر غير متوفر في سوقك"
      className="flex min-h-[70dvh] items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <ShieldAlert
            className="h-7 w-7 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-xl font-black text-foreground">
          هذا المتجر غير متوفر في سوقك
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {facilityName && other ? (
            <>
              متجر «<span className="font-bold text-foreground">{facilityName}</span>»
              في سوق {other.name} — وجلستك سوق {mine.name}.
            </>
          ) : (
            <>
              {serverMessage ?? `الرابط الذي فتحته يعود لسوق آخر — وجلستك سوق ${mine.name}.`}
            </>
          )}{" "}
          قوائم تطبيقك تعرض سوقك فقط، والسوق يُكتشف تلقائياً من بياناتك
          وموقعك.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
            className="native-tap min-h-[44px] gap-2"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            رجوع للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
