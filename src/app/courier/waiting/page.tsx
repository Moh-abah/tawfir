"use client";

/**
 * /courier/waiting — وضع الانتظار + الإيقاف والتظلم (شاشة 3/11 وجزء 10/11).
 * الحالات الأربع من verification_status (عقد CourierMeOut):
 *   pending              → انتظار التدقيق (24–48 ساعة)
 *   awaiting_completion  → الإدارة تطلب استكمال مستند — إعادة رفع + إبلاغ
 *   rejected             → سبب الرفض (rejection_reason) + التوجيه (appeal_note)
 *   suspended            → سبب الإيقاف + التوجيه
 *   verified             → توجيه فوري للرئيسية الميدانية
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlarmClock,
  Bike,
  Camera,
  CheckCircle2,
  FileWarning,
  HelpCircle,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/shared/AuthShell";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCourierMe,
  useCourierDocUpload,
  useCourierRecheck,
  useCourierLogout,
} from "@/hooks/useCourier";
import { unlockCourierAudio } from "@/lib/courier-call-sound";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";

const DOC_LABELS: Record<string, string> = {
  photo: "صورتك الشخصية",
  id_document: "الهوية / البطاقة",
  license: "رخصة القيادة",
  vehicle_photo: "صورة المركبة",
};

const DOC_KEYS = ["photo", "id_document", "license", "vehicle_photo"] as const;

function WaitingInner() {
  const router = useRouter();
  const { data: me, isLoading, isError, error, refetch, isRefetching } = useCourierMe();
  const logout = useCourierLogout();
  const docUpload = useCourierDocUpload();
  const recheck = useCourierRecheck();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [cameraFor, setCameraFor] = useState<string | null>(null);
  const [refreshTimer, setRefreshTimer] = useState(30);

  /* توثيق مكتمل → الرئيسية الميدانية */
  useEffect(() => {
    if (me?.verification_status === "verified") {
      router.replace("/courier/home");
    }
  }, [me?.verification_status, router]);

  /* عداد تحديث تلقائي (تحرّك الإدارة يظهر خلال ≤30ث) */
  useEffect(() => {
    const t = window.setInterval(() => setRefreshTimer((s) => (s > 0 ? s - 1 : 30)), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (refreshTimer === 30) void refetch();
  }, [refreshTimer, refetch]);

  /* فك قفل الصوت مبكراً لجهوزية نداءات ما بعد التوثيق */
  useEffect(() => {
    unlockCourierAudio();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <WaitMode
        reason={
          error instanceof Error
            ? error.message
            : "تعذّر تحميل حالة التوثيق — سنعيد المحاولة تلقائياً"
        }
        onRetry={() => void refetch()}
        isRetrying={isRefetching}
        hint="إن استمرت الرسالة فتوثيقك قائم لدى الإدارة — عاود لاحقاً"
      />
    );
  }

  const status = me.verification_status;

  const pickDoc = (docKey: string) => {
    setCameraFor(docKey);
    fileRef.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docKey = cameraFor;
    e.target.value = "";
    if (!file || !docKey) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "الصورة أكبر من 5MB",
        variant: "destructive",
      });
      return;
    }
    docUpload.mutate(
      { file, docType: docKey },
      {
        onSuccess: () => {
          haptic("success");
          toast({
            title: "تم رفع المستند ✅",
            description: "سيصل للإدارة فوراً",
          });
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر الرفع",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="hidden"
        onChange={onFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full space-y-4"
      >
        {/* بطاقة الحالة */}
        <div className="rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-soft backdrop-blur">
          {status === "pending" && (
            <>
              <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                <AlarmClock className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground">
                {me.verification_status_ar}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                طلبك رقم #{me.courier_id} قيد التدقيق لدى إدارة توفير — عادةً
                خلال 24–48 ساعة. ستتشغل بوابتك الميدانية تلقائياً فور
                التوثيق.
              </p>
            </>
          )}

          {status === "awaiting_completion" && (
            <>
              <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-chart-4/15 text-chart-4">
                <FileWarning className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground">
                {me.verification_status_ar}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                طلبت الإدارة استكمال مستنداتك — ارفعها الآن بكاميرا جوالك
                ثم أرسل للمراجعة من جديد
              </p>
              {me.rejection_reason && (
                <p className="mt-2 rounded-xl bg-muted/70 p-3 text-xs font-bold text-foreground">
                  {me.rejection_reason}
                </p>
              )}
              <ul className="mt-4 space-y-2 text-start">
                {DOC_KEYS.map((k) => (
                  <li key={k}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => pickDoc(k)}
                      disabled={docUpload.isPending}
                      className="h-12 w-full justify-between rounded-2xl native-tap"
                      aria-label={`إعادة رفع ${DOC_LABELS[k]}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <Camera className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
                        {DOC_LABELS[k]}
                      </span>
                      {docUpload.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="text-xs font-bold text-primary">رفع</span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="lg"
                disabled={recheck.isPending}
                onClick={() =>
                  recheck.mutate(undefined, {
                    onSuccess: () => {
                      haptic("success");
                      toast({ title: "أُرسل للمراجعة من جديد ✅" });
                      void refetch();
                    },
                  })
                }
                className="mt-3 h-12 w-full gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
              >
                {recheck.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                )}
                أرسل للمراجعة من جديد
              </Button>
            </>
          )}

          {(status === "rejected" || status === "suspended") && (
            <>
              <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <ShieldAlert className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="text-xl font-extrabold text-foreground">
                {me.verification_status_ar}
              </h1>
              {me.rejection_reason && (
                <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-bold leading-relaxed text-foreground">
                  السبب: {me.rejection_reason}
                </p>
              )}
              {me.appeal_note && (
                <div className="mt-3 rounded-2xl bg-muted/70 p-4 text-start">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                    <HelpCircle className="h-4 w-4" aria-hidden="true" />
                    توجيه التظلم
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {me.appeal_note}
                  </p>
                </div>
              )}
              {/* للرفض: مسار استكمال المستندات وإعادة المراجعة */}
              {status === "rejected" && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => pickDoc(DOC_KEYS[1])}
                  className="mt-4 h-12 w-full gap-2 rounded-2xl native-tap"
                >
                  <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
                  إعادة رفع مستندات والمراجعة
                </Button>
              )}
            </>
          )}
        </div>

        {/* عداد التحديث + خروج */}
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            تحديث تلقائي بعد {refreshTimer} ثانية
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              router.replace("/courier/login");
            }}
            className="gap-1.5 text-muted-foreground native-tap"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            خروج
          </Button>
        </div>

        {/* بطاقة معلومات ما بعد التوثيق */}
        <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-primary">
            <Bike className="h-4.5 w-4.5" aria-hidden="true" />
            عند التوثيق ستحصل فوراً على
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>شارة «مندوب موثق» + رقم عضوية رسمي</li>
            <li>رادار النداءات الحي بصوت واهتزاز</li>
            <li>ملف إنجازاتك: مهامك وأرباحك ومستواك</li>
          </ul>
        </div>
      </motion.div>
    </>
  );
}

export default function CourierWaitingPage() {
  return (
    <AuthShell backHref="/courier">
      <WaitingInner />
    </AuthShell>
  );
}
