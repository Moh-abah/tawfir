"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { Save, Lock, Info, Bell, Globe, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── Password strength calculator ──────────────── */
function getPasswordStrength(password: string): { level: "weak" | "medium" | "strong"; percent: number } {
  if (!password) return { level: "weak", percent: 0 };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { level: "weak", percent: 33 };
  if (score <= 3) return { level: "medium", percent: 66 };
  return { level: "strong", percent: 100 };
}

const STRENGTH_LABELS: Record<string, string> = {
  weak: "ضعيفة",
  medium: "متوسطة",
  strong: "قوية",
};

const STRENGTH_COLORS: Record<string, string> = {
  weak: "bg-destructive",
  medium: "bg-accent",
  strong: "bg-success",
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [email] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [facilityNotif, setFacilityNotif] = useState(true);
  const [securityNotif, setSecurityNotif] = useState(true);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  function handleSaveProfile() {
    toast({ title: "تم حفظ الملف الشخصي" });
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمة المرور غير متطابقة", variant: "destructive" });
      return;
    }
    toast({ title: "تم تغيير كلمة المرور" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function handleSaveAll() {
    toast({ title: "تم حفظ جميع التغييرات" });
  }

  function handleSaveNotifications() {
    toast({ title: "تم حفظ إعدادات الإشعارات" });
  }

  function handleChangeAvatar() {
    toast({ title: "قريبًا", description: "ستتوفر ميزة تغيير الصورة الشخصية قريبًا" });
  }

  return (
    <div className="relative space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة إعدادات الحساب والمنصة.
        </p>
      </div>

      {/* Profile Section with animated gradient border */}
      <div className="gradient-border-animated rounded-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-primary-foreground">
                  م
                </div>
                <button
                  type="button"
                  onClick={handleChangeAvatar}
                  className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
                  aria-label="تغيير الصورة"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-semibold">المشرف</p>
                <p className="text-sm text-muted-foreground">admin@wafir.gleeze.com</p>
                <button
                  type="button"
                  onClick={handleChangeAvatar}
                  className="text-sm text-primary hover:text-primary/80 transition-colors min-h-[44px] inline-flex items-center"
                >
                  <Camera className="ml-1 h-3.5 w-3.5" />
                  تغيير الصورة
                </button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display-name">الاسم المعروض</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="المشرف"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  dir="ltr"
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <Button className="gap-2" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" />
              حفظ
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Animated gradient divider */}
      <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-primary/30 to-transparent" />

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-secondary" />
            الإعدادات العامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">المظهر</p>
              <p className="text-xs text-muted-foreground">
                {theme === "dark" ? "داكن" : "فاتح"}
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="تبديل المظهر"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">اللغة</p>
              <p className="text-xs text-muted-foreground">العربية - ثابت</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الإشعارات</p>
              <p className="text-xs text-muted-foreground">تفعيل إشعارات النظام</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              aria-label="تبديل الإشعارات"
            />
          </div>
        </CardContent>
      </Card>

      {/* Animated gradient divider */}
      <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-secondary/30 to-transparent" />

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-accent" />
            أمان الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">كلمة المرور الحالية</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="**********"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="**********"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="**********"
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Password strength meter */}
          {newPassword.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">قوة كلمة المرور</span>
                <span className={cn(
                  "text-xs font-medium",
                  passwordStrength.level === "weak" && "text-destructive",
                  passwordStrength.level === "medium" && "text-accent",
                  passwordStrength.level === "strong" && "text-success",
                )}>
                  {STRENGTH_LABELS[passwordStrength.level]}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    STRENGTH_COLORS[passwordStrength.level],
                  )}
                  style={{ width: `${passwordStrength.percent}%` }}
                />
              </div>
            </div>
          )}

          <Button className="gap-2" onClick={handleChangePassword}>
            <Save className="h-4 w-4" />
            حفظ كلمة المرور
          </Button>
        </CardContent>
      </Card>

      {/* Animated gradient divider */}
      <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-accent/30 to-transparent" />

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            إعدادات الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">إشعارات البريد الإلكتروني</p>
              <p className="text-xs text-muted-foreground">استلام إشعارات عبر البريد الإلكتروني</p>
            </div>
            <Switch
              checked={emailNotif}
              onCheckedChange={setEmailNotif}
              aria-label="إشعارات البريد الإلكتروني"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">إشعارات المنشآت الجديدة</p>
              <p className="text-xs text-muted-foreground">تنبيه عند إضافة منشآت جديدة</p>
            </div>
            <Switch
              checked={facilityNotif}
              onCheckedChange={setFacilityNotif}
              aria-label="إشعارات المنشآت الجديدة"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">تنبيهات الأمان</p>
              <p className="text-xs text-muted-foreground">إشعارات تسجيل الدخول والنشاط المشبوه</p>
            </div>
            <Switch
              checked={securityNotif}
              onCheckedChange={setSecurityNotif}
              aria-label="تنبيهات الأمان"
            />
          </div>
          <Button className="gap-2" onClick={handleSaveNotifications}>
            <Save className="h-4 w-4" />
            حفظ إعدادات الإشعارات
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-muted-foreground" />
            عن المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>توفير - منصة الخصومات وطلب الوجبات اليمنية</p>
          <p>الإصدار: 1.0.0</p>
        </CardContent>
      </Card>

      {/* Sticky save all button */}
      <div className="sticky bottom-4 z-30 flex justify-center">
        <Button
          onClick={handleSaveAll}
          className="min-h-[44px] gap-2 bg-gradient-to-l from-primary to-secondary px-8 font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Save className="h-4 w-4" />
          حفظ جميع التغييرات
        </Button>
      </div>
    </div>
  );
}
