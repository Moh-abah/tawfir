"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Gift,
  Sparkles,
  ShieldCheck,
  Loader2,
  Crown,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { TawfirPillBadge } from "@/components/shared/TawfirPillBadge";
import { useSubscribeFreeMembership } from "@/hooks/useSubscribeFreeMembership";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { FreeMembershipSubscribeOut } from "@/types/api.generated";
import type { CustomerApiError } from "@/services/customer-api-client";
import { formatMembershipNumber, formatExpiry } from "@/lib/format";

/**
 * FreeMembershipCard — الجولة 20.
 *
 * تُعرض في /membership/subscribe عند تفعيل المشرف للعلم
 * `is_free_membership_enabled`. تشرح العضوية المجانية بصراحة:
 *  - بلا دفع · بلا رفع إيصال · موافقة فورية.
 *  - زر CTA واحد «احصل على عضويتك مجاناً» → POST /membership/subscribe-free.
 *  - عند النجاح: تتحول البطاقة إلى شاشة نجاح داخلية تعرض رقم العضوية
 *    الحقيقي + تاريخ الانتهاء + بطاقة العضوية الكاملة (بعد invalidate /me).
 *
 * الهوية البصرية: كحلي #0A1A2F + ذهبي #D4AF37 + زمرد #0E7D62.
 */
