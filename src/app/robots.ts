import type { MetadataRoute } from "next";
import { PUBLIC_URL } from "@/lib/site-config";

/**
 * robots.txt — الجولة 21 (webDevReview #9):
 * ديناميكي، يسمح بفهرسة كل الصفحات العامة، يمنع صفحات الحساب/المشرف/المالك.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/admin",
          "/owner",
          "/cart",
          "/checkout",
          "/orders",
          "/notifications",
          "/api/",
        ],
      },
    ],
    sitemap: `${PUBLIC_URL}/sitemap.xml`,
    host: PUBLIC_URL,
  };
}
