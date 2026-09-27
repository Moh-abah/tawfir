import { NextResponse } from "next/server";

/**
 * ملف ربط نطاقات تطبيق الويب (Scope Extensions)
 * ═══════════════════════════════════════════════════════════════
 * scope_extensions في الـmanifest تتيح للتطبيق المثبّت من
 * tawfir.giize.com التنقل إلى بوابات المشروع الأخرى دون إظهار
 * شريط عنوان المتصفح — بشرط أن يصرّح كل نطاق ممتد بذلك عبر هذا
 * الملف على المسار /.well-known/web-app-origin-association
 * (مواصفة Web App Scope Extensions — كروم 130+).
 *
 * يُخدم ديناميكياً من هذا المشروع نفسه (المشروع ينشر على كل
 * البوابات) فيُغطى الملف على admin./facility. وغيرها تلقائياً.
 * نصرّح بكل صيغ الـmanifest المستخدمة (العميل/المالك/الإدارة).
 */

const WEB_APPS = [
  /* تطبيق العميل */
  "https://tawfir.giize.com/manifest.webmanifest",
  /* بوابة المالك (نطاقها الفرعي + صيغة الاستعلام المستخدمة في التخطيط) */
  "https://facility.tawfir.giize.com/manifest.webmanifest?app=owner",
  "https://facility.tawfir.giize.com/manifest.webmanifest",
  /* لوحة الإدارة */
  "https://admin.tawfir.giize.com/manifest.webmanifest?app=admin",
  "https://admin.tawfir.giize.com/manifest.webmanifest",
];

export async function GET() {
  const body = {
    web_apps: WEB_APPS.map((manifest) => ({
      manifest,
      details: { paths: ["/*"] },
    })),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
