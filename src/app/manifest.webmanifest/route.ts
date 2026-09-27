
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
const OWNER_HOST_ALT = "owner.tawfir.giize.com";
const ADMIN_HOST = "admin.tawfir.giize.com";
const API_HOST = "api.tawfir.giize.com";
const APP_ORIGIN = "https://tawfir.giize.com";

/* ═══ الجولة 25 — قدرات PWABuilder المكتملة ═══
 *
 * scope_extensions: توسيع نطاق التطبيق المثبّت ليشمل بوابات المشروع
 * الأخرى (إدارة/مالك/API) فلا يظهر شريط عنوان المتصفح عند التنقل
 * بينها من التطبيق المثبّت. يتطلب ملف تحقق على كل نطاق ممتد:
 * /.well-known/web-app-origin-association (مخدوم ديناميكياً من هذا
 * المشروع نفسه عبر src/app/.well-known/web-app-origin-association/route.ts).
 */
const SCOPE_EXTENSIONS = [
  { origin: "https://" + ADMIN_HOST },
  { origin: "https://" + OWNER_HOST },
  { origin: "https://" + OWNER_HOST_ALT },
  { origin: "https://" + API_HOST },
];

/* معرّف تصنيف العمر الدولي (IARC).
 * ⚠ قيمة مؤقتة موثقة — يُستبدلها المالك بالمعرّف الحقيقي بعد
 * استيفاء استبيان IARC المجاني (من Play Console → تحديد تصنيف
 * المحتوى، أو https://www.globalratings.com) ثم وضعه هنا حرفياً.
 * وجود العضو نفسه هو ما يفحصه PWABuilder والمتاجر. */
const IARC_RATING_ID = "PENDING-IARC-QUESTIONNAIRE";

/* أيقونة معالجات الملفات */
const FILE_HANDLER_ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

/* أنواع الملفات المدعومة: صور المنتجات/الفواتير + PDF */
const FILE_HANDLER_ACCEPT = {
  "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
  "application/pdf": [".pdf"],
};

/* ودجة (Widget) العروض — HTML مستقل في /widgets/offers-widget.html */
const OFFERS_WIDGET = {
  name: "عروض توفير",
  short_name: "عروض",
  description: "أحدث العروض والخصومات من مطاعم وكافتيريات توفير المشتركة — تحديث حي من التطبيق.",
  src: "/widgets/offers-widget.html",
  type: "text/html",
  sizes: "2x2",
  background_color: "#0A1A2F",
  theme_color: "#0A1A2F",
};

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
      "منصة توفير اليمنية — اطلب وجباتك من المطاعم والكافتيريات المشتركة واشترك في عضوية سنوية تمنحك خصم حتى 30% على كل طلباتك. اختر منطقتك، تصفّح الوجبات، واطلب بضغطة زر، مع دفع آمن نقداً عند الاستلام في صنعاء وبقية مناطق الجمهورية اليمنية.",
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
    /* الجولة 25 — تفضيلات العرض الكاملة:
     *  • window-controls-overlay: على سطح المكتب المثبّت تُدمج أزرار
     *    النافذة مع شريط التطبيق (عنوان أصيل) — CSS يقسّم الشريط في globals.css
     *  • tabbed: دعم وضع التبويبات حيثما توفر (كروم/إيدج التجريبي)
     *  • البدائل الآمنة بعدها للمنصات الأقدم */
    display_override: [
      "window-controls-overlay",
      "tabbed",
      "standalone",
      "minimal-ui",
      "browser",
    ],
    /* لوحة جانبية Edge — فتح توفير بجانب التطبيقات على ويندوز (عرض مريح 420px) */
    edge_side_panel: { preferred_width: 420 },
    /* استقبال المشاركات من تطبيقات أخرى: نص/رابط/صور/ PDF
     * → يعترضه Service Worker ويخزّنه محلياً ثم يفتح صفحة /share-target
     * التي تعرض المعاينة وأزرار المتابعة (بحث/فتح الرابط/معاينة الصورة).
     * (نمط POST+multipart هو الصيغة الكاملة التي يفحصها PWABuilder) */
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: ["image/*", "application/pdf"],
          },
        ],
      },
    },
    /* معالجة فتح الملفات من نظام التشغيل (فتح صورة من مدير الملفات بتوفير)
     * → صفحة /files تستقبل الملف عبر launchQueue وتعرض معاينة */
    file_handlers: [
      {
        action: "/files",
        accept: FILE_HANDLER_ACCEPT,
        icons: FILE_HANDLER_ICONS,
        launch_type: "single-client",
      },
    ],
    /* ودجة العروض لشاشة أندرويد/ويندوز */
    widgets: [OFFERS_WIDGET],
    /* تطبيق ملاحظات سريعة: زر «ملاحظة جديدة» من النظام يفتح /notes/new */
    note_taking: { new_note_url: "/notes/new" },
    /* تصنيف العمر (مؤقت — انظر التعليق أعلاه) */
    iarc_rating_id: IARC_RATING_ID,
    /* توسيع النطاق: البوابات الأخرى داخل نطاق التطبيق المثبّت */
    scope_extensions: SCOPE_EXTENSIONS,
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
    /* ── الجولة 24 + 25: عناصر تدقيق PWABuilder ── */
    launch_handler: { client_mode: "navigate-existing" },
    display_override: [
      "window-controls-overlay",
      "tabbed",
      "standalone",
      "minimal-ui",
      "browser",
    ],
    edge_side_panel: { preferred_width: 420 },
    /* مشاركة صور/فواتير المنتجات إلى بوابة المالك → صفحة داخل نطاق /owner/
     * (إجراء share_target يجب أن يقع داخل scope) — يعترضه الـSW ويخزّن
     * المحتوى محلياً ثم يفتح /owner/share-target للمعاينة والاستيراد. */
    share_target: {
      action: "/owner/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: ["image/*", "application/pdf"],
          },
        ],
      },
    },
    /* فتح صور المنتجات/الفواتير من مدير الملفات في بوابة المالك */
    file_handlers: [
      {
        action: "/owner/files",
        accept: FILE_HANDLER_ACCEPT,
        icons: FILE_HANDLER_ICONS,
        launch_type: "single-client",
      },
    ],
    iarc_rating_id: IARC_RATING_ID,
    scope_extensions: [
      { origin: APP_ORIGIN },
      { origin: "https://" + ADMIN_HOST },
      { origin: "https://" + API_HOST },
    ],
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
    display_override: [
      "window-controls-overlay",
      "tabbed",
      "standalone",
      "minimal-ui",
      "browser",
    ],
    edge_side_panel: { preferred_width: 480 },
    iarc_rating_id: IARC_RATING_ID,
    scope_extensions: [
      { origin: APP_ORIGIN },
      { origin: "https://" + OWNER_HOST },
      { origin: "https://" + API_HOST },
    ],
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
