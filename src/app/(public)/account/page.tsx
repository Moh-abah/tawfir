"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  UserRound,
  Mail,
  Phone,
  LogOut,
  Loader2,
  Save,
  UserPlus,
  LogIn,
  ShieldCheck,
  Crown,
  Hourglass,
  RefreshCw,
  CreditCard,
  ShoppingBag,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberCard } from "@/components/public/MemberCard";
import { AccountFaqContactSection } from "@/components/public/AccountFaqContactSection";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { PasswordChangeCard } from "@/components/shared/PasswordChangeCard";
import { SoundSettingsCard } from "@/components/shared/SoundSettingsCard";
import { useCustomerAuth, useCustomerLogout } from "@/hooks/useCustomerAuth";
import { useMe, useInvalidateMe } from "@/hooks/useMe";
import { useHasMounted } from "@/hooks/useHasMounted";
import { customerAuthService } from "@/services/customer-auth.service";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  getPendingMembershipRequest,
  clearPendingMembershipRequest,
  type PendingMembership,
} from "@/lib/membership-local";
import { formatDate } from "@/lib/format";
import type { MeOut } from "@/types/api.generated";

/* ------------------------------------------------------------------ */
/*  زائر — بطاقة ترحيب مصغرة + زرا الدخول والتسجيل                     */
/* ------------------------------------------------------------------ */
function GuestAccount() {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-md px-4 py-10 sm:py-16"
    >
      <Card className="rounded-2xl border-border/60 shadow-soft-lg">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <TawfirLogo className="h-14 w-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground">
              أهلاً بك في توفير
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              سجّل الدخول لعرض بطاقتك وطلباتك، أو أنشئ حساباً جديداً
              واشترك في عضوية توفير لتحصل على خصم حتى 30%.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button asChild className="min-h-[44px] gap-2 rounded-full">
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                تسجيل الدخول
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] gap-2 rounded-full"
            >
              <Link href="/register">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                إنشاء حساب
              </Link>
            </Button>
          </div>
          <PWAInstallButton portal="customer" variant="full" className="w-full" />

          {/* الأسئلة الشائعة + تواصل معنا — الجولة 9 (المهمة 1) */}
          <div className="mt-8 w-full">
            <AccountFaqContactSection />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  هيكل تحميل الصفحة                                                  */
