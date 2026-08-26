/**
 * مصدر Service Worker لتطبيقي «توفير» (عميل + مالك)
 * ═══════════════════════════════════════════════════════════════
 * يُخدم عبر مسار /sw.js (route handler) مع حقن رقم الإصدار وعلم
 * الإنتاج — فيعمل بنفس المنطق في التطوير والإنتاج مع فروق آمنة.
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
 *  • صور المنشآت/المنتجات (image patterns): CacheFirst بحد 50 مدخل (FIFO)
 *  • بوابة المالك: هيكل التطبيق أوفلاين + كل API المالك NetworkOnly
 *  • التنقلات: NetworkFirst مع سقوط للكاش ثم صفحة /offline
 *  • أصول Next الثابتة: CacheFirst في الإنتاج / NetworkFirst في التطوير
 *
 * رسائل عربية أصيلة عند فقد الاتصال:
 *  • عملية بلا اتصال → 503 {detail: «يتطلب هذا الإجراء اتصالاً بالإنترنت»}
 *  • طلب بوابة المالك → «تتطلب بوابة المنشآت اتصالاً بالإنترنت»
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
const REVALIDATE_DEBOUNCE_MS = 60000;

/* أصول الهيكل المستقرة — تُخزَّن مسبقاً عند التثبيت (تعمل في التطوير والإنتاج) */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/privacy",
  "/logo.svg",
  "/logo-mark.svg",
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
];

/* بيانات كتالوج أساسية تُخزَّن مسبقاً في كاش البيانات حتى يعمل التطبيق
   أوفلاين من أول تثبيت (طلبات الزيارة الأولى قد تسبق تفعيل العامل) */
const PRECACHE_DATA_URLS = ["/api/regions"];

/* خريطة مؤقتة لمنع إغراق الخادم بإعادة التحقق لنفس الطلب */
const revalidateMemo = new Map();

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
    pathname.startsWith("/screenshots/") ||
    pathname === "/logo.svg" ||
    pathname === "/logo-mark.svg" ||
    pathname === "/logowafir.png" ||
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
    ? "تتطلب بوابة المنشآت اتصالاً بالإنترنت"
    : "يتطلب هذا الإجراء اتصالاً بالإنترنت";
  return new Response(JSON.stringify({ detail: detail }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

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

  /* 7) الصور (صور المنشآت/المنتجات): CacheFirst بحد 50 */
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
    const networkUpdate = fetch(request)
      .then(function (response) {
        if (response && response.ok) {
          return cache.put(request, response.clone());
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
      event.waitUntil(cache.put(request, fresh.clone()));
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
      event.waitUntil(cache.put(key, response.clone()));
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
    if (response && response.ok && !isAdmin) {
      /* نستنسخ فوراً قبل إرجاع الاستجابة — الاستنساخ المتأخر يفشل
         لأن جسم الاستجابة يكون قد بدأ استهلاكه (خطأ Body already used) */
      const clone = response.clone();
      event.waitUntil(
        caches.open(NAV_CACHE).then(function (cache) {
          return cache.put(request, clone);
        })
      );
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || Response.error();
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
  }
}

async function cacheFirstImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(request, response.clone());
      await trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
    }
    return response;
  } catch (err) {
    return Response.error();
  }
}
`;
}
