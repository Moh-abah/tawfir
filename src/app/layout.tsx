import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { BOOT_LOGO_SRC } from "@/lib/pwa/boot-logo";

const cairo = localFont({
  src: [
    {
      path: "../../public/fonts/Cairo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/Cairo-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-cairo",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMono-Regular.ttf",
  variable: "--font-geist-mono",
  display: "swap",
});

/**
 * الميتا الافتراضية هنا لتطبيق «العميل» (tawfir.giize.com وlocalhost).
 * بوابة المالك تتجاوزها عبر metadata في:
 *   - src/app/owner/layout.tsx            (صفحة /owner/login)
 *   - src/app/(owner)/owner/layout.tsx    (صفحات البوابة المحمية)
 *
 * الترويسات المغروسة:
 *  • manifest: /manifest.webmanifest (ديناميكي حسب Host)
 *  • appleWebApp: capable + statusBarStyle default + title «توفير»
 *  • apple-touch-icon: /icons/apple-touch-icon.png
 *  • apple-touch-startup-image (splash): يُحقنها (public)/layout.tsx
 *    للأحجام المختلفة — تظهر عند إطلاق التطبيق المثبت على iPhone/iPad
 *  • theme-color: #0A1A2F (الزمردي — هوية توفير)
 */
export const metadata: Metadata = {
  // الجولة 21 — metadataBase + canonical لمنع المحتوى المكرر في Google
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tawfir.giize.com",
  ),
  alternates: {
    canonical: "/",
  },
  title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
  description:
    "منصة توفير اليمنية — تصفّح الوجبات اليمنية من المطاعم والمقاهي واطلبها، واشترك في عضوية الخصم حتى 30%. اختر منطقتك واستمتع بالعروض الحصرية.",
  keywords: ["توفير", "Tawfir", "طلب وجبات", "وجبات يمنية", "مندي", "خصم حتى 30%", "مطاعم", "مقاهي", "اليمن", "عضوية"],
  authors: [{ name: "توفير" }],
  manifest: "/manifest.webmanifest",
  applicationName: "توفير",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "توفير",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  /* الجولة 16 — معاينة اجتماعية عند مشاركة الروابط في واتساب/تيليجرام:
     بطاقة ملخّص كبيرة بصورة الغلاف الاجتماعي المعتمدة من الهوية + وصف مختصر */
  openGraph: {
    type: "website",
    locale: "ar_YE",
    siteName: "توفير",
    title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
    description:
      "تطبيق توفير — اطلب أشهى الوجبات اليمنية من مطاعم ومقاهي مدينتك، ووفّر حتى 30% على كل طلب مع عضوية توفير.",
    images: [
      {
        url: "/identity/tawfir-social-cover.png",
        width: 2560,
        height: 1440,
        alt: "توفير — تطبيق طلب الوجبات اليمنية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "توفير | طلب الوجبات اليمنية وخصم حتى 30% للعضوية",
    description:
      "تطبيق توفير — اطلب أشهى الوجبات اليمنية من مطاعم ومقاهي مدينتك، ووفّر حتى 30% على كل طلب مع عضوية توفير.",
    images: ["/identity/tawfir-social-cover.png"],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "theme-color": "#0A1A2F",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* الجولة 22 — سلوك Native: تعطيل التقريب بإصبعين + زووم النقر المزدوج
     على الجوال (viewport meta يعمل على أندرويد؛ iOS يُكمل بمنع
     gesturestart في NativeBridge — كلاهما معاً يغطي كل المتصفحات). */
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A1A2F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/*
          الجولة 16 — إصلاح CLS (0.08): البانر الترحيبي يُرسم في SSR دائماً،
          ثم يُزال بعد الترطيب للمسجّلين/الرافضين → إزاحة محتوى عند كل تحميل.
          هذا السكربت يعمل قبل أول طلاء (قبل رسم أي بكسل): يقرأ كوكي الجلسة
          وعلم الرفض ويضيف data-wb-hide على <html> — فيخفيه CSS فوراً
          فيبقى التخطيط ثابتاً قبل وبعد الترطيب (نمط منع وميض الثيم نفسه).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(document.cookie.split('; ').some(function(c){return c.indexOf('tawfir_customer_token=')===0})||sessionStorage.getItem('tawfir_welcome_dismissed')!==null){d.setAttribute('data-wb-hide','')}}catch(e){}`,
          }}
        />
        {/* الجولة 22/23 — منع وميض الثيم (Theme no-flash): يقرأ اختيار
            المستخدم من localStorage ويضيف class="dark" قبل أول طلاء.
            الجولة 23: بلا اختيار مخزّن ← يتبع وضع النظام
            (prefers-color-scheme) — فشاشة الإقلاع والتطبيق كلاهما
            يطابق وضع الجهاز مثل التطبيقات الأصلية تماماً.
            يحدّث أيضاً <meta name="theme-color"> ليطابق شريط المتصفح/النظام
            لون الوضع الحالي (فاتح = فاتح، داكن = كحلي الهوية). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=window.localStorage.getItem('tawfir-theme');var dk=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dk){document.documentElement.classList.add('dark')}var m=document.querySelector('meta[name=theme-color]');if(m){m.setAttribute('content',dk?'#0A1A2F':'#F7F7F7')}}catch(e){}`,
          }}
        />
        {/* الجولة 21 — structured data schema.org/WebSite للـSEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "توفير",
              alternateName: "Tawfir",
              url: "https://tawfir.giize.com",
              description:
                "منصة يمنية للخصومات على الوجبات — خصم حتى 30% للأعضاء في المطاعم والكافيهات المشتركة",
              inLanguage: "ar",
              publisher: {
                "@type": "Organization",
                name: "توفير",
                url: "https://tawfir.giize.com",
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://tawfir.giize.com/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>

      <body
        className={`${cairo.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* ═══ شاشة إقلاع Native (الجولة 22 + ثنائية الثيم بالجولة 23) ═══
            تُرسم في HTML الأولي (قبل أي JS/شبكة) فتغطي الوميض الأبيض
            وتحاكي سبلاش التطبيقات الأصلية: شعار توفير المفرغ الرسمي
            (mark.png كـ data URI — يُرسم فوراً بلا طلب شبكة) + نقاط تحميل.
            الجولة 23: خلفية ثنائية الثيم تتبع وضع النظام/التطبيق —
            فاتح = خلفية فاتحة بهالات زمرد/ذهب، داكن = كحلي الهوية —
            منسجمة مع الوضع الحالي بدل داكن فقط (مطلب Native).
            سكربت no-flash أعلاه يضبط class=dark قبل طلاء السبلاش
            فتُرسم الخلفية الصحيحة من أول بكسل — بلا وميض.
            BootSplash (داخل Providers) يخفيها بعد جهوزية التطبيق بمدة
            دنيا ~750ms + تلاشي ناعم. سكربت احتياطي inline يخفيها بعد 5s
            مهما حدث (JS معطّل/خطأ). */}
        <div id="tawfir-boot" aria-hidden="true">
          <img
            src={BOOT_LOGO_SRC}
            alt=""
            width={256}
            height={256}
            draggable={false}
            className="tawfir-boot-logo"
          />
          <div className="tawfir-boot-dots">
            <span
              style={{
                animation: "tawfir-boot-bounce 1.1s infinite",
                animationDelay: "-0.32s",
              }}
            />
            <span
              style={{
                animation: "tawfir-boot-bounce 1.1s infinite",
                animationDelay: "-0.16s",
              }}
            />
            <span style={{ animation: "tawfir-boot-bounce 1.1s infinite" }} />
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
@keyframes tawfir-boot-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.06);opacity:.92}}
@keyframes tawfir-boot-bounce{0%,80%,100%{transform:translateY(0);opacity:.65}40%{transform:translateY(-9px);opacity:1}}
/* ── شاشة الإقلاع — تخطيط ── */
#tawfir-boot{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;transition:opacity 320ms ease}
#tawfir-boot .tawfir-boot-logo{width:92px;height:92px;object-fit:contain;user-select:none;-webkit-user-drag:none;animation:tawfir-boot-pulse 1.6s ease-in-out infinite}
#tawfir-boot .tawfir-boot-dots{display:flex;gap:8px}
#tawfir-boot .tawfir-boot-dots span{width:9px;height:9px;border-radius:999px;background:#0E7D62}
#tawfir-boot .tawfir-boot-dots span:nth-child(2){background:#D4AF37}
/* ── فاتح (الوضع الافتراضي): خلفية فاتحة بهالات زمرد/ذهب ناعمة
   (نفس لغة login-page-bg الفاتحة) — الشعار المفرغ بظل ناعم خفيف */
#tawfir-boot{background-color:#F7F7F7;background-image:radial-gradient(circle at 85% 12%,rgba(14,125,98,0.10),transparent 42%),radial-gradient(circle at 12% 88%,rgba(212,175,55,0.13),transparent 42%),linear-gradient(135deg,#FAFAF8 0%,#F0F3F0 100%);color:#0A1A2F}
#tawfir-boot .tawfir-boot-logo{filter:drop-shadow(0 6px 18px rgba(10,26,47,0.16))}
/* ── داكن: كحلي الهوية العميق (نفس تدرّج الجولة 22) + توهج للشعار */
html.dark #tawfir-boot{background-color:#071426;background-image:radial-gradient(circle at 85% 12%,rgba(16,185,129,0.10),transparent 45%),radial-gradient(circle at 12% 88%,rgba(212,175,55,0.08),transparent 45%),linear-gradient(135deg,#071426 0%,#0A1A2F 32%,#0C2C36 55%,#0A1A2F 78%,#071426 100%);color:#fff}
html.dark #tawfir-boot .tawfir-boot-logo{filter:drop-shadow(0 6px 22px rgba(0,0,0,0.45))}
/* إخفاء بلا إزالة: العنصر جزء من شجرة React (SSR) — إزالته من DOM
   يدوياً تكسر ربط React (insertBefore على عقدة غائبة = خطأ عند
   التنقل). لذا نخفيه فقط ويبقى في الشجرة بلا أي تكلفة. */
.tawfir-boot-hide{opacity:0 !important;pointer-events:none !important}
.tawfir-boot-hidden{display:none !important}
`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            /* احتياط: إخفاء السبلاش بعد 5 ثوانٍ حتى لو فشل React/JS
               (إخفاء فقط — لا إزالة — للحفاظ على شجرة React سليمة) */
            __html: `try{setTimeout(function(){var b=document.getElementById('tawfir-boot');if(b){b.classList.add('tawfir-boot-hide');setTimeout(function(){b.classList.add('tawfir-boot-hidden')},400)}},5000)}catch(e){}`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
