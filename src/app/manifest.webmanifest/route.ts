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

interface ScreenshotSpec {
  src: string;
  label: string;
}

const CUSTOMER_SCREENSHOTS: ScreenshotSpec[] = [
  { src: "/screenshots/customer-home.png", label: "الرئيسية — عروض مميزة لك" },
  { src: "/screenshots/customer-card.png", label: "بطاقة العضوية الرقمية" },
  { src: "/screenshots/customer-facility.png", label: "صفحة المتجر ومنتجاتها" },
];

const OWNER_SCREENSHOTS: ScreenshotSpec[] = [
  { src: "/screenshots/owner-login.png", label: "تسجيل دخول بوابة المتاجر" },
  { src: "/screenshots/owner-products.png", label: "إدارة منتجات المتجر" },
  { src: "/screenshots/owner-import.png", label: "استيراد المنتجات" },
];

function screenshots(list: ScreenshotSpec[]) {
  return list.map((shot) => ({
    src: shot.src,
    sizes: "1080x1920",
    type: "image/png",
    form_factor: "narrow",
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
    ],
    screenshots: screenshots(CUSTOMER_SCREENSHOTS),
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
    ],
    screenshots: screenshots(OWNER_SCREENSHOTS),
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
  if (appOverride === "owner") {
    isOwner = true;
  } else if (appOverride === "customer") {
    isOwner = false;
  } else {
    isOwner = host === OWNER_HOST;
  }

  const manifest = isOwner ? ownerManifest() : customerManifest();

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
