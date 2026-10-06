"use client";

import { ArrowRight, RefreshCcw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  applyMarketSwitch,
  MARKET_META,
  MARKET_COUNTRY,
  type MarketKey,
} from "@/store/market.store";
import { useSetLocaleMe } from "@/hooks/useFinance";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useQueryClient } from "@tanstack/react-query";

/**
 * MarketUnavailableGuard — حارس «غير متوفر في سوقك» (جولة v5.1)
 * ═════════════════════════════════════════════════════════════════
 * مع v3.1 الخادم يُخفي أهداف السوق الآخر كلياً (404 «غير متاح في سوقك
 * الحالي») — الحارس يعالج الحالة الودودة: رابط متجر من سوق آخر
 * (بحث قديم/مشاركة) لا يظهر في قائمة سوق الجلسة.
 *
 * سلوكان أذكياء حسب السياق:
 *  - زائر: قائمة السوق الآخر (برأس X-Market) تسمّي المتجر وصيغته —
 *    [تبديل السوق إلى سوقه] يفتح الرابط نفسه داخل سوقه الصحيح.
 *  - عميل مسجل: الخادم يُخفي سوق العنصر عمداً (لا تسريب) — رسالة عامة
 *    + [تبديل السوق] يُزامِن أيضاً PUT /locale/me (دولته مصدر قوائمه
 *    على كل جهاز) ثم يُعاد فحص الرابط بسوقه الجديد.
 *
 * القواعد (الملحق v5.1): لا رسالة خطأ تقنية، لا إعادة محاولة ولا
 * معاملات لتجاوز 404 — الخادم مصمم لعدم الكشف عن وجود العنصر أصلاً.
 */

interface MarketUnavailableGuardProps {
  /** سوق الجلسة الحالي — يُعرض علمه في الرسالة. */
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
  const qc = useQueryClient();
  const setLocaleMe = useSetLocaleMe();
  const accessToken = useCustomerAuthStore((s) => s.accessToken);
  const mine = MARKET_META[sessionMarket];

  /** الهوية الخصمية للعرض: نعرف سوق المتجر (زائر) أم رسالة عامة؟ */
  const otherMarket: MarketKey | null =
    facilityMarket ?? (facilityName ? (sessionMarket === "saudi" ? "yemen" : "saudi") : null);
  const target: MarketKey =
    otherMarket ?? (sessionMarket === "saudi" ? "yemen" : "saudi");
  const other = MARKET_META[target];

  function switchAndRecheck() {
    applyMarketSwitch(target, qc);
    /* العميل المسجل: دولته على الخادم مصدر قوائمه — تُزامَن فوراً
       حتى يفرض الخادم السوق الجديد على جلساته كلها. */
    if (accessToken) {
      setLocaleMe.mutate({ country_code: MARKET_COUNTRY[target] });
    }
    /* إعادة فحص الرابط نفسه بسوقه الجديد — إن كان منه فُتح، وإلا
       عاد الحارس بلسوقه الجديد (بلا حلقة: الحالة تبقَت متسقة). */
    router.refresh();
  }

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
          {facilityName && otherMarket ? (
            <>
              متجر «<span className="font-bold text-foreground">{facilityName}</span>{" "}
              {other.flag}» في سوق {other.name} — وجلستك سوق {mine.name}{" "}
              {mine.flag}.
            </>
          ) : (
            <>
              {serverMessage ??
                `الرابط الذي فتحته يعود لسوق آخر — وجلستك سوق ${mine.name} ${mine.flag}.`}
            </>
          )}{" "}
          قوائم تطبيقك تعرض سوقك فقط، ويمكنك التبديل بضغطة واحدة.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={switchAndRecheck}
            className="native-tap min-h-[44px] gap-2"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            تبديل السوق إلى {other.name}
          </Button>
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

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          تبديل السوق يعيد ضبط قوائمك (المناطق والمتاجر والبطاقات) — يمكنك
          التبديل في أي وقت من أيقونة العلم في الهيدر.
        </p>
      </div>
    </div>
  );
}
