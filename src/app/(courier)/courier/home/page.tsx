"use client";

/**
 * /courier/home — الرئيسية الميدانية (شاشة 4/11).
 * ═════════════════════════════════════════════════════════
 * - مفتاح التوفر (POST /courier/availability) — يفتح الرادار
 * - دائرة النبض (useCourierPulse): موقع حي + بطارية + آخر نبضة
 * - رادار النداءات (GET /courier/calls كل 5ث) → بطاقة النداء المنبثقة
 * - بطاقة «مهمتي الجارية» إن وُجدت (توجيه لشاشة مهمتي)
 * - إحصاءات مصغرة + Web Push (FCM) لنمط الجذب خارج التطبيق (شاشة 11)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BatteryFull,
  Bell,
  Bike,
  Banknote,
  MapPin,
  Package,
  Power,
  RadioTower,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CourierCallCardOverlay } from "@/components/courier/CourierCallCard";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCourierMe,
  useCourierCalls,
  useCourierCurrentTask,
  useCourierAvailability,
  useCourierPulse,
  useCourierStats,
  useCourierLogout,
  pickActiveCall,
} from "@/hooks/useCourier";
import { courierFcmService } from "@/services/courier.service";
import { unlockCourierAudio } from "@/lib/courier-call-sound";
import { haptic } from "@/lib/haptic";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** طلب إذن الإشعارات + FCM — «نمط الجذب خارج التطبيق» (Web Push) */
async function enableWebPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    toast({
      title: "متصفحك لا يدعم إشعارات النداء",
      description: "جرّب متصفح كروم أو ثبّت التطبيق",
      variant: "destructive",
    });
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast({
        title: "لم تُمنح صلاحية الإشعارات",
        description: "ستصلك النداءات داخل التطبيق فقط",
      });
      return false;
    }
    /* تسجيل توكن FCM عبر مساعدات المستودع المُصلَحة (توحيد VAPID + ربط
       SW + إعادة محاولة شبكية) — بدل استيراد مكتبة المراسلة مباشرة */
    try {
      const { isFcmSupported, getFcmToken, subscribeFcmMessages } =
        await import("@/lib/firebase");
      if (isFcmSupported()) {
        const token = await getFcmToken();
        if (token) {
          await courierFcmService.registerToken(
            token,
            `courier/${navigator.userAgent.slice(0, 120)}`,
          );
        }
        /* نداءات الخلفية تصل Push؛ نداءات الواجهة — توست فوري */
        subscribeFcmMessages((payload) => {
          const title = payload.notification?.title ?? "نداء توصيل جديد";
          toast({ title, description: payload.notification?.body ?? undefined });
        });
      }
    } catch {
      /* FCM غير مهيأ في هذه البيئة — إشعارات المتصفح المحلية كافية */
    }
    toast({
      title: "فُعّل جذب النداء خارج التطبيق 🔔",
      description: "ستصلك النداءات حتى لو كان التطبيق مغلقاً",
    });
    return true;
  } catch {
    return false;
  }
}