export function FreeMembershipCard() {
  const router = useRouter();
  const { toast } = useToast();
  const prefersReduced = usePrefersReducedMotion();
  const [result, setResult] = useState<FreeMembershipSubscribeOut | null>(null);

  const mutation = useSubscribeFreeMembership();

  const handleClaim = () => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        setResult(data);
        toast({
          title: "تم منح العضوية المجانية",
          description: data.detail || "احصل على عضويتك المجانية بنجاح",
        });
      },
      onError: (err: CustomerApiError) => {
        if (err.status === 0 || /اتصال|إنترنت|network/i.test(err.message)) {
          toast({
            title: "يتطلب هذا الإجراء اتصالاً بالإنترنت",
            description: "تحقق من اتصالك ثم أعد المحاولة",
            variant: "destructive",
          });
          return;
        }
        if (err.status === 409) {
          toast({
            title: "لديك عضوية بالفعل",
            description: err.message,
          });
          // من المفترض أن الصفحة الأم أعادت توجيه العميل لـ AlreadyMember،
          // لكن نترك المستخدم يرى الرسالة بوضوح.
          return;
        }
        toast({
          title:
            err.status === 403
              ? "العضوية المجانية غير مفعّلة"
              : "تعذّر منح العضوية",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  /* ─── شاشة النجاح الداخلية ─── */
  if (result) {
    const anim = prefersReduced
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } };

    return (
      <motion.div
        {...anim}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--logo-emerald) 22%, transparent)",
            }}
          >
            <CheckCircle2
              className="h-12 w-12"
              style={{ color: "var(--logo-emerald)" }}
              aria-hidden="true"
            />
          </span>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            🎁 تم منحك عضوية توفير المجانية!
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {result.detail ||
              "احصل على خصم 30% في كل المتاجر المشتركة — بلا رسوم."}
          </p>
        </div>

        {/* بطاقة العضوية الجديدة (data من الاستجابة + حقول افتراضية للعرض) */}
        <div
          className="relative overflow-hidden rounded-[20px] p-6 text-white shadow-soft-lg"
          style={{
            background:
              "linear-gradient(135deg, var(--logo-navy) 0%, color-mix(in srgb, var(--logo-navy) 75%, var(--logo-emerald)) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--logo-gold) 35%, transparent), transparent 60%)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col gap-5" dir="rtl">
            <div className="flex items-start justify-between gap-3">
              <TawfirLogo onDark className="h-11 w-auto" />
              <span
                className="rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-soft"
                style={{ background: "var(--logo-gold)" }}
              >
                خصم 30%
              </span>
            </div>
            <div className="space-y-1.5 text-left">
              <p className="flex items-center gap-1.5 text-sm font-bold text-white/90">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                بطاقة الخصومات الذكية
              </p>
              <p
                className="text-xl font-black tracking-[0.12em] tabular-nums text-white sm:text-2xl"
                dir="ltr"
                data-selectable="true"
                title="رقم عضويتك"
              >
                {formatMembershipNumber(result.membership_number)}
              </p>
            </div>
            <div className="mt-auto flex items-end justify-between border-t border-white/15 pt-4">
              <div className="space-y-1 text-left">
                <p className="text-[10px] font-medium text-white/60">
                  نوع العضوية
                </p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  عضوية سنوية مجانية
                </p>
                <p
                  className="text-[10px] font-bold"
                  style={{ color: "var(--logo-gold-light)" }}
                >
                  وفّر أكثر.. عِش أجمل
                </p>
              </div>
              <div className="text-left" dir="ltr">
                <p className="flex items-center gap-1 text-[10px] font-medium text-white/60">
                  <CalendarDays className="h-3 w-3" aria-hidden="true" />
                  تاريخ الانتهاء
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
                  {formatExpiry(result.expires_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار المتابعة */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => router.push("/account")}
            className="min-h-[44px] gap-2 rounded-full"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            حسابي
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-[44px] gap-2 rounded-full"
          >
            <Link href="/">
              تصفّح الوجبات
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  /* ─── بطاقة دعوة الاشتراك المجاني (الحالة الافتراضية) ─── */
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6"
    >
      <header className="text-center">
        <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
          عضوية توفير المجانية 🎁
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          احصل على بطاقة الخصومات الذكية مجاناً — بلا دفع ولا رفع إيصال
        </p>
      </header>

      {/* بطاقة الهوية: شعار + شارات + مزايا — ثنائية الثيم (الجولة 22):
          فاتح = بطاقة فاتحة بلمسة زمردية بنصوص واضحة، داكن = كحلي الهوية */}
      <div className="tawfir-brand-card relative overflow-hidden rounded-[20px] border border-border/50 p-6 shadow-soft-lg sm:p-8 dark:border-transparent">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 80% 15%, color-mix(in srgb, var(--logo-gold) 40%, transparent), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-5 text-center">
          <TawfirLogo onDark={false} className="h-12 w-auto dark:brightness-0 dark:invert" />
          <TawfirPillBadge className="shadow-soft" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-soft"
              style={{ background: "var(--logo-gold)" }}
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              خصم 30% في كل المتاجر
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-soft"
              style={{ background: "var(--logo-emerald)" }}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              موافقة فورية بلا انتظار
            </span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-foreground/85 dark:text-white/85">
            فريق توفير يمنحك العضوية السنوية مجاناً خلال هذه الفترة — لا حاجة
            لتحويل بنكي ولا رفع إيصال. فقط اضغط الزر وستظهر بطاقتك فوراً.
          </p>
        </div>
      </div>

      {/* بطاقة المزايا الثلاث */}
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
            </span>
            ماذا تحصل عليه؟
          </CardTitle>
          <CardDescription>مزايا العضوية المجانية كاملة كالعضوية المدفوعة</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {[
              "بطاقة عضوية رقمية بنفس صيغة العضوية المدفوعة (16 خانة)",
              "خصم 30% على كل طلباتك من المتاجر المشتركة في توفير",
              "عروض حصرية ومزايا مميزة لمدة سنة كاملة",
              "لا حاجة لتحويل بنكي ولا رفع إيصال — كلها فورية",
            ].map((benefit, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-foreground"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--logo-emerald) 22%, transparent)",
                    color: "var(--logo-emerald)",
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* زر CTA */}
      <Button
        type="button"
        onClick={handleClaim}
        disabled={mutation.isPending}
        className="min-h-[48px] w-full gap-2 rounded-full text-base font-bold"
        style={{
          background:
            "linear-gradient(135deg, var(--logo-emerald), color-mix(in srgb, var(--logo-emerald) 70%, var(--logo-navy)))",
        }}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            جارٍ منح العضوية...
          </>
        ) : (
          <>
            <Crown className="h-5 w-5" aria-hidden="true" />
            احصل على عضويتك مجاناً
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        عند الضغط سيتم إنشاء بطاقة عضويتك فوراً وستظهر هنا وفي حسابك.
      </p>
    </motion.div>
  );
}
