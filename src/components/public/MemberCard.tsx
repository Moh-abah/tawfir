"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CreditCard, UserPlus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { useMe } from "@/hooks/useMe";
import { DISCOUNT_RATE } from "@/lib/site-config";
import { formatExpiry, formatMembershipNumber } from "@/lib/format";
import type { MyMembershipCard } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/**
 * بطاقة العضوية — الجلد الجديد بهوية توفير:
 *  - الخلفية: رسمة tawfir-membership-card-art.png (أصل معتمد من الهوية)
 *    عبر next/image fill + طبقة كحلية شفافة (توكنات فقط) لضمان تباين AA
 *    للنص الأبيض/الذهبي فوقها
 *  - البيانات نص HTML فوق الخلفية — منطق العرض كما هو بلا أي تغيير
 */

/** غلاف الخلفية الفنية + طبقة القراءة الكحلية — توكنات CSS فقط */
function CardArtBackdrop() {
  return (
    <>
      <Image
        src="/identity/tawfir-membership-card-art.png"
        alt=""
        fill
        draggable={false}
        sizes="(max-width: 640px) 100vw, 560px"
        className="object-cover"
        priority={false}
      />
      {/* طبقة كحلية للتقرّب من لون خلفية المرجع وحماية تباين النص */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(260deg, color-mix(in srgb, var(--logo-navy) 24%, transparent) 0%, color-mix(in srgb, var(--logo-navy) 62%, transparent) 55%, color-mix(in srgb, var(--logo-navy) 90%, transparent) 100%)",
        }}
      />
    </>
  );
}

/**
 * زخارف Confetti زمردية/ذهبية (دوائر ومربعات مائلة ومثلثات)
 * خلف بطاقات الدعوة — aria-hidden وتحترم تقليل الحركة (الأنيميشن عبر globals).
 */
function MemberCardConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="absolute right-[7%] top-[14%] h-3 w-3 rounded-full bg-accent/70" />
      <span className="absolute left-[10%] top-[24%] h-2 w-2 rotate-45 bg-secondary/60" />
      <span className="absolute right-[24%] bottom-[16%] h-2.5 w-2.5 rounded-full bg-secondary/50" />
      <span className="absolute left-[26%] bottom-[32%] h-2 w-2 rotate-12 bg-accent/60" />
      <span className="absolute left-[5%] top-[58%] h-1.5 w-1.5 rounded-full bg-accent/50" />
      <span className="absolute right-[40%] top-[9%] h-2.5 w-2.5 [clip-path:polygon(50%_0,100%_100%,0_100%)] bg-cat-facility/50" />
      <span className="absolute left-[44%] bottom-[10%] h-2 w-2 rotate-45 bg-secondary/50" />
      <span className="absolute right-[12%] top-[46%] h-2 w-2 [clip-path:polygon(50%_0,100%_100%,0_100%)] bg-accent/50" />
      <span className="animate-float-slow absolute left-[18%] top-[10%] h-1.5 w-1.5 rounded-full bg-secondary/40" />
      <span className="animate-float-slower absolute right-[18%] bottom-[38%] h-2 w-2 rotate-45 bg-accent/40" />
    </div>
  );
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const expiry = formatExpiry(expiresAt);
  if (!expiry) return null;
  return (
    <div className="text-left" dir="ltr">
      <p className="flex items-center gap-1 text-[10px] font-medium text-white/60">
        <CalendarDays className="h-3 w-3" aria-hidden="true" />
        تاريخ الانتهاء
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-white">{expiry}</p>
    </div>
  );
}

interface MemberCardBodyProps {
  membership: MyMembershipCard;
}

