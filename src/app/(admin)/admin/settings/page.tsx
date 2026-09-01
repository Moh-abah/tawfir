"use client";

import { useRouter } from "next/navigation";
import {
  Info,
  Bell,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  User,
  Loader2,
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
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
import { useAdminAuth, useAdminLogout } from "@/hooks/useAdminAuth";
import { useAccountMe } from "@/hooks/useAccountMe";
import { PasswordChangeCard } from "@/components/shared/PasswordChangeCard";
import { SoundSettingsCard } from "@/components/shared/SoundSettingsCard";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useWsStatus } from "@/hooks/useWsStatus";
import { formatDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/site-config";
import { APP_VERSION } from "@/lib/pwa/version";
import { cn } from "@/lib/utils";

/* ─── معلومات التواصل الحقيقية — مواصفة توفير اليمنية ─── */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";

const ROLE_LABEL: Record<string, string> = {
  admin: "مشرف",
  owner: "مالك متجر",
  customer: "عميل",
};

/**
 * إعدادات لوحة المشرف — الجولة 5.
 *
 * ميزات حقيقية فقط:
 *  - بيانات الحساب من GET /me (بالتوكن الأدمن) — لا نص ثابت
 *  - المظهر عبر المزوّد المخصص (يعمل فعلياً)
 *  - حالة الإشعارات الحقيقية: WebSocket + عدّاد غير المقروء + زر عرض
 *  - بطاقة تواصل حقيقية (هاتف/واتساب/بريد + الموقع)
 *  - الإصدار من lib/pwa/version.ts (مصدره package.json)
 *
 *  - أمان الحساب: تغيير كلمة المرور (PUT /me/password — الجولة 7)
 *  - قسم الأصوات: تشغيل/مستوى/تجربة كل صوت من الـ18 (الجولة 8)
 */
export default function AdminSettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { accessToken, hydrated } = useAdminAuth();
  const logout = useAdminLogout();

  // بيانات الحساب الحقيقية — GET /api/v1/me (توكن المشرف)
  const me = useAccountMe("admin", hydrated && !!accessToken);
  // عدّاد الإشعارات الحقيقي — GET /notifications/unread-count
  const unread = useUnreadCount(!!accessToken);
  // حالة WebSocket الحقيقية — من ws-client
  const wsStatus = useWsStatus();

  const account = me.data;
  const unreadCount = unread.data?.count ?? 0;
  const isLoading = me.isLoading && hydrated;

  return (
    <div className="relative mx-auto max-w-3xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إعدادات حساب المشرف — بيانات حقيقية من الخادم.
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
          {isLoading ? (
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
                  <dt className="text-muted-foreground">الدور:</dt>
                  <dd>
                    <Badge variant="secondary" className="gap-1 rounded-full">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {ROLE_LABEL[account.role] ?? account.role}
                    </Badge>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-muted-foreground">الجوال:</dt>
                  <dd dir="ltr" className="tabular-nums">
                    {account.phone}
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

      {/* ─── المظهر — يعمل فعلياً عبر المزوّد المخصص ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-secondary" aria-hidden="true" />
            المظهر
          </CardTitle>
          <CardDescription>تبديل الوضع الفاتح/الداكن للوحة التحكم.</CardDescription>
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

      {/* ─── الإشعارات — حالة حقيقية ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-accent-ink" aria-hidden="true" />
            الإشعارات
          </CardTitle>
          <CardDescription>
            حالة الإشعارات الفورية لحسابك الآن — مباشرة من الخادم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* حالة WebSocket */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {wsStatus === "connected" ? (
                <Wifi className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">الاتصال الفوري</p>
                <p className="text-xs text-muted-foreground">
                  {wsStatus === "connected" && "متصل — الإشعارات تصلك لحظياً"}
                  {wsStatus === "reconnecting" && "يعيد الاتصال..."}
                  {wsStatus === "disconnected" && "غير متصل حالياً"}
                  {wsStatus === "error" && "خطأ في الاتصال"}
                  {wsStatus === "idle" && "بانتظار الاتصال..."}
                </p>
              </div>
            </div>
            <span
              role="status"
              aria-live="polite"
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                wsStatus === "connected"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {wsStatus === "connected" ? "متصل" : "غير متصل"}
            </span>
          </div>

          <Separator />

          {/* عدد غير المقروء */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">غير المقروء</p>
              <p className="text-xs text-muted-foreground">
                عدد الإشعارات التي لم تقرأها بعد
              </p>
            </div>
            {unread.isLoading ? (
              <Skeleton className="h-7 w-14 rounded-full" />
            ) : (
              <Badge
                variant={unreadCount > 0 ? "default" : "secondary"}
                className="min-w-9 justify-center rounded-full tabular-nums"
                aria-live="polite"
              >
                {unreadCount}
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 rounded-full"
            onClick={() => router.push("/notifications")}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            عرض الإشعارات
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── الدعم والتواصل — حقيقي ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
            معلومات الاتصال
          </CardTitle>
          <CardDescription>للاستفسارات والدعم الفني تواصل معنا مباشرة:</CardDescription>
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
              <MapPin className="h-4 w-4 text-accent-ink" aria-hidden="true" />
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

      {/* ─── عن المنصة ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            عن المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {SITE_NAME} — منصة الخصومات وطلب الوجبات اليمنية
          </p>
          <p>
            الإصدار: <span dir="ltr">{APP_VERSION}</span>
          </p>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* ─── الحساب ─── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            الحساب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">تسجيل الخروج</p>
              <p className="text-xs text-muted-foreground">
                تسجيل الخروج من لوحة التحكم على هذا الجهاز
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
      <PasswordChangeCard role="admin" />

      {/* الأصوات — نظام الإشعارات الصوتية (الجولة 8) */}
      <SoundSettingsCard />
    </div>
  );
}
