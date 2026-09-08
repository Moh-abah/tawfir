
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * الـ Manifest الديناميكي لتطبيقي «توفير» — تطبيقان من مشروع واحد حسب الـ Host.
 *
 *  • tawfir.giize.com (أو localhost/أي Host آخر) → تطبيق العميل
 *      name: «توفير — بطاقة الخصومات»
 *      short_name: «توفير»
 *      start_url: «/» — scope: «/»
 *      theme_color: #0A1A2F (زمردي) — أيقونات العميل
 *      shortcuts: الرئيسية / المتاجر / حسابي
 *
 *  • facility.tawfir.giize.com → تطبيق المالك
 *      name: «توفير — بوابة المتاجر»
 *      short_name: «توفير مالك»
 *      start_url: «/owner/login» — scope: «/owner/»
 *      theme_color: #0A1A2F (زمردي عميق) — أيقونات المالك
 *
 * يمكن أيضاً تمرير ?app=owner أو ?app=customer لفرض التطبيق
 * (يستخدمه layout بوابة المالك على localhost حتى تُختبر بيئة المالك
 *  من نفس الأصل: localhost:3000/owner/login → manifest المالك).
 *
 * ترويسات:
 *  • Content-Type: application/manifest+json
 *  • Cache-Control: no-cache, no-store, must-revalidate
 */
const OWNER_HOST = "facility.tawfir.giize.com";
const ADMIN_HOST = "admin.tawfir.giize.com";

interface ScreenshotSpec {
  src: string;
  label: string;
  /** أبعاد الصورة الفعلية — إلزامية ومطابقة حرفياً */
  sizes: string;
  /** narrow = هاتف/لوحي عمودي · wide = سطح مكتب */
  formFactor: "narrow" | "wide";
}

/*
 * الجولة 24 — لقطات حقيقية ملتقطة من التطبيق الحي:
 *  • موبايل (Pixel 9): 1080×2400 — التخطيط الهاتفي الأصيل (عمودان + BottomNav)
 *  • سطح مكتب: 1920×1080 — form_factor: wide (شرط PWABuilder/كروم)
 *  • الثلاث المولّدة فنياً سابقاً (بطاقة العضوية + شاشتا المالك — تحتاجان
 *    دخولاً): 1080×1920 كما ولّدها optimize-assets
 */