/** بطاقة العضوية للمسجّل — الرقم والنوع والانتهاء من بيانات حقيقية فقط */
function LoggedInMemberCard({ membership }: MemberCardBodyProps) {
  return (
    <div className="relative min-h-[190px] overflow-hidden rounded-[20px] p-5 text-white shadow-soft-lg sm:p-7">
      <CardArtBackdrop />
      <div
        className="card-shimmer-sweep pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full flex-col gap-5" dir="rtl">
        {/* الشعار + الشارات */}
        <div className="flex items-start justify-between gap-3">
          <TawfirLogo onDark className="h-10 w-auto sm:h-11" />
          <div className="flex items-center gap-2">
            {!membership.is_active && (
              <span className="rounded-full bg-destructive px-3 py-1.5 text-xs font-extrabold text-white shadow-soft">
                منتهية
              </span>
            )}
            {membership.discount_rate > 0 && (
              <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-accent-foreground shadow-soft">
                خصم {membership.discount_rate}%
              </span>
            )}
          </div>
        </div>

        {/* العنوان + رقم العضوية الحقيقي */}
        <div className="space-y-1.5 text-left">
          <p className="flex items-center gap-1.5 text-sm font-bold text-white/90">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            بطاقة الخصومات الذكية
          </p>
          {/* الجولة 9 (المهمة 9.2): رقم العضوية قابل للنسخ — استثناء من
              قاعدة منع التحديد العامة (انظر globals.css). */}
          <p
            className="text-xl font-black tracking-[0.12em] tabular-nums text-white sm:text-2xl"
            dir="ltr"
            data-selectable="true"
            title="اضغط مطولاً لنسخ رقم العضوية"
          >
            {formatMembershipNumber(membership.membership_number)}
          </p>
        </div>

        {/* النوع (يسار) + الانتهاء (يمين) + التاغلاين المعتمد */}
        <div className="mt-auto flex items-end justify-between border-t border-white/15 pt-4">
          <div className="space-y-1 text-left">
            <p className="text-[10px] font-medium text-white/60">نوع العضوية</p>
            <p className="mt-0.5 text-sm font-bold text-white">
              عضوية {membership.membership_type}
            </p>
            <p className="text-[10px] font-bold text-[color:var(--logo-gold-light)]">
              وفّر أكثر.. عِش أجمل
            </p>
          </div>
          <ExpiryBadge expiresAt={membership.expires_at} />
        </div>
      </div>
    </div>
  );
}

/**
 * بطاقة مسجّل بلا عضوية — ترحيب شخصي + دعوة اشتراك (لا تعرض CTA
 * «سجّل» القديم لأن المستخدم سجّل بالفعل).
 */
function LoggedInNoMembershipCard({ fullName }: { fullName?: string }) {
  const greeting = fullName
    ? `أهلاً ${fullName} — اشترك في العضوية`
    : "اشترك في عضوية توفير";
  return (
    <div className="gradient-emerald relative overflow-hidden rounded-[20px] p-6 text-white shadow-soft-lg sm:p-8">
      <MemberCardConfetti />
      <div
        className="card-shimmer-sweep pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <TawfirLogo onDark className="h-11 w-auto sm:h-12" />
          <h1 className="text-xl font-extrabold text-white sm:text-2xl">
            {greeting}
          </h1>
          <p className="text-sm font-medium text-white/80 sm:text-base">
            خصم {DISCOUNT_RATE}% في كل المتاجر المشتركة — مبلغ سنوي 3000 ر.ي
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="min-h-[44px] shrink-0 gap-2 rounded-full bg-accent px-7 text-accent-foreground shadow-soft hover:bg-accent/90"
        >
          <Link href="/membership/subscribe">
            <Crown className="h-4 w-4" aria-hidden="true" />
            اشترك في العضوية
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** بطاقة الزائر — دعوة تسجيل بلا أي رقم أو تاريخ */
function VisitorMemberCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gradient-emerald relative overflow-hidden rounded-[20px] p-6 text-white shadow-soft-lg sm:p-8",
        className
      )}
    >
      <MemberCardConfetti />
      <div
        className="card-shimmer-sweep pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <TawfirLogo variant="mark" size="sm" />
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            بطاقة الخصومات الذكية
          </h1>
          <p className="text-sm font-medium text-white/80 sm:text-base">
            وفّر أكثر.. عِش أجمل — خصم {DISCOUNT_RATE}% في كل المتاجر المشتركة
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="min-h-[44px] shrink-0 gap-2 rounded-full bg-accent px-7 text-accent-foreground shadow-soft hover:bg-accent/90"
        >
          <Link href="/register">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            سجّل واحصل على بطاقتك
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** هيكل بطاقة أثناء التحميل — الجولة 16: يطابق بنية البطاقة الحقيقية
 *  خانةً بخانة (نفس الحشوات والفجوات وارتفاعات الأسطر) حتى لا تتغير
 *  مساحة البطاقة عند وصول البيانات → صفر CLS عند الاستبدال. */