/* ------------------------------------------------------------------ */
function AccountSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-56 w-full rounded-[20px]" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  نموذج تعديل البيانات (الاسم + الجوال — البريد ثابت)                */
/* ------------------------------------------------------------------ */
const profileSchema = z.object({
  full_name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  // الجوال اليمني: 9 أرقام تبدأ بـ 70 أو 71 أو 73 أو 77 أو 78
  phone: z
    .string()
    .min(9, { message: "رقم الجوال يجب أن يكون 9 أرقام" })
    .regex(/^(7[01378])\d{7}$/, {
      message: "أدخل رقم جوال يمني صحيح (يبدأ بـ 70/71/73/77/78)",
    }),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileEditForm({ me }: { me: MeOut }) {
  const { toast } = useToast();
  const invalidateMe = useInvalidateMe();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState,
    watch,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: me.full_name,
      phone: me.phone,
    },
  });

  const currentValues = watch();

  const updateMutation = useMutation({
    mutationFn: (values: ProfileValues) =>
      customerAuthService.updateMe(values),
    onSuccess: () => {
      setServerError(null);
      invalidateMe();
      toast({
        title: "تم حفظ التعديلات",
        description: "تم تحديث بياناتك بنجاح",
      });
    },
    onError: (e: Error) => {
      setServerError(e.message || "تعذّر حفظ التعديلات");
      toast({
        title: "تعذّر حفظ التعديلات",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const isDirty =
    currentValues.full_name !== me.full_name || currentValues.phone !== me.phone;

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">الاسم الكامل</Label>
        <Input
          id="full_name"
          autoComplete="name"
          disabled={updateMutation.isPending}
          aria-invalid={!!formState.errors.full_name}
          {...register("full_name")}
        />
        {formState.errors.full_name && (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.full_name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">رقم الجوال</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          className="text-left"
          autoComplete="tel"
          placeholder="771234567"
          disabled={updateMutation.isPending}
          aria-invalid={!!formState.errors.phone}
          {...register("phone")}
        />
        {formState.errors.phone && (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.phone.message}
          </p>
        )}
      </div>

      {serverError && (
        <p
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        className="min-h-[44px] gap-2 rounded-full"
        disabled={updateMutation.isPending || !isDirty}
      >
        {updateMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        {updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  بطاقة بياناتي (مشتركة بين كل الحالات المسجّلة)                   */
/* ------------------------------------------------------------------ */
function MyDataCard({ me }: { me: MeOut }) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
          بياناتي
        </CardTitle>
        <CardDescription>
          يمكنك تعديل الاسم ورقم الجوال — البريد الإلكتروني ثابت
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
            <UserRound
              className="h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">الاسم الكامل</p>
              <p className="truncate text-sm font-bold text-foreground">
                {me.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
            <Mail className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
              <p dir="ltr" className="truncate text-left text-sm font-bold text-foreground">
                {me.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
            <Phone className="h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">رقم الجوال</p>
              <p dir="ltr" className="truncate text-left text-sm font-bold text-foreground">
                {me.phone}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-secondary" aria-hidden="true" />
            تعديل البيانات
          </h3>
          <ProfileEditForm key={`${me.id}-${me.full_name}-${me.phone}`} me={me} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  شارة «قيد المراجعة» الذهبية                                         */
/* ------------------------------------------------------------------ */
function PendingReviewBadge({ pending }: { pending: PendingMembership }) {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/60 p-5 shadow-soft"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--logo-gold) 12%, transparent), transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "var(--logo-gold)",
            color: "var(--logo-white)",
          }}
        >
          <Hourglass className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              طلب العضوية قيد المراجعة
            </h2>
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              <Hourglass className="h-3 w-3" aria-hidden="true" />
              قيد المراجعة
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {pending.created_at
              ? `تاريخ الطلب: ${formatDate(pending.created_at)}`
              : "طلبك قيد المراجعة من قبل فريقنا"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تُراجع طلبات العضوية يدوياً خلال 24-48 ساعة. عند الموافقة ستظهر بطاقة عضويتك هنا.
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-h-[40px] gap-1.5 rounded-full"
        >
          <Link href="/membership/subscribe">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            أعد الاشتراك
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  حالة 2: مسجّل بلا عضوية ولا طلب معلّق                             */
/* ------------------------------------------------------------------ */
function NoMembershipState({ me }: { me: MeOut }) {
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6"
    >
      {/* الترحيب */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground">
          مرحباً، {me.full_name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          هذه بياناتك في منصة توفير
        </p>
      </div>

      {/* دعوة الاشتراك في العضوية */}
      <Card
        className="overflow-hidden rounded-2xl border-border/60 shadow-soft"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--logo-blue) 8%, transparent), color-mix(in srgb, var(--logo-gold) 6%, transparent))",
        }}
      >
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              background: "var(--logo-gold)",
              color: "var(--logo-white)",
            }}
          >
            <Crown className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-foreground">
              ليس لديك عضوية بعد
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
              اشترك في عضوية توفير السنوية واحصل على خصم حتى 30% على كل طلباتك.
              مبلغ 3000 ر.ي سنوياً، موافقة يدوية خلال 24-48 ساعة.
            </p>
          </div>
          {/* ملاحظة عبر الأجهزة: قد يكون الطلب قيد المراجعة أو مرفوضاً */}
          <p className="mx-auto max-w-md rounded-xl bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <RefreshCw className="me-1 inline h-3 w-3" aria-hidden="true" />
            إن أرسلت طلب اشتراك من جهاز آخر، فقد يكون قيد المراجعة أو لم
            يُستوفَ بعد. لا يمكننا عرض سبب الرفض هنا — تواصل معنا أو أعد
            الاشتراك من جديد.
          </p>
          <Button asChild className="min-h-[44px] gap-2 rounded-full">
            <Link href="/membership/subscribe">
              <Crown className="h-4 w-4" aria-hidden="true" />
              اشترك في عضوية توفير
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* تثبيت التطبيق */}
      <PWAInstallButton portal="customer" variant="full" />

      {/* بياناتي */}
      <MyDataCard me={me} />

      {/* أمان الحساب — تغيير كلمة المرور */}
      <PasswordChangeCard role="customer" />

        {/* الأصوات — نظام الإشعارات الصوتية (الجولة 8) */}
        <SoundSettingsCard />

        {/* الأسئلة الشائعة + تواصل معنا — الجولة 9 (المهمة 1) */}
        <AccountFaqContactSection />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  حالة 5: مسجّل بعضوية موافق عليها                                  */
/* ------------------------------------------------------------------ */
function ActiveMemberState({ me }: { me: MeOut }) {
  const logout = useCustomerLogout();
  const prefersReduced = usePrefersReducedMotion();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6"
    >
      {/* الترحيب */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground">
            مرحباً، {me.full_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            هذه بطاقتك وبياناتك في منصة توفير
          </p>
        </div>
        <Button
          variant="outline"
          onClick={logout}
          className="min-h-[44px] gap-2 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          تسجيل الخروج
        </Button>
      </div>

      {/* بطاقة العضوية */}
      <MemberCard />

      {/* إجراءات سريعة */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] justify-start gap-2 rounded-2xl"
        >
          <Link href="/orders">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            طلباتي
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] justify-start gap-2 rounded-2xl"
        >
          <Link href="/favorites">
            <Heart className="h-4 w-4 text-destructive" aria-hidden="true" />
            مفضلتي
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] justify-start gap-2 rounded-2xl"
        >
          <Link href="/">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            تصفّح الوجبات
          </Link>
        </Button>
      </div>

      {/* تثبيت التطبيق */}
      <PWAInstallButton portal="customer" variant="full" />

      {/* بياناتي + التعديل */}
      <MyDataCard me={me} />

      {/* أمان الحساب — تغيير كلمة المرور */}
      <PasswordChangeCard role="customer" />

        {/* الأصوات — نظام الإشعارات الصوتية (الجولة 8) */}
        <SoundSettingsCard />

        {/* الأسئلة الشائعة + تواصل معنا — الجولة 9 (المهمة 1) */}
        <AccountFaqContactSection />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  صفحة حسابي                                                         */
/* ------------------------------------------------------------------ */
export default function AccountPage() {
  const { accessToken, hydrated } = useCustomerAuth();
  const me = useMe();
  const hasMounted = useHasMounted();

  /* الاشتقاق المباشر من localStorage بعد التركيب — بلا setState داخل effect.
     عند ظهور العضوية في /me تُمحى تلقائياً من التخزين المحلي. */
  const membership = me.data?.membership ?? null;

  /* أثر جانبي صرف: محو الطلب المعلّق محلياً عند ظهور العضوية (لا setState). */
  useEffect(() => {
    if (membership) clearPendingMembershipRequest();
  }, [membership]);

  const pendingRequest: PendingMembership | null =
    hasMounted && !membership ? getPendingMembershipRequest() : null;

  /* قبل الترطيب: هيكل ثابت يمنع وميض التوجيه */
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/" />
        <AccountSkeleton />
      </>
    );
  }

  /* حالة 1: زائر غير مسجل */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/" />
        <GuestAccount />
      </>
    );
  }

  if (me.isLoading) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/" />
        <AccountSkeleton />
      </>
    );
  }

  if (me.isError || !me.data) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/">
          <NotificationBell />
        </ScreenHeader>
        <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            {me.error instanceof Error
              ? me.error.message
              : "تعذّر تحميل بيانات الحساب"}
          </p>
          <Button
            onClick={() => me.refetch()}
            className="min-h-[44px] rounded-full"
          >
            إعادة المحاولة
          </Button>
        </div>
      </>
    );
  }

  /* حالة 5: مسجّل بعضوية موافق عليها */
  if (membership) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/">
          <NotificationBell />
        </ScreenHeader>
        <ActiveMemberState me={me.data} />
      </>
    );
  }

  /* حالة 3: مسجّل بطلب معلّق محلياً */
  if (pendingRequest) {
    return (
      <>
        <ScreenHeader title="الملف الشخصي" fallbackHref="/">
          <NotificationBell />
        </ScreenHeader>
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6"
        >
          {/* الترحيب */}
          <div>
            <h2 className="text-2xl font-extrabold text-foreground">
              مرحباً، {me.data.full_name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              هذه بياناتك في منصة توفير
            </p>
          </div>

          {/* شارة قيد المراجعة */}
          <PendingReviewBadge pending={pendingRequest} />

          {/* تثبيت التطبيق */}
          <PWAInstallButton portal="customer" variant="full" />

          {/* بياناتي */}
          <MyDataCard me={me.data} />

          {/* أمان الحساب — تغيير كلمة المرور */}
          <PasswordChangeCard role="customer" />

          {/* الأصوات — نظام الإشعارات الصوتية (الجولة 8) */}
          <SoundSettingsCard />

          {/* الأسئلة الشائعة + تواصل معنا — الجولة 9 (المهمة 1) */}
          <AccountFaqContactSection />
        </motion.div>
      </>
    );
  }

  /* حالة 2 + 4: مسجّل بلا عضوية (ولا طلب معلّق — أو ربما مرفوض لا يمكن تمييزه) */
  return (
    <>
      <ScreenHeader title="الملف الشخصي" fallbackHref="/">
        <NotificationBell />
      </ScreenHeader>
      <NoMembershipState me={me.data} />
    </>
  );
}
