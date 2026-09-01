"use client";

import { useState } from "react";
import {
  CircleHelp,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DELIVERY_FEE, DISCOUNT_RATE } from "@/lib/site-config";

/**
 * قسم «الأسئلة الشائعة» + «تواصل معنا» — الجولة 9 (المهمة 1)
 *
 * نُقلا من الصفحة الرئيسية إلى /account (أسفل الشاشة بعد بطاقة العضوية/الاشتراك
 * وقسم الأمان وقسم الأصوات).
 *
 * البيانات (حقيقية حصراً):
 *  - الهاتف: 780090882
 *  - البريد: moohabhb68@gmail.com
 *  - العنوان: الجمهورية اليمنية — صنعاء
 */

/* ─── الأسئلة الشائعة (محدّثة لنظام العضوية اليدوي) ──────────────────── */
const FAQ_ITEMS = [
  {
    q: "ما هي منصة توفير؟",
    a: `منصة توفير تتيح لك طلب وجباتك من المطاعم والكافيهات المشتركة، مع إمكانية الاشتراك في عضوية سنوية تمنحك خصم ${DISCOUNT_RATE}% على كل طلباتك.`,
  },
  {
    q: "كيف أشترك في العضوية؟",
    a: "بعد تسجيل حساب جديد، ارفع صورة تحويل بقيمة 3000 ر.ي إلى حساب توفير (محمد يحيى عبه، حساب رقم 780090882، محفظة جيب) من صفحة حسابي. سيُراجع المشرف طلبك خلال 24-48 ساعة.",
  },
  {
    q: `كم نسبة الخصم؟`,
    a: `خصم ${DISCOUNT_RATE}% على كل طلباتك من المطاعم والكافيهات المشتركة طوال فترة عضويتك السنوية. يُطبّق الخصم تلقائياً عند الطلب إن كانت عضويتك مفعّلة.`,
  },
  {
    q: "هل يمكنني الطلب بدون عضوية؟",
    a: "نعم، يمكنك تصفّح الوجبات والطلب بدون عضوية بسعر رسمي بلا خصم. للاستفادة من خصم حتى 30% اشترك في عضوية توفير.",
  },
  {
    q: "متى تُفعّل عضويتي؟",
    a: "بعد رفع صورة التحويل، يراجع المشرف طلبك خلال 24-48 ساعة. تُفعّل العضوية فور الموافقة وتظهر بطاقتك في حسابك تلقائياً.",
  },
  {
    q: `كم تكلفة التوصيل؟`,
    a: `رسوم توصيل ثابتة قدرها ${DELIVERY_FEE} ر.ي لكل طلب، تُضاف لإجمالي الطلب عند تأكيده.`,
  },
  {
    q: "كيف أتحكم في بياناتي؟",
    a: "اضغط أيقونة المستخدم أعلى الشاشة لفتح حسابك وعدّل بياناتك (الاسم، الجوال) مباشرة. البريد الإلكتروني ثابت ولا يمكن تغييره.",
  },
] as const;

/* ─── تواصل معنا — بيانات حقيقية حصراً ─────────────────────────────── */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";
const CONTACT_ADDRESS = "الجمهورية اليمنية — صنعاء";

/**
 * قسم FAQ + Contact كاملاً — يُعرض في أسفل /account.
 */
export function AccountFaqContactSection() {
  // للتحكم في أكورديون الـ FAQ (سؤال واحد مفتوح في كل مرة)
  const [openFaq, setOpenFaq] = useState<string | undefined>();

  return (
    <div className="space-y-8">
      {/* الأسئلة الشائعة */}
      <section className="space-y-6" aria-label="الأسئلة الشائعة">
        <div className="flex items-center gap-2">
          <CircleHelp className="h-5 w-5 text-secondary" aria-hidden="true" />
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
            الأسئلة الشائعة
          </h2>
        </div>
        <div className="max-w-2xl">
          <Accordion
            type="single"
            collapsible
            value={openFaq}
            onValueChange={setOpenFaq}
            className="rounded-2xl border bg-card"
          >
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="px-4 sm:px-6"
              >
                <AccordionTrigger className="min-h-[44px] text-right text-sm font-bold text-foreground hover:no-underline sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* تواصل معنا */}
      <section className="space-y-6" aria-label="تواصل معنا">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-secondary" aria-hidden="true" />
          <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
            تواصل معنا
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-soft-lg">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <Phone className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">الهاتف</p>
              <a
                href={`tel:${CONTACT_PHONE}`}
                dir="ltr"
                data-selectable="true"
                title={CONTACT_PHONE}
                className="mt-0.5 block truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
            <a
              href={CONTACT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="تواصل معنا عبر واتساب"
              className="native-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </a>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="native-tap flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-soft-lg"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                البريد الإلكتروني
              </p>
              <p
                dir="ltr"
                data-selectable="true"
                title={CONTACT_EMAIL}
                className="mt-0.5 truncate text-left text-sm text-muted-foreground"
              >
                {CONTACT_EMAIL}
              </p>
            </div>
          </a>

          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-soft-lg">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cat-restaurant-soft">
              <MapPin
                className="h-5 w-5 text-cat-restaurant"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">العنوان</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {CONTACT_ADDRESS}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-all duration-200 hover:shadow-soft-lg">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cat-cafe-soft">
              <MapPinned
                className="h-5 w-5 text-cat-cafe"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">منطقة الخدمة</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                جميع مناطق الجمهورية اليمنية
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
