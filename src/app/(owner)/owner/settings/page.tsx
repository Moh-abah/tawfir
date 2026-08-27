"use client";

import { useRouter } from "next/navigation";
import {
  Download,
  Info,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Store,
  User,
  MapPin,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  ChevronLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/theme-provider";
import { useOwnerAuth, useOwnerLogout } from "@/hooks/useOwnerAuth";
import { useAccountMe } from "@/hooks/useAccountMe";
import { PasswordChangeCard } from "@/components/shared/PasswordChangeCard";
import { SoundSettingsCard } from "@/components/shared/SoundSettingsCard";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { APP_VERSION } from "@/lib/pwa/version";
import { formatDate } from "@/lib/format";
import { SITE_NAME, DELIVERY_FEE } from "@/lib/site-config";
import type { Facility } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── معلومات التواصل الحقيقية — مواصفة توفير اليمنية ─── */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";

/** حالة المنشأة الحقيقية من الباك إند (is_approved/rejection_reason). */
function facilityStatus(f: Facility): {
  label: string;
  tone: "success" | "warning" | "destructive";
  icon: typeof CheckCircle2;
} {
  if (f.is_approved === undefined || f.is_approved === true) {
    return { label: "موافق عليها", tone: "success", icon: CheckCircle2 };
  }
  if (f.rejection_reason) {
    return { label: "مرفوضة", tone: "destructive", icon: XCircle };
  }
  return { label: "بانتظار موافقة المشرف", tone: "warning", icon: Clock };
}

const TONE_CLASS: Record<"success" | "warning" | "destructive", string> = {
  success: "bg-success/15 text-success",
  warning: "bg-accent/15 text-accent",
  destructive: "bg-destructive/15 text-destructive",
};

/**
 * إعدادات المالك — الجولة 5.
 *
 * ميزات حقيقية فقط:
 *  - بيانات الحساب من GET /me (بالتوكن المالك)
 *  - حالة منشآته الحقيقية من GET /owner/facility (موافق عليها/معلّق/مرفوض)
 *  - زر تثبيت التطبيق (PWAInstallButton — beforeinstallprompt حقيقي)
 *  - المظهر عبر المزوّد المخصص + بطاقة تواصل حقيقية + الخروج
 */
export default function OwnerSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { accessToken, hydrated } = useOwnerAuth();
  const logout = useOwnerLogout();

  // بيانات الحساب الحقيقية — GET /api/v1/me (توكن المالك)
  const me = useAccountMe("owner", hydrated && !!accessToken);
  // منشآتي الحقيقية — GET /api/v1/owner/facility
  const facilities = useMyFacilities();

  const account = me.data;
  const myFacilities = facilities.data ?? [];
  const isLoadingMe = me.isLoading && hydrated;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إعدادات تطبيق بوابة المنشآت.
        </p>
      </div>

      {/* ─── معلومات الحساب — GET /me ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
            معلومات الحساب
          </CardTitle>
          <CardDescription>بيانات حسابك كما هي مسجّلة في المنصة.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMe ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          ) : account ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xl font-bold text-primary-foreground">
                  {account.full_name?.trim().charAt(0) || "م"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{account.full_name}</p>
                  <p dir="ltr" className="truncate text-sm text-muted-foreground">
                    {account.email}
                  </p>
                </div>
              </div>
              <Separator />
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">الجوال:</dt>
                  <dd dir="ltr" className="tabular-nums">{account.phone}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">الدور:</dt>
                  <dd>
                    <Badge variant="secondary" className="rounded-full">
                      مالك منشأة
                    </Badge>
                  </dd>
                </div>
                <div className="col-span-full flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <dt className="text-muted-foreground">تاريخ الإنشاء:</dt>
                  <dd>{formatDate(account.created_at)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                تعذّر تحميل بيانات الحساب الآن.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => me.refetch()}
                disabled={me.isFetching}
              >
                {me.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                إعادة المحاولة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── منشآتي — الحالة الحقيقية ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-secondary" aria-hidden="true" />
            منشآتي
          </CardTitle>
          <CardDescription>
            حالة منشآتك لدى الإدارة — مباشرة من الخادم.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {facilities.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : facilities.isError ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                تعذّر تحميل منشآتك الآن.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => facilities.refetch()}
                disabled={facilities.isFetching}
              >
                {facilities.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                إعادة المحاولة
              </Button>
            </div>
          ) : myFacilities.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              لا توجد منشآت مرتبطة بحسابك.
            </p>
          ) : (
            <ul className="space-y-3">
              {myFacilities.map((f) => {
                const status = facilityStatus(f);
                const StatusIcon = status.icon;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/owner/facilities/${f.id}`)}
                      className="flex w-full min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 text-right transition-colors hover:bg-muted"
                      aria-label={`إدارة ${f.name}`}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          TONE_CLASS[status.tone]
                        )}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {f.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.rejection_reason
                            ? `سبب الرفض: ${f.rejection_reason}`
                            : status.label}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 rounded-full border-transparent",
                          TONE_CLASS[status.tone]
                        )}
                      >
                        {status.label}
                      </Badge>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── تثبيت التطبيق ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-secondary" aria-hidden="true" />
            التطبيق
          </CardTitle>
          <CardDescription>
            ثبّت بوابة المنشآت على شاشة جوالك الرئيسية للوصول بنقرة واحدة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PWAInstallButton portal="owner" variant="full" />
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── المظهر ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-primary" aria-hidden="true" />
            المظهر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الوضع الداكن</p>
              <p className="text-xs text-muted-foreground">
                {theme === "dark" ? "مفعّل" : "غير مفعّل"}
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="تبديل المظهر"
            />
          </div>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── معلومات التواصل — حقيقية حصراً ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-accent" aria-hidden="true" />
            الدعم والتواصل
          </CardTitle>
          <CardDescription>
            للاستفسارات والدعم الفني تواصل معنا مباشرة:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={`tel:${CONTACT_PHONE}`}
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <Phone className="h-4 w-4 text-secondary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">الهاتف</p>
              <p dir="ltr" className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                {CONTACT_PHONE_DISPLAY}
              </p>
            </div>
          </a>
          <a
            href={CONTACT_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
              <MessageCircle className="h-4 w-4 text-success" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">واتساب</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                محادثة مباشرة مع فريق {SITE_NAME}
              </p>
            </div>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">البريد الإلكتروني</p>
              <p dir="ltr" className="mt-0.5 text-sm text-muted-foreground">
                {CONTACT_EMAIL}
              </p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">الموقع</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                الجمهورية اليمنية — صنعاء
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── عن التطبيق ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            عن التطبيق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{SITE_NAME} — بوابة أصحاب المنشآت</p>
          <p>
            الإصدار: <span dir="ltr">{APP_VERSION}</span>
          </p>
          <p className="text-xs leading-relaxed">
            رسوم التوصيل الثابتة: {DELIVERY_FEE} ريال يمني — ويعمل التطبيق
            أوفلاين بعرض آخر بيانات ظهرت سابقاً، وتتطلب جميع العمليات اتصالاً
            بالإنترنت.
          </p>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── الحساب ─── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Lock className="h-5 w-5" aria-hidden="true" />
            الحساب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">تسجيل الخروج</p>
              <p className="text-xs text-muted-foreground">
                تسجيل الخروج من بوابة المنشآت على هذا الجهاز
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 min-h-[44px]"
              onClick={() => logout()}
            >
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* أمان الحساب — تغيير كلمة المرور (الجولة الختامية: PUT /me/password) */}
      <PasswordChangeCard role="owner" />

      {/* الأصوات — نظام الإشعارات الصوتية (الجولة 8) */}
      <SoundSettingsCard />
    </div>
  );
}