const CUSTOMER_SCREENSHOTS: ScreenshotSpec[] = [
  { src: "/screenshots/customer-home.png", label: "الرئيسية — عروض مميزة لك", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/customer-card.png", label: "بطاقة العضوية الرقمية", sizes: "1080x1920", formFactor: "narrow" },
  { src: "/screenshots/customer-facility.png", label: "صفحة المتجر ومنتجاتها", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/customer-offers.png", label: "العروض الخاصة بخصومات حية", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/customer-search.png", label: "البحث الفوري في الوجبات", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/customer-home-dark.png", label: "الوضع الليلي — ثنائية الثيم", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/desktop-home.png", label: "الرئيسية على سطح المكتب", sizes: "1920x1080", formFactor: "wide" },
  { src: "/screenshots/desktop-facility.png", label: "صفحة المتجر على الشاشة الواسعة", sizes: "1920x1080", formFactor: "wide" },
  { src: "/screenshots/desktop-offers.png", label: "العروض على سطح المكتب", sizes: "1920x1080", formFactor: "wide" },
  { src: "/screenshots/desktop-search.png", label: "البحث على سطح المكتب", sizes: "1920x1080", formFactor: "wide" },
];

const OWNER_SCREENSHOTS: ScreenshotSpec[] = [
  { src: "/screenshots/owner-login.png", label: "تسجيل دخول بوابة المتاجر", sizes: "1080x2400", formFactor: "narrow" },
  { src: "/screenshots/owner-products.png", label: "إدارة منتجات المتجر", sizes: "1080x1920", formFactor: "narrow" },
  { src: "/screenshots/owner-import.png", label: "استيراد المنتجات", sizes: "1080x1920", formFactor: "narrow" },
];

function screenshots(list: ScreenshotSpec[]) {
  return list.map((shot) => ({
    src: shot.src,
    sizes: shot.sizes,
    type: "image/png",
    form_factor: shot.formFactor,
    label: shot.label,
  }));
}

/**
 * Manifest تطبيق العميل — بطاقة الخصومات.
 * description سطران تسويقية + shortcuts [الرئيسية / المتاجر / حسابي].
 */
function customerManifest() {
  return {
    id: "/",
    name: "توفير — بطاقة الخصومات",
    short_name: "توفير",
    description:
      "منصة توفير اليمنية — اطلب وجباتك من المطاعم والمقاهي المشتركة واشترك في عضوية سنوية تمنحك خصم حتى 30% على كل طلباتك. اختر منطقتك، تصفّح الوجبات، واطلب بضغطة زر، مع دفع آمن نقداً عند الاستلام في صنعاء وبقية مناطق الجمهورية اليمنية.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    theme_color: "#0A1A2F",
    background_color: "#F7F7F7",
    categories: ["shopping", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      /* إصلاح أيقونة شريط الحالة (أندرويد API 21+): أيقونة أحادية
         بيضاء بخلفية شفافة — يستخدمها كروم/الـWebAPK للأيقونة
         الصغيرة للإشعارات بجوار الساعة والبطارية. بدونها يُشتق
         كروم صورة قص من أيقونة المشغل المعتمة ← مربع أبيض صلب. */
      {
        src: "/identity/notification_icon_white_96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "monochrome",
      },
      {
        src: "/identity/notification_icon_white_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    screenshots: screenshots(CUSTOMER_SCREENSHOTS),
    /* ── الجولة 24: عناصر تدقيق PWABuilder (علامات أعلى) ── */
    /* نافذة واحدة: الإطلاق الجديد يركّز/يتنقل في النسخة المفتوحة (single-instance) */
    launch_handler: { client_mode: "navigate-existing" },
    /* تفضيلات العرض: standalone أولاً ثم بدائل آمنة */
    display_override: ["standalone", "minimal-ui", "browser"],
    /* استقبال مشاركة النص من تطبيقات أخرى → يفتح البحث مباشرة (ميزة حقيقية) */
    share_target: {
      action: "/search",
      method: "GET",
      params: { text: "text" },
    },
    /* بروتوكول مخصص: روابط web+tawfir://… تفتح في البحث */
    protocol_handlers: [
      {
        protocol: "web+tawfir",
        url: "/search?q=%s",
      },
    ],
    /* التطبيقات الأصلية المرتبطة على Play (تحديثهما بعد أول نشر) */
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=com.tawfir.ye.app",
        id: "com.tawfir.ye.app",
      },
    ],
    shortcuts: [
      {
        name: "الرئيسية",
        short_name: "الرئيسية",
        url: "/",
        icons: [{ src: "/icons/shortcut-home.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "المتاجر",
        short_name: "المتاجر",
        url: "/facilities",
        icons: [{ src: "/icons/shortcut-stores.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "طلباتي",
        short_name: "طلباتي",
        description: "تابع حالة طلباتك الحالية والسابقة",
        url: "/orders",
        icons: [{ src: "/icons/shortcut-orders.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "حسابي",
        short_name: "حسابي",
        url: "/account",
        icons: [{ src: "/icons/shortcut-account.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}

/**
 * Manifest تطبيق المالك — بوابة المتاجر.
 * scope «/owner/» + start_url «/owner/login» + أيقونات owner-*
 */
function ownerManifest() {
  return {
    id: "/owner/login",
    name: "توفير — بوابة المتاجر",
    short_name: "توفير مالك",
    description:
      "بوابة أصحاب المتاجر في منصة توفير: أدر متجرك ومنتجاتك وعروضك من جوالك، واستورد قوائمك بضغطة واحدة، وتابع كل شيء لحظة بلحظة أينما كنت. تطبيقك الرسمي لإدارة مشاركتك في بطاقة توفير.",
    start_url: "/owner/login",
    scope: "/owner/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    theme_color: "#0A1A2F",
    background_color: "#F7F7F7",
    categories: ["shopping", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/owner-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/owner-icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/owner-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/owner-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      /* نفس إصلاح أيقونة شريط الحالة — أحادية بيضاء/شفافة للمالك */
      {
        src: "/identity/notification_icon_white_96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "monochrome",
      },
      {
        src: "/identity/notification_icon_white_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    screenshots: screenshots(OWNER_SCREENSHOTS),
    /* ── الجولة 24: عناصر تدقيق PWABuilder (نفس نمط العميل) ── */
    launch_handler: { client_mode: "navigate-existing" },
    display_override: ["standalone", "minimal-ui", "browser"],
    /* استقبال نص مشارك → يفتح في بوابة المالك مركزاً على شاشة الدخول */
    share_target: {
      action: "/owner/login",
      method: "GET",
      params: { text: "text" },
    },
    related_applications: [
      {
        platform: "play",
        url: "https://play.google.com/store/apps/details?id=com.tawfir.ye.owner",
        id: "com.tawfir.ye.owner",
      },
    ],
  };
}

/**
 * Manifest لوحة الإدارة — إصلاح هوية بوابة الأدمن (كانت ترث
 * manifest تطبيق العميل): scope «/admin/» + start_url «/admin»
 * + نفس أيقونات العميل + monochrome للإشعارات.
 */
function adminManifest() {
  return {
    id: "/admin",
    name: "توفير — لوحة الإدارة",
    short_name: "توفير أدمن",
    description:
      "لوحة إدارة منصة توفير — إدارة المستخدمين والمتاجر والطلبات والبطاقات وطلبات العضوية والمناطق وسجلات التدقيق.",
    start_url: "/admin",
    scope: "/admin/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    theme_color: "#0A1A2F",
    background_color: "#F7F7F7",
    categories: ["shopping", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/identity/notification_icon_white_96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "monochrome",
      },
      {
        src: "/identity/notification_icon_white_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    launch_handler: { client_mode: "navigate-existing" },
    display_override: ["standalone", "minimal-ui", "browser"],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const appOverride = searchParams.get("app");
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).split(":")[0];

  let isOwner: boolean;
  let isAdmin = false;
  if (appOverride === "owner") {
    isOwner = true;
  } else if (appOverride === "customer") {
    isOwner = false;
  } else if (appOverride === "admin") {
    isOwner = false;
    isAdmin = true;
  } else {
    isAdmin = host === ADMIN_HOST;
    isOwner = host === OWNER_HOST;
  }

  const manifest = isAdmin
    ? adminManifest()
    : isOwner
      ? ownerManifest()
      : customerManifest();

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
