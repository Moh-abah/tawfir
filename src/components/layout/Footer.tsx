"use client";

import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { useLang } from "@/lib/i18n";

/** بيانات التواصل الحقيقية — مواصفة توفير اليمنية */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";

const QUICK_LINKS = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.facilities", href: "/facilities" },
  { labelKey: "profile.footer.linkRegister", href: "/register" },
  { labelKey: "nav.account", href: "/account" },
  { labelKey: "auth.login.cta", href: "/login" },
  { labelKey: "profile.footer.linkPrivacy", href: "/privacy" },
] as const;

export function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    /* hide-in-standalone: يُخفي الفوتر كلياً عند تشغيل التطبيق مثبّتاً
       (display-mode: standalone — PWA) أو داخل غلاف Capacitor الأصلي
       (html[data-native] — APK) — مظهر Native خالص: لا «أسفل تمرير»
       ويب، الشاشة تنتهي بالمحتوى وشريط التنقل السفلي فقط. */
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
              {t("profile.footer.about")}
            </p>
          </div>

          {/* العمود 2: روابط سريعة */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-foreground">{t("profile.footer.quickLinks")}</h3>
            <ul className="space-y-1">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود 3: تواصل معنا — بيانات حقيقية */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-foreground">{t("profile.contact.title")}</h3>
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
                <span>{t("profile.contact.addressValue")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* الشريط السفلي — التاغلاين المعتمد */}
        <div className="mt-8 space-y-1.5 border-t pt-6 text-center">
          <p className="text-xs font-bold text-primary">{t("profile.card.tagline")}</p>
          <p className="text-xs text-muted-foreground">
            {t("profile.footer.rights", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
