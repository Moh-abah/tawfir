/**
 * مصدر Service Worker لتطبيقي «توفير» (عميل + مالك)
 * ═══════════════════════════════════════════════════════════════
 * يُخدم عبر مسار /sw.js (route handler) مع حقن رقم الإصدار وعلم
 * الإنتاج — فيعمل بنفس المنطق في التطوير والإنتاج مع فروق آمنة.
 *
 * ═══ الإشعارات الخارجية (FCM Push) — الجولة 22 ═══
 * هذا العامل هو الوحيد في المشروع بنطاق "/" — وهو نفسه الذي يملك
 * اشتراك Push (getToken يربط الاشتراك به). لذلك معالجات push و
 * notificationclick هنا هي التي تُظهر إشعار شاشة القفل دون فتح
 * التطبيق. (في السابق كان هناك عامل ثانٍ /firebase-messaging-sw.js
 * بنفس النطاق — المتصفح لا يسمح بعاملين لنفس النطاق، فكانت أحداث
 * push تصل لعامل الكاش الذي لا يعرف كيف يعرضها — جذر مشكلة عدم
 * وصول الإشعارات الخارجية. حُلَّت بالدمج هنا وحذف العامل الثاني.)
 *
 *   • push: إن وُجد نافذة مرئية (التطبيق مفتوح بالأمام) → إعادة
 *     توجيه الحمولة للصفحة عبر postMessage لعرض توست الواجهة.
 *     وإلا (التطبيق بالخلفية/الشاشة مقفلة) → showNotification
 *     بإشعار نظام كامل بهوية توفير (أيقونة/RTL/عربية/صوت النظام).
 *   • notificationclick: تركيز تبويب موجود + تنقّل للرابط العميق،
 *     أو فتح نافذة جديدة عند غيابه.
 *
 * ═══ الإصلاح الشامل للإشعارات (أيقونات أندرويد/iOS + كل الأنواع) ═══
 * معايير أندرويد (API 21+): الأيقونة الصغيرة في شريط الحالة يجب أن
 * تكون أحادية اللون (أبيض فقط) بخلفية شفافة (Alpha). أي أيقونة ملونة
 * أو بخلفية صلبة يحوّلها النظام إلى مربع أبيض صلب — وهذا ما كان يحدث
 * مع icon-192.png الملونة (خلفية كحلية معتمة → مربع أبيض صغير).
 * الحل: badge = notification_icon_white_96.png (شعار توفير المفرغ
 * أبيض على شفاف) + icon = tawfir-app-icon-192.png (الأيقونة الملونة
 * نفس أيقونة التطبيق — للعرض الكبير في درج الإشعارات).
 * لكل نوع إشعار (17 نوعاً): أنماط اهتزاز + requireInteraction للحرج
 * + زر إجراء «عرض» + صورة كبيرة للعروض + timestamp + توحيد
 * الروابط العميقة مع notifications-meta.ts.
 *
 * استراتيجيات الكاش:
 *  • Precache (تثبيت): صفحة /offline و/privacy وخطوط Cairo والأيقونات
 *  • كتالوج العميل GET /api/products + /api/products/nearby +
 *    /api/facilities + /api/facilities/{id}/products + /api/regions +
 *    /api/cards → StaleWhileRevalidate — آخر نسخة تبقى متاحة أوفلاين
 *    إلى الأبد وتُحدَّث بخلفية عند كل وصول (revalidation)
 *  • كل POST/PUT/PATCH/DELETE + auth/login + me + admin/* + owner/* +
 *    orders + membership + أي طلب يحمل Authorization: NetworkOnly —
 *    لا يُخزَّن شيء إطلاقاً (لا تخزين للتوكنات أو العمليات الحساسة)
 *  • صور المتاجر/المنتجات (image patterns): CacheFirst بحد 50 مدخل (FIFO)
 *  • بوابة المالك: هيكل التطبيق أوفلاين + كل API المالك NetworkOnly
 *  • التنقلات: NetworkFirst مع سقوط للكاش ثم صفحة /offline
 *  • أصول Next الثابتة: CacheFirst في الإنتاج / NetworkFirst في التطوير
 *
 * رسائل عربية أصيلة عند فقد الاتصال:
 *  • عملية بلا اتصال → 503 {detail: «يتطلب هذا الإجراء اتصالاً بالإنترنت»}
 *  • طلب بوابة المالك → «تتطلب بوابة المتاجر اتصالاً بالإنترنت»
 *    (يتعامل معها عملاء API الثلاثة كرسالة خطأ عادية من الخادم)
 */

