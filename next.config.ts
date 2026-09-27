import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "preview-chat-*.space-z.ai"],
  images: { unoptimized: true },
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