function MemberCardSkeleton() {
  return (
    <div
      className="gradient-emerald relative min-h-[190px] overflow-hidden rounded-[20px] p-5 text-white shadow-soft-lg sm:p-7"
      aria-busy="true"
      aria-label="جارٍ تحميل بطاقة العضوية"
    >
      <div className="relative z-10 flex h-full flex-col gap-5" dir="rtl">
        {/* الشعار + شارة الخصم */}
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-10 w-[118px] bg-white/15" />
          <Skeleton className="h-[30px] w-[86px] rounded-full bg-white/15" />
        </div>
        {/* العنوان + رقم العضوية */}
        <div className="space-y-1.5 text-left">
          <Skeleton className="h-5 w-40 bg-white/15" />
          <Skeleton className="h-8 w-full max-w-[260px] bg-white/15" />
        </div>
        {/* النوع + الانتهاء */}
        <div className="mt-auto flex items-end justify-between border-t border-white/15 pt-4">
          <div className="space-y-1 text-left">
            <Skeleton className="h-3.5 w-16 bg-white/15" />
            <Skeleton className="h-5 w-24 bg-white/15" />
          </div>
          <div className="space-y-1 text-left">
            <Skeleton className="h-3.5 w-16 bg-white/15" />
            <Skeleton className="h-5 w-20 bg-white/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

export interface MemberCardProps {
  /**
   * عرض بيانات عضوية محددة مباشرة (مثال: شاشة نجاح التسجيل —
   * البيانات من استجابة التسجيل وليس من /me).
   * عند غيابها: يجلب البطاقة من GET /me تلقائياً.
   */
  membership?: MyMembershipCard | null;
  className?: string;
}

/**
 * بطاقة العضوية الذكية — العنصر الرئيسي في الرئيسية وحسابي.
 *
 * حالات العرض:
 *  - زائر (لا توكن): VisitorMemberCard — دعوة «سجّل واحصل على بطاقتك»
 *  - مسجّل بعضوية نشطة: LoggedInMemberCard — الرقم الحقيقي 16 خانة مقسّم 4×4
 *  - مسجّل بلا عضوية: LoggedInNoMembershipCard — «أهلاً {name} — اشترك في العضوية»
 *  - مسجّل بعضوية منتهية (is_active=false): LoggedInMemberCard مع شارة «منتهية»
 */
export function MemberCard({ membership, className }: MemberCardProps) {
  const me = useMe();

  // 1) عند تمرير membership صريحاً (شاشة نجاح التسجيل):
  if (membership !== undefined) {
    if (!membership) {
      return <VisitorMemberCard className={className} />;
    }
    return (
      <div className={className}>
        <LoggedInMemberCard membership={membership} />
      </div>
    );
  }

  // 2) تحميل بيانات /me:
  if (me.isLoading) {
    return (
      <div className={className}>
        <MemberCardSkeleton />
      </div>
    );
  }

  // 3) مسجّل بعضوية (سواء نشطة أو منتهية):
  if (me.data?.membership) {
    return (
      <div className={className}>
        <LoggedInMemberCard membership={me.data.membership} />
      </div>
    );
  }

  // 4) مسجّل دخول (me.data موجود) لكن بلا عضوية:
  if (me.data) {
    return (
      <div className={className}>
        <LoggedInNoMembershipCard fullName={me.data.full_name} />
      </div>
    );
  }

  // 5) زائر (لا me.data):
  return <VisitorMemberCard className={className} />;
}
