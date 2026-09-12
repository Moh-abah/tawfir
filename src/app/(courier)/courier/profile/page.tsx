"use client";

/**
 * /courier/profile — ملفي وإنجازاتي (شاشة 8/11).
 * بطاقة العضوية (رقم + خصائص + تواريخ) + الإحصاءات الكاملة +
 * المستوى + زر الإعدادات/الخروج.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Banknote,
  Bike,
  CalendarCheck,
  Gauge,
  LineChart,
  Package,
  Settings,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import { useCourierMe, useCourierStats, useCourierLogout } from "@/hooks/useCourier";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: "دراجة نارية",
  electric_bike: "دراجة كهربائية",
  other: "مركبة أخرى",
};

export default function CourierProfilePage() {
  const router = useRouter();
  const { data: me, isLoading, isError, error, refetch, isRefetching } = useCourierMe();
  const { data: stats } = useCourierStats();
  const logout = useCourierLogout();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </main>
    );
  }
  if (isError || !me) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <CourierScreenHeader title="ملفي" icon={BadgeCheck} />
        <WaitMode
          reason={error instanceof Error ? error.message : "تعذّر تحميل ملفك"}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </main>
    );
  }

  const card = me.membership_card;
  const s = {
    completed_tasks:
      (stats?.completed_tasks as number | undefined) ?? me.stats.completed_tasks,
    service_km: (stats?.service_km as number | undefined) ?? me.stats.service_km,
    total_earnings:
      (stats?.total_earnings as number | undefined) ?? me.stats.total_earnings,
    active_days: (stats?.active_days as number | undefined) ?? me.stats.active_days,
    avg_response_seconds:
      (stats?.avg_response_seconds as number | null | undefined) ??
      me.stats.avg_response_seconds,
    level_ar: (stats?.level_ar as string | undefined) ?? me.stats.level_ar,
  };

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-8">
      <CourierScreenHeader title="ملفي وإنجازاتي" icon={BadgeCheck} />

      {/* ═══ بطاقة العضوية (مكوّن مشترك إلزامي §8-4) ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="بطاقة عضوية المندوب"
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-bl from-primary/15 via-card to-card p-5 shadow-soft"
      >
        {/* زخرفة الخلفية */}
        <div
          className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* الصورة العلنية إن وُجدت */}
              {me.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={me.photo_url}
                  alt={`صورة المندوب ${me.public_name}`}
                  className="h-14 w-14 rounded-2xl border-2 border-primary/30 object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Bike className="h-7 w-7" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-black text-foreground">
                  {card.public_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {card.document_full_name}
                </p>
              </div>
            </div>
            {card.verified && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                مندوب موثق
              </span>
            )}
          </div>

          {/* رقم العضوية بخط ضخم */}
          <div className="mt-5 rounded-2xl bg-card/80 p-4 text-center backdrop-blur">
            <p className="text-[11px] font-bold text-muted-foreground">
              رقم عضوية المندوب
            </p>
            <p
              dir="ltr"
              className="mt-1 font-mono text-2xl font-black tracking-[0.15em] text-primary"
            >
              {card.membership_number ?? "—"}
            </p>
          </div>

          {/* خصائص البطاقة */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
              <p className="text-muted-foreground">المركبة</p>
              <p className="mt-0.5 font-bold text-foreground">
                {VEHICLE_LABELS[card.vehicle_type] ?? card.vehicle_type}
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 px-3 py-2 text-center">
              <p className="text-muted-foreground">إصدار البطاقة</p>
              <p className="mt-0.5 font-bold text-foreground">
                {card.issued_at
                  ? new Date(card.issued_at).toLocaleDateString("ar", {
                      dateStyle: "medium",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          {card.next_review_at && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              المراجعة الدورية القادمة:{" "}
              {new Date(card.next_review_at).toLocaleDateString("ar", {
                dateStyle: "medium",
              })}
            </p>
          )}
        </div>
      </motion.section>

      {/* الإحصاءات */}
      <section aria-label="إنجازاتي" className="grid grid-cols-2 gap-3">
        {[
          {
            icon: Package,
            label: "مهام منجزة",
            value: String(s.completed_tasks ?? 0),
          },
          {
            icon: Banknote,
            label: "أرباحي الكلية",
            value: formatCurrency(s.total_earnings ?? 0),
          },
          {
            icon: LineChart,
            label: "كيلومترات الخدمة",
            value: `${(s.service_km ?? 0).toLocaleString("ar")} كم`,
          },
          {
            icon: CalendarCheck,
            label: "أيام نشطة",
            value: String(s.active_days ?? 0),
          },
          {
            icon: Gauge,
            label: "متوسط سرعة الاستجابة",
            value:
              s.avg_response_seconds != null
                ? `${Math.round(s.avg_response_seconds)} ثانية`
                : "—",
          },
          {
            icon: Timer,
            label: "مستواي",
            value: s.level_ar ?? "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
          >
            <stat.icon
              className="mx-auto h-5 w-5 text-primary"
              aria-hidden="true"
            />
            <p className="mt-2 text-center text-sm font-black text-foreground">
              {stat.value}
            </p>
            <p className="text-center text-[10px] text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* بيانات التواصل (لعرضه هو فقط) */}
      <section
        aria-label="بياناتي"
        className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft"
      >
        <h2 className="mb-3 text-sm font-extrabold text-foreground">بياناتي</h2>
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">الجوال</dt>
            <dd dir="ltr" className="font-bold text-foreground">
              {me.phone ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">البريد</dt>
            <dd dir="ltr" className="truncate font-bold text-foreground">
              {me.email ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">رقم اللوحة</dt>
            <dd dir="ltr" className="font-bold text-foreground">
              {me.vehicle_plate ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* إعداداتي */}
      <Button
        asChild
        variant="outline"
        size="lg"
        className="h-13 w-full gap-2 rounded-2xl native-tap"
      >
        <Link href="/courier/settings" aria-label="فتح الإعدادات">
          <Settings className="h-5 w-5" aria-hidden="true" />
          إعداداتي
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          router.replace("/courier/login");
        }}
        className="mx-auto block text-muted-foreground native-tap"
        aria-label="تسجيل الخروج"
      >
        تسجيل الخروج
      </Button>
    </main>
  );
}