export function getServiceWorkerSource(version: string, isProd: boolean): string {
  const IS_PROD = isProd ? "true" : "false";
  return `/* توفير Service Worker — الإصدار ${version} */
const VERSION = "${version}";
const IS_PROD = ${IS_PROD};

const SHELL_CACHE = "tawfir-shell-" + VERSION;
const DATA_CACHE = "tawfir-data-" + VERSION;
const IMAGE_CACHE = "tawfir-images-" + VERSION;
const NAV_CACHE = "tawfir-nav-" + VERSION;
const ALL_CACHES = [SHELL_CACHE, DATA_CACHE, IMAGE_CACHE, NAV_CACHE];

const OFFLINE_URL = "/offline";
const MAX_IMAGE_ENTRIES = 50;
/* إصلاح تسريب الذاكرة الدائم (التدقيق 3-a / H-2 + H-3): كانت كاشات
   البيانات والتنقل تنمو بلا حدود — كل نسخة query-string فريدة
   (/api/products?page=3&region_id=1…) وكل RSC/HTML لصفحة مزارة
   تُخزّن للأبد في Cache Storage الذي يبقى عبر الجلسات — PWA مثبّت
   يتصفح أسابيع ينتهي لمئات الـMB وحدود الحصة. الآن: سقوف صريحة
   بنفس نمط MAX_IMAGE_ENTRIES + تقليم فعلي بعد كل put. */
const MAX_DATA_ENTRIES = 120;
const MAX_NAV_ENTRIES = 40;
const REVALIDATE_DEBOUNCE_MS = 60000;

/* أصول الهيكل المستقرة — تُخزَّن مسبقاً عند التثبيت (تعمل في التطوير والإنتاج) */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/privacy",
  /* إصلاح الشعار: هوية توفير الأساسية — الشعار المفرغ المحسّن +
     أيقونة الإشعار الأحادية + أيقونة التطبيق الملونة + اللوكب —
     (كانت /identity/* بلا كاش مسبق ← 404/اختفاء الشعار أوفلاين).
     أزلنا logo.svg/logo-mark.svg (1.2MB لكل منهما بلا أي استخدام). */
  "/identity/mark-256.png",
  "/identity/notification_icon_white_96.png",
  "/identity/notification_icon_white_512.png",
  "/identity/tawfir-app-icon-192.png",
  "/identity/lockup-fulltra-640.png",
  "/identity/tawfir-empty-state-480.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/owner-icon-192.png",
  "/icons/owner-icon-512.png",
  "/fonts/Cairo-Regular.ttf",
  "/fonts/Cairo-SemiBold.ttf",
  "/fonts/Cairo-Bold.ttf",
  "/fonts/Cairo-ExtraBold.ttf",
  "/fonts/Cairo-Black.ttf",
  /* الجولة 20: تسخين مسبق لشاشات الزبون الأساسية — تعمل أوفلاين من أول تثبيت
     (الصفحة الرئيسية، العروض، البحث، المتاجر، الإشعارات، الحساب، تسجيل الدخول) */
  "/",
  "/offers",
  "/search",
  "/facilities",
  "/notifications",
  "/account",
  "/login",
  "/membership",
];

/* بيانات كتالوج أساسية تُخزَّن مسبقاً في كاش البيانات حتى يعمل التطبيق
   أوفلاين من أول تثبيت (طلبات الزيارة الأولى قد تسبق تفعيل العامل) */
const PRECACHE_DATA_URLS = [
  "/api/regions",
  /* الجولة 20: بيانات أساسية تُخزّن مسبقاً لشاشات أوفلاين أفضل */
  "/api/products",
  "/api/facilities",
  "/api/special-offers",
  "/api/cards",
];

/* خريطة مؤقتة لمنع إغراق الخادم بإعادة التحقق لنفس الطلب
   (إصلاح التدقيق 3-a / M-1: كانت تنمو بلا حدود مع كل URL فريد طوال
   عمر العامل — الآن تُقلَّم دورياً عند تجاوز الحد — الأقدم أولاً) */
const revalidateMemo = new Map();
const MAX_REVALIDATE_MEMO = 200;

function pruneRevalidateMemo() {
  if (revalidateMemo.size <= MAX_REVALIDATE_MEMO) return;
  const excess = revalidateMemo.size - Math.floor(MAX_REVALIDATE_MEMO / 2);
  let dropped = 0;
  for (const key of revalidateMemo.keys()) {
    if (dropped >= excess) break;
    revalidateMemo.delete(key);
    dropped++;
  }
}

/* مسارات لا تُخزَّن أبداً (توكنات وبيانات حساسة) — تعمل على أي أصل
   • /auth/* + /me: بيانات حساب وتوكنات
   • /admin/*: لوحة المشرف — بيانات حساسة
   • /owner/*: بوابة المالك — بيانات حساسة
   • /orders + /membership: عمليات مالية/حساسة لا تُخزَّن */
function isNeverCacheGet(pathname) {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/me") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/owner") ||
    pathname.startsWith("/api/v1/auth") ||
    pathname.startsWith("/api/v1/me") ||
    pathname.startsWith("/api/v1/admin") ||
    pathname.startsWith("/api/v1/owner") ||
    pathname.indexOf("/api/orders") !== -1 ||
    pathname.indexOf("/api/membership") !== -1
  );
}

/* مسارات كتالوج العميل العامة المسموح بتخزينها (StaleWhileRevalidate):
   • /products و/products/nearby و/products/{id}
   • /facilities و/facilities/{id} و/facilities/{id}/products
   • /regions
   • /cards (بطاقات الخصم)
   ملاحظة: الكاش يخدم نسخة أوفلاين ويُحدّث في الخلفية */
function isCatalogGet(pathname) {
  if (pathname === "/api/products") return true;
  if (pathname === "/api/products/nearby") return true;
  if (pathname.indexOf("/api/products/") !== -1) return true;
  if (pathname === "/api/facilities") return true;
  if (pathname.indexOf("/api/facilities/") !== -1) return true;
  if (pathname === "/api/regions") return true;
  if (pathname === "/api/regions/") return true;
  if (pathname === "/api/cards") return true;
  return false;
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icons/") ||
    /* إصلاح 404 الشعار: صور الهوية الآن أصول ثابتة (كاش فوري بالإنتاج) */
    pathname.startsWith("/identity/") ||
    pathname.startsWith("/screenshots/") ||
    pathname === "/logo.svg" ||
    pathname === "/logo-mark.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  );
}

function isRscRequest(request) {
  if (request.headers.get("rsc") === "1") return true;
  const accept = request.headers.get("accept") || "";
  return accept.indexOf("text/x-component") !== -1;
}

/* استجابة 503 عربية موحدة عند فقد الاتصال — يقرأها عملاء API كـ detail */
function offlineApiResponse(request) {
  const url = new URL(request.url);
  const isOwner = url.pathname.indexOf("/owner") !== -1;
  const detail = isOwner
    ? "تتطلب بوابة المتاجر اتصالاً بالإنترنت"
    : "يتطلب هذا الإجراء اتصالاً بالإنترنت";
  return new Response(JSON.stringify({ detail: detail }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/* ═══════════════ إشعارات FCM Push (الجولة 22 + الإصلاح الشامل) ═══════════════ */

/* هوية العلامة في إشعار النظام:
   • LARGE_ICON (/identity/tawfir-app-icon-192.png): الأيقونة الملونة
     نفسها أيقونة التطبيق — تظهر كأيقونة كبيرة في درج الإشعارات
     (أندرويد يتجاهلها للتطبيقات المثبتة ويستخدم أيقونة المشغل).
   • BADGE (/identity/notification_icon_white_96.png): شعار توفير
     المفرغ أحادي اللون الأبيض على خلفية شفافة (Alpha) — هذا هو
     الرمز الصغير في شريط الحالة العلوي بجوار الساعة والبطارية.
     ⚠ معيار أندرويد API 21+: أيقونات صغيرة أحادية بيضاء/شفافة فقط —
     الأيقونة الملونة السابقة كانت تتحول لمربع أبيض صلب.
   • (ملاحظة: يوجد أيضاً أيقون monochrome في manifest.webmanifest
     للتطبيقات المثبتة WebAPK — يستخدمها كروم لشريط الحالة). */
var BRAND_ICON = "/identity/tawfir-app-icon-192.png";
var BRAND_BADGE = "/identity/notification_icon_white_96.png";
var BRAND_TITLE = "توفير";

/* جدول خصائص كل نوع إشعار (17 نوعاً) — اهتزاز/أهمية/زر إجراء/صورة:
   • vibrate: نمط الاهتزاز (يعمل على أندرويد عبر الإشعارات
     الأصلية للتطبيق المثبت WebAPK — ومتصفح كروم يدعمه أيضاً).
   • requireInteraction: يبقي الإشعار ثابتاً (لا يُختفي تلقائياً)
     للأنواع الحرجة فقط (طلب جديد للمالك — يحتاج إجراءً).
   • actionTitle: زر «عرض» يظهر في الإشعار — يفتح نفس الرابط العميق.
   • image: للعروض الخاصة — صورة كبيرة إن أرسلها الباك إند. */
var TYPE_META = {
  /* ── دورة الطلب (حرجة) ── */
  order_new: {
    vibrate: [250, 120, 250, 120, 250, 120, 250],
    requireInteraction: true,
    actionTitle: "عرض الطلب",
  },
  order_confirmed: { vibrate: [180, 90, 180], actionTitle: "عرض الطلب" },
  order_preparing: { vibrate: [180, 90, 180], actionTitle: "عرض الطلب" },
  order_out_for_delivery: { vibrate: [180, 90, 180, 250], actionTitle: "عرض الطلب" },
  order_delivered: { vibrate: [220, 110, 220], actionTitle: "عرض الطلب" },
  order_cancelled: { vibrate: [350, 150, 350], actionTitle: "عرض الطلب" },
  /* ── العضوية ── */
  membership_new_request: { vibrate: [180, 90, 180], actionTitle: "عرض الطلبات" },
  membership_received: { vibrate: [180, 90, 180], actionTitle: "عرض التفاصيل" },
  membership_approved: { vibrate: [220, 110, 220, 110, 220], actionTitle: "عرض العضوية" },
  membership_rejected: { vibrate: [350, 150, 350], actionTitle: "عرض التفاصيل" },
  membership_expiring: { vibrate: [280, 130, 280], actionTitle: "عرض العضوية" },
  /* ── المتاجر/الملاك ── */
  facility_approved: { vibrate: [220, 110, 220, 110, 220], actionTitle: "عرض المتجر" },
  facility_rejected: { vibrate: [350, 150, 350], actionTitle: "عرض التفاصيل" },
  owner_registered: { vibrate: [180, 90, 180], actionTitle: "لوحة المالك" },
  /* ── العروض الخاصة ── */
  special_offer_new: { vibrate: [180, 90, 180, 90, 180], actionTitle: "عرض العرض", image: true },
  special_offer_ending: { vibrate: [280, 130, 280], actionTitle: "عرض العرض", image: true },
  special_offer_soldout: { vibrate: [350, 150, 350], actionTitle: "عرض المنتج", image: true },
};

function getTypeMeta(type) {
  return TYPE_META[type] || { vibrate: [180, 90, 180], actionTitle: "عرض" };
}

/* يشتق رابط النقر من نوع الإشعار + حقول البيانات (نفس منطق
   src/lib/notifications-meta.ts — hrefFor — مُوحّد في الإصلاح الشامل:
   special_offer_* مع product_id → صفحة المنتج (كانت /offers). */
function resolveClickUrl(type, data) {
  data = data || {};
  /* رابط صريح من الباك إند إن وُجد (أولوية قصوى) */
  if (data.url && typeof data.url === "string" && data.url.charAt(0) === "/") {
    return data.url;
  }
  /* طلب جديد: مستقبله المالك إن وُجد facility_id (صفحة طلبات متجره)،
     وإلا الزبون (صفحة الطلب) — وإن لم يوجد شيء فقائمة الطلبات */
  if (type === "order_new") {
    if (data.facility_id) return "/owner/facilities/" + data.facility_id + "/orders";
    if (data.order_id) return "/orders/" + data.order_id;
    return "/orders";
  }
  if (data.order_id) return "/orders/" + data.order_id;
  if (data.product_id) return "/products/" + data.product_id;
  switch (type) {
    case "membership_new_request":
      return "/admin/membership-requests";
    case "membership_received":
    case "membership_approved":
    case "membership_rejected":
    case "membership_expiring":
      return "/account";
    case "facility_approved":
    case "facility_rejected":
    case "owner_registered":
      return "/owner";
    case "special_offer_new":
    case "special_offer_ending":
    case "special_offer_soldout":
      /* توحيد مع الواجهة: الأفضل صفحة المنتج، وإلا فقائمة العروض */
      return "/offers";
    default:
      return "/";
  }
}

/* قراءة حمولة الـPush من PushEvent (صيغتا notification أو data-only) */
function parsePushPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch (_e) {
    try {
      return { data: { body: event.data.text() } };
    } catch (_e2) {
      return {};
    }
  }
}

/* بناء NotificationOptions بهوية توفير — محسّن لكل نوع:
   • icon: الأيقونة الملونة (درج الإشعارات) + badge: الشعار المفرغ
     الأحادي الأبيض (شريط الحالة أندرويد — معيار API 21+).
   • vibrate + requireInteraction + timestamp + actions من TYPE_META.
   • image: صورة كبيرة للعروض إن أرسلها الباك إند (data.image/image_url).
   • tag + renotify: تجميع سلوك الاشعارات من نفس الطلب/المنتج. */
function buildPushOptions(title, body, type, data, payloadTimestamp) {
  data = data || {};
  var meta = getTypeMeta(type);
  var tagBase = type ? "tawfir-" + type : "tawfir-notif";
  var tag = data.order_id
    ? tagBase + "-" + data.order_id
    : data.product_id
      ? tagBase + "-" + data.product_id
      : tagBase;

  var options = {
    body: body,
    icon: BRAND_ICON,
    badge: BRAND_BADGE,
    dir: "rtl",
    lang: "ar",
    tag: tag,
    renotify: true,
    vibrate: meta.vibrate,
    timestamp: payloadTimestamp || Number(data.timestamp) || Date.now(),
    data: Object.assign({}, data, {
      url: resolveClickUrl(type, data),
      type: type,
    }),
  };

  /* الأنواع الحرجة (طلب جديد): إشعار ثابت لا يختفي تلقائياً —
     يبقى في شاشة القفل/الدرج حتى إجراء المستخدم */
  if (meta.requireInteraction) {
    options.requireInteraction = true;
  }

  /* زر إجراء واحد «عرض …» يفتح نفس الرابط العميق — يظهر في درج
     الإشعارات وشاشة القفل على أندرويد (بحد 2-3 أزرار) */
  if (meta.actionTitle) {
    options.actions = [
      {
        action: "tawfir-open",
        title: meta.actionTitle,
      },
    ];
  }

  /* صورة كبيرة للعروض الخاصة إن أرسلها الباك إند — تُعرض في
     أعلى الإشعار (أندرويد وكروم سطح المكتب) */
  if (meta.image) {
    var imgUrl = data.image || data.image_url || "";
    if (
      typeof imgUrl === "string" &&
      (imgUrl.indexOf("http://") === 0 || imgUrl.indexOf("https://") === 0)
    ) {
      options.image = imgUrl;
    }
  }

  return options;
}

/* push: إشعار نظام عند الخلفية/القفل، أو إعادة توجيه للواجهة عند الفتح */
self.addEventListener("push", function (event) {
  event.waitUntil(
    (async function () {
      var payload = parsePushPayload(event);
      var notif = payload.notification || {};
      var data = payload.data || {};
      var title = notif.title || data.title || BRAND_TITLE;
      var body = notif.body || data.body || "";
      var type = data.notification_type || data.type || "";
      var ts = payload.fcmMessageId
        ? Number(data.sent_at || data.timestamp) || undefined
        : undefined;

      /* هل التطبيق مفتوح ومرئي؟ → توست داخل الواجهة بدل إشعار النظام */
      var windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      var hasVisible = windowClients.some(function (c) {
        return c.visibilityState === "visible";
      });

      if (hasVisible) {
        var relay = {
          __tawfirPush: true,
          payload: {
            messageId: payload.fcmMessageId || data.message_id || null,
            notification: notif,
            data: data,
          },
        };
        await Promise.all(
          windowClients.map(function (c) {
            try {
              c.postMessage(relay);
            } catch (_e) {
              /* تجاهل */
            }
          })
        );
        return;
      }

      /* الخلفية/شاشة القفل → إشعار نظام بهوية توفير */
      return self.registration.showNotification(
        title,
        buildPushOptions(title, body, type, data, ts)
      );
    })().catch(function (_err) {
      /* احتياط أخير: إشعار عام كي لا يفوت المستخدم وجود رسالة */
      try {
        return self.registration.showNotification(BRAND_TITLE, {
          body: "لديك إشعار جديد",
          icon: BRAND_ICON,
          badge: BRAND_BADGE,
          dir: "rtl",
          lang: "ar",
          vibrate: [180, 90, 180],
          data: { url: "/" },
        });
      } catch (_e) {
        return undefined;
      }
    })
  );
});

/* notificationclick: ركّز تبويباً موجوداً وتنقّل للهدف، أو افتح نافذة.
   يعمل للمسار الافتراضي ولأزرار الإجراءات (event.action === "tawfir-open")
   بنفس السلوك — فتح الرابط العميق. */
self.addEventListener("notificationclick", function (event) {
  /* تجاهل أزرار الإجراء غير المعروفة (مثل إغلاق) — الإشعار يبقى */
  if (event.action && event.action !== "tawfir-open") {
    return;
  }
  event.notification.close();
  var data = event.notification.data || {};
  var targetUrl = data.url || "/";

  event.waitUntil(
    (async function () {
      var allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (var i = 0; i < allClients.length; i++) {
        var client = allClients[i];
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(targetUrl);
            } else if ("postMessage" in client) {
              client.postMessage({
                type: "tawfir-navigate",
                url: targetUrl,
              });
            }
            return;
          } catch (_e) {
            /* جرّب التالي */
          }
        }
      }
      try {
        await self.clients.openWindow(targetUrl);
      } catch (_e) {
        /* تجاهل */
      }
    })()
  );
});

/* ═══════════════ التثبيت والتفعيل ═══════════════ */

self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      const shellCache = await caches.open(SHELL_CACHE);
      /* كل مسار مستقل حتى لا يفشل التثبيت بسبب أصل واحد */
      await Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return shellCache.add(url);
        })
      );
      /* كتالوج المناطق في كاش البيانات — نفس الكاش الذي تقرأه SWR */
      const dataCache = await caches.open(DATA_CACHE);
      await Promise.allSettled(
        PRECACHE_DATA_URLS.map(function (url) {
          return dataCache.add(url);
        })
      );
    })()
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(function (key) {
          if (ALL_CACHES.indexOf(key) === -1) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
    })()
  );
});

/* زر «تحديث الآن»: يطلب من العامل الجديد الاستلام فوراً */
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ═══════════════ اعتراض الطلبات ═══════════════ */

self.addEventListener("fetch", function (event) {
  const request = event.request;

  /* 1) كل العمليات الكاتبة: شبكة فقط — لا تخزين إطلاقاً
        (POST/PUT/PATCH/DELETE: تسجيل دخول، إنشاء طلب، اشتراك عضوية…) */
  if (request.method !== "GET") {
    event.respondWith(handleNetworkOnly(request));
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  /* 2) مسارات حساسة أو طلب موقّع بتوكن: شبكة فقط
        (auth/me/admin/owner/orders/membership — لا تخزين للتوكنات) */
  if (
    isNeverCacheGet(url.pathname) ||
    request.headers.has("Authorization")
  ) {
    event.respondWith(handleNetworkOnly(request));
    return;
  }

  /* 3) الأصول الثابتة (نفس الأصل) */
  if (isSameOrigin && isStaticAsset(url.pathname)) {
    event.respondWith(handleStatic(request));
    return;
  }

  /* 4) كتالوج العميل GET العام (products/facilities/regions/cards):
        StaleWhileRevalidate — آخر نسخة تبقى أوفلاين */
  if (isSameOrigin && isCatalogGet(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }

  /* 5) حمولات RSC (تنقلات SPA) — شبكة أولاً مع سقوط للكاش */
  if (isSameOrigin && isRscRequest(request)) {
    event.respondWith(handleRsc(event, request));
    return;
  }

  /* 6) التنقلات (تحميل صفحات كاملة) */
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, request));
    return;
  }

  /* 7) الصور (صور المتاجر/المنتجات): CacheFirst بحد 50 */
  if (request.destination === "image") {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  /* ما عداه: يمرر كما هو (WebSocket وأشباهه) */
});

/* ═══════════════ الاستراتيجيات ═══════════════ */

async function handleNetworkOnly(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return offlineApiResponse(request);
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(DATA_CACHE);
  const cachedResponse = await cache.match(request);

  const lastRevalidated = revalidateMemo.get(request.url);
  const shouldRevalidate =
    !lastRevalidated ||
    Date.now() - lastRevalidated > REVALIDATE_DEBOUNCE_MS;

  if (shouldRevalidate) {
    revalidateMemo.set(request.url, Date.now());
    pruneRevalidateMemo();
    const networkUpdate = fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          return cache
            .put(request, response.clone())
            .then(function () {
              return trimCache(DATA_CACHE, MAX_DATA_ENTRIES);
            });
        }
        return undefined;
      })
      .catch(function () {
        return undefined;
      });
    event.waitUntil(networkUpdate);
  }

  /* النسخة المخزنة تُقدَّم فوراً وتبقى متاحة أوفلاين حتى ينجح تحديث جديد */
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      event.waitUntil(
        cache
          .put(request, fresh.clone())
          .then(function () {
            return trimCache(DATA_CACHE, MAX_DATA_ENTRIES);
          })
      );
    }
    return fresh;
  } catch (err) {
    return offlineApiResponse(request);
  }
}

async function handleStatic(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  if (IS_PROD) {
    /* الإنتاج: الكاش أولاً (أصول Next بمحتوى مُوقَّع لا يتغير) */
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      return cached || Response.error();
    }
  }

  /* التطوير: الشبكة أولاً كي لا تتقادم الأصول بعد كل إعادة ترجمة */
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}

function rscCacheKey(request) {
  const marker = request.url.indexOf("?") === -1 ? "?" : "&";
  return new Request(request.url + marker + "__tawfir_rsc=1", {
    method: "GET",
  });
}

async function handleRsc(event, request) {
  const cache = await caches.open(NAV_CACHE);
  const key = rscCacheKey(request);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      event.waitUntil(
        cache
          .put(key, response.clone())
          .then(function () {
            return trimCache(NAV_CACHE, MAX_NAV_ENTRIES);
          })
      );
    }
    return response;
  } catch (err) {
    const cached = await cache.match(key);
    if (cached) return cached;
    return offlineApiResponse(request);
  }
}

async function handleNavigation(event, request) {
  const url = new URL(request.url);
  /* صفحات الأدمن لا تُخزَّن إطلاقاً (سياسة صفر تخزين لبيانات الأدمن) */
  const isAdmin = url.pathname.startsWith("/admin");
  try {
    const response = await fetch(request);
    /* الجولة 12: في التطوير لا نخزّن HTML التنقلات إطلاقاً — الكاش القديم
       مع JS متجدد بعد كل إعادة ترجمة يسبب hydration mismatch قاتلاً.
       (الإنتاج آمن: HTML و chunks يُنشران معاً بنسخ مُوقّعة) */
    if (response && response.ok && !isAdmin && IS_PROD) {
      /* نستنسخ فوراً قبل إرجاع الاستجابة — الاستنساخ المتأخر يفشل
         لأن جسم الاستجابة يكون قد بدأ استهلاكه (خطأ Body already used) */
      const clone = response.clone();
      event.waitUntil(
        caches
          .open(NAV_CACHE)
          .then(function (cache) {
            return cache.put(request, clone);
          })
          .then(function () {
            return trimCache(NAV_CACHE, MAX_NAV_ENTRIES);
          })
      );
    }
    return response;
  } catch (err) {
    if (!IS_PROD) {
      /* التطوير: لا سقوط لكاش HTML متقادم — صفحة الخطأ مباشرة */
      return offlineApiResponse(request);
    }
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || Response.error();
  }
}

async function trimCache(cacheName, maxEntries) {
  /* تحسين (التدقيق 3-a): كانت تحذف مفتاحاً واحداً فقط عند تجاوز الحد —
     فيبقى الكاش فوق السقوف بعشرات المداخل مع كل إدراج جديد. الآن
     نحذف كل الفائض دفعة واحدة (المفاتيح بترتيب الإدراج = الأقدم
     أولاً — إزاحة LRU بالإدراج) فيعود الكاش لحدّه فوراً. */
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(
    keys.slice(0, excess + Math.ceil(maxEntries * 0.1)).map(function (k) {
      return cache.delete(k);
    })
  );
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    /* لا نخزّن ولا نُعيد الاستجابات الفاشلة الصريحة (404/5xx) — كنا
       نُعيد الـ404 من الشبكة فتظهر الصور «مفقودة من الـSW» في المتصفح
       (جذر مشكلة /identity/mark.png). الاستجابات opaque (صور خارجية
       بلا CORS — status 0) تبقى مدعومة كما كانت. */
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(request, response.clone());
      await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
      return response;
    }
    return Response.error();
  } catch (err) {
    return Response.error();
  }
}
`;
}
