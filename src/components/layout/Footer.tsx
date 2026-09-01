"use client";

import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";

/** بيانات التواصل الحقيقية — مواصفة توفير اليمنية */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";
const CONTACT_ADDRESS = "الجمهورية اليمنية — صنعاء";

const QUICK_LINKS = [
  { label: "الرئيسية", href: "/" },
  { label: "المتاجر", href: "/facilities" },
  { label: "تسجيل العضوية", href: "/register" },
  { label: "حسابي", href: "/account" },
  { label: "تسجيل الدخول", href: "/login" },
  { label: "سياسة الخصوصية", href: "/privacy" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    /* hide-in-standalone: يُخفي الفوتر كلياً عند تشغيل التطبيق مثبّتاً
       (display-mode: standalone) — تجربة Native App */
    <footer
      className="hide-in-standalone mt-auto w-full bg-card"
      role="contentinfo"
    >
      {/* الخط العلوي المتدرج — هوية توفير الزمردية */}
      <div className="gradient-emerald h-1 w-full" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* العمود 1: توفير — قصة البراند + التاغلاين المعتمد */}
          <div className="space-y-4">
            <TawfirLogo variant="lockup_fulltra" size="md" showPill />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              اول منصة يمنية يمنية توصّل بينك وبين أفضل العروض في مدينتك —
              عضوية واحدة، ووفّر على كل طلب بخصم يصل إلى 30%.
            </p>
          </div>

          {/* العمود 2: روابط سريعة */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-foreground">روابط سريعة</h3>
            <ul className="space-y-1">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود 3: تواصل معنا — بيانات حقيقية */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-foreground">تواصل معنا</h3>
            <ul className="space-y-1">
              <li>
                <a
                  href={`tel:${CONTACT_PHONE}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span dir="ltr">{CONTACT_PHONE_DISPLAY}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span dir="ltr">{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li className="flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                <span>{CONTACT_ADDRESS}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* الشريط السفلي — التاغلاين المعتمد */}
        <div className="mt-8 space-y-1.5 border-t pt-6 text-center">
          <p className="text-xs font-bold text-primary">وفّر أكثر.. عِش أجمل</p>
          <p className="text-xs text-muted-foreground">
            جميع الحقوق محفوظة لتوفير {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
