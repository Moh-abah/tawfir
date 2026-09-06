"use client";

import { motion } from "framer-motion";
import { Gift, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFreeMembershipFlag } from "@/hooks/useFreeMembershipFlag";
import { useSetFreeMembershipFlag } from "@/hooks/useSetFreeMembershipFlag";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * FreeMembershipToggleCard — الجولة 20.
 *
 * بطاقة إعدادات المشرف للتحكم في علم العضوية المجانية:
 *  - GET  /admin/settings/free-membership → قراءة العلم الحالي
 *  - PATCH /admin/settings/free-membership {is_free_membership_enabled:bool}
 *
 * عند التفعيل: العملاء الجدد يحصلون على عضوية مجانية فور التسجيل (بلا
 * دفع ولا رفع إيصال)، ويظهر لهم في /membership/subscribe زر «احصل على
 * عضويتك مجاناً» بدلاً من شاشة الدفع.
 *
 * عند التعطيل: يعود التدفق اليدوي (تحويل + رفع إيصال + موافقة 24-48 ساعة).
 *
 * الهوية: كحلي #0A1A2F + ذهبي #D4AF37 + زمرد #0E7D62.
 */
export function FreeMembershipToggleCard() {
  const prefersReduced = usePrefersReducedMotion();
  const flagQuery = useFreeMembershipFlag(true);
  const setFlag = useSetFreeMembershipFlag();

  const isLoading = flagQuery.isLoading;
  const isError = flagQuery.isError;
  const value = flagQuery.data?.is_free_membership_enabled ?? false;

  const handleToggle = (checked: boolean) => {
    setFlag.mutate(checked);
  };

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card
        className="overflow-hidden rounded-2xl border-border/60 shadow-soft"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--logo-navy) 4%, transparent), color-mix(in srgb, var(--logo-gold) 4%, transparent))",
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "var(--logo-gold)",
                color: "var(--logo-white)",
              }}
            >
              <Gift className="h-5 w-5" aria-hidden="true" />
            </span>
            العضوية المجانية
          </CardTitle>
          <CardDescription>
            تحكّم في منح العملاء عضوية مجانية تلقائياً عند التسجيل
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                تعذّر تحميل حالة العضوية المجانية من الخادم.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => flagQuery.refetch()}
                disabled={flagQuery.isFetching}
              >
                {flagQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    تفعيل العضوية المجانية
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {value
                      ? "مفعّلة الآن — كل عميل جديد يحصل على عضوية سنوية مجاناً"
                      : "معطّلة — الاشتراك يتطلب تحويلاً يدوياً + موافقة"}
                  </p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={handleToggle}
                  disabled={setFlag.isPending}
                  aria-label="تبديل العضوية المجانية"
                  className={cn(value ? "" : "")}
                />
              </div>

              {setFlag.isPending && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  جارٍ تحديث الإعداد...
                </p>
              )}

              <Separator />

              <div
                className="rounded-xl border border-border/50 p-4"
                style={{
                  background:
                    value &&
                    "color-mix(in srgb, var(--logo-emerald) 6%, transparent)",
                }}
              >
                <p className="text-xs leading-relaxed text-foreground">
                  {value ? (
                    <span className="space-y-1.5 block">
                      <span className="block font-bold text-foreground">
                        ✅ وضع العضوية المجانية مفعّل
                      </span>
                      <span className="block text-muted-foreground">
                        — عند تسجيل أي عميل جديد يُمنح عضوية توفير سنوية
                        مجاناً (is_free=true) بلا تحويل ولا رفع إيصال.
                        <br />— في صفحة /membership/subscribe تختفي شاشة الدفع
                        ورفع الإيصال ويظهر زر «احصل على عضويتك مجاناً».
                      </span>
                    </span>
                  ) : (
                    <span className="space-y-1.5 block">
                      <span className="block font-bold text-foreground">
                        ⛔ وضع الاشتراك اليدوي مفعّل
                      </span>
                      <span className="block text-muted-foreground">
                        — العميل الجديد يجب أن يحوّل 3000 ر.ي ويرفع صورة
                        الإيصال، ثم تُراجع الطلب يدوياً خلال 24-48 ساعة.
                        <br />— صفحة الاشتراك تعرض معلومات التحويل وحق رفع الصورة.
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                ملاحظة: التغيير ينعكس فوراً على العملاء الجدد. العملاء
                المُسجّلون بلا عضوية يستطيعون طلب عضوية مجانية من
                /membership/subscribe طالما العلم مفعّل.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
