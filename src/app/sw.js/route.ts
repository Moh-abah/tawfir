import { NextResponse } from "next/server";
import { getServiceWorkerSource } from "@/lib/pwa/sw-source";
import { APP_VERSION } from "@/lib/pwa/version";

/**
 * خدمة ملف Service Worker على /sw.js
 * ------------------------------------
 * لماذا route handler وليس ملفاً ثابتاً؟
 *  • حقن علم الإنتاج (NODE_ENV) — في السلوك الكاشي الآمن في التطوير
 *    (NetworkFirst للأصول) والسريع في الإنتاج (CacheFirst).
 *  • حقن رقم الإصدار من مصدر واحد مشترك.
 *  • ضمان ترويسات Service-Worker-Allowed وCache-Control.
 */
export async function GET() {
  const isProd = process.env.NODE_ENV === "production";
  const source = getServiceWorkerSource(APP_VERSION, isProd);

  return new NextResponse(source, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
