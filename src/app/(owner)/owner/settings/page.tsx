"use client";

import { useTheme } from "next-themes";
import { Download, Info, Lock, Mail, MessageCircle, Phone, Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useOwnerLogout } from "@/hooks/useOwnerAuth";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { APP_VERSION } from "@/lib/pwa/version";

/** بيانات التواصل الحقيقية — مواصفة توفير اليمنية */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";

/**
 * إعدادات المالك — ميزات حقيقية فقط:
 * زر تثبيت التطبيق + المظهر + معلومات التواصل الحقيقية + الخروج.
 * لا ميزات وهمية إطلاقاً.
 */
export default function OwnerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const logout = useOwnerLogout();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إعدادات تطبيق بوابة المنشآت.
        </p>
      </div>

      {/* تثبيت التطبيق */}
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

      {/* المظهر */}
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

      {/* معلومات التواصل — حقيقية حصراً */}
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
              <p dir="ltr" className="mt-0.5 text-sm text-muted-foreground">
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
                محادثة مباشرة مع فريق توفير
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
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* عن التطبيق */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            عن التطبيق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>توفير — بوابة أصحاب المنشآت</p>
          <p>
            الإصدار: <span dir="ltr">{APP_VERSION}</span>
          </p>
          <p className="text-xs leading-relaxed">
            يعمل التطبيق أوفلاين بعرض آخر بيانات ظهرت سابقاً، وتتطلب جميع
            العمليات اتصالاً بالإنترنت.
          </p>
        </CardContent>
      </Card>

      <div className="h-[2px] w-full rounded-full bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

      {/* الحساب */}
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
          <Separator className="my-4" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            لتعديل بيانات المنشأة أو كلمة المرور تواصل مع إدارة توفير عبر
            الأرقام أعلاه.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
