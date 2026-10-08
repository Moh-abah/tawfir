import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * proxy.ts — خليفة middleware.ts في Next.js 16 (الاصطلاح الجديد).
 * ═══════════════════════════════════════════════════════════════════
 * توجيه البوابات الثلاث عبر Host واحد:
 *  • tawfir.giize.com        → بوابة العميل (عام)
 *  • admin.tawfir.giize.com  → /admin (محمي بكوكي tawfir_admin_token)
 *  • facility.tawfir.giize.com → /owner (محمي بكوكي tawfir_owner_token)
 *  • console.tawfir.giize.com → /console (الكونسول المعزول لمصنع المنصات —
 *    حراسة factory_admin داخل الصفحة نفسها بجلسة مستقلة، فلا حراسة كوكيز هنا)
 */

const PUBLIC_HOST = "tawfir.giize.com";
const ADMIN_HOST = "admin.tawfir.giize.com";
const OWNER_HOST = "facility.tawfir.giize.com";
const CONSOLE_HOST = "console.tawfir.giize.com";

/** صفحات بوابة المالك العامة (بلا حراسة): الدخول + تسجيل متجر جديد */
const OWNER_PUBLIC_PATHS = new Set(["/owner/login", "/owner/register"]);

/** صفحات بوابة المندوب العامة (بلا حراسة): التعريف + الدخول + التسجيل */
const COURIER_PUBLIC_PATHS = new Set([
  "/courier",
  "/courier/login",
  "/courier/register",
]);

function isOwnerPublicPath(pathname: string): boolean {
  return OWNER_PUBLIC_PATHS.has(pathname);
}

function isCourierPublicPath(pathname: string): boolean {
  return COURIER_PUBLIC_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // 1) www → bare domain (308 permanent redirect)
  if (host === `www.${PUBLIC_HOST}`) {
    url.protocol = "https";
    url.host = PUBLIC_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  if (host === `www.${ADMIN_HOST}`) {
    url.protocol = "https";
    url.host = ADMIN_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  if (host === `www.${OWNER_HOST}`) {
    url.protocol = "https";
    url.host = OWNER_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Known production hosts
  const isAdminHost = host === ADMIN_HOST;
  const isOwnerHost = host === OWNER_HOST;
  const isPublicHost = host === PUBLIC_HOST;

  // 2) ADMIN_HOST: rewrite / → /admin, and any non-/admin path → /admin{path}
  if (isAdminHost) {
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    if (!pathname.startsWith("/admin")) {
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    // Protect admin routes (except login)
    if (pathname !== "/admin/login") {
      const token = request.cookies.get("tawfir_admin_token")?.value;
      if (!token) {
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // 3) OWNER_HOST: rewrite / → /owner, and any non-/owner path → /owner{path}
  if (isOwnerHost) {
    if (pathname === "/") {
      url.pathname = "/owner";
      return NextResponse.rewrite(url);
    }
    if (!pathname.startsWith("/owner")) {
      url.pathname = `/owner${pathname}`;
      return NextResponse.rewrite(url);
    }
    // Protect owner routes (except public pages: login + register)
    if (!isOwnerPublicPath(pathname)) {
      const token = request.cookies.get("tawfir_owner_token")?.value;
      if (!token) {
        url.pathname = "/owner/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // 3.5) CONSOLE_HOST: rewrite / → /console — جذر سب دومين الكونسول يفتح الكونسول المعزول مباشرة
  //     (كان يقع في «النطاقات المجهولة» فيُعرض المتجر العادي — وهذا هو خلل المالك:
  //      يفتح console.tawfir.giize.com فيراه موقع العملاء فيظن أنه حُوِّل للرئيسي)
  if (host === CONSOLE_HOST) {
    if (pathname === "/") {
      url.pathname = "/console";
      return NextResponse.rewrite(url);
    }
    // بقية المسارات تمر كما هي: /console تعمل، و/factory (مركز المصنع) متاح أيضاً هنا
    return NextResponse.next();
  }

  // 4) PUBLIC_HOST: prevent /admin and /owner paths (redirect to proper subdomain)
  if (isPublicHost) {
    if (pathname.startsWith("/admin")) {
      url.protocol = "https";
      url.host = ADMIN_HOST;
      url.pathname = pathname;
      return NextResponse.redirect(url, 308);
    }
    if (pathname.startsWith("/owner")) {
      url.protocol = "https";
      url.host = OWNER_HOST;
      url.pathname = pathname;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  // 5) Unknown hosts (localhost, Vercel preview): no rewrites, just protect admin/owner/courier
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get("tawfir_admin_token")?.value;
    if (!token) {
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/owner") && !isOwnerPublicPath(pathname)) {
    const token = request.cookies.get("tawfir_owner_token")?.value;
    if (!token) {
      url.pathname = "/owner/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  /* 6) بوابة المندوب — حراسة على كل النطاقات (شاشة التوثيق الحساسة داخلها):
     ما عدا شاشاتها العامة الثلاث (تعريف/دخول/تسجيل) */
  if (pathname.startsWith("/courier") && !isCourierPublicPath(pathname)) {
    const token = request.cookies.get("tawfir_courier_token")?.value;
    if (!token) {
      url.pathname = "/login";
      url.searchParams.set("mode", "courier");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  /**
   * مسارات مستثناة من المعالجة (تُخدم كما هي على كل النطاقات):
   * - أصول PWA: manifest الديناميكي، Service Worker، الأيقونات، اللقطات، assetlinks
   * - صفحات مشتركة: /offline و/privacy (تعمل على نطاقي العميل والمالك)
   *
   * ═══ إصلاح جذري — شعارات الهوية المكسورة (404) على نطاق facility ═══
   * قبل هذا الإصلاح كان الـmatcher يستثني icons/ وfonts/ فقط، بينما
   * تُركت identity/ (الشعارات + رسمات «لا توجد بيانات») وsounds/
   * وwidgets/ وuploads/ خارج الاستثناء — فكانت إعادة الكتابة على
   * المالك تُحوِّل /identity/mark-256.png إلى /owner/identity/mark-256.png
   * الذي لا وجود له → 404 لكل شعارات الهوية في كل صفحات بوابة المالك
   * حتى لو كانت الملفات موجودة في نفس النشر.
   * أُضيئلت الآن: identity/ وsounds/ وwidgets/ وuploads/
   * (الشبكة الأمنية لوسائط الـAPI في next.config تعمل الآن على
   * البوابات أيضاً) + native-offline.html (شاشة أوفلاين القشرة
   * الأصلية).
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|robots.txt|sitemap.xml|manifest.webmanifest|sw\\.js|icons/|screenshots/|\\.well-known/|offline|privacy|fonts/|identity/|sounds/|widgets/|uploads/|native-offline\\.html).*)",
  ],
};
