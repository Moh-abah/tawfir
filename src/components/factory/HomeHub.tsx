"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNav, type SectionId } from "@/store/session";
import { TestModeNote } from "./shared/Bits";
import {
  Palette,
  Globe,
  LayoutDashboard,
  MonitorSmartphone,
  Bike,
  Package,
  ArrowLeft,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  Coins,
  Phone,
} from "lucide-react";

const MODULES: {
  id: SectionId;
  code: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  {
    id: "owner-brand",
    code: "A",
    title: "حزمة الهوية — لوحة المنشآت",
    desc: "عرض/تعديل الهوية، رفع الأصول بقيود كل نوع، مؤشر اكتمال لحظي، العملة من الرد",
    icon: Palette,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "admin-sites",
    code: "B",
    title: "مصنع المواقع — الإدارة + المالك",
    desc: "إنشاء/تفعيل مواقع التجار، فحص DNS، معاينة قبل DNS، «موقعي» عند التاجر",
    icon: LayoutDashboard,
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "generated-site",
    code: "B′",
    title: "قالب الموقع المولَّد",
    desc: "resolve → هوية → كتالوج حصراً → سلة → طلب → متابعة حية عبر WebSocket مع عزل كامل",
    icon: Globe,
    tone: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "console",
    code: "C",
    title: "الكونسول المنفصل — /console",
    desc: "صفحة مستقلة تماماً بعزل بصري وتوكني: جاهزية → إصدار تطبيق → خزنة keystore → بناء + ZIP → سجل البصمات",
    icon: MonitorSmartphone,
    tone: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    id: "owner-couriers",
    code: "D",
    title: "مناديب التاجر",
    desc: "إنشاء موثق فوري، إيقاف/تفعيل، «كلّف مندوبي» على مهام النداء، إحصاءات تتراكم",
    icon: Bike,
    tone: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "factory-dev",
    code: "E+F",
    title: "سكربت التعبئة + FCM",
    desc: "apply-factory-manifest.mjs، متغيرات TAWFIR_*، workflow جاهز، تسجيل توكن FCM ببصمة التاجر",
    icon: Package,
    tone: "bg-stone-100 text-stone-700 border-stone-200",
  },
];

const PRINCIPLES = [
  { icon: FlaskConical, text: "وضع الاختبار المطلق: OTP 123456 بلا انتظار — يظهر إشعاره في كل شاشات الدخول" },
  { icon: Coins, text: "العملة من الـAPI حصراً (currency في كل رد) — صفر نص عملة مصمت" },
  { icon: Phone, text: "صيغتا الجوال مقبولتان: 7XXXXXXXX (اليمن) و05XXXXXXXX (السعودية)" },
  { icon: ShieldCheck, text: "عزل التوكن ثنائي الاتجاه مُثبت: كونسول↔إدارة/مالك = 401 بالدليل" },
];

export function HomeHub() {
  const setSection = useNav((s) => s.setSection);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Badge className="mb-3 bg-emerald-700 text-white">مصنع المنصات — مدمج داخل tawfir-front</Badge>
            <h1 className="text-2xl font-extrabold text-stone-900 sm:text-3xl">
              واجهات مصنع «توفير» — من الهوية إلى المتجر إلى التطبيق
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
              الباك إند حي ومثبت رقمياً (openapi.json: <strong>174 مساراً</strong>). كل ما تراه هنا يقرأ من
              <code dir="ltr" className="mx-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs">api.tawfir.giize.com</code>
              مباشرة — لا بيانات مصمتة، لا عملة سوقية ثابتة، والقوالب تتلون بهوية كل تاجر من الردود.
            </p>
          </div>
          <ul className="grid gap-2 text-xs text-stone-600 sm:text-[13px]">
            {PRINCIPLES.map((p, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                <p.icon className="h-4 w-4 shrink-0 text-emerald-700" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5">
          <TestModeNote devCode="123456" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isConsole = m.id === "console";
          return (
            <Card key={m.id} className="flex flex-col transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${m.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    المهمة {m.code}
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-base">{m.title}</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed">{m.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                {isConsole ? (
                  /* الكونسول: رابط إلى صفحته المستقلة /console (عزل بصري وتوكني) */
                  <Button size="sm" className="w-full gap-1.5 bg-violet-700 hover:bg-violet-800">
                    <a href="/console" className="flex w-full items-center justify-center gap-1.5">
                      افتح الكونسول المعزول <ArrowLeft className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setSection(m.id)}
                  >
                    افتح الواجهة <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" /> التسلسل الحرفي لإصدار تطبيق تاجر (من الضغطة الأولى)
        </h2>
        <ol className="mt-3 grid gap-2 text-[13px] text-emerald-900 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "التاجر يكمل هويته 100% في لوحة المنشآت (A)",
            "الإدارة تفعّل موقعه + فحص DNS + معاينة (B)",
            "الموقع المولَّد يفتح على نطاقه بعزل كامل (B′)",
            "الكونسول يصدر التطبيق ببصمة فريدة (C) — من صفحته /console",
            "رفع keystore → إطلاق بناء → تنزيل ZIP (C)",
            "الأسرار TAWFIR_* للمستودع → CI يبني AAB/APK (E)",
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
