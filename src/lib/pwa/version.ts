/**
 * رقم إصدار تطبيقي «توفير» (العميل + المالك).
 * يُحقن في Service Worker ويُعرض في الإعدادات.
 * رفعه = عامل جديد ينتظر → رسالة «يتوفر تحديث لتطبيق توفير».
 *
 * الإصدار 1.1.0 — مرحلة PWA: manifest ديناميكي بهوية توفير + Service
 * Worker محدّث (StaleWhileRevalidate لـ /products /facilities /regions
 * /cards + NetworkOnly للتوكنات والعمليات الحساسة) + زر تثبيت بهوية
 * توفير + شاشة أوفلاين + سياسة خصوصية + assetlinks.
 */
export const APP_VERSION = "1.1.0";
