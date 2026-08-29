import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_HOST = "tawfir.giize.com";
const ADMIN_HOST = "admin.tawfir.giize.com";
const OWNER_HOST = "facility.tawfir.giize.com";

/** صفحات بوابة المالك العامة (بلا حراسة): الدخول + تسجيل متجر جديد */
const OWNER_PUBLIC_PATHS = new Set(["/owner/login", "/owner/register"]);

function isOwnerPublicPath(pathname: string): boolean {
  return OWNER_PUBLIC_PATHS.has(pathname);
}

export function middleware(request: NextRequest) {
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

  // 5) Unknown hosts (localhost, Vercel preview): no rewrites, just protect admin/owner
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

  return NextResponse.next();
}

export const config = {
  /**
   * مسارات مستثناة من المعالجة (تُخدم كما هي على كل النطاقات):
   * - أصول PWA: manifest الديناميكي، Service Worker، الأيقونات، اللقطات، assetlinks
   * - صفحات مشتركة: /offline و/privacy (تعمل على نطاقي العميل والمالك)
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|robots.txt|sitemap.xml|manifest.webmanifest|sw\\.js|icons/|screenshots/|\\.well-known/|offline|privacy|icon.svg|logo.svg|logo-mark.svg|fonts/).*)",
  ],
};