export default function CourierHomePage() {
  const router = useRouter();
  const { data: me, isError: meError, error, refetch, isRefetching } = useCourierMe();
  const { data: calls, isError: callsError } = useCourierCalls(
    me?.availability === "available",
  );
  const { data: currentTask } = useCourierCurrentTask();
  const { data: stats } = useCourierStats();
  const availability = useCourierAvailability();
  const logout = useCourierLogout();
  const [pushAsked, setPushAsked] = useState(false);

  const isAvailable = me?.availability === "available";
  const pulse = useCourierPulse(isAvailable);

  /* النداء النشط — الأول غير المنتهي */
  const activeCall = useMemo(() => {
    if (!isAvailable) return null;
    return pickActiveCall(calls ?? undefined);
  }, [calls, isAvailable]);

  /* فك قفل الصوت عند أول لمسة داخل البوابة */
  useEffect(() => {
    const unlock = () => unlockCourierAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /* اقتراح Web Push عند أول توفر — مرة واحدة */
  useEffect(() => {
    if (isAvailable && !pushAsked && typeof localStorage !== "undefined") {
      setPushAsked(true);
      if (localStorage.getItem("tawfir_courier_push_prompted") !== "1") {
        localStorage.setItem("tawfir_courier_push_prompted", "1");
        void enableWebPush();
      }
    }
  }, [isAvailable, pushAsked]);

  /* نبض الوقت منذ آخر نبضة */
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowTs(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);
  const sincePulse = pulse.lastPulseAt
    ? Math.max(0, Math.round((nowTs - pulse.lastPulseAt) / 1000))
    : null;

  const toggleAvailability = (next: boolean) => {
    haptic(next ? "success" : "light");
    availability.mutate(next, {
      onSuccess: () => {
        toast({
          title: next
            ? "أنت متاح الآن — الرادار مفتوح 📡"
            : "أوقفت توفررك — لن تصلك نداءات",
        });
      },
      onError: (err: unknown) => {
        toast({
          title: "تعذّر تغيير التوفر",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    });
  };

  if (meError && !me) {
    return (
      <main className="mx-auto max-w-lg p-4 pt-10">
        <WaitMode
          reason={error instanceof Error ? error.message : "تعذّر تحميل بروفايلك"}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </main>
    );
  }
  if (!me) return null;

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-8">
      <CourierScreenHeader
        title={`أهلاً، ${me.public_name}`}
        subtitle={`${me.verification_status_ar} · رقم العضوية ${me.membership_card.membership_number ?? "—"}`}
        icon={Bike}
      />

      {/* مفتاح التوفر */}
      <section
        aria-label="مفتاح التوفر"
        className={cn(
          "rounded-3xl border p-5 shadow-soft transition-colors",
          isAvailable
            ? "border-primary/40 bg-primary/5"
            : "border-border/60 bg-card",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Power
                className={cn(
                  "h-5 w-5",
                  isAvailable ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <h2 className="text-base font-extrabold text-foreground">
                {isAvailable ? "متاح لاستقبال النداءات" : "غير متصل بالرادار"}
              </h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isAvailable
                ? "افتح تطبيق الخرائط مستعداً — النداء الأول قد يصلك الآن"
                : "أدر المفتاح عندما تكون جاهزاً للانطلاق"}
            </p>
          </div>
          <Switch
            id="courier-availability"
            checked={isAvailable}
            onCheckedChange={toggleAvailability}
            disabled={availability.isPending}
            aria-label="مفتاح التوفر لاستقبال النداءات"
            className="scale-125"
          />
          <Label htmlFor="courier-availability" className="sr-only">
            التوفر
          </Label>
        </div>

        {/* دائرة النبض — تظهر عند التوفر فقط */}
        <AnimatePresence>
          {isAvailable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-4 rounded-2xl bg-card/70 p-4">
                {/* النبض الحي */}
                <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full bg-primary/15"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.15, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2.2 }}
                    aria-hidden="true"
                  />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Activity className="h-5 w-5" aria-hidden="true" />
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">
                    {pulse.pulseError ? (
                      <span className="text-destructive">{pulse.pulseError}</span>
                    ) : pulse.coords ? (
                      <>
                        الموقع الحي يعمل
                        {sincePulse !== null && (
                          <span className="text-muted-foreground">
                            {" "}
                            · آخر نبضة قبل {sincePulse}ث
                          </span>
                        )}
                      </>
                    ) : (
                      "بانتظار إذن الموقع…"
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {pulse.coords
                      ? `${pulse.coords.lat.toFixed(4)}، ${pulse.coords.lng.toFixed(4)}`
                      : "امنح صلاحية الموقع ليعمل الرادار"}
                    {pulse.battery !== null && (
                      <span className="ms-1 flex items-center gap-0.5">
                        <BatteryFull className="h-3 w-3" aria-hidden="true" />
                        {pulse.battery}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* خطأ النبض يعرض ضمن بطاقة الانتظار الرشيق المدمجة */}
              {(callsError || pulse.pulseError) && (
                <p
                  className="mt-2 flex items-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground"
                  role="status"
                >
                  <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
                  {callsError
                    ? "تعذّر الوصول لرادار النداءات — إعادة محاولة تلقائية كل 5 ثوانٍ"
                    : "الرادار يعمل — النداءات تصل مع توفر الموقع"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* مهمة جارية — بطاقة توجيه */}
      {currentTask?.task_id && (
        <Link
          href="/courier/task"
          className="block rounded-3xl border border-primary/40 bg-gradient-to-l from-primary/10 to-primary/5 p-5 shadow-soft native-tap-card"
          aria-label="مهمتك الجارية — افتح شاشة مهمتي"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
              >
                <Package className="h-6 w-6" aria-hidden="true" />
              </motion.span>
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  لديك مهمة جارية!
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentTask.status_ar} · {currentTask.facility_name ?? ""}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-primary">
              متابعة
              <Timer className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      )}

      {/* الإحصاءات المصغرة */}
      <section aria-label="ملخص اليوم" className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Package,
            label: "مهام منجزة",
            value: String(stats?.completed_tasks ?? me.stats.completed_tasks ?? 0),
          },
          {
            icon: Banknote,
            label: "أرباحي",
            value: formatCurrency(
              (stats?.total_earnings as number | undefined) ??
                me.stats.total_earnings ??
                0,
            ),
          },
          {
            icon: Bike,
            label: "مستواي",
            value: (stats?.level_ar as string | undefined) ?? me.stats.level_ar,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border/60 bg-card p-3 text-center shadow-soft"
          >
            <s.icon className="mx-auto h-4.5 w-4.5 text-primary" aria-hidden="true" />
            <p className="mt-1.5 truncate text-sm font-black text-foreground">
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* نمط الجذب خارج التطبيق — تفعيل يدوي دائم */}
      <section
        aria-label="إشعارات النداء خارج التطبيق"
        className="rounded-3xl border border-dashed border-chart-4/40 bg-chart-4/5 p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-chart-4/10 text-chart-4">
              <Bell className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">
                جذب النداء خارج التطبيق
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                إشعار يوقظ جهازك عند نداء جديد حتى لو كان التطبيق مغلقاً
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void enableWebPush()}
            className="h-10 shrink-0 rounded-xl native-tap"
            aria-label="تفعيل إشعارات النداء خارج التطبيق"
          >
            تفعيل
          </Button>
        </div>
      </section>

      {/* خروج */}
      <div className="px-1 pb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            router.replace("/courier/login");
          }}
          className="text-muted-foreground native-tap"
          aria-label="تسجيل الخروج من بوابة المندوب"
        >
          تسجيل الخروج
        </Button>
      </div>

      {/* بطاقة النداء المنبثقة — فوق كل شيء */}
      <AnimatePresence>
        {activeCall && !currentTask?.task_id && (
          <CourierCallCardOverlay key={activeCall.call_id} call={activeCall} />
        )}
      </AnimatePresence>
    </main>
  );
}
