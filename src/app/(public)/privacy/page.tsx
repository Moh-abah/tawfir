import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Database,
  Ban,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  Truck,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | توفير",
  description:
    "سياسة خصوصية منصة توفير — البيانات المجموعة وهدفها، وعدم مشاركتها مع أطراف ثالثة، وآلية حذفها.",
};

/** بيانات التواصل الحقيقية — مواصفة توفير اليمنية */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";

interface Section {
  icon: LucideIcon;
  title: string;
  points: readonly string[];
}

/**
 * صفحة سياسة الخصوصية — إلزامية لقبول Google Play.
 * مكوّن Server بسيط بالهوية، يعمل على نطاقي العميل والمالك.
 */
export default function PrivacyPage() {
  const sections: ReadonlyArray<Section> = [
    {
      icon: Database,
      title: "البيانات التي نجمعها",
      points: [
        "الاسم الكامل — لعرضه في حسابك وبطاقة عضويتك الرقمية.",
        "البريد الإلكتروني — معرّفاً لحسابك ووسيلة تواصل أساسية.",
        "رقم الجوال — للتحقق من هويتك والتواصل بشأن عضويتك.",
        "رقم العضوية وتاريخ انتهائها — لإدارة استحقاقك للخصومات لدى المنشآت المشتركة (بعد موافقتك على الاشتراك).",
      ],
    },
    {
      icon: ShieldCheck,
      title: "الهدف من جمع البيانات",
      points: [
        "إنشاء وإدارة حسابك وعضويتك في منصة توفير.",
        "إتاحة عرض بطاقة الخصم الرقمية الخاصة بك عند الاستخدام.",
        "تشغيل الخدمة الأساسية: عرض المنشآت والمنتجات والعروض المشتركة.",
      ],
    },
    {
      icon: Truck,
      title: "معلومات الطلبات والتوصيل",
      points: [
        "عنوان التوصيل ومعلومات الموقع تُستخدَم حصراً لأغراض تجهيز وتوصيل طلباتك من المطاعم والمقاهي.",
        "لا تُستخدم بيانات الموقع لأي غرض تسويقي أو تتبع دائم.",
        "يُحتفظ بسجل طلباتك في حسابك لمتابعة حالتها ومراجعتها فقط.",
      ],
    },
    {
      icon: ImageIcon,
      title: "صور تحويل العضوية",
      points: [
        "تُرفع صورة إيصال التحويل لاشتراك العضوية بهدف التحقق اليدوي من الدفع.",
        "تُحفظ الصورة مؤقتاً للمراجعة حتى يتم قبول طلب الاشتراك أو رفضه.",
        "تُحذف صورة الإيصال تلقائياً بعد الموافقة على الطلب — لا تُستخدم لأي غرض آخر.",
      ],
    },
    {
      icon: Ban,
      title: "عدم المشاركة مع أطراف ثالثة",
      points: [
        "لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض تسويقية أو إعلانية.",
        "تُستخدم بياناتك حصراً لتشغيل خدمة توفير كما هو موصوف في هذه السياسة.",
      ],
    },
    {
      icon: Trash2,
      title: "حذف بياناتك",
      points: [
        "يحق لك طلب حذف بياناتك وحسابك نهائياً في أي وقت.",
        "يتم الحذف عبر التواصل المباشر معنا بالهاتف أو البريد أو واتساب الموضحة أدناه، أو عبر صفحة التواصل.",
        "في حال وجود طلبات قائمة قيد التجهيز، تُكمل بياناتها اللازمة للتوصيل حتى انتهاء الطلب ثم تُحذف.",
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {/* ترويسة بالهوية */}
      <header className="gradient-ocean relative overflow-hidden rounded-2xl">
        <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-10 text-center">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <TawfirLogo className="h-12 w-auto" onDark />
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            سياسة الخصوصية
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/80">
            خصوصيتك أمانة — هذه السياسة تشرح بشفافية البيانات التي نجمعها في
            منصة توفير، ولماذا، وكيف تتحكم بها بالكامل.
          </p>
        </div>
      </header>

      {/* الأقسام */}
      <div className="mt-6 space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft"
              aria-label={section.title}
            >
              <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                {section.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* التواصل */}
        <section
          className="rounded-2xl border border-border/50 bg-card p-6 shadow-soft"
          aria-label="التواصل بشأن الخصوصية"
        >
          <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <Phone className="h-5 w-5 text-accent" aria-hidden="true" />
            </span>
            للطلب أو الاستفسار
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            لطلب حذف بياناتك أو أي استفسار يتعلق بالخصوصية، تواصل معنا
            مباشرة عبر إحدى الوسائل التالية أو عبر{" "}
            <Link
              href="/#contact"
              className="font-bold text-primary hover:underline"
            >
              صفحة التواصل
            </Link>
            :
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
            >
              <Phone
                className="h-4 w-4 shrink-0 text-secondary"
                aria-hidden="true"
              />
              <span dir="ltr" className="text-sm font-medium text-foreground">
                {CONTACT_PHONE_DISPLAY}
              </span>
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
            >
              <Mail
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span
                dir="ltr"
                className="truncate text-sm font-medium text-foreground"
              >
                {CONTACT_EMAIL}
              </span>
            </a>
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted"
            >
              <MessageCircle
                className="h-4 w-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground">واتساب</span>
            </a>
          </div>
        </section>

        <p className="pb-6 text-center text-xs leading-relaxed text-muted-foreground">
          آخر تحديث لهذه السياسة: الإصدار الأول من تطبيق توفير
        </p>
      </div>
    </div>
  );
}
