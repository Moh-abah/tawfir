/**
 * apple-app-site-association — Universal Links على iOS
 * ══════════════════════════════════════════════════════════════════════
 * يخدم الملف على المسار /.well-known/apple-app-site-association
 * (بلا امتداد + Content-Type: application/json — هكذا يتطلبه Apple CDN
 * حرفياً؛ ملفات public/ بلا امتداد تُخدَم octet-stream فلا تصلح).
 *
 * ماذا يفعل؟
 *  حين يفتح المستخدم رابط https://tawfir.giize.com/... من Safari أو
 *  الرسائل على آيفون، يتحقق iOS من هذا الملف: إن كان التطبيق المثبَّت
 *  معرّفاً هنا (Bundle ID + Team ID) يفتح الرابط داخل التطبيق مباشرةً
 *  بدل المتصفح، ويوجّهه NativeBridge (setupNativeUrlOpen) للمسار.
 *  — المكافئ الكامل لـ assetlinks.json (روابط أندرويد العميقة).
 *
 * من أين يأتي Team ID؟ (أولوية):
 *  1) متغير البيئة APPLE_TEAM_ID عند بناء/تشغيل الموقع.
 *  2) ملف apple-team-id.txt في جذر المستودع — سطر واحد فقط هو
 *     معرّف الفريق (10 أحرف من App Store Connect → Membership).
 *  3) إن لم يتوفر بعد: يُخدَم ملف بصيغة صالحمة وتفاصيل فارغة —
 *     لا يكسر شيئاً، وبمجرد إضافة المعرّف تعمل الروابط العميقة.
 *
 * ملاحظة: تغييرات هذا الملف قد تحتاج حتى 24 ساعة حتى يلتقطها
 * Apple CDN (له كاش خاص) — طبيعي ولا يدعو للقلق.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SITE_HOST = "tawfir.giize.com";
/** تطبيقات توفير المسجلة: العميل (المنشور على المتاجر) + المالك */
const APP_BUNDLE_IDS = ["com.tawfir.ye.app", "com.tawfir.ye.owner"];

function readTeamId(): string {
  /* 1) متغير البيئة */
  const fromEnv = process.env.APPLE_TEAM_ID;
  if (fromEnv && /^[A-Z0-9]{10}$/.test(fromEnv.trim())) {
    return fromEnv.trim();
  }
  /* 2) ملف جذر المستودع (apple-team-id.txt) */
  try {
    const file = join(process.cwd(), "apple-team-id.txt");
    if (existsSync(file)) {
      const content = readFileSync(file, "utf8").trim();
      if (/^[A-Z0-9]{10}$/.test(content)) return content;
    }
  } catch {
    /* قراءة فشلت — نسقط للوضع الفارغ */
  }
  return "";
}

export async function GET() {
  const teamId = readTeamId();
  const body = teamId
    ? {
        applinks: {
          details: [
            {
              appIDs: APP_BUNDLE_IDS.map((id) => `${teamId}.${id}`),
              components: [
                {
                  comment: "كل مسارات الموقع — التطبيق يوجّه داخلياً",
                  "/": "/*",
                },
              ],
            },
          ],
        },
        /* ربط الويب (Smart App Banners + اقتراحات Safari) */
        webcredentials: {
          details: [
            {
              appIDs: APP_BUNDLE_IDS.map((id) => `${teamId}.${id}`),
            },
          ],
        },
      }
    : {
        applinks: { details: [] },
        _note:
          "أضف APPLE_TEAM_ID لبيئة الموقع أو أنشئ apple-team-id.txt في جذر المستودع (سطر واحد: معرّف فريق Apple — 10 أحرف) لتفعيل Universal Links",
      };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      /* Apple CDN يعيد الزيارة دورياً — كاش يوم واحد معقول */
      "cache-control": "public, max-age=3600",
    },
  });
}
