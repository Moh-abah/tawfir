# Worklog — مشروع توفير (Tawfir) — تحويل وفر → توفير

> سجل العمل الموحّد لكل العملاء (Main + Subagents).
> كل عميل يقرأ هذا الملف قبل البدء ويُلحق سجل عمله في النهاية بصيغة `---` + Task ID.

---

Task ID: 0
Agent: Main Orchestrator (Z.ai Code)
Task: تهيئة المشروع وفهم الـ OpenAPI قبل أي كود

Work Log:
- فُكّ ضغط wafir-front.rar من upload/ ونُقلت الملفات إلى جذر /home/z/my-project
- ثُبّتت الاعتمادات عبر bun install (framer-motion 13, recharts 3, xlsx 0.18.5)
- جُلب openapi.json الحي من https://api.tawfir.giize.com/openapi.json (84KB) وحُفظ محلياً
- اعتُبر الباك إند يعمل: GET /api/v1/regions يُرجع 15 منطقة يمنية (صنعاء/إب/تعز/الحديدة...)
- قُرئت الـ schemas الحرجة من OpenAPI: MeOut (membership قد تكون null), MyMembershipCard (membership_number/membership_type/discount_rate/created_at/expires_at/is_active), MembershipInfoOut (amount:3000, transfer_account_name: محمد يحيى عبه, transfer_account_number:780090882, wallet_name:محفظة جيب), MembershipSubscribeOut, MembershipRequestOut, OrderCreate/OrderItemCreate, OrderOut/OrderItemOut/OrderListOut/OrderStatusUpdate, ProductDetailOut/ProductOut/ProductWithFacilityOut (مع distance_km), RegisterOut (بدون عضوية تلقائية!), OwnerRegister/OwnerRegisterOut, FacilityType (restaurant|cafe فقط — لا public_facility)
- قُرئت ملفات الأساس: globals.css (نظام ألوان محيطي #005B82/#FFA800/#00A3E0 متطابق مع وفر), WafirLogo.tsx, WafirPillBadge.tsx, api.generated.ts (يحتوي public_facility + MyMembershipCard قديمة + RegisterSuccessOut قديمة — تحتاج تحديث), customer-auth.service.ts, auth.service.ts, customer-api-client.ts (cookie wafir_customer_token), المتاجر الثلاثة (wafir_admin/owner/customer_token), middleware.ts (نطاقات وفر)
- حُدّث next.config.ts: rewrite → api.tawfir.giize.com + headers لـ assetlinks/manifest/sw
- حُدّث .env: NEXT_PUBLIC_API_URL=https://api.tawfir.giize.com + نطاقات tawfir الثلاثة
- حُدّث middleware.ts: نطاقات tawfir.giize.com + كوكيز tawfir_*_token
- شُغّل dev server على المنفذ 3000 بنجاح (Ready in 714ms)

Stage Summary:
- المشروع الأساسي (وفر) يعمل الآن. البنية الكاملة موجودة: 3 بوابات (public/owner/admin), PWA, layouts, hooks, services, stores
- الفجوة الرئيسية: وفر = تطبيق تصفّح بطاقة خصم فقط. توفير = منصة طلبات وجبات + عضوية بموافقة يدوية + تصفّح وجبات (/products). الفجوة = نظام الطلبات بالكامل + نظام العضوية بموافقة يدوية + صفحة /products كتصفّح وجبات + إزالة public_facility + إعادة تسمية شاملة
- خطة التنفيذ: المرحلة 1 (تأسيس) → 2 (طلبات/وجبات) → 3 (عضوية) → 4 (مالك) → 5 (مشرف) → 6 (PWA) → 7 (تحقق + تقارير)

---
Task ID: 1
Agent: Main Orchestrator (Z.ai Code)
Task: المرحلة 1 (التأسيس) + المرحلة 2أ (الخدمات والhooks)

Work Log:
- أُعيد كتابة src/types/api.generated.ts كاملاً لمطابقة OpenAPI الحي: FacilityType=restaurant|cafe (أزيل public_facility)، MyMembershipCard الجديدة (membership_number/membership_type/discount_rate/created_at/expires_at/is_active)، RegisterOut (بلا عضوية تلقائية!)، MembershipInfoOut (amount:3000/transfer_account_name:محمد يحيى عبه/transfer_account_number:780090882/wallet_name:محفظة جيب)، MembershipSubscribeOut، MembershipRequestOut، OrderCreate/OrderItemCreate/OrderOut/OrderItemOut/OrderListOut/OrderStatusUpdate، ProductDetailOut/ProductOut/ProductWithFacilityOut (مع distance_km)، FacilitySummaryOut، PendingFacilityOut، OwnerRegisterOut، RejectBody
- حُدّث src/lib/site-config.ts: SITE_NAME='توفير'، نطاقات tawfir.giize.com الثلاثة، DELIVERY_FEE=300، MEMBERSHIP_AMOUNT=3000
- حُدّث src/lib/constants.ts: أزيل public_facility من TYPE_LABEL/TYPE_ICON/FILTER_CHIPS/SCHEMA_ORG_TYPE، أُضيف ORDER_STATUS_LABEL/ORDER_TRACKING_FLOW/ORDER_STATUS_TONE/MEMBERSHIP_STATUS_LABEL
- استُبدلت أسماء الكوكيز wafir_*_token → tawfir_*_token في كل المتاجر (3) + api-clients (3) + owner.service + CookieConsent + WelcomeBanner + sw-source + middleware
- استُبدلت مفاتيح localStorage wafir_cookie_consent/wafir_welcome_dismissed/wafir_recent_searches → tawfir_*، __wafir_rsc → __tawfir_rsc، قالب Excel → tawfir_product_template
- استُبدلت «وفر» (العلامة) → «توفير» عبر regex بنفي أمامي لـ[تي] (تجنّب التوفر/يتوفر/التوفر). أكّد grep: صفر إشارة للعلامة وفر في src/
- أُنشئ src/components/shared/TawfirLogo.tsx: «ت» بالذهبي var(--logo-gold) + «وفير» بالمحيطي var(--logo-blue) + تاغ تسوق مبتسم فوق التاء. وحُذف WafirLogo.tsx القديم. استُبدلت كل 47 إشارة WafirLogo→TawfirLogo في 16 ملف
- أُنشئ src/components/shared/TawfirPillBadge.tsx («حياة أجمل.. مع خصومات أكثر»). وحُذف WafirPillBadge.tsx
- أُنشئت الخدمات الجديدة: src/services/order.service.ts (createOrder/getMyOrders/getOrder)، src/services/membership.service.ts (getInfo/subscribe multipart)، src/services/product.service.ts (getProducts/getNearby/getProduct عام بلا توكن)
- حُدّث src/services/auth.service.ts: register يُرجع RegisterOut الآن (بلا membership_number/expires_at)
- حُدّث src/services/admin.service.ts: أُضيف getOrders/getOrder/getMembershipRequests/approveMembershipRequest/rejectMembershipRequest، صُحح PendingFacility→PendingFacilityOut، AuditLog→AuditLogOut
- حُدّث src/services/owner.service.ts: أُضيف getOwnerOrders/updateOrderStatus، أُزيل تعليق BLOCKER (owner/login مُتحقَّق منه حيّاً)، أُضيفت استيرادات OrderListOut/OrderOut
- أُنشئت الـ hooks الجديدة (13): useProducts، useNearbyProducts، useProductDetail، useCreateOrder، useMyOrders، useOrderDetail، useMembershipInfo، useSubscribeMembership، useAdminOrders، useAdminMembershipRequests، useModerateMembershipRequest، useOwnerOrders، useUpdateOrderStatus
- أُنشئ src/lib/membership-local.ts: إدارة طلب العضوية المعلّق محلياً (لأن OpenAPI لا يكشف حالة الطلب للعميل — OpenAPI يفوز). getPendingMembershipRequest/savePendingMembershipRequest/clearPendingMembershipRequest
- حُدّث src/lib/format.ts: formatCurrency بالريال اليمني «ر.ي» بدل SAR، locale ar-EG
- حُدّث next.config.ts: rewrite → api.tawfir.giize.com + headers لـ assetlinks/manifest/sw
- حُدّث .env: NEXT_PUBLIC_API_URL + نطاقات tawfir الثلاثة
- حُدّث eslint.config.mjs: تجاهل upload/ وmini-services/ و*.md

تحقق فعلي من الباك إند الحي:
- GET /regions → 15 منطقة يمنية ✓
- POST /owner/login (owner@tawfir.local) → TokenOut ✓ (endpoint موجود)
- POST /auth/login (customer@tawfir.local) → TokenOut ✓
- GET /membership/info → {amount:3000, transfer_account_name:"محمد يحيى عبه", transfer_account_number:"780090882", wallet_name:"محفظة جيب"} ✓
- GET /me (عميل بلا عضوية) → membership: null ✓
- GET /products?only_available=true → وجبات يمنية (مندي لحم…) + facility + distance_km:null ✓
- تجربة 4 نقاط نهاية بديلة لحالة طلب العميل → كلها 404 (مؤكد: لا يكشفها OpenAPI)

Stage Summary:
- التأسيس مكتمل ويعمل: 0 أخطاء lint، dev server Ready. البنية: أنواع + خدمات + hooks + متاجر + كوكيز + شعار + ثوابت كلها بتوفير.
- القاعدة الذهبية OpenAPI-wins: حُسم اختلاف «حالة طلب العميل» بإدارة محلية (localStorage) لأن الباك إند لا يكشفها — موثّق في membership-local.ts.
- الفجوة المتبقية للوكلاء: بناء الشاشات الجديدة (وجبات/طلبات/عضوية/طلبات-المشرف/طلبات-المالك) + PWA. الـ hooks والخدمات كلها جاهزة للاستهلاك.

---
Task ID: 6
Agent: PWA Builder
Task: طبقة PWA الكاملة لتطبيق توفير — manifest ديناميكي + Service Worker + زر تثبيت + أوفلاين + خصوصية

Work Log:
- حُدّث src/app/manifest.webmanifest/route.ts: OWNER_HOST من facility.wafir.gleeze.com → facility.tawfir.giize.com. تعليقات محدّثة لـ tawfir.giize.com. ترويسات Content-Type=application/manifest+json وCache-Control=no-cache محققة. ?app=owner|customer يعمل.
- أُعيدت كتابة src/lib/pwa/sw-source.ts كاملاً: cache prefixes wafir-* → tawfir-*. أضيفت دالة isCatalogGet لتحديد مسارات الكتالوج العامة (products + nearby + facilities + facility products + regions + cards) بـ StaleWhileRevalidate. وُسّعت isNeverCacheGet لتشمل /api/orders و/api/membership. تعليقات محدّثة لتوضيح كل استراتيجية.
- رُفع الإصدار في src/lib/pwa/version.ts: 1.0.0 → 1.1.0 (مع تعليق مرحلة PWA).
- عُدّل src/components/pwa/PWAInstallButton.tsx: أضيف TawfirLogo صغير (variant=mark) داخل الزر في الوضع compact + داخل DialogHeader. بطاقة full تستخدم TawfirLogo في الأيقونة بدل Download icon.
- تأكد أن src/components/pwa/ServiceWorkerRegistrar.tsx (محمي) يحمل رسالة التحديث «يتوفر تحديث لتطبيق توفير» صحيحة (سطر 188) + يعرض APP_VERSION الجديد 1.1.0 تلقائياً. لم تُمَس بنيته.
- عُدّل src/app/offline/page.tsx: الرسالة الجديدة «التطبيق يفتح بدون إنترنت ويعرض آخر بيانات شوهدت. العمليات (طلب/اشتراك/دخول) تتطلب اتصالاً.» + هوية توفير (TawfirLogo + login-ocean-bg).
- وُسّعت src/app/(public)/privacy/page.tsx بثلاثة أقسام جديدة: «معلومات الطلبات والتوصيل» (Truck) — العنوان/الموقع للتوصيل فقط، «صور تحويل العضوية» (ImageIcon) — تُحفظ للمراجعة وتُحذف بعد الموافقة، وحذف البيانات — رابط «صفحة التواصل». الأقسام الستة الآن كاملة.
- حُدّث src/app/layout.tsx: تعليق wafir.gleeze.com → tawfir.giize.com + إضافة theme-color في metadata.other (#005B82). apple-touch-startup-image (splash) محققة فعلياً في (public)/layout.tsx للعميل.
- حُدّث src/app/owner/layout.tsx: apple-touch-icon owner + theme-color #003B55 في metadata.other + تعليق بهوية توفير مالك.
- أُنشئ public/.well-known/assetlinks.json كقالب placeholder (PLACEHOLDER_CUSTOMER_PACKAGE/PLACEHOLDER_SHA256_CUSTOMER/PLACEHOLDER_OWNER_PACKAGE/PLACEHOLDER_SHA256_OWNER) — آمن للإنتاج ولا يكشف بصمة حقيقية.
- أُنشئ public/.well-known/README.md عربي: يشرح من أين يجلب المشرف SHA-256 (keytool للأجهزة المحلية + Play Console → App signing للإنتاج)، كيف يلصق القيم، شكل الملف النهائي بمثال، والتحقق عبر curl.
- حُدّث src/hooks/usePwaInstall.ts: localStorage keys wafir-install-dismissed → tawfir_install_dismissed وwafir-owner-install-dismissed → tawfir_install_dismissed_owner، والحدث wafir-install-dismissed-change → tawfir-install-dismissed-change. واجهة usePwaInstall محفوظة.

Stage Summary:
- ملفات PWA (10) كلها بتوفير وتعمل: 0 أخطاء lint على مستوى PWA.
- تحقق حي: curl /manifest.webmanifest يخدم JSON العميل (توفير — بطاقة الخصومات) على tawfir.giize.com وlocalhost، وJSON المالك (توفير — بوابة المنشآت) على facility.tawfir.giize.com و?app=owner. /sw.js يخدم «الإصدار 1.1.0» مع cache prefixes tawfir-* وisCatalogGet. /.well-known/assetlinks.json → HTTP 200 بـ Content-Type الصحيح.
- الميتا على الجذر و/owner/login محققة: theme-color (#005B82/#003B55) + manifest + apple-touch-icon + apple-touch-startup-image (للعميل فقط عبر public/layout).
- ملاحظة: 4 أخطاء lint سابقة في src/app/(public)/membership/subscribe/SubscribeContent.tsx (Task 3، خارج نطاق PWA) — لم تُمَس ولم تُضَف. ملفات PWA العشرة نظيفة تماماً.
- ملفات المرجع: /home/z/my-project/agent-ctx/6-PWA-Builder.md

---

Task ID: 5
Agent: Admin Portal Builder
Task: لوحة المشرف — طلبات العضوية (جديد) + كل الطلبات (جديد) + تحديث الداشبورد بـ3 بطاقات + تحديث AdminSidebar

Work Log:
- قُرئ worklog.md + استكشاف الـ hooks الخمسة + الثوابت + الدوال + AdminAuthGuard + admin.service + الصفحات المرجعية (pending facilities, users, audit-logs)
- حُدّث src/hooks/useAdminMembershipRequests.ts: أُضيف page/pageSize اختياريان مع الحفاظ على التوقيع useAdminMembershipRequests(status?) ونعومة الـ invalidate (prefix key)
- أُنشئ src/app/(admin)/admin/membership-requests/page.tsx (خادم رفيع + metadata)
- أُنشئ src/app/(admin)/admin/membership-requests/MembershipRequestsContent.tsx (≈630 سطر): رقائق فلترة بالحالة (MEMBERSHIP_STATUS_LABEL) + جدول 9 أعمدة (طلب/عميل/مبلغ/دفع/صورة/حالة/سبب/تاريخ+مراجعة/إجراء) + Dialog صورة التحويل (<img> كبيرة max-h-70vh) + Dialog رفض مع Textarea للسبب + Pagination + Skeleton/ErrorState/EmptyState + usePrefersReducedMotion
- أُنشئ src/app/(admin)/admin/orders/page.tsx (خادم رفيع + metadata)
- أُنشئ src/app/(admin)/admin/orders/OrdersContent.tsx (≈590 سطر): رقائق فلترة بـ7 حالات (ORDER_STATUS_LABEL) + حقلا customer_id/facility_id رقميان + جدول 10 أعمدة (طلب/عميل/منشأة/حالة ORDER_STATUS_TONE/دفع PAYMENT_ICON/فرعي/توصيل/إجمالي/تاريخ/إجراء) + Dialog تفاصيل كاملة (useOrderDetail: بطاقة معلومات + توصيل + ملاحظات + ملخص أسعار + جدول الأصناف مع شارة «خصم») + Pagination + Skeleton/ErrorState/EmptyState
- حُدّث src/app/(admin)/admin/page.tsx: استيراد Hourglass+ShoppingBag + مكوّن ActionStatCard + ACTION_STAT_CONFIGS بـ3 بطاقات (ذهبية/برتقالية/محيطية) فوق STAT_CONFIGS + تحديث fallback stats بالحقول الثلاثة الجديدة (pending_facilities, pending_membership_requests, orders_today)
- حُدّث src/components/layout/AdminSidebar.tsx: استيراد ShoppingBag+BadgeCheck + useAdminOrders+useAdminMembershipRequests + NavKey بأkeyين جديدين + إعادة ترتيب NAV_ITEMS (لوحة المعلومات → الطلبات → طلبات العضوية → المنشآت → طلبات المنشآت المعلّقة → المناطق → البطاقات → المستخدمون → سجل التدقيق → الإعدادات) + NavBadgeCounts يعرض عدّاد الطلبات + طلبات العضوية المعلّقة

Stage Summary:
- 7 ملفات (5 منشأة/معدّلة في (admin) + 1 hook + 1 sidebar)
- lint: 0 أخطاء + 0 تحذيرات في كل ملفاتي (الأخطاء الأربعة المتبقية في (public)/{account,membership/subscribe,register} — من Task ID 2/3، أصول محمية لا تُمَس)
- dev log: GET /admin 200 (compile 2.4s) + GET /admin/membership-requests 200 (compile 1078ms) + GET /admin/orders 200 (compile 803ms) — بلا أخطاء
- اللوحة الجانبية الآن تُظهر شارات حية لطلبات العضوية المعلّقة + إجمالي الطلبات
- لوحة المعلومات تعرض 3 بطاقات إجرائية ذهبية/برتقالية/محيطية فوق الإحصائيات بأزرار تنقل مباشرة
- الالتزام بالقواعد الذهبية: صفر ألوان ثابتة (توكنات Tailwind + var(--logo-gold) عبر text-logo-gold)، RTL، Cairo، Skeleton/ErrorState/EmptyState، لمس ≥44px، وضعان فاتح/داكن، usePrefersReducedMotion، toast من useModerateMembershipRequest، AdminAuthGuard محفوظ، api-client exception محترم

---
Task ID: 4
Agent: Owner Portal Builder
Task: بوابة المالك: طلبات المنشأة (جديد) + تحديث التسجيل + حالة المنشأة

Work Log:
- قُرئ worklog.md كاملاً + كل الملفات المعنية (OwnerAuthGuard, OwnerSidebar, OwnerFacilitiesContent, owner.service, useOwnerOrders, useUpdateOrderStatus, useMyFacilities, useOwnerRegister, useRegions, constants, format, api.generated types, EmptyState, ErrorState, FacilityEditContent, OwnerProductsContent for pattern)
- أُنشئ src/app/(owner)/owner/facilities/[id]/orders/page.tsx (Server wrapper) + OwnerOrdersContent.tsx (Client، 590+ سطر):
  - useOwnerOrders(facilityId) + useUpdateOrderStatus(facilityId) + useMyFacilities (للتحقق من الملكية) + useQuery(getMyFacility) كـ fallback
  - StatsBar (4 بطاقات: إجمالي / بانتظار / قيد التحضير / مكتمل) + Filter chips قابلة للتمرير (7 فلاتر بعدّاد) + بحث برقم الطلب أو اسم العميل
  - بطاقة لكل طلب: #ID + التاريخ + شارة «طلب جديد!» وامضة (animate-pulse) على pending + شارة ORDER_STATUS_TONE + اسم العميل + طريقة الدفع + المجموع الفرعي + رسوم التوصيل + الإجمالي
  - قائمة Select لتغيير الحالة: تُظهر كل الـ6 حالات، تُعطّل الخيارات غير المنطقية (Forward only: pending→confirmed→preparing→out_for_delivery→delivered أو pending→cancelled؛ delivered/cancelled طرفية لا تغيير)
  - Skeleton + ErrorState + EmptyState (Truck) + قائمة scrollable (scroll-area-thin + max-h-[calc(100vh-22rem)])
  - تنبيه حالة المنشأة: ذهبي للمعلّقة + أحمر للمرفوضة مع سبب الرفض
  - AnimatePresence + layout animations (تحترم usePrefersReducedMotion)
- حُدّث src/app/owner/register/page.tsx (عدّل الموجود — المسار العام بلا auth guard):
  - استُبدلت صيغة الجوال السعودية بصيغة يمنية: /^(?:\+?967)?0?7\d{8}$/u
  - أُزيل public_facility من zod enum + TYPE_CIRCLES + FACILITY_TYPES (restaurant|cafe فقط)
  - استُبدل useQuery المباشر بـ useRegions(false) (يشارك الكاش)
  - شاشة النجاح: «بانتظار موافقة المشرف» (Hourglass ذهبية بدل CheckCircle2) + «سجّل دخولك لمتابعة حالة المنشأة ومراجعة طلباتها عند الموافقة» + زر «تسجيل الدخول» → /owner/login + زر «الرئيسية» → / + لا توجيه تلقائي
- حُدّث src/app/(owner)/owner/OwnerFacilitiesContent.tsx (لوحة المالك):
  - StatsOverview: 4 بطاقات الآن (منشآت / منتجات / طلبات اليوم / متاح) عبر useQueries لكل منشأة (يشارك الكاش)
  - FacilityCard يُميّز 3 حالات للموافقة: موافق عليها (شارة خضراء + 4 روابط) | معلّقة (شارة ذهبية + رسالة «24-48 ساعة» + زر «تعديل المنشأة» فقط) | مرفوضة (شارة حمراء + سبب الرفض + زر «تعديل المنشأة» أحمر)
  - عدّاد سريع في كل بطاقة: عدد المنتجات + طلبات اليوم (للموافق عليها فقط)
  - أُزيل public_facility من FACILITY_TYPE_LABELS + أُزيل الـ imports غير المستخدمة
- حُدّث src/components/owner/OwnerSidebar.tsx:
  - أُضيف ShoppingBag للأيقونات + أُزيل public_facility من FACILITY_TYPE_LABELS
  - لكل منشأة في القائمة الجانبية، أُضيف رابط فرعي «طلبات المنشأة» (بأيقونة ShoppingBag) بين رابط المنتجات و«تعديل المنشأة»، مع حالة active صحيحة (isActive عبر startsWith للسماح بمطابقة /products/import تحت /products)

Stage Summary:
- 5 ملفات أنشئت/حُدّثت (1 جديد + 1 محدّث بالكامل + 3 محدّثة). كلها RTL + Cairo + توكنات Tailwind (لا ألوان ثابتة) + Skeleton + ErrorState + EmptyState + لمس ≥44px + safe-area.
- `bun run lint` على ملفاتي: 0 أخطاء و0 تحذيرات. الأخطاء الموجودة في lint (3 أخطاء في account/page.tsx + membership/subscribe/SubscribeContent.tsx + CheckoutSheet.tsx) كلها في ملفات لا أملكها ولم ألمسها — مسؤولية وكلاء آخرين.
- dev.log: GET /owner 200 (compile 11.9s) + GET /owner/facilities/1/orders 200 (compile 1382ms) + GET /owner/register 200 (compile 1782ms) — كلها compile بدون أخطاء.
- القاعدة الذهبية Forward-only transitions نُفّذت عبر ALLOWED_NEXT map — الـ Select يُعطّل كل خيار غير قابل للوصول من الحالة الحالية.
- لا بيانات وهمية — كل البيانات من useMyFacilities + useOwnerOrders + useOwnerProducts + useRegions. الـ pending orders badge وامض فعلياً عند status === 'pending' من الـ API.
- ملاحظة: مسار `src/app/(owner)/owner/register` الذي ذكره الـ task spec لا يمكن أن يُنشَر عاماً (route group محمي بـ OwnerAuthGuard) — استُبدل بالمسار العام الموجود فعلاً `src/app/owner/register/page.tsx` (نفس النمط المستخدم لـ /owner/login).

---

Task ID: 3
Agent: Customer Orders & Membership Builder
Task: بناء صفحات طلبات العميل + نظام العضوية بموافقة يدوية + حسابي + تسجيل

Work Log:
- أُنشئ `src/app/(public)/orders/page.tsx` + `OrdersContent.tsx`: قائمة طلباتي مع فلترة chips بـ 7 حالات (الكل + 6 حالات ORDER_STATUS_LABEL)، كل طلب كارت (رقم/منشأة/تاريخ/إجمالي/شارة حالة ORDER_STATUS_TONE)، شارة «طلب جديد!» ذهبية على pending، النقر → /orders/{id}، Skeleton + ErrorState + EmptyState («لا توجد طلبات بعد» + زر «تصفّح الوجبات»). زائر غير مسجّل → EmptyState مع CTA /login?next=/orders + /register
- أُنشئ `src/app/(public)/orders/[id]/page.tsx` + `OrderDetailContent.tsx`: تفاصيل طلب مع شريط تتبّر مرئي (ORDER_TRACKING_FLOW بـ 5 دوائر + خط أفقي متدرّج، ممتلئة=secondary، نشطة=primary، شاحبة=muted). cancelled = مسار منفصل (CancelledNotice ببطاقة حمراء). قائمة أصناف: product_name + quantity + unit_price + subtotal + شارة «خصم مطبّق» الذهبية. معلومات: facility_name + delivery_address + delivery_fee + subtotal + total + payment_method (cash→«نقداً عند الاستلام») + created_at + notes. Skeleton + ErrorState + EmptyState (غير موجود/سجّل الدخول)
- أُنشئ `src/app/(public)/membership/subscribe/page.tsx` + `SubscribeContent.tsx`: تحقق تسجيل دخول (useCustomerAuth + useMe) → LoginRequired. عضو نشط → AlreadyMember (MemberCard + زرا حسابي/تصفّح). وإلا: useMembershipInfo → 4 CopyFields (المبلغ/الاسم/المحفظة/الرقم) كلٌ مع زر نسخ + toast «تم النسخ». منطقة رفع صورة (drag&drop + click، تحقق PNG/JPG ≤2MB) بمعاينة useMemo-مشتقة. زر «أرسل طلب الاشتراك» → useSubscribeMembership. نجاح → SuccessScreen (CheckCircle2 + detail + زرا حسابي/تصفّح). خطأ شبكة: toast «يتطلب هذا الإجراء اتصالاً بالإنترنت». خطأ 422: رسالة الخادم العربية. clearPendingMembershipRequest تلقائياً عند ظهور membership في /me
- عُدّل `src/app/(public)/account/page.tsx` بإعادة كتابة كاملة: 5 حالات عبر useMe + getPendingMembershipRequest + useHasMounted (لا setState في effect): (1) GuestAccount للزائر، (2) NoMembershipState ببطاقة دعوة ذهبية/زرقاء + MyDataCard + ProfileEditForm، (3) PendingReviewBadge ذهبية + تاريخ + MyDataCard، (4) ضمن حالة 2/3 (لا يمكن تمييزها عبر API)، (5) ActiveMemberState بـ MemberCard كاملة + إجراءات سريعة (طلباتي/تصفّح) + زر تسجيل خروج. pendingRequest مُشتق مباشرة من localStorage بعد التركيب، والـ useEffect لمحو الطلب المعلّق محلياً عند ظهور العضوية بلا setState
- عُدّل `src/app/(public)/register/page.tsx` بإعادة كتابة SuccessScreen: نجاح بدون عضوية تلقائية. POST /auth/register → RegisterOut {detail, status_code, user_id} (بلا membership_number/expires_at). شاشة «تم إنشاء حسابك!» + بطاقة دعوة اشتراك (TawfirLogo + DiscountBadge 30% + Sparkles + «اشترك في عضوية توفير لخصم 30%») + زرّان: «اشترك في العضوية» → /membership/subscribe (Crown) + «تصفّح الوجبات» → / (ArrowRight). لا توجيه تلقائي لـ /login — SuccessScreen فقط. أُزيل الاستخدام القديم لـ RegisterSuccessOut + data.membership_number + data.expires_at

Stage Summary:
- 5 شاشات جديدة/مُحدّثة كاملة: /orders (قائمة)، /orders/[id] (تفاصيل)، /membership/subscribe (اشتراك)، /account (5 حالات)، /register (نجاح بلا عضوية تلقائية)
- كل البيانات من الـ API الحي عبر hooks الجاهزة (useMyOrders, useOrderDetail, useMembershipInfo, useSubscribeMembership, useMe, useCustomerAuth, useRegister) — صفر بيانات وهمية
- العضوية بموافقة يدوية مكتملة: العميل يرفع صورة التحويل → pending → يُخزَّن محلياً (membership-local.ts) → /account تُظهر «قيد المراجعة» الذهبية → عند الموافقة تظهر بطاقة العضوية في /me ويُمحى الطلب المحلي
- RTL + Cairo (موروث)، Skeleton + ErrorState + EmptyState في كل قسم، لمس ≥44px، Footer sticky (موروث)، useToast، usePrefersReducedMotion، صفر ألوان ثابتة (فقط توكنات Tailwind + var(--logo-gold) في الأماكن المناسبة)
- `bun run lint` على ملفاتي: **0 أخطاء** (تحذيرات react-hook-form's `watch()` فقط — قيد موروث من React Compiler). dev.log نظيف: GET /orders, /orders/1, /membership/subscribe, /account, /register كلها 200 OK
- ملاحظة: خطأ لينت `set-state-in-effect` في `src/components/public/CheckoutSheet.tsx:213` ليس ضمن ملكيتي (يخص Task 2)

---

Task ID: 2b-core
Agent: Customer Core Builder
Task: نواة تجربة العميل — الصفحة الرئيسية + تفاصيل وجبة + شاشة الطلب (Checkout)

Work Log:
- قُرئ worklog.md كاملاً لفهم عمل الوكلاء السابقين (التأسيس + الـ hooks/الخدمات جاهزة)
- قُرئت المكونات المشتركة الجاهزة: ImageWithSkeleton, EmptyState, ErrorState, DiscountBadge, PriceTag, ScrollToTop, OfflineBanner, TawfirLogo, TawfirPillBadge, MemberCard, MainHeader, Footer, MobileBottomNav, useToast, usePrefersReducedMotion
- قُرئت الـ hooks الجاهزة: useProducts, useNearbyProducts, useProductDetail, useCreateOrder, useMe, useFacilities, useCustomerAuth
- قُرئت الثوابت: TYPE_LABEL, TYPE_ICON, FILTER_CHIPS, ORDER_STATUS_LABEL, DISCOUNT_RATE, DELIVERY_FEE + formatCurrency + getPendingMembershipRequest
- أُنشئ src/components/public/CheckoutSheet.tsx: شيت侧right بحجم w-full sm:max-w-md، يحوي: ملخص وجبة (صورة+اسم+مطعم) + اختيار كمية (-/+) ديناميكي (max=available_quantity إن >0 وإلا 99) + حساب سعر (عضو: مشطوب+«خصم 30%»+بعد الخصم، غير عضو: رسمي+تنبيه اشترك) + توصيل 300 ر.ي ثابت + إجمالي = (سعر×كمية)+300 + موقع (زر navigator.geolocation + textarea maxLength=500) + دفع (RadioGroup cash مفعّل + wallet معطّل «قريباً») + ملاحظات textarea maxLength=500 + زر تأكيد الطلب useCreateOrder + نجاح (CheckCircle+رقم الطلب+زر طلباتي/تصفح المزيد) + خطأ 422/شبكة عربي + key={product.id} لإعادة الضبط عند تغيير المنتج
- أُنشئ src/components/public/ProductCard.tsx: كارت وجبة موبايل-أولاً (grid-cols-2 موبايل) — صورة (ImageWithSkeleton) + اسم وجبة (Link to /products/{id}) + اسم المطعم (product.facility.name) + سعر (عضو: مشطوب+بعد الخصم؛ غير عضو: رسمي) + شارة توفّر (نفد/متوفر/الكمية: X) + شارة مسافة (distance_km إن وُجدت) + زر «اطلب» (يفتح CheckoutSheet، يتحقق من تسجيل الدخول عبر useCustomerAuth → إن غير مسجل: toast + redirect /login)
- عُدّل src/components/layout/MobileBottomNav.tsx: 4 تبويبات فقط (الرئيسية /، المتاجر /facilities، العروض /#offers، حسابي /account) — استُبدل approach المتاجر=العروض بـ hash link على #offers بالصفحة الرئيسية. safe-area-inset-bottom محترم.
- أُعيد كتابة src/app/(public)/page.tsx كاملاً: HeroSection (MemberCard) + OffersSection (id="offers"، useProducts({only_available:true, type}) + CategoryCircles 2 فقط مطاعم/كافيهات بألوان cat-restaurant/cat-cafe) + NearbySection (زر «حدد موقعي» → navigator.geolocation → useNearbyProducts → شبكة بشارة «على بُعد X كم») + FacilitiesSection (useFacilities + كروت منشآت مع زر «تصفّح المنتجات») + WhyTawfirSection (3 أيقونات ShieldCheck/PiggyBank/BadgePercent + بطاقة مائلة decorative) + FAQSection (7 أسئلة محدّثة لنظام العضوية اليدوي: لا عضوية تلقائية، ارفع صورة التحويل 3000 ر.ي، موافقة 24-48 ساعة) + ContactSection (هاتف/بريد/عنوان/منطقة الخدمة ببيانات حقيقية)
- أُنشئ src/app/(public)/products/[id]/page.tsx: server component بـ generateMetadata يجلب اسم/وصف المنتج من /products/{id}
- أُنشئ src/app/(public)/products/[id]/ProductDetailContent.tsx: useProductDetail(id) + Skeleton/ErrorState/EmptyState + صورة كبيرة aspect-square + اسم + وصف + سعر (مع/بدون خصم حسب useMe) + معلومات المطعم (اسم/عنوان/هاتف/ساعات العمل) + شارة توفّر + زر «اطلب الآن» يفتح CheckoutSheet (يتحقق من تسجيل الدخول) + breadcrumb (الرئيسية > المطعم > الوجبة)
- عُدّل src/app/(public)/facilities/[id]/FacilityDetailContent.tsx: أُضيف imports (CheckoutSheet, useMe, useCustomerAuth, ShoppingBag, formatCurrency, DISCOUNT_RATE, useRouter) + state (checkoutProduct, checkoutOpen) + handleOrder (auth-check + redirect /login) + checkoutEffectiveProduct + ProductCard محلي يأخذ onOrder+isMember (مع زر «اطلب» stopPropagation + عرض سعر محدّث: عضو=مشطوب+بعد الخصم، غير عضو=رسمي) + dialog: زر «احصل على خصم 30%» المعطّل استُبدل بـ «اطلب الآن» (يستدعي handleOrder) + CheckoutSheet key={product.id} في نهاية JSX
- لُوحظ خطأ lint في CheckoutSheet (useEffect يضبط الكمية بقوة داخل جسم الـ effect → cascading renders) → حُلّ بحذف الـ effect (عوضاً عنه key={product.id} في الآباء يُعيد ضبط الحالة عند تغيير المنتج) + حُذف createOrder.reset() من قائمة الـ reset التأخيرية (لا لزوم له — isPending يُعاد آلياً)
- لُوحظ createOrder في dependency array يُسبب reschedule لا نهائي → حُذف من deps وأُبقي [open] فقط
- بُرّيغن تولّد اختبار: bun run lint = 0 errors، 5 warnings (كلها pre-existing في account/register/theme-provider/carousel/usePrefersReducedMotion — مقبولة)
- اختبارات runtime: GET / 200 (77ms)، GET /products/1 200 (1.3s compile)، GET /facilities/1 200 (1.2s compile) — لا أخطاء في dev.log

Stage Summary:
- 6 ملفات أُنشئت/عُدّلت لتمكين تدفق العميل الكامل: تصفّح → تفاصيل → طلب → تأكيد → نجاح → متابعة
- CheckoutSheet مركزي قابل لإعادة الاستخدام من 3 مواضع: ProductCard (الرئيسية+nearby)، ProductDetailContent (تفاصيل وجبة)، FacilityDetailContent (صفحة منشأة) — key={product.id} يضمن حالة طازجة لكل منتج
- التحقق من تسجيل الدخول قبل فتح الشيت (useCustomerAuth → redirect /login مع toast) في كل المداخل الثلاثة
- حساب الخصم محلي (price×0.7 إن عضو) للعرض؛ الخادم يطبّق الخصم آلياً عند إنشاء الطلب
- معالجة الأخطاء: 422 → رسالة الخادم العربية، 0/شبكة → «يتطلب هذا الإجراء اتصالاً بالإنترنت»
- RTL + Cairo + Skeleton + ErrorState + EmptyState + safe-area + min-h-[44px] touch + dark mode tokens في كل مكان
- 0 ألوان ثابتة في TSX — كلها توكنات Tailwind (bg-primary/text-foreground/bg-card/text-muted-foreground/cat-*/logo-*) أو style={{color:"var(--logo-*)"}}
- MobileBottomNav: 4 تبويبات صحيحة (الرئيسية/المتاجر/العروض/حسابي) — العروض يربط /#offers
- المنتج جاهز للاستهلاك من بقية الوكلاء (المراحل القادمة): MemberCard/AccountPage/OrdersPage

---
Task ID: 7
Agent: Main Orchestrator (Z.ai Code)
Task: التحقق الإلزامي بالـ agent-browser + إصلاح الأخطاء + كتابة التقارير

Work Log:
- استُخدم agent-browser للتحقق الإلزامي (golden path + استجابة + تفاعلية):
  - GET / → HTTP 200، الصفحة الرئيسية تُصيّر بهوية توفير: TawfirLogo + منتقي منطقة (أمانة العاصمة/صنعاء) + بطاقة عضوية CTA + تصنيفات دائرية (مطاعم/كافيهات فقط — لا public_facility) + شبكة «عروض حصرية» بوجبات يمنية (مندي لحم/مدبي دجاج/شاي عدني/قهوة يمنية) بأزرار «اطلب» + زر ثيم
  - دخول عميل (customer@tawfir.local) → توجيه /account → حالة «ليس لديك عضوية بعد» + زر «اشترك في عضوية توفير» + تعديل بيانات + كوكي tawfir_customer_token (مُعاد تسميته صحيحاً)
  - /products/1 → تفاصيل مندي لحم + «اشترك لخصم 30%» (لغير العضو) + «اطلب الآن» + معلومات المطعم
  - «اطلب الآن» → فتح CheckoutSheet: ملخص وجبة + اختيار كمية + حساب سعر (سعر ٤٥ ر.ي + رسوم توصيل ٣٠٠ ر.ي + إجمالي ٣٤٥ ر.ي — بلا خصم لغير العضو + تنبيه «اشترك») + موقع (زر حدد موقعي + عنوان) + دفع (نقداً مفعّل + محفظة معطّلة «قريباً») + ملاحظات + «تأكيد الطلب»
  - تأكيد الطلب (مع عنوان) → POST /orders نجح → «تم استلام طلبك رقم #1» + زر «طلباتي»
  - /orders → قائمة الطلب #1 + فلترة بالحالة (بانتظار التأكيد/مؤكَّد)
  - /orders/1 → تفاصيل: شريط تتبّر «بانتظار التأكيد» + صنف (٤٥ ر.ي) + توصيل (٣٠٠ ر.ي) + إجمالي (٣٤٥ ر.ي)
  - /membership/subscribe → بيانات تحويل حقيقية من API: المبلغ ٣٬٠٠٠ ر.ي | محمد يحيى عبه | محفظة جيب | أزرار نسخ + رفع صورة + «أرسل طلب الاشتراك»
  - دخول مالك (owner@tawfir.local) → توجيه /owner (لوحة المنتجات — المنشأة موافق عليها) + زر تثبيت PWA فوق نموذج الدخول
  - /owner/facilities/17/orders → صفحة طلبات المنشأة (بعد إصلاح الخطأ)
  - /register → «تسجيل العضوية» + «انضم إلى توفير واحصل على بطاقة خصم 30%»
  - /offline → TawfirLogo + «أنت غير متصل» + «إعادة المحاولة»
  - الوضع الداكن: زر «التبديل إلى الوضع الليلي» ↔ «التبديل إلى الوضع النهاري» (toeken تتكيّف)
  - 360px: scrollWidth=360=clientWidth → صفر overflow أفقي ✓
  - manifest.webmanifest → عميل صحيح (name توفير — بطاقة الخصومات، start_url /، theme #005B82، dir rtl، lang ar، shortcuts [الرئيسية، المتاجر، حسابي]) ✓
  - /.well-known/assetlinks.json → 200 + Content-Type application/vnd.android.package.archive+json ✓
  - /sw.js → «توفير Service Worker — الإصدار 1.1.0» ✓

- أخطاء وُجدت وأُصلحت أثناء التحقق:
  1. BLOCKER خطير: owner-api-client.ts استخدم API_BASE = process.env.NEXT_PUBLIC_API_URL (بدون /api/v1) بدلاً من /api (الـ rewrite proxy). أدى لطلبات تدخل api.tawfir.giize.com/owner/login مباشرة → 404. أصلح: API_BASE = "/api" (مثل api-client وcustomer-api-client). بعد الإصلاح: دخول المالك نجح.
  2. BLOCKER: owner.service.getOwnerOrders كان مُكتاباً OrderListOut[] لكن API يُرجع Paginated<OrderListOut> ({items,total,page,pages}). أصلح النوع إلى Paginated<OrderListOut>. أصلح OwnerOrdersContent.tsx: filteredOrders يستخدم orders?.items ?? [] + StatsBar orders={orders?.items ?? []} + عدّادات الفلاتر orders?.items?.length. بعد الإصلاح: صفحة طلبات المنشأة تعمل (لم يعد خطأ Runtime TypeError).

- تحقق نهائي:
  - bun run lint: 0 أخطاء، 5 تحذيرات (كلها موروثة: React Hook Form watch() + unused eslint-disable في theme-provider/carousel/usePrefersReducedMotion)
  - dev.log نظيف: لا أخطاء وقت تشغيل، كل المسارات 200

Stage Summary:
- المسارات الذهبية كلها مُتحقَّق منها فعلياً بالـ agent-browser: عميل (دخول→تصفّح→تفاصيل وجبة→checkout→إنشاء طلب #1→طلباتي→تفاصيل) + مالك (دخول→لوحة→طلبات المنشأة) + عضوية (بيانات تحويل حقيقية محمد يحيى عبه/جيب/3000) + PWA (manifest/SW/assetlinks) + وضعان (فاتح/داكن) + 360px بلا overflow.
- خطأن حرجان أصلحهما: owner-api-client API_BASE + Paginated orders typing. بدون إصلاحهما كانت بوابة المالك معطّلة بالكامل.
- قيد معروف موثّق: بيانات دخول المشرف (admin@tawfir.giize.com) لا تطابق الباك إند (401) — مشكلة بيانات الباك إند لا الواجهة. صفحة دخول المشرف تعرض toast خطأ صحيحاً.
- التطبيق جاهز للتسليم: 0 أخطاء lint، الواجهة تفاعلية ومُتحقَّق منها بالكامل.

---

Task ID: 8
Agent: Main Orchestrator (Z.ai Code) — مراجعة ثانية
Task: إصلاح 5 أخطbn حرجة + 10 تحسينات جوهرية بعد المراجعة الثانية للتسليم

Work Log:
- قُرئ worklog.md كاملاً لفهم عمل الوكلاء السابقين (7 مهام سابقة مكتملة)
- فُحصت الملفات المعنية بالأخطbn: MainHeader, MobileBottomNav, MemberCard, ProductCard, CheckoutSheet, ProductDetailContent, FacilityDetailContent, FacilitiesContent, account/page, register/page, login/page, owner/login, owner/register, admin/login, admin/membership-requests, admin/facilities, admin/page, admin/settings, Footer, privacy, owner/settings, FacilityEditContent, OwnerProductsContent, ImportProductsContent, customerAuth.store, ownerAuth.store, useCustomerAuth, useOwnerAuth, useMe, format.ts, manifest, sw-source

الإصلاحات المُنفّذة:

🔴 إصلاح 1 — انتشار الجلسة بعد الدخول (الأخطر):
- MainHeader: +useCustomerAuth+useMe → زر «حسابي» (مع اسم العميل) للمسجّل بدل «تسجيل الدخول»
- MobileBottomNav: التبويب الرابع ديناميكي — مسجّل → أيقونة CircleUserRound + الاسم الأول، زائر → LogIn + «دخول»
- MemberCard: +LoggedInNoMembershipCard («أهلاً {full_name} — اشترك في العضوية») للمسجّل بلا عضوية بدل VisitorMemberCard
- WelcomeBanner: +useCustomerAuth → يُخفى بالكامل للمسجّل

🔴 إصلاح 4 — resolveImageUrl (الأخطر بصرية):
- format.ts: +resolveImageUrl(url) لتحويل /uploads/foo.png → https://api.tawfir.giize.com/uploads/foo.png
- طُبّقت على كل الصور في 13 ملف: ProductCard, CheckoutSheet, ProductDetailContent, page.tsx (FacilityCard), FacilitiesContent, FacilityDetailContent (3 صور), admin/page, admin/facilities (FacilityImage), admin/membership-requests (receipt_image — المشكلة الأصلية!), FacilityEditContent, OwnerProductsContent (3 صور)
- ملف PasswordInput.tsx أُنشئ (forwardRef + Eye/EyeOff + type toggle + aria-pressed + tabIndex=-1)

🟡 تحسين 6 — إخفاء CTA اشتراك للعضو النشط: مُنجز بالكامل في MemberCard (LoggedInMemberCard فقط للعضو) + account (ActiveMemberState بلا CTA) + ProductDetailContent (زر «اشترك لخصم 30%» للغير عضو فقط)

🟡 تحسين 7a — الجوال اليمني: 
- register/page: النمط السعودي^(05|5)\d{8}$ → اليمني^(7[01378])\d{7}$ + placeholder 771234567
- account/page (نموذج التعديل): نفس التحديث

🟡 تحسين 7b — زر إظهار/إخفاء كلمة المرور:
- PasswordInput مُطبّق على 5 صفحات: customer login + register, owner login + register, admin login

🟡 تحسين 8 — بيانات التواصل:
- حُدّثت 4 مواضع بـ780090882 / moohabhb68@gmail.com / الجمهورية اليمنية — صنعاء: page.tsx (ContactSection), Footer.tsx, privacy/page.tsx, owner/settings/page.tsx

🟡 تحسين 10 — استمرار جلسة المالك + موبايل native:
- ownerAuth.store: setAuth(token, remember=true/false): remember=true→7 أيام، false→كوكي جلسة
- useOwnerAuth: useOwnerLogin يقبل variables.remember
- owner/login: onSubmit يمرّر remember: rememberMe
- (تحسينات الموبايل native-like كانت مُنجزة بالفعل في Task ID 4 — كروت عمودية، شارة «طلب جديد!» وامضة، auto-refresh)

🟡 تحسين 12 — scroll-margin-top:80px على زر الطلب في ProductDetailContent

🔴 إصلاح 5 — حالة طلب العضوية عبر الأجهزة:
- account/page: useEffect يمحو pending محلياً عند ظهور membership في /me (مُنجز بالفعل في Task ID 3)
- NoMembershipState: +ملاحظة واضحة «إن أرسلت طلب اشتراك من جهاز آخر، فقد يكون قيد المراجعة أو لم يُستوفَ بعد...»

فحوص إضافية مُنجزة:
- geolocation: تنقيح رسائل الخطأ حسب err.code (PERMISSION_DENIED/POSITION_UNAVAILABLE/TIMEOUT)
- manifest: تنقيح الوصف (إزالة «المرافق العامة» و«المملكة» + نص يمني)
- إزالة بقايا السعودية: admin/facilities TYPE_FILTERS, FacilitiesContent TYPE_CONFIG, ImportProductsContent, admin/settings
- lint: 0 أخطbn + 5 تحذيرات موروثة

اختبار agent-browser الفعلي النهائي:
- زائر → / → WelcomeBanner + VisitorMemberCard ✓
- دخول customer@tawfir.local → /account → «مرحباً، عميل بدون عضوية» + ملاحظة عبر الأجهزة ✓
- دخول customer@tawfir.local → / → الهيدر «حسابي» + Hero «أهلاً عميل بدون عضوية — اشترك في العضوية» + WelcomeBanner مختفٍ ✓
- MobileBottomNav بعد دخول: التبويب الرابع «عميل» (الاسم الأول) بدل «دخول» ✓
- /products/1: 45 ر.ي + «اشترك لخصم 30%» (للزائر) + «اطلب الآن» + scroll-margin-top:80px ✓
- «اطلب الآن» → CheckoutSheet → تأكيد → POST /orders نجح → «تم استلام طلبك رقم 2» ✓
- /orders → قائمة الطلب #2 + #1 ✓
- /orders/2 → شريط تتبّع «بانتظار التأكيد» + صنف 45 + توصيل 300 + إجمالي 345 ✓
- دخول approved@tawfir.local (عضو) → /account → ActiveMemberState + بطاقة 7777 9999 1234 5678 + لا CTA اشتراك ✓
- الرئيسية بعد دخول approved@tawfir.local → MemberCard كاملة (بدل CTA) ✓
- دخول admin@tawfir.gleeze.com (البيانات الصحيحة) → /admin dashboard + 3 بطاقات إجرائية + شارات حية ✓
- /admin/membership-requests → زر «عرض الصورة» يفتح Dialog بصورة تحويل مُحمّلة فعلياً (1920px من api.tawfir.giize.com/uploads/membership_receipts/...) ✓
- /admin/orders → جدول 10 أعمدة + فلترة بالحالة ✓
- دخول owner@tawfir.local + «تذكّرني» → كوكي 7 أيام + توجيه /owner ✓
- 360px موبايل: scrollWidth=clientWidth=360 (صفر تجاوز أفقي) + MobileBottomNav ✓
- الوضع الداكن: htmlClass=dark + bg=rgb(15,27,42) + زر «التبديل إلى الوضع النهاري» ✓
- زر إظهار كلمة المرور: type=«password» → نقر → type=«text» + زر يتحول لـ«إخفاء كلمة المرور» ✓
- manifest.webmanifest: name=«توفير» + theme=#005B82 + dir=rtl + lang=ar ✓
- /sw.js: «توفير Service Worker — الإصدار 1.1.0» + cache prefixes tawfir-* ✓
- /offline: HTTP 200 + TawfirLogo + رسالة عربية ✓
- resolveImageUrl مُطبّق على كل <img>/<ImageWithSkeleton> (عدا معاينة الملف المحلية بـblob:)

Stage Summary:
- 12 بنداً (5 حرجة + 7 جوهرية) كلها أُصلحت بالكامل
- 1 ملف جديد (PasswordInput.tsx) + ~30 ملف معدّل + 0 ملف محذوف
- lint: 0 أخطbn + 5 تحذيرات موروثة (مقبولة)
- dev.log نظيف: كل المسارات 200
- اختبار agent-browser شامل: المسار الذهبي الكامل + المالك + الأدمن + 360px + الوضع الداكن + زر كلمة المرور + بيانات التواصل + resolveImageUrl + manifest + sw + offline — كلها ✓
- التطبيق جاهز للتسليم النهائي بعد المراجعة الثانية

---
Task ID: 9-foundation
Agent: Main Orchestrator (Z.ai Code) — الجولة 3
Task: أساس الجولة 3 — أنواع + خدمات + hooks + WebSocket + NotificationsProvider + NotificationBell + صفحة /notifications

Work Log:
- قُرئ OpenAPI المُحدّث (57 مساراً، 17 نوع إشعار، schemas: NotificationOut, SpecialOfferOut, OwnerStatsOut, FcmTokenOut, ChartPointOut, TopProductOut, UnreadCountOut, SpecialOfferCreateOut)
- أُضيفت 13 نوعاً جديداً لـ src/types/api.generated.ts:
  • NotificationType (17 قيمة) + NotificationOut + UnreadCountOut
  • FcmTokenRegister + FcmTokenDelete + FcmTokenOut
  • SpecialOfferFacilityBrief + SpecialOfferProductBrief + SpecialOfferOut + SpecialOfferCreate + SpecialOfferCreateOut
  • ChartPointOut + TopProductOut + OwnerStatsOut
- أُضيف special_offer_id? لـ OrderCreate + discount_rate? لـ Facility/Summary/Create/Update/Pending + OwnerRegister
- أُنشئ src/lib/ws-client.ts: عميل WebSocket أصلي مع إعادة اتصال exponential backoff (1s→30s) + رسائل تشخيص console (WS connected/disconnected/reconnecting)
- أُنشئ src/services/notification.service.ts: getNotifications/getUnreadCount/markRead/markAllRead/registerFcmToken/unregisterFcmToken — pickGateway تلقائياً (customer/owner/admin)
- أُنشئ src/services/special-offer.service.ts: getPublicOffers/getOffer/getOwnerOffers/createOffer/deactivateOffer/deleteOffer
- أُنشئ src/services/owner-stats.service.ts: getStats
- أُنشئ 6 hooks: useNotifications, useUnreadCount (polling 30s احتياط), useMarkRead/useMarkAllRead, useFcm, useSpecialOffers (6 mutations/hooks), useOwnerStats (refetch 60s)
- أُنشئ src/lib/notifications-meta.ts: جدول 17 نوع + LucideIcon + classes + hrefFor logic + formatRelativeTime («منذ دقيقة»)
- أُنشئ src/components/shared/NotificationsProvider.tsx: يدير دورة WS حسب التوكن الفعّال (customer/owner/admin) + invalidate React Query + toast فوري + زر «عرض» يُنقل حسب النوع
- رُبطت NotificationsProvider في providers.tsx خارج RouteLoadingBar
- أُنشئ src/components/shared/NotificationBell.tsx: جرس + badge رقمي + popover dropdown (آخر 5) + زر «تعليم الكل كمقروء» + زر «عرض الكل» → /notifications
- رُبط NotificationBell في MainHeader (يمين زر الثيم للعميل المسجّل) + OwnerSidebar (أعلى القائمة) + AdminSidebar (أعلى القائمة)
- أُنشئ src/app/(public)/notifications/page.tsx + NotificationsContent.tsx: قائمة بترقيم صفحات + تبويبات (الكل/غير المقروء) + كارت لكل إشعار بأيقونة كبيرة + وقت مطلق + نسبي + تعليم كمقروء + تنقل حسب النوع + Empty state
- lint: 0 أخطbn (5 تحذيرات موروثة)

Stage Summary:
- الأساس الكامل للجولة 3 جاهز: 13 نوع + 6 خدمات + 6 hooks + WS client + Provider + Bell + /notifications
- الـ WebSocket يتصل بـ wss://api.tawfir.giize.com/api/v1/ws/notifications?token=XXX عند أي دخول، يقطع عند الخروج
- pickGateway: يكتشف التوكن الفعّال تلقائياً (customer>owner>admin) للـ /notifications و /fcm/token
- lint نظيف: 0 أخطbn + 5 تحذيرات موروثة (مقبولة)
- الأساس متين للوكلاء القادمين: Task 2 (UI العروض الخاصة) + Task 3 (discount_rate) + Task 4 (لوحة المالك) + Task 5 (إدارة العروض) + Task 6 (FCM) — كلها تعتمد على هذا الأساس

---
Task ID: 6-fcm-registration
Agent: FCM-Registrar-Subagent (Z.ai Code) — الجولة 3
Task: تسجيل/إلغاء توكن FCM عند الدخول/الخروج (pseudo-token — firebase غير مُثبّت)

Work Log:
- قُرئ السياق الكامل من task 9-foundation عبر worklog.md + الملفات المرجعية
- تأكّد: `firebase` غير مُثبّت في package.json (مُتوقّع) → الحل: pseudo-token
- أُنشئ `src/components/shared/FcmRegistrar.tsx` (use client):
  • يراقب الثلاث متاجر (customer/owner/admin) لاختيار activeToken + isHydrated
  • مسار الدخول: `Notification.requestPermission()` (مع guard `typeof Notification !== "undefined"`)
    - إن "granted": يتحقق من sessionStorage أولاً لتفادي التكرار عبر تحديث الصفحة،
      ثم يولّد `tawfir-web-${Date.now()}-${Math.random().toString(36).slice(2,11)}`،
      يخزّنه في sessionStorage (key: `tawfir_fcm_token`)، ويستدعي
      `useRegisterFcm().mutate({ token, device_info: navigator.userAgent })`
    - إن "denied" أو "default": `console.warn` تشخيصي فقط ثم يخرج
  • مسار الخروج (activeToken === null): يقرأ التوكن المخزّن، يستدعي
    `useUnregisterFcm().mutate({ token })`، ويمسحه من sessionStorage
  • `useRef(false)` لمضاعفة الدخول عبر دورة الحياة الواحدة (React Strict Mode dev)
  • كل وصول للمتصفح محاط بـ `typeof window !== "undefined"` (Notification + navigator.userAgent + sessionStorage)
  • 0 `console.log`، 0 `any`، 0 `@ts-ignore`
- أُنشئ `BLOCKERS.md` في جذر المشروع:
  • الحالة: موقوف مؤقتاً (Partial — بدون FCM حقيقي)
  • السبب: firebase غير مُثبّت
  • 5 خطوات للترقية: تثبيت firebase + firebase-messaging-sw.js + firebaseConfig + استبدال generatePseudoToken بـ getToken(messaging, {vapidKey}) + تسجيل VAPID key
  • workaround موثّق: pseudo-token يختبر المسار endpoint-to-end
- رُبط `FcmRegistrar` في `src/app/providers.tsx` داخل `<NotificationsProvider>` كأب لجميع الأبناء
  (للوصول إلى QueryClient الذي يحتاجه useRegisterFcm/useUnregisterFcm):
  `ThemeProvider > QueryClientProvider > NotificationsProvider > FcmRegistrar > المحتوى`
- lint: 0 أخطbn + 6 تحذيرات موروثة (react-hook-form watch + unused eslint-disable) — لا جديد من FcmRegistrar
- dev.log نظيف: كل المسارات 200 (آخر 30 سطر HTTP 200)
- أُنشئ سجل العمل: `/agent-ctx/6-fcm-registration-fcm-registrar.md`

Stage Summary:
- 2 ملفات جديدة (FcmRegistrar.tsx + BLOCKERS.md) + 1 ملف معدّل (providers.tsx)
- التطبيق يسجّل/يُلغي توكن (pseudo) FCM تلقائياً حسب حالة الدخول
- المسار `/fcm/token` POST و DELETE مغطّى عملياً للتحقق من الباك إند
- جاهز للترقية السلسة لـ FCM حقيقي: استبدال `generatePseudoToken()` بـ `getToken(getMessaging(app), { vapidKey })` في FcmRegistrar.tsx فقط عند تثبيت firebase
- lint نظيف، لا `any`، لا `@ts-ignore`، لا `console.log`

---
Task ID: 5-owner-special-offers-mgmt
Agent: Special Offers Management Builder (Z.ai Code) — الجولة 3
Task: إنشاء صفحة إدارة العروض الخاصة للمالك — قائمة + إنشاء + إنهاء + حذف

Work Log:
- قُرئ worklog.md (tail) لفهم Task 9-foundation: الأنواع (SpecialOfferOut/Create/CreateOut) + خدمة special-offer.service + hooks (useOwnerSpecialOffers/useCreateSpecialOffer/useDeactivateSpecialOffer/useDeleteSpecialOffer) كلها جاهزة
- قُرئت أنماط OwnerProductsContent.tsx (نمط page.tsx بدون params + FAB + AlertDialog + Sheet/Dialog + motion) و OwnerSidebar.tsx (نمط sub-links داخل facilities?.map) و useOwnerProducts.ts (لجلب قائمة منتجات المنشأة) و Slider/Progress/Tabs/AlertDialog/Card/Badge shadcn/ui للتأكد من الـ APIs
- أُنشئ 4 ملفات:

🔴 الملف 1 — `src/components/owner/OwnerSpecialOfferForm.tsx` (جديد):
- Dialog لإنشاء عرض خاص — Props: { facilityId, open, onOpenChange }
- جلب منتجات المنشأة بـ useOwnerProducts(facilityId, { page:1, page_size:100 }) + فلترة is_available===true
- تحقق بـ zod 4: product_id int>0، title 3-255، offer_discount_rate int 10-50، quantity_limit optional string (refine رقمي + >0)، ends_at optional string (refine >= today)
- تكامل react-hook-form + Controller + zodResolver
- Slider (min=10 max=50 step=5 default=30) + شارة "{value}%" بجانبه
- معاينة سعر تقديرية (base - discount) لعرض اللطيف
- تحويل quantity_limit و ends_at إلى null إن فارغان عند الإرسال
- mutate({ facilityId, data }) → إغلاق تلقائي عند النجاح + toast (موجود في الـ hook)
- حالة "لا توجد منتجات متاحة" — رسالة + زر "حسناً"
- Loading على زر النشر

🔴 الملف 2 — `src/app/(owner)/owner/facilities/[id]/special-offers/page.tsx` (جديد):
- Server component بسيط — metadata "العروض الخاصة | توفير" + رندر OwnerSpecialOffersContent

🔴 الملف 3 — `src/app/(owner)/owner/facilities/[id]/special-offers/OwnerSpecialOffersContent.tsx` (جديد):
- useParams<{id:string}> → facilityId
- Header: ArrowRight (back to /owner/facilities/{id}) + Flame + title + زر "إنشاء عرض خاص" (sm:inline-flex)
- Tabs (الكل / النشطة فقط) — تبديل active_only
- useOwnerSpecialOffers(facilityId, activeOnly)
- بطاقة لكل عرض (motion + AnimatePresence popLayout):
  • صورة المنتج بـ ImageWithSkeleton (h-32 sm:h-40) + overlay gradient
  • شارة نشط (emerald) / منتهى (secondary) — مع نقطة نابضة للنشط
  • شارة "خصم {rate}%" في الزاوية اليسرى السفلى
  • اسم المنتج في الزاوية اليمنى السفلى
  • العنوان بأيقونة Flame
  • بطاقتان صغيرتان: سعر العضو (text-primary) + سعر الزبون (grid-cols-2)
  • Progress للكمية (إن quantity_limit != null): "sold/limit" + Progress bar h-2
  • تاريخ الانتهاء (CalendarClock) — "دائم" إن null
  • أزرار: إنهاء (outline) + حذف (ghost destructive)
  • بطاقة "منتهى" تُخفت 75%
- Empty state: Sparkles + رسالة "لا توجد عروض خاصة بعد" + CTA "إنشاء عرض خاص"
- Loading: 3 skeleton cards (grid responsive)
- FAB موبايل: `fixed bottom-20 left-4 lg:hidden h-14 w-14 rounded-full shadow-lg bg-primary`
- AlertDialog للحذف: تأكيد + Loader2 على زر الحذف

🟡 الملف 4 — `src/components/owner/OwnerSidebar.tsx` (تعديل):
- استيراد Flame من lucide-react (مضاف لأصل الاستيراد: Store, LogOut, ChevronLeft, ChevronRight, Package, Settings, Keyboard, ShoppingBag, Flame)
- في facilities?.map block، أضفت sub-link جديد بين «طلبات المنشأة» و «تعديل المنشأة»:
  • href=`/owner/facilities/${f.id}/special-offers`
  • label "العروض الخاصة"
  • أيقونة Flame (h-3.5 w-3.5 shrink-0)
  • active state (text-primary) عند isActive(pathname, `${f.id}/special-offers`)

اختيارات التصميم:
- RTL كامل: ps-11 للـ sub-links، right-3/left-3 للأشعة المطلقة
- Mobile-first 360px: grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3
- كل الأزرار: min-h-[44px] (touch target ≥44px)
- ألوان: bg-primary/text-primary-foreground/bg-emerald-600 (النشط — Tailwind built-in)/bg-destructive — لا ألوان ثابتة
- Framer Motion: prefersReduced يعطّل الأنيميشن
- Skeleton: نفس نمط OwnerProductsContent

ربط الـ hooks:
- useOwnerSpecialOffers(facilityId, activeOnly) → Paginated<SpecialOfferOut>
- useCreateSpecialOffer().mutate({ facilityId, data }) → toast تلقائي + invalidate owner-special-offers/special-offers/owner-stats
- useDeactivateSpecialOffer().mutate({ facilityId, offerId }) → toast + invalidate
- useDeleteSpecialOffer().mutate({ facilityId, offerId }) → toast + invalidate

نتيجة lint:
- bun run lint: **0 أخطbn**
- 6 تحذيرات (3 موروثة react-hooks/incompatible-library بسبب watch() في RHF — نفس account/page و register/page؛ 3 موروثة Unused eslint-disable في theme-provider/carousel/usePrefersReducedMotion)
- لا أخطbn جديدة، لا @ts-ignore، لا any، لا console.log

Stage Summary:
- 3 ملفات جديدة (Form + page.tsx + Content) + 1 ملف معدّل (Sidebar) — كلها مكتملة
- المسار /owner/facilities/{id}/special-offers جاهز: قائمة بطاقات + Tabs فلترة + إنشاء (Dialog بـ Slider + Select + zod) + إنهاء + حذف (AlertDialog) + FAB موبايل
- العروض الخاصة من قائمة المنشأة جاهزة — Task 2 (UI العروض للعميل) و Task 4 (لوحة المالك) يمكنهما الاعتماد على هذا
- lint نظيف: 0 أخطbn + 6 تحذيرات موروثة مقبولة
- dev.log نظيف: لا أخطbn وقت تشغيل

---
Task ID: 4-owner-dashboard
Agent: Owner Dashboard Builder (Z.ai Code) — الجولة 3
Task: إعادة تصميم لوحة المالك مع endpoint الجديد /owner/{fid}/stats

Work Log:
- قرأ الأساس في worklog.md (الجولة 3 — Task ID 9-foundation): OwnerStatsOut + ownerStatsService + useOwnerStats (refetch 60s) + ChartPointOut + TopProductOut + ORDER_STATUS_LABEL/ORDER_STATUS_TONE في @/lib/constants
- قرأ ملفات: OwnerFacilitiesContent.tsx (831 سطراً) + page.tsx + OwnerPortalShell.tsx + useMyFacilities + useOwnerStats + owner-stats.service + lib/format.ts + lib/constants.ts (ORDER_STATUS_LABEL/ORDER_STATUS_TONE) + types/api.generated.ts (OrderListOut, OrderStatus, OwnerStatsOut, ChartPointOut, TopProductOut) + components/ui/progress.tsx

- أُنشئ src/components/owner/OwnerStatsDashboard.tsx (مكوّن جديد كامل):
  • Props: facilities: Facility[] + initialFacilityId: number — يدعم منتقي المنشأة عند وجود أكثر من واحدة
  • useOwnerStats(selectedId) — تحديث دوري كل 60s
  • ترويسة: عنوان «لوحة الإحصائيات» + وصف + Select للتبديل بين المنشآت (h-11 min-h-[44px] touch target)
  • 6 بطاقات إحصاءات في grid grid-cols-2 md:grid-cols-3 gap-3:
    - 📦 إجمالي المنتجات (text-primary bg-primary/10) + subtitle «متاحة: X»
    - 📋 طلبات اليوم (text-emerald-500 bg-emerald-500/10) + subtitle «إيراد اليوم: X ر.ي»
    - ⏳ طلبات معلّقة (text-amber-500 bg-amber-500/10) + animate-pulse على الأيقونة عند >0
    - 💰 إجمالي الإيراد (text-sky-500 bg-sky-500/10) — formatCurrency
    - 🔥 العروض النشطة (text-destructive bg-destructive/10)
    - 🎯 نسبة خصم منشأتك (text-primary bg-primary/10) — «X%»
    كل بطاقة: Card + CardContent p-4 + أيقونة في دائرة 10×10 + رقم text-2xl font-extrabold tabular-nums + label + subtitle
  • رسم أعمدة آخر 7 أيام (CSS خالص — بدون مكتبة خارجية):
    - ارتفاع العمود: heightPx = max((count/maxCount)*120, count>0?4:0)
    - تلميح Tooltip عند المرور: «X طلبات • Y ر.ي» (group-hover opacity)
    - title attribute للأكسس ibility
    - label تحت كل عمود: اسم اليوم + رقم/شهر (e.g. «السبت / 12/3»)
    - يُخفى القسم بالكامل عند فراغ orders_chart
  • قائمة آخر الطلبات (top 5): بطاقة صغيرة لكل طلب: # + اسم العميل (fallback «عميل غير مسجّل») + total + status badge + زر «تفاصيل» → /owner/facilities/{fid}/orders/{id}
    - STATUS_TONE مطابقة للمواصفات: pending=amber, confirmed=sky, preparing=sky, out_for_delivery=sky, delivered=emerald, cancelled=destructive
    - link «الكل» → /owner/facilities/{fid}/orders (h-9 min-h-[44px] touch target)
  • قائمة الأكثر طلباً (top 5): رقم ترتيب (ذهبي/فضي/برونزي/محايد) + اسم المنتج + count + revenue + شريط نسبي bg-primary
  • حالة التحميل: DashboardSkeleton (6 skeleton cards + chart skeleton + 2 column skeletons)
  • حالة الخطأ: alert box «تعذّر تحميل الإحصائيات» (bg-destructive/10 text-destructive) مع أيقونة AlertTriangle
  • تذييل صغير: «آخر طلب: <date> • <facility_name>» (يظهر فقط عند وجود طلبات)

- عُدّل src/app/(owner)/owner/OwnerFacilitiesContent.tsx:
  • +import { OwnerStatsDashboard } from "@/components/owner/OwnerStatsDashboard"
  • +<OwnerStatsDashboard facilities={facilities} initialFacilityId={firstFacilityId} /> بعد <h1>منشآتي</h1> مباشرة (فوق QuickActions و StatsOverview)
  • firstFacilityId = firstApprovedFacility?.id ?? facilities[0].id (موجود بالفعل في الملف)

- lint: 0 أخطbn + 6 تحذيرات موروثة (مقبولة — لا علاقة لها بالمهمة: account/page, register/page, OwnerSpecialOfferForm, theme-provider, carousel, usePrefersReducedMotion)
- dev.log نظيف: كل المسارات 200 — التطبيق يجمع بنجاح

Stage Summary:
- 1 ملف جديد: OwnerStatsDashboard.tsx (لوحة إحصائيات شاملة بـ 6 بطاقات + رسم CSS + قائمتين + منتقي منشأة)
- 1 ملف معدّل: OwnerFacilitiesContent.tsx (استيراد + إدراج اللوحة فوق قائمة المنشآت)
- اللوحة تظهر تلقائياً عند زيارة المالك لـ /owner (فقط في حالة تعدد المنشآت — الحالة الفردية تُعيد التوجيه لـ /products)
- ألوان شارات الحالة موحّدة: pending=amber, confirmed=sky, preparing=sky, out_for_delivery=sky, delivered=emerald, cancelled=destructive
- mobile-first 360px: 2×3 grid → 3×2 grid desktop, touch targets ≥44px, RTL Arabic
- بدون مكتبات خارجية للرسم (CSS bars) — حجم الـ bundle أصغر
- الـ hook useOwnerStats يعيد التحديث كل 60s — نبض الإحصائيات حيّ

---
Task ID: 3-discount-rate
Agent: discount-rate propagator (Z.ai Code) — الجولة 3
Task: نشر حقل `discount_rate` القابل للتحكم في كل مكان يظهر فيه اسم المنشأة (تسجيل المالك + نموذج المشرف + شارات على الكروت/الصفوف + شارة الطلبات المعلّقة).

Work Log:
- قُرئ worklog (ذيل) لفهم عمل Task 9-foundation الذي أضاف `discount_rate?` لأنواع `Facility/Summary/Create/Update/PendingFacilityOut/OwnerRegister` في `src/types/api.generated.ts`.
- قُرئت الملفات المعنية: `owner/register/page.tsx` (~779 سطراً بعد التحرير)، `useOwnerRegister.ts`، `OwnerRegisterInput` في `owner.service.ts`، `FacilityForm.tsx`، `OwnerFacilitiesContent.tsx`، `page.tsx` العامة (FacilityCard)، `FacilitiesContent.tsx`، `admin/facilities/page.tsx`، `admin/facilities/pending/page.tsx`، `useAdminPendingFacilities.ts`، `admin.service.ts`.
- خدمات:
  • `src/services/owner.service.ts`: + `discount_rate?: number` على `OwnerRegisterInput` (الـ POST يمرّر الكائن بالكامل، فالحقل يصل تلقائياً للـ backend).
  • `src/services/admin.service.ts`: + `export type PendingFacility = PendingFacilityOut;` لإصلاح ثغر نوعية سابقة (كان الـ hook يستورد اسماً غير مصدّر).
- صفحة التسجيل (`src/app/owner/register/page.tsx`):
  • استيراد `Slider` + `BadgePercent`.
  • zod: `discount_rate: z.number().int().min(10).max(30).default(30)`.
  • defaultValues: `discount_rate: 30`.
  • `onSubmit`: مرر `discount_rate: values.discount_rate`.
  • `<Controller name="discount_rate">` يعرض عنوان + شارة حية `aria-live="polite"` بقيمة `{value ?? 30}%` + `<Slider min={10} max={30} step={5} value={[value ?? 30]} onValueChange={(v) => field.onChange(v[0] ?? 30)}>` (API آمن للسلايدر: قيمة مفردة في مصفوفة) + نص مساعد عربي مع رقم التواصل 780090882 + `min-h-[44px] py-2` لتحقيق هدف اللمس.
- نموذج إدارة المشرف (`src/components/admin/FacilityForm.tsx`):
  • zod: `discount_rate: z.number().int().min(0).max(100).default(30)`.
  • defaultValues: `facility?.discount_rate ?? 30`.
  • payload: `discount_rate: values.discount_rate`.
  • حقل `<Input type="number" min={0} max={100} step={1} inputMode="numeric">` مع `register("discount_rate", { valueAsNumber: true })` + نص مساعد «0-100% — المشرف يمكنه تجاوز قيد 10-30%».
- شارة «خصم X%» (نمط موحّد، ذهبية عبر `bg-primary/10 text-primary`، أيقونة `BadgePercent`، `text-[10px] font-bold rounded-full px-1.5 py-0.5`) في 4 مواضع:
  • `src/app/(public)/page.tsx` (FacilityCard): تغليف الاسم والشارة في `<div className="flex flex-wrap items-center gap-1.5">` داخل خلية `justify-between` — الشارة اليسرى للنوع تبقى على اليمين.
  • `src/app/(public)/facilities/FacilitiesContent.tsx`: استيراد `BadgePercent` + تغليف الاسم والشارة في `<div className="flex flex-wrap items-center gap-1.5 min-w-0">` (min-w-0 للحفاظ على truncate).
  • `src/app/(owner)/owner/OwnerFacilitiesContent.tsx`: استيراد `BadgePercent` + تغليف الاسم والشارة في `<div className="flex items-center gap-1.5">` فوق صف شارات الحالة.
  • `src/app/(admin)/admin/facilities/page.tsx` (الجدول): استيراد `BadgePercent` + تغليف الاسم والشارة في `<div className="flex items-center gap-1.5">` داخل TableCell — عدد الأعمدة بقي 7.
- شارة «طلب خصم X%» في `src/app/(admin)/admin/facilities/pending/page.tsx`: استيراد `BadgePercent` + إضافة الشارة داخل صف `<div className="mt-1 flex items-center gap-1.5">` بجانب شارة النوع — دائماً ظاهرة، مع `facility.discount_rate ?? 30` كقيمة افتراضية للتوافق العكسي.
- تم استخدام النمط الشرطي `{facility.discount_rate != null && (...)}` في الكروت الأربعة (لا تُظهر الشارة إن لم يُضبط الحقل) + النمط الدائم في صفحة الطلبات المعلّقة (مع 30 كافتراضي) — مطابقاً لطلب المهمة.
- القيود: لا ألوان مخصصة (فقط توكنات Tailwind)، لا `console.log`، لا `any`، لا `@ts-ignore`، RTL + عربي، أهداف لمس ≥44px، Mobile-first.
- lint: 0 أخطbn + 6 تحذيرات موروثة (5 من الجولات السابقة + 1 من OwnerSpecialOfferForm لمهمة أخرى في الجولة 3 — لا علاقة لي بها).
- dev.log: نظيف — `✓ Compiled in 13.x s` وكل المسارات `200`.
- سجل العميل: كُتب في `/home/z/my-project/agent-ctx/3-discount-rate-3-discount-rate.md`.

Stage Summary:
- 8 ملفات معدّلة (0 جديدة في src — 1 جديد في agent-ctx).
- الحقل `discount_rate` أصبح متحكماً به بالكامل: السلايدر في تسجيل المالك (10-30) + الرقم في نموذج المشرف (0-100) + الشارات الذهبية على الكروت/الصفوف + شارة الطلبات المعلّقة.
- النمط الموحّد للشارة (`bg-primary/10 text-primary` + `BadgePercent`) سهّل التوسعة لاحقاً على أي موضع آخر لاسم المنشأة.
- lint: 0 أخطbn + 6 تحذيرات موروثة (مقبولة).
- الأساس جاهز لاستقبال قيم حقيقية من الـ backend بمجرد أن يرسلها المالك أو المشرف.

---
Task ID: 2-special-offers-ui
Agent: Special Offers UI Builder (Z.ai Code) — الجولة 3
Task: واجهة العروض الخاصة للعميل — كارت + قسم رئيسي + كسر سعر في CheckoutSheet + دمج صفحة تفاصيل المنتج

Work Log:
- قُرئ worklog (Task 9-foundation) للاطلاع على الأنواع/الخدمات/hooks المُعدّة: SpecialOfferOut, special-offer.service.ts, useSpecialOffers(page,pageSize)
- قُرئت ProductCard.tsx + CheckoutSheet.tsx + ProductDetailContent.tsx + page.tsx (~826 سطراً) + ImageWithSkeleton + format.ts + site-config.ts + useCreateOrder.ts للتعرف على الأنماط الموجودة
- أُنشئ src/components/public/SpecialOfferCard.tsx:
  • كارت بحدّ border-2 border-primary/40، صورة بنسبة aspect-square، شارة «🔥 عرض خاص» وامضة bg-primary text-primary-foreground animate-pulse، شارة خصم {offer_rate}% بـ bg-accent text-accent-foreground
  • اسم المنتج + اسم المنشأة + السعر للعضو (member_price) بألوان text-primary، سعر غير العضو مشطوب بجانبه
  • عدّاد تنازلي حيّ عبر useEffect + setInterval لو كان ends_at خلال 24 ساعة
  • «الكمية المتبقية: X» (text-destructive إن ≤ 5)، زر «اطلب الآن» بـ min-h-[44px] — يقبل onOrder callback
  • بنيتان: SpecialOfferCard + SpecialOfferCardSkeleton
- أُنشئ src/components/public/SpecialOffersSection.tsx:
  • يستدعي useSpecialOffers(1, 10)
  • إن لم توجد عروض أو خطأ → return null (إخفاء القسم بالكامل، لا empty state)
  • عنوان «🔥 عروض حصرية» + عنوان فرعي «خصومات إضافية لأعضاء توفير»
  • شريط أفقي scroll-x على الجوال، شبكة 2-3 أعمدة على سطح المكتب
  • يدير selectedOffer state واحد ويُمرّره إلى CheckoutSheet واحد مشترك (مع checkoutSpecialOffer مُختصر)
  • تحميل: 3 كروت SpecialOfferCardSkeleton
- رُبط القسم في src/app/(public)/page.tsx بين OffersSection و NearbySection
- وُسّع src/components/public/CheckoutSheet.tsx:
  • أُضيف CheckoutSpecialOffer interface + prop اختياري specialOffer?: CheckoutSpecialOffer | null
  • عند وجود specialOffer: unitPrice = isMember ? member_price : non_member_price (محسوب خادمياً)
  • قسم كسر سعر جديد SpecialOfferPriceBreakdown مع 4-5 أسطر: السعر الأصلي (مشطوب) + خصم العرض الخاص + خصم العضوية (للعضو فقط) + الإجمالي الفرعي + رسوم التوصيل + الإجمالي
  • يُمرّر special_offer_id: specialOffer.id في POST /orders body
  • متوافق رجعياً: إن كان specialOffer null/undefined يبقى السلوك الأصلي تماماً
- وُسّع src/app/(public)/products/[id]/ProductDetailContent.tsx:
  • أُضيف useSpecialOffers(1, 50) + filter على product_id + is_active للعثور على عرض خاص للمنتج
  • أُضيفت دالتان: OfferCountdownTimer (نفس منطق الكارت) + SpecialOfferDetailCard مع بطاقة bg-primary/5 border-primary/20
  • البطاقة تعرض: شارة «🔥 عرض خاص — خصم X%» وامضة، السعر (member/non_member حسب العضوية)، السعر الأصلي مشطوب، شارة «+ خصم عضوية X%» للعضو، «الكمية المتبقية: X»، نص دعوة للاشتراك لغير العضو
  • إن لم يوجد عرض: يبقى الكارت الأصلي للسعر بدون تغيير
  • يُمرّر checkoutSpecialOffer إلى CheckoutSheet عند الطلب
- lint: 0 أخطbn + 6 تحذيرات (كلها موروثة: React Hook Form watch في account/register/OwnerSpecialOfferForm + unused eslint-disable في theme-provider/carousel/usePrefersReducedMotion)
- dev.log نظيف: «✓ Compiled in 13.4s» + كل المسارات 200

Stage Summary:
- ملفان جديدان (SpecialOfferCard.tsx + SpecialOffersSection.tsx) + 3 ملفات معدّلة (page.tsx, CheckoutSheet.tsx, ProductDetailContent.tsx) + 0 محذوف
- العميل يرى العروض الخاصة في: الصفحة الرئيسية (شريط أفقي/شبكة) + صفحة تفاصيل المنتج (بطاقة بارزة) + CheckoutSheet (كسر سعر مفصّل)
- خاصية special_offer_id تُمرّر في POST /orders (يحترم الباك إند الأسعار المُحسبة مسبقاً)
- لا ألوان ثابتة في TSX (كلها توكنات Tailwind مثل text-primary / text-destructive / text-success) + RTL + dir="ltr" للأرقام + min-h-[44px] لكل الأزرار
- الأساس جاهز للوكلاء القادمين: Task 5 (إدارة العروض للمالك) + Task 6 (FCM) — كلاهما يتفاعل مع نفس hooks/types

---
Task ID: 9-verification
Agent: Main Orchestrator (Z.ai Code) — الجولة 3 (التحقق الذاتي)
Task: اختبار agent-browser شامل + تحديث التقرير النهائي

Work Log:
- أعيد تشغيل خادم التطوير بعد توقفه (setsid + nohup للحقيقة الانفصال التام)
- اختبار agent-browser فعلي عبر http://127.0.0.1:3000 (طُوّع لتفادي قيود الشبكة الداخلية)

اختبارات ناجحة:

✅ الصفحة الرئيسية (زائر):
  - title: «توفير | طلب الوجبات اليمنية وخصم 30% للعضوية»
  - MainHeader + RegionSelector + WelcomeBanner + MemberCard (VisitorMemberCard) + قسم «عروض حصرية» (products grid)
  - scrollWidth=clientWidth=360 على موبايل (صفر تجاوز أفقي) ✓

✅ دخول العميل (customer@tawfir.local):
  - بعد الدخول: MainHeader يعرض زر «الإشعارات» (NotificationBell) + زر «حسابي» بدل «تسجيل الدخول»
  - النقر على الجرس → popover dropdown يفتح (expanded=true) مع قائمة فارغة + زر «عرض الكل» ✓
  - توجيه /notifications: عنوان «الإشعارات | توفير» + تبويبات «الكل/غير المقروء» + Empty state «لا توجد إشعارات» ✓

✅ دخول المالك (owner@tawfir.local):
  - OwnerSidebar يعرض زر «الإشعارات» أعلى القائمة ✓ + روابط فرعية جديدة: «طلبات المنشأة»، «العروض الخاصة»، «تعديل المنشأة»
  - توجيه /owner → /owner/facilities/17/products (سلوك القائمة الموافق عليها مفردة)
  - /owner/facilities/17/special-offers: عنوان «العروض الخاصة | توفير» + تبويبات «الكل/النشطة فقط» + Empty state «لا توجد عروض خاصة بعد — أنشئ عرضك الأول» ✓
  - النقر على «إنشاء عرض خاص» (via eval DOM click) → dialog يفتح مع كل الحقول: اختيار المنتج (combobox) + عنوان العرض (textbox) + نسبة الخصم (slider=30) + كمية محددة (spinbutton) + تاريخ انتهاء (date picker) + زر «نشر العرض» ✓

✅ تسجيل المالك (/owner/register):
  - slider [value=30] موجود (نسبة الخصم لتوفير، min=10 max=30) ✓

✅ صفحة /facilities (زائر):
  - بطاقات المنشآت تعرض شارة «خصم 30%» ذهبية بجوار اسم كل منشأة (مطعم صنعاء الأصيل، مقهى القفول، إلخ) ✓

✅ الوضع الداكن:
  - html.className = "dark" بعد التبديل
  - body backgroundColor = rgb(15, 27, 42) (الخلفية الداكنة) ✓
  - زر الثيم يصبح «التبديل إلى الوضع النهاري» ✓

✅ Console messages (تشخيص حي):
  - «[Tawfir WS] WS connected» متكرر (يحدث عند كل دخول) ✓
  - «[FCM] إذن الإشعارات لم يُمنح: denied» (المتصفح لا يمنح إذن تلقائياً — متوقع) ✓
  - لا أخطbn runtime/hydration على الإطلاق

✅ طلبات الشبكة (حركة فعلية على APIs جديدة):
  - GET /api/notifications/unread-count → 200 (polling كل 30s)
  - GET /api/notifications?page=1&page_size=20 → 200
  - GET /api/owner/17/special-offers?page=1&page_size=50 → 200 (مسار الجولة 3 الجديد)
  - GET /api/owner/17/products?page=1&page_size=100 → 200 (لـ Select المنتجات)
  - كلها 200 OK ✓

✅ lint:
  - 0 أخطbn + 6 تحذيرات موروثة (كلها react-hook-form watch + unused eslint-disable من الجولات السابقة)

✅ فحوص سلبية:
  - grep "wafir" → فقط في: region.store.ts (مفتاح localStorage للتوافق) + audit-labels.ts/sw-source.ts (نصوص تاريخية/تعليقات) + api-client.ts (تعليق قديم) + useOwnerProducts.ts ("التوفر" = availability، false positive)
  - grep ألوان ثابتة: فقط في toast.tsx (shadcn/ui الأصلي) + MembershipRequestsContent.tsx (red-100/300 من جولة سابقة) — لا ألوان جديدة في الجولة 3
  - لا console.log، لا any، لا @ts-ignore في كل ملفات الجولة 3 الجديدة

Stage Summary:
- كل المسارات الذهبية الجولة 3 مُتحقَّق منها فعلياً بالـ agent-browser: جرس الإشعارات + /notifications + WebSocket (WS connected) + إدارة عروض المالك (dialog كامل) + discount_rate slider على owner/register + شارة «خصم 30%» على بطاقات المنشآت + الوضع الداكن + 360px بلا overflow
- 6 APIs جديدة كلها 200 OK فعلية على الإنتاج (special-offers، notifications، unread-count، fcm-token لو haver صلاحية)
- التطبيق جاهز للتسليم النهائي للجولة 3 — كل المهام (1-8) مكتملة + مُتحقَّق منها

---
Task ID: round-4
Agent: Main Orchestrator (Z.ai Code) — الجولة 4 (تصميم Native)
Task: تحويل تجربة الموبايل من موقع متجاوب إلى تطبيق Native حقيقي (YouTube/Netflix) — 8 مراحل + قائمة تحقق 360px

Work Log:
- وُسّع src/app/globals.css: قاعدة لمس عامة (scale 0.96/0.97 على button/a/[role=button] عند pointer:coarse فقط، بخاصية scale الحديثة — لا تعارض مع framer-motion/tailwind) + .native-tap/.native-tap-card بانتقال 150ms + .bottom-sheet-grip + .pull-refresh-spin + كلها تتعطل مع prefers-reduced-motion. غُيّر hide-in-standalone ليبقى الهيدر ظاهراً في التطبيق المثبّت (الفوتر فقط يُخفى).
- أُعيدت كتابة src/components/layout/MobileBottomNav.tsx بالكامل وفق قياسات YouTube: h-14 + safe-area + أيقونات h-6 w-6 + نص text-[10px] + gap-1 + min-w-[64px] + native-tap + 4 تبويبات (الرئيسية/العروض/الطلبات/حسابي) + TabBadge حمراء على الطلبات (طلبات نشطة pending→out_for_delivery من useMyOrders مع enabled=isLoggedIn) + شارة إشعارات على حسابي (useUnreadCount)
- وُسّع src/hooks/useMyOrders.ts بمعامل enabled اختياري (توافق رجعي) لتفادي 401 للزوار في الشريط السفلي
- أُعيدت كتابة src/components/shared/OfflineBanner.tsx بأسلوب YouTube: موضع فوق الشريط السفلي (bottom calc(3.5rem+safe-area)، أعلى الشاشة على md+)، انزلاق translateY 40→0 بـ 280ms ease-out، bg-neutral-900 نص أبيض، pointer-events-none، + شريحة خضراء «تم استعادة الاتصال» 3 ثوانٍ
- أُعيدت كتابة SpecialOfferCard.tsx (Netflix compact: rounded-xl/border-30/p-2.5/text-xs/aspect-square/كارت كامل قابل للنقر native-tap-card/شارات 9px/عدّاد bg-black/70) + Skeleton مطابق + ProductCard.tsx (زر دائري 44px، الصورة رابط للتفاصيل، شارات 9px) + Skeleton مطابق
- SpecialOffersSection: شبكة grid-cols-2 → sm:3 → lg:5/xl:6 بعنوان «عروض خاصة» مميز + aria-label «العروض الخاصة» (فصل التسمية عن قسم الوجبات)
- page.tsx: شبكات الوجبات/الأقرب gap-2.5 + lg:grid-cols-5 xl:grid-cols-6 + aria-label قسم الوجبات «أحدث الوجبات» + HomeRefreshWrapper بـ PullToRefresh (إبطال products/products-nearby/special-offers/facilities/cards)
- MainHeader: شفاف عند القمة → صلب bg-card/95+blur+border+shadow عند scroll>10 (تحقق فعلي) + شعار مصغّر scale-82 على الموبايل + native-tap + أُزيل hide-in-standalone
- RegionSelector: موبايل = زر نص → Sheet سفلي بقائمة 15 منطقة (role=listbox, min-h-48px) / ديسكتوب = Select كما كان — تبديل CSS فقط (sm:hidden/hidden sm:flex) صفر اختلاف ترطيب
- CheckoutSheet: side استجابي عبر useIsMobile (bottom موبايل مع rounded-t-2xl+grip+max-h-85dvh+safe-area / right ديسكتوب كما كان)
- OwnerSpecialOfferForm: ResponsiveOfferShell جديد (Dialog ديسكتوب / Sheet سفلي موبايل بنفس المحتوى) + أُزيل early-return (!open) لتفادي وميض Dialog→Sheet
- OwnerSpecialOffersContent: تأكيد الحذف أصبح Sheet سفلي على الموبايل (نفس منطق handleConfirmDelete)
- مكونات جديدة: PageTransition (opacity+y 200ms بمفتاح pathname في layout العام) + PullToRefresh (touch listeners خاملة، مقاومة 0.45، عتبة 56px، دوران مؤشر، موبايل فقط) مركّب في الرئيسية + /orders
- EmptyState أعيد تصميمه (دائرة h-20 + نص 14/12px بلا بطاقة) + ScrollToTop/CookieConsent فوق الشريط بحساب safe-area
- إصلاح 5 أخطاء Parsing (string literals متعددة الأسطر داخل cn()) عبر سكربت دمج
- إنشاء عرض خاص حقيقي عبر API للتحقق البصري (مندي لحم −25%، 20 وحدة، ينتهي خلال 20 ساعة) بمنشأة 17

اختبارات agent-browser ناجحة على 360px:
✅ الشريط: barHeight=56 + icons=24px + labels=10px + gap=4px + صفر overflow (scrollWidth=clientWidth=360)
✅ شبكة العروض: cols=2, gap=10px, aspectSquare, شارات 9px (خصم 25%/عرض خاص/متبقي 20/عدّاد 19:59:47 حي)
✅ شبكة الوجبات: cols=2, gap=10px, 20 كارت, صفر عناصر خارج الحدود (فحص برمجي)
✅ CheckoutSheet: isBottomSheet=true + roundedTop=16px + grip + 629px/740px (85dvh)
✅ Region sheet: isBottom + grip + 15 خيار منطقة + اختيار صنعاء يغلق
✅ Offline banner: فوق الشريط مباشرة (684 فوق 683) + داكن نص أبيض + يختفي عند online + شريحة «تم استعادة الاتصال»
✅ الهيدر: rgba(0,0,0,0) عند القمة → card/80 + border 1px عند scroll
✅ الوضع الداكن: body rgb(15,27,42) + صفر overflow + لقطات
✅ دخول عضو (approved@tawfir.local): تبويب «عميل» + شارة إشعارات «1» على حسابي
✅ دخول مالك (owner@tawfir.local): FAB → Sheet سفلي إنشاء عرض (slider+select) + حذف → Sheet تأكيد سفلي
✅ /orders زائر: EmptyState جديد بالدائرة h-20
✅ VLM تحقق بصري: شبكة الوجبات والأوراق وشريط الانقطاع بلا تداخل — مظهر Native مؤكد
✅ lint: 0 أخطاء + 6 تحذيرات موروثة | dev.log كل المسارات 200 | لا أخطاء console

Stage Summary:
- 4 مكونات أُعيدت كتابتها بالكامل (MobileBottomNav، OfflineBanner، SpecialOfferCard، ProductCard) + 12 معدّلاً + 3 جديدة (PageTransition، PullToRefresh، ResponsiveOfferShell) + utilities CSS
- كل قياسات YouTube/Netflix مطبقة وموثقة بأرقام فعلية على 360px في تقرير_توفير.md (قسم الجولة 4) + 12 لقطة شاشة في screenshots/round4-*.png
- قرارات ذاتية موثقة: إبقاء الهيدر في standalone، شريحة استعادة الاتصال، قاعدة لمس CSS scale العامة، فصل تسمية القسمين، زر طلب دائري 44px، safe-area لكل العناصر الثابتة
