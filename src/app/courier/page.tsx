"use client";

/**
 * /courier — شاشة «التعريف والانطلاق» لبوابة المندوب (شاشة 1/11).
 * البوابة الرابعة جزيرة مستقلة: تصميم مستقل بجذر /courier.
 * عربية-RTL · زمرد/ذهب (هوية توفير) · موبايل-أولاً.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Bike,
  Camera,
  Clock3,
  LineChart,
  MapPin,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

const FEATURES = [
  {
    icon: Zap,
    title: "نداءات فورية",
    desc: "طلبات توصيل حية تصل جهازك بصوت واهتزاز — أول مندوب يؤكد يفوز",
  },
  {
    icon: Banknote,
    title: "أجرة شفافة بالكيلومتر",
    desc: "تعرف المسافة والأجرة قبل القبول — أرباحك محسوبة بعدالة",
  },
  {
    icon: BadgeCheck,
    title: "شارة «مندوب موثق»",
    desc: "توثيق رسمي من إدارة توفير يظهر للمتاجر ويرفع ثقة العملاء",
  },
  {
    icon: MapPin,
    title: "موقع العميل بنقطة",
    desc: "العميل يثبت مسمار بابه على الخريطة — تصل لموقعه بدقة",
  },
  {
    icon: LineChart,
    title: "ملف إنجازاتك",
    desc: "مهامك، كيلومتراتك، أرباحك، ومستواك — كل شيء موثق باسمك",
  },
  {
    icon: Clock3,
    title: "أوقاتك بيدك",
    desc: "أنت من يفتح توفره ويغلقه — لا أحد يفرض عليك ساعات العمل",
  },
];

const STEPS = [
  { icon: Camera, text: "سجّل بياناتك وارفع مستنداتك بكاميرا جوالك" },
  { icon: ShieldCheck, text: "توثيق سريع من الإدارة (عادة 24–48 ساعة)" },
  { icon: Bike, text: "افتح توفررك واستقبل أول نداء" },
];

export default function CourierIntroPage() {
  return (
    <main
      className="login-page-bg relative min-h-[100dvh] overflow-x-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), var(--cap-safe-top, 0px))",
      }}
    >
      {/* هالات الهوية */}
      <div
        className="login-blob-emerald pointer-events-none absolute -start-28 -top-28 h-80 w-80 rounded-full blur-3xl opacity-60 dark:opacity-100"
        aria-hidden="true"
      />
      <div
        className="login-blob-gold pointer-events-none absolute -end-24 top-1/3 h-72 w-72 rounded-full blur-3xl opacity-60 dark:opacity-100"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-24 pt-8">
        {/* الشعار + الترويسة */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="dark:login-logo-glow">
            <TawfirLogo variant="full" size="lg" href="" />
          </div>
          <h1 className="text-3xl font-black text-foreground">
            بوابة مندوبي <span className="text-primary">توفير</span>
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            انضم لأسطول التوصيل الموثق في منصة توفير — درب دخلك بخريطة
            ذكية، أجرة عادلة، وشرة رسمية
          </p>
        </div>

        {/* بطاقات المزايا */}
        <section aria-label="مزايا الانضمام" className="mt-8 grid grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-soft backdrop-blur"
            >
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-extrabold text-foreground">
                {f.title}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </section>

        {/* خطوات الانطلاق */}
        <section
          aria-label="خطوات الانطلاق"
          className="mt-6 rounded-3xl border border-border/60 bg-card/85 p-5 shadow-soft backdrop-blur"
        >
          <h2 className="mb-4 text-center text-base font-extrabold text-foreground">
            انطلاقتك في ثلاث خطوات
          </h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                  <s.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="flex-1 rounded-2xl bg-muted/60 px-4 py-2.5 text-sm font-medium text-foreground">
                  {s.text}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* أزرار الانطلاق */}
        <div className="mt-7 space-y-3">
          <Button
            asChild
            size="lg"
            className="h-14 w-full rounded-2xl bg-primary text-lg font-black text-primary-foreground native-tap"
          >
            <Link href="/courier/register" aria-label="تسجيل مندوب جديد">
              انطلق الآن — سجّل كمندوب
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-13 w-full rounded-2xl border-primary/30 bg-card/70 text-base font-bold text-foreground native-tap"
          >
            <Link href="/courier/login" aria-label="دخول مندوب مسجل">
              لدي حساب — دخول
            </Link>
          </Button>
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            بالتسجيل أنت توافق على شروط بوابة مندوبي توفير
          </p>
        </div>
      </div>
    </main>
  );
}
