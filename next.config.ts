import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "preview-chat-*.space-z.ai"],
  /* ═══ إصلاح الأداء الجوهري (ضغط الصور) ═══
     كانت images.unoptimized=true تعني أن كل صورة منتج/متجر/عرض تُحمَّل
     بحجمها الأصلي الكامل (مئات الكيلوبايتات إلى ميجابايتات) وتُفك ترميزها
     بالدقة الكاملة لعرضها في خلايا 100-160px على الجوال — أثقل سبب
     للبطء والتهنيج في الـAPK على الشبكات الضعيفة.
     الآن مُحسِّن صور Next مُفعّل: يُحوّل إلى WebP/AVIF ويصغّر لكل
     شاشة + يخدمها من نفس الأصل (كاش SW نظيف بلا opaque) مع كاش
     30 يوماً للمصدر. remotePatterns يغطي أصول الوسائط والهوية
     (api/رئيسي/مالك/أدمن) + localhost للتطوير. */
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 يوماً — الصور شبه ثابتة
    deviceSizes: [360, 412, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [48, 64, 96, 128, 160, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "api.tawfir.giize.com" },
      { protocol: "https", hostname: "tawfir.giize.com" },
      { protocol: "https", hostname: "facility.tawfir.giize.com" },
      { protocol: "https", hostname: "admin.tawfir.giize.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/v1/:path*`,
      },
      {
        // شبكة أمان الوسائط: أي طلب /uploads/* على نطاق البوابات
        // (admin./facility./www...) يُخدَم من الـAPI مباشرة — يحمي
        // من الروابط النسبية في حزم قديمة مخبأة قبل إصلاح resolveImageUrl.
        source: "/uploads/:path*",
        destination: `${API_BASE}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // يجب أن تُخدم على المسار الجذري ليربطها أندرويد بالتطبيق
        source: "/.well-known/assetlinks.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
