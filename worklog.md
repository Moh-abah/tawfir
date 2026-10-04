# سجل عمل وكلاء منصة توفير — worklog

> ملف تنسيق مشترك: كل وكيل يقرأه قبل البدء ويُلحق سجله بعده (لا تُستبدل المحتويات).

---
Task ID: 1
Agent: الجولة التمهيدية (Z)
Task: تهيئة بيئة العمل من مستودع توفير الحقيقي والتحقق من الحي

Work Log:
- استنساخ https://github.com/Moh-abah/tawfir.git (commit 8831830) إلى /home/z/my-project بالكامل مع .git
- التحقق من الحي: /health=200، openapi paths=199 / schemas=196 ✅ (مطابق للبرومبت)
- حذف node_modules القديمة + bun install نظيف (916 حزمة) + bun pm trust
- تحديث openapi_live.json من الحي + bun run api:types (طُبّقت 13 ترقيعاً — قائمة الزائدة موثقة بمخرجات السكربت)
- تشغيل dev server على 3000 — GET / = 200

Stage Summary:
- البيئة جاهزة على كود المستودع الفعلي؛ الفروقات المستقبلية تُحسب عبر git diff مقابل 8831830
- اكتشاف حرج: الكود الحالي بلا أي تنفيذ مالي (لا moyasar / finance / payouts) — الجولة v2 كاملة على الفرونت
- اكتشاف: الحي يعيد PAYMENT_MODE=direct حالياً → شاشة الدفع تعرض «الصيانة» حتى يقلبها الأدمن (سلوك العقد الصحيح)
- اكتشاف: payment_method للطلب = cash|wallet فقط؛ الدفع الإلكتروني خطوة لاحقة عبر /finance/orders/{id}/pay/verify
- اكتشاف: GET /finance/orders/{id} يعيد مصفوفة PaymentOut (هللات للسعودية)؛ GET /finance/entries للأدمن حصراً (المالك 403)
- مصدر السوق: GET /locale/me → country_code 966/967 + currency SAR/YER

---
Task ID: 2
Agent: الجولة التمهيدية (Z)
Task: بناء طبقة الأساس المالية المشتركة لكل الأدوار

Work Log:
- src/lib/idempotency.ts: newIdempotencyKey/reuseIdempotencyKey/idempotencyHeader (برونزية-4)
- src/services/locale.service.ts: locale/me + locale/countries + isSaudiCountry + currencyFromCountry
- src/services/finance.service.ts: 4 خدمات (customerFinance/ownerFinance/courierFinance/adminFinance) بعقود مطابقة للاستجابات الحية المدققة (settings items، owner card، overview، notifications، payouts، entries {total,page,pages,items}، payments/config، balance {receivable,currency})
- src/hooks/useFinance.ts: hooks React Query بمفاتيح finance:* (polling للبطاقات 60s، idempotency في verify/execute)
- src/components/finance/finance-ui.tsx: formatMoney (ar-SA/ar-YE) + MoneyText + paymentAmountMajor (هللات موثقة) + FinanceStatusBadge بقواميس عربية + destinationTypeLabel

Stage Summary:
- العقد الموحد: كل الوكلاء يستوردون من هذه الملفات الربعة فقط — ممنوع بناء نداءات /finance مباشرة من المكوّنات
- هوية الألوان: تُستخدم توكنات الكود القائمة (primary زمرد، accent ذهبي، success، destructive، amber للتحذير)

---
Task ID: 4-c
Agent: بصمة — مهندس فرونت منصة توفير (جولة v2)
Task: بوابة المندوب — رصيدي + وجهات الصرف (IBAN/STC Pay) + سجل مستحقاتي

Work Log:
- src/app/(courier)/courier/finance/page.tsx: صفحة server بـ metadata «المالية والمستحقات | توفير» تستدعي CourierFinanceContent (نمط صفحة wallets حرفياً) — تقع تلقائياً داخل حارس (courier)/courier/layout (توكن + verified من GET /courier/me).
- src/app/(courier)/courier/finance/CourierFinanceContent.tsx (client):
  • بطاقة الرصيد: useCourierBalance → receivable + currency عبر MoneyText كبير (لا أرقام ميتة) + زر تحديث يدوي (isFetching spin) + إن receivable=0 حالة نجاح خفيفة «لا مستحقات معلّقة الآن» + skeleton/خطأ detail عربي + إعادة.
  • CourierDestinationsSection: بطاقات الوجهات — destinationTypeLabel + holder_name + IBAN مقنّع «SA** **** آخر-4» (dir=ltr) أو mobile LTR + city/country + شارة is_verified («موثقة» success / «قيد التوثيق» amber).
  • Dialog «إضافة وجهة»: منتقي نوع bank/wallet كأزرار تبديل كبيرة (role=radio) — bank: holder_name (≥3، ≤160 مطابق للسكيما) + iban (regex 2-34 لاتيني/أرقام، hint «IBAN يبدأ بـ SA»، dir=ltr) + city اختياري — wallet: holder_name + mobile (تنقية toEnglishDigits من yemen.ts + أرقام فقط 9-15، hint «يبدأ بـ 05 أو 9665») — country="SA" يُرسل ضمنياً (مطلوب في DestinationIn) — أخطاء inline + صندوق أخطاء detail من الخادم كما هي + زر حفظ pending — عند وجود وجهة من النوع نفسه تنبيه لطيف «ستُستخدم أحدث وجهة عند الصرف» بلا حظر.
  • CourierPayoutsSection: قائمة PayoutOut داخل max-h-96 overflow-y-auto — المبلغ MoneyText بالعملة + FinanceStatusBadge مع PAYOUT_STATUS_AR + «طلب #N» + destinationTypeLabel + formatDate + صندوق failure_reason كما هو عند failed + «المحاولات: N» عند attempt_count>1 — فراغ «لا عمليات صرف بعد — تُنشأ تلقائيًا بعد إتمام مهامك».
  • كل قسم مستقل بثلاث حالاته (skeleton/خطأ+إعادة/فراغ بذكاء) — لا PayPal إطلاقاً.
- src/components/courier/CourierBottomNav.tsx: تبويب خامس «المالية» (أيقونة Wallet) → /courier/finance بين «مهامي» و«ملفي» — grid-cols-4→5، min-w 64→56px للحفاظ على اللياقة في 320px مع بقاء h-14 (لمس ≥44px) وsafe-area كما هي — التمييز النشط startsWith يعمل للمسار الجديد.
- src/app/(courier)/courier/profile/page.tsx: بطاقة/زر «المالية والمستحقات — رصيدي ووجهات الصرف» (Banknote) → /courier/finance قبل زر محافظي بنفس نمطه (border-primary/30).
- lint: 0 errors (6 تحذيرات موروثة في ملفات خارج النطاق: register/OwnerSpecialOfferForm/OwnerYemenNotifications) — tsc --noEmit: لا أخطاء في ملفات المهمة (الأخطاء القائمة كلها موروثة خارجها).

Stage Summary:
- بوابة المندوب المالية مكتملة فوق طبقة العقود (courierFinanceService + useFinance حصراً — لا نداءات مباشرة من المكوّنات).
- العقود مطابقة للحي: DestinationIn يفرض country (نرسل SA)، holder_name 3-160، iban ≤34، mobile ≤20 — PayoutOut كامل الحقول.
- ملاحظة تكامل: PROTECTED_PREFIXES في courier-api-client لا يتضمن /courier/finance — الحارس في layout يغطي التسجيل (reactive store) لكن إضافة المسار هناك تحسين اختياري لوكيل قادم.
- لم يُلمس: next.config.ts / capacitor / merge.sh / factory / بوابات الأدوار الأخرى — dev server لم يُشغَّل ولم يُبنَ (تعذّر curl التحققي: المنفذ 3000 غير مستجيب في البيئة الحالية).

---
Task ID: 4-b
Agent: بصمة — مهندس فرونت (مالية المالك وإشعارات اليمن)
Task: بوابة المالك — بطاقة التاجر المالية + إشعارات التسديد اليمنية (جولة التوسعة المالية v2)

Work Log:
- src/app/(owner)/owner/finance/page.tsx + OwnerFinanceContent.tsx: صفحة «المالية» على نمط صفحات البوابة (metadata عربية، Server page + Client content) — تجمع البطاقة المالية وقسم إشعارات اليمن.
- src/components/owner/OwnerFinanceCardPanel.tsx: بطاقة التاجر المالية من useOwnerFinanceCard(true, 60) (polling حي 60s + زر تحديث يدوي refetch). شبكة sm:grid-cols-2 lg:grid-cols-3: الذمة القائمة (amber إن > 0 / success إن 0)، العمولات المتراكمة (accent)، المدفوع (success)، إشعارات معلّقة (عدّاد)، وسطر معلومات الفواتير/الطلبات/التحويلات. بانر تحذيري بنص الخادم الموثق عند cap_reached، وسطر «سقف الذمة المسموح» يظهر فقط عندما debt_cap ≠ null/"" (داخل البانر عند بلوغ السقف، وبطاقة مستقلة عند عدمه). كل المبالغ MoneyText + العملة من card.currency حرفياً (YER/SAR كما يراها الخادم). skeleton + خطأ (detail عربي + زر إعادة).
- src/components/owner/OwnerYemenNotifications.tsx: بوابة العرض ديناميكية — القسم يُركَّب فقط عندما card.currency === "YER" (في السوق السعودي null كلياً والـhook معطّل enabled=false فلا نداء شبكة). نموذج رفع في Dialog: amount إلزامي ≥1 بر.ي مع hint «المبلغ المُحوّل فعلياً لعمولاتك»، bank_name/reference_no/transfer_date اختيارية، image_url عبر ImageUploader (رفع ملف حقيقي: ضغط webp + تقدم XHR + إعادة محاولة، مع بديل لصق رابط مدمج). أخطاء inline من detail الخادم (OwnerApiError عربي جاهز) + تحقق محلي للمبلغ. القائمة: الأحدث أولًا، MoneyText بعملة الإشعار نفسه + FinanceStatusBadge(NOTIFICATION_STATUS_AR)، review_note عند rejected في صندوق تحذيري «سبب الرفض: …»، thumbnail إيصال resolveImageUrl يُكبَّر عبر ImageLightbox المشترك، formatDate(created_at)، فلترة chips (الكل/معلّق/مقبول/مرفوض)، القائمة max-h-96 overflow-y-auto، لمس ≥44px.
- التنقل: OwnerSidebar — عنصر «المالية» (Wallet) بأسلوب العناصر وactive state نفسه بعد «متجري» وقبل مجموعات المتاجر (يخدم الديسكتوب وقائمة Sheet الموبايل معاً لأن NavLinks مشترك). OwnerMobileMenuSheet — رابط «المالية» في قسم «عام». OwnerMobileBottomNav بقي 4 تبويبات ثابتة دون إضافة (الوصول عبر ☰ والسايدبار كما وُجّه).
- قرار رفع الصورة: استُخدمت خدمة الرفع الموجودة uploadImage عبر ImageUploader المشترك بـ folder="facilities" — عقد الخادم يقبل products|facilities فقط ولا يُسمح بتعديل upload.service.ts ضمن النطاق؛ الإيصالات تُرفع لمجلد وسائط facilities (موثق أعلاه). ImageUploader يوفر أصلاً بديل «أو ألصق رابطاً» فيغطي الحلين.
- lint: bunx eslint على ملفات المهمة الستة = 0 مشاكل (أخطاء المشروع الجديدة في AdminFinanceSettings/MoyasarEmbeddedForm لملفات وكيل آخر خارج نطاقي)؛ tsc --noEmit بلا أخطاء في ملفاتي.

Stage Summary:
- صفحة /owner/finance حيّة داخل OwnerPortalShell بلا أي تلامس مع layout/bوابات أخرى؛ النداء الشبكي واحد (queryKey مشترك finance:owner-card بين المحتوى واللوحة).
- لا أرقام تسعير في الكود — كل المبالغ والعملات من الاستجابة عبر MoneyText؛ debt_cap يُعرض كما يأتي من الخادم.
- السوق اليمني/السعودي ديناميكي بالكامل من card.currency — إشعارات التسديد تختفي كلياً في SAR بلا فرع معماريات إضافي.
- تكامل: عند قبول/رفض الأدمن (Task 4-a) تُبطل المفاتيح finance:owner-card وfinance:owner-yemen-notifications من useFinance فيتحدّث قسم المالك تلقائياً بالـpolling أو بعد refetch.

---
Task ID: 4-d
Agent: بصمة — مهندس فرونت منصة توفير (وكلاء متوازيون)
Task: لوحة الأدمن المالية الشاملة — الجولة المالية v2

Work Log:
- صفحة جديدة src/app/(admin)/admin/finance/page.tsx (Server + metadata بنمط wallets) + AdminFinanceContent.tsx: Tabs بخمسة تبويبات [الإعدادات المالية | إشعارات اليمن | الصرف للمندوبين | دفتر القيود | لوحة المالكين]، شريط تبويبات قابل للتمرير أفقياً على الموبايل (لمس ≥44px).
- src/components/admin/AdminFinanceSettings.tsx: خريطة key→value نصية من useFinanceSettings + 9 مجموعات مرئية بأيقونات (عمولة السعودية/اليمن، سقف الذمة فارغ=بلا سقف، ACCOUNT_MODE و PAYMENT_MODE عبر Select بعربي، PAYOUT_AUTO_AFTER_ASSIGN Switch يحفظ فوراً بنمط «المحافظ»، FINANCE_POLLING_SECONDS، DISCOUNT_MAX_PCT، توصيل السعودية/اليمن) + بطاقة «التوصيل كما يراه العميل» معاينة حية نصية فوق المجموعتين (بلا حسابات) + تنبيه «direct = تحت الصيانة» + مجموعة «مفاتيح أخرى» للمفاتيح غير المعروفة (لا تُسقط) + حفظ فردي لكل حقل مع pending لكل مفتاح (updateSetting.variables.key) وقيم محفوظة/مقارنة نصاً حرفياً.
- قرار موثق (lint): مزامنة قيم الخادم بنمط «key reset» — SettingsEditor يُعاد تركيبه بمفتاح content-based (key=value&...) بدل setState داخل useEffect (قاعدة react-hooks/set-state-in-effect); زر «تحديث» يعيد الجلب والتغيّر الفعلي بالقيم = تركيب جديد بقيم الخادم.
- src/components/admin/AdminYemenNotifications.tsx: chips فلتر الحالة (الكل/submitted/approved/rejected) تمرر للـhook، بطاقات mobile-first مع MoneyText بالعملة وbank/reference/transfer_date، thumbnail إيصال (resolveImageUrl + ImageWithSkeleton) يفتح Dialog تكبير، أزرار قبول (bg-success)/رفض (destructive) لsubmitted فقط عبر Dialog يطلب review_note (إلزامي للرفض مع تنبيه حي «سبب الرفض سيظهر للتاجر»)، idempotency_key: newIdempotencyKey() داخل النداء في body، polling 60s من الـhook.
- src/components/admin/AdminPayouts.tsx: chips الفلاتر الخمسة + «مزامنة من مويسر» (usePollPayouts مع pending وخطأ inline) + جدول (md+) ينهار لبطاقات (موبايل): #/مندوب/طلب/MoneyText/destinationTypeLabel/شارة PAYOUT_STATUS_AR/formatDate/failure_reason صندوق صغير + «تنفيذ صرف» Dialog (courier_id إلزامي، amount بـhint «اتركه فارغاً للمبلغ الافتراضي»، destination_id، order_id اختيارية) + ملاحظة sandbox awaiting_activation أسفل النموذج — مفتاح idempotency داخل useExecutePayout.
- src/components/admin/AdminFinanceEntries.tsx: فلاتر entry_type/party_type/currency/status (Select من القواميس + «الكل») وparty_id رقم اختياري وper_page=20 وأي فلتر يعيد للصفحة 1؛ جدول md+/بطاقات موبايل؛ المبلغ بلون الاتجاه (سالب destructive/موجب foreground) MoneyText بالعملة؛ ref_id مقطوع monospace؛ ترقيم «سابق/التالي + صفحة X من Y — المجموع Z»؛ «تصدير CSV» → adminFinanceService.exportCsv() → Blob → ObjectURL باسم tawfir-finance-entries.csv مع revokeObjectURL (مهلة 1s) وخطأ inline؛ الملاحظة الموثقة «عمولات السعودية قد تظهر بالهللات (amount ×100) كما تعيدها الاستجابة» تحت الجدول.
- src/components/admin/AdminOwnersOverview.tsx: KPI عمولات بتكرار ديناميكي على مفاتيح commissions (MoneyText بعملة كل مفتاح)؛ جدول owners (md+)/بطاقات: debt أمبر إن >0، accumulated، paid بالنجاح، شارة «بلغ السقف/دون السقف»، زر «البطاقة» → Dialog بuseAdminOwnerCard يعرض العملة/المتراكم/الذمة/المدفوع/المعلق/السقف (null=بلا سقف)/الفواتير/الطلبات/التحويلات؛ أحدث 5 إشعارات و5 صرف من نفس الاستجابة كقوائم جانبية (ترتيب تنازلي محلياً بالتاريخ، max-h-96 overflow-y-auto). ملاحظة: أسطر owners بلا عملة في العقد → أرقام بلا رمز، والعملة الصريحة في البطاقة.
- src/components/layout/AdminSidebar.tsx: عنصر «المالية» (Wallet) → /admin/finance بعد «الطلبات» مباشرة + شارة عدد إشعارات submitted عبر useAdminYemenNotifications("submitted") ضمن NavBadgeCounts (نفس نمط بقية الشارات، بلا ثقل إضافي ملحوظ). AdminMobileBottomNav: 5 تبويبات ثابتة + «المزيد» يفتح AdminMobileSidebar الذي يعرض القائمة كاملة تلقائياً — لا تعديل (سادس غير مطلوب).
- التحقق: eslint نظيف على كل ملفات النطاق (bunx eslint على الملفات السبعة = 0 مشاكل) وtsc --noEmit بلا أي خطأ في ملفات النطاق (114 خطأ موجود مسبقاً خارج النطاق: api.generated مُجدّد + DeliveryFields.tsx خطأ Loader2 من وكيّل آخر موازٍ — خارج نطاقي ولم ألمسه).

Stage Summary:
- كل البوابات المالية الخمس للأدمن حية من adminFinanceService/useFinance حصراً — لا نداءات مباشرة من المكوّنات، لا أرقام تسعير في الكود، MoneyText بجوار كل مبلغ والعملات كما تعيدها الاستجابة.
- الإعدادات حية: حفظ PUT واحد لكل مفتاح ويسري فوراً (toast الـhook يذكر ذلك)، القيم نصوص تُقارن وتُحفظ حرفياً.
- ملاحظة تكامل لمالك الأساس: finance.service.ts:352 — في exportCsv كُتب Accept خارج كائن headers (خطأ TS2769 موجود مسبقاً؛ الترويسة لا تُرسل فعلياً وقت التشغيل) — يحتاج رفع Accept داخل headers، خارج نطاق 4-d عمداً.

---
Task ID: 4-a
Agent: بصمة — مهندس فرونت (المدمج Moyasar)
Task: تدفق الدفع المدمج Moyasar للسوق السعودي + إصلاح الأرقام الميتة في السلة (البرونزية-3)

Work Log:
- src/components/finance/MoyasarEmbeddedForm.tsx (جديد): تحميل سكربت CDN mpay/1.7.3 ديناميكياً (وعد مفرد + retry بإعادة تركيب key) — window.Moyasar.init بـ amount=Math.round(major*100) هللات، currency SAR، callback_url=origin+/payment/return?order={id}، methods من الإعدادات الحية، language ar — بلا أي حقول بطاقة يدوية؛ خطأ CDN → رسالة عربية + زر إعادة ≥44px
- src/app/(public)/payment/return/ (جديد): server page بـ robots noindex + PaymentReturnContent (Suspense) — يقرأ order/payment_id (مع قبول `id` الذي يلحقه مويسر عند العودة)؛ «مدفوع سابقًا» من useFinanceOrderPayments قبل أي تحقق؛ تحقق حتمي عبر useVerifyEmbeddedPayment بمفتاح idempotency واحد في useRef (إعادات «غير مدفوعة بعد» تلقائية 3×/3ث بنفس المفتاح ثم زر يدوي بنفس المفتاح)؛ أخطاء العقد (مطابقة مبلغ/عملة/طلب آخر) → detail كما هو + تنبيه جسيم «تواصل مع الدعم»؛ 401 → زر دخول بـ next؛ نجاح paid → شاشة خضراء + متابعة الطلب/طلباتي (إبطال الكاش يتكفل به onSuccess في الـhook: orders + order-detail + finance:order-payments)
- src/app/(public)/orders/[id]/pay/ (جديد): حارس جلسة (hydrate → redirect /login?next=/orders/{id}/pay)؛ بوّابة العرض: سوق غير سعودي → «الدفع الإلكتروني متاح للسوق السعودي فقط»؛ مدفوع سابقاً → بطاقة خضراء + زر للطلب؛ embedded=false أو mode≠embedded → بطاقة «تحت الصيانة» (Wrench) + «كاش متاح دائماً» بلا نموذج (سيناريو الحي direct)؛ embedded → ملخص order.total/subtotal/delivery_fee بـMoneyText SAR + شفافية الأجرة (distance/billed/per_km + شارة عنوان غير محدد بدقة) + MoyasarEmbeddedForm + ملاحظة الأمان
- src/components/public/DeliveryFields.tsx: نوع CheckoutPaymentMethod = PaymentMethod | "electronic" + prop market (saudi|yemen، الافتراضي yemen للتوافق) — سعودي: كاش + بطاقة «دفع إلكتروني (بطاقة/Apple Pay)» (electronic واجهة حصراً) وإخفاء محفظة التاجر؛ يمني: كاش + محفظة وإزالة بطاقة «الدفع الإلكتروني المباشر 🔒 قريباً» الميتة (لا أثر إلكتروني للسوق اليمني)
- src/components/public/CheckoutSheet.tsx: حذف DELIVERY_FEE/DISCOUNT_RATE نهائياً — أجرة حية عبر useDeliveryEstimate(product.facility_id, lat, lng) بنفس مفتاح استعلام DeliveryFields (طلب واحد)، عرض breakdown حرفياً + شارة amber للعنوان غير الدقيق + note؛ قبل الموقع «تُحسب حسب المسافة بعد تحديد موقعك» بلا رقم؛ الإجمالي = subtotal + fee عند توفرها + سطر «الإجمالي النهائي يؤكده الخادم عند إنشاء الطلب»؛ نسبة عضوية حية من /me فقط (بلا ثابت) ورواج العضوية بلا رقم؛ كل المبالغ بـMoneyText بعملة السوق (SAR/YER) بدل formatCurrency (ر.ي الميتة)؛ الطلب يُرسل payment_method="cash" دائماً في المسار الإلكتروني (electronic لا يُرسل للخادم إطلاقاً — عقد)؛ SuccessView: سعودي+إلكتروني → بطاقة ذهبية «خطوة أخيرة — الدفع الإلكتروني» + «ادفع الآن» → /orders/{id}/pay + «كاش عند الاستلام — لاحقاً»؛ اليمن سلوكه كما كان حرفياً (wallet → شاشة الدفع / كاش → طلباتي)؛ locale فاشل → يمني مع retry:1
- src/app/(public)/orders/[id]/OrderDetailContent.tsx: قسم «الدفع» (useLocaleMe + useFinanceOrderPayments) للسوق السعودي حصراً — دفعة paid → FinanceStatusBadge «مدفوعة» وإخفاء الزر، وإلا زر «ادفع الآن إلكترونيًا» → /orders/{id}/pay (يظهر حتى للطلب كاش)؛ اليمن بلا قسم إلكتروني؛ ملخص الفاتورة بـMoneyText بعملة السوق + سطر شفافية distance_km/billed_km/per_km_price + شارة «عنوان غير محدد بدقة» + InfoRow رسوم التوصيل بـformatMoney
- src/services/customer-api-client.ts (إصلاح تكاملي أدنى): post يقبل options.headers مثل apiClient/ownerApiClient — قبل الإصلاح كانت ترويسة X-Idempotency-Key تتساقط في verifyEmbeddedPayment وكان خطأ TS2554 قائماً من المهمة 2 (البرونزية-4 أصبحت توصل فعلياً)
- CartSheet/CartPageContent: حرس نوعي 1-سطر (electronic→cash) بسبب توسيع نوع DeliveryFields — سلوك السلة سوق يمني افتراضياً دون تغيير
- DELIVERY_FEE/DISCOUNT_RATE بقيت في site-config.ts (grep: مستعملة في AccountFaq/MemberCard/ProductCard/StickyMiniCart/useCartPricing/ProductDetail/Facilities/register/home/owner-settings — الشرط «غير مستعملة في أي ملف» غير متحقق)
- التحقق: bunx tsc --noEmit = 108 خطأ كلها سابقة (كانت 109 — أصلحنا واحد) وصفر في ملفاتي؛ bun run lint = 0 errors و5 warnings كلها سابقة (react-hook-form/PaymentScreenContent)؛ dev/build لم يُشغّلا (ملتزم)

Stage Summary:
- عقد الدفع الإلكتروني مكتمل الواجهة: CheckoutSheet (اختيار electronic) → إنشاء طلب cash → /orders/{id}/pay (نموذج مويسر المدمج، هللات ×100، مفتاح publishable حي) → /payment/return (تحقق حتمي idempotent) → شاشة نجاح تبطل كاش الطلبات
- البوابة السوقية صارمة: اليمني لا يرى أي أثر دفع إلكتروني (خيار/شارة/placeholder)؛ والسعودي لا يرى محفظة التاجر؛ فشل locale = يمني (graceful)
- الوضع الحي mode=direct → شاشة «الدفع الإلكتروني تحت الصيانة» جاهزة للاختبار الفوري، وتنقلب تلقائياً إلى النموذج المدمج متى فعّل الأدمن embedded
- مخاطر للتكامل: (1) Moyasar يلحق id (وليس payment_id) عند العودة — تمت تغطيته بقراءة الاثنين (2) تكملة مهام لاحقة: StickyMiniCart/useCartPricing/FAQ ما زالت تحمل أرقاماً ميتة للسلة اليمنية (خارج نطاق 4-a) (3) finance.service.ts(352) خطأ TS سابق (exportCsv يمرر Accept خارج headers) — يحتاج وكيل أدمن (4) error TS2339 payment_is_completion سابق في WalletPaymentCard (يمني) — يحتاج ترقيع أنواع

---
Task ID: 8-a
Agent: بصمة — مهندس فرونت توفير
Task: إزالة كاملة لأثر «فلسفة 30% القديمة» والأرقام التسعيرية الميتة (البرونزية-3 + القسم 8)

Work Log:
- src/lib/site-config.ts: حذف DISCOUNT_RATE (30) وDELIVERY_FEE (300) نهائياً — بقي SITE_NAME/URLs/BRAND_ORIGIN/identityUrl/MEMBERSHIP_AMOUNT كما وُجه (لم يُلمس).
- src/hooks/useCartPricing.ts (إعادة بناء): memberRate من /me حصراً (membership.discount_rate ?? 0 — بلا أي ثابت/fallback)؛ deliveryFee: number|null من useDeliveryEstimate(facilityId, lat/lng المحفوظة في cart store) عبر GET /orders/delivery-estimate؛ total: number|null = deliveryFee==null ? null : subtotal+deliveryFee؛ أرجع {items, pricedItems, facilityId, facilityName, totalCount, baseSubtotal, subtotal, discountAmount, deliveryFee, deliveryLoading, total, isMember, memberRate} — حُذف potentialSavings (كان يحسب 30%) وmemberSavings أصبحت discountAmount وdelivery أصبحت deliveryFee.
- src/store/cart.store.ts (إضافة داعمة): deliveryLat/deliveryLng محفوظة في persist + setDeliveryCoords — تُمسح تلقائياً عند إفراغ السلة/آخر صنف. هذا هو «الموقع المحفوظ في cart store» الذي يتغذى عليه التقدير.
- مستعملو useCartPricing (grep كامل — ثلاثة فقط): CartSheet.tsx وCartPageContent.tsx وStickyMiniCart.tsx حُدّثوا كلهم للتوقيع الجديد:
  • CartSheet: صف «أجرة التوصيل» = fee من الخادم أو «تُحسب حسب المسافة عند التأكيد»؛ الإجمالي يظهر فقط عند توفر الأجرة وإلا «{subtotal} + الأجرة»؛ onLocated يحفظ الإحداثيات في cart store؛ خصم العضوية يُعرض فقط عند discountAmount>0 (لا «خصم 0%»).
  • CartPageContent: نفس الأسلوب + وعي handover (استلام من المتجر = «بلا أجرة» والإجمالي=subtotal)؛ زر التأكيد الديسكتوب/الشريط اللاصق يعرضان الإجمالي عند توفره وإلا نصاً واضحاً؛ MembershipUpsell أصبح نصية بلا مبالغ محسوبة.
  • StickyMiniCart: حذف DELIVERY_FEE/DISCOUNT_RATE والحساب المحلي كلياً — التسعير من useCartPricing؛ الإجمالي عند توفر الأجرة وإلا «{subtotal} + الأجرة».
- ProductCard.tsx (سطر 90): memberRate = me.data?.membership?.discount_rate ?? 0 وhasMemberDiscount = isMember && memberRate>0 — الشطب/اللون primary يختفيان معاً عند صفر (لا خصم 0% ولا اعتماد على 30).
- MemberCard.tsx (201/240): «خصومات حصرية للعضوية في كل المتاجر المشتركة» / «وفّر أكثر.. عِش أجمل — خصومات حصرية للعضوية» — بلا أرقام؛ بطاقة العضو الحقيقية كانت أصلاً تعرض membership.discount_rate فقط عند >0 (بقيت كما هي).
- AccountFaqContactSection.tsx: حذف الاستيراد وإعادة صياغة FAQ بلا أرقام — سطر الخصم بنص المهمة حرفياً + «نسبة الخصم يحددها كل متجر»، وسطر التوصيل «تُحسب حسب المسافة... تُعرض بوضوح قبل تأكيد الطلب»، وسطر الاشتراك بلا «3000 ر.ي».
- مستعملو DISCOUNT_RATE/DELIVERY_FEE الآخرون (grep شملهم): ProductDetailContent (memberRate من /me فقط + «اشترك لخصم {facilityRate}%» فقط إن facility.discount_rate>0 وإلا «اشترك لخصم حصري»)؛ FacilitiesContent + FacilityDetailContent (DiscountBadge بنسبة المتجر الحقيقية ?? 0 + حوار السعر بخصم /me + شريط «خصومات حصرية»)؛ register/page (شارة «خصومات حصرية للعضوية» بدل DiscountBadge الثابت + BENEFITS + العنوان + حذف «3000 ر.ي»)؛ home page.tsx (maxDiscount fallback 0 — الشارة من نسب المتجر الحقيقية فقط)؛ owner/settings («أجرة التوصيل: تُحسب حسب المسافة»)؛ DiscountBadge.tsx (default 30→0: بلا رقم افتراضي، تختفي عند ≤0).
- نصوص «خصم حتى 30%» الثابتة (grep شامل): WelcomeBanner، Footer، SavingsSummaryCard، FreeMembershipCard (4 مواضع)، account/page (سطرا 89/443 + حذف 3000)، manifest.webmanifest/route، layout.tsx (العنوان الرئيسي og/twitter «توفير | طلب الوجبات والخصومات الحصرية» + الوصف + keywords + jsonLd)، FacilityForm (تعليقا 510/524: «نسبة الخصم يحددها التاجر — 0 حتى الحد الأقصى من الإعدادات الحية» بلا تغيير منطق)، owner/register (~1374: «نسبة الخصم اختيارية من 0% حتى الحد الأقصى المسموح من المنصة. يمكن تعديلها لاحقاً.» — الجملة فقط)، OwnerSpecialOfferForm (placeholder «مثال: عرض حصري — وجبات بخصم خاص»)، OwnerSpecialOffersContent (نص المثال)، savings/page (سطران)، SubscribeContent (3 مواضع) وsubscribe/page metadata (بلا «3000 ر.ي») — ومن ضمنها مواضع لم تُسمّى في المهمة لكنها ظهرت في grep «خصم حتى 30%» وُجدت ضمن النطاق.
- FreeMembershipToggleCard.tsx (أدمن): حذف «3000 ر.ي» الحرفية الوحيدة المتبقية → «مبلغ الاشتراك السنوي» (MEMBERSHIP_AMOUNT نفسه لم يُلمس).
- لم يُلمس: CheckoutSheet/OrderDetailContent/finance-* (منطق الجولة المالية سليم)، منطق حقول النماذج، الملفات المولدة (api.openapi.ts/api.generated.ts تبقى تحمل أمثلة OpenAPI بـ30% — خارج النطاق).
- التحقق: bunx tsc --noEmit = 0 أخطاء (كان خطأ واحد أدخلته أنا في CartSheet وأصلحته فوراً)؛ bun run lint = 0 errors و5 warnings كلها موروثة (react-hook-form watch في register/OwnerSpecialOfferForm — خارج نطاقي)؛ grep نهائي: DISCOUNT_RATE/DELIVERY_FEE = صفر في src كله، و«30%» خارج الأنواع المولدة = قيم شفافية CSS color-mix فقط (ليست تسعيرية)، و«300 ر.ي/3000 ر.ي» الحرفية = صفر.

Stage Summary:
- فلسفة التسعير أصبحت موحدة على كل أسطح السلة: نسبة العضوية من /me فقط، أجرة التوصيل ديناميكية حسب المسافة من /orders/delivery-estimate (بموقع محفوظ في cart store)، والإجمالي إما مكتمل من الأجرة المقدَّرة أو نص شفاف «+ الأجرة» — الرقم النهائي دائماً من الخادم عند إنشاء الطلب.
- صفر ثوابت تسعيرية في الكود: لا DISCOUNT_RATE ولا DELIVERY_FEE، ولا نص تسويقي يحمل رقماً (30% / 300 / 3000) خارج الأنواع المولدة من OpenAPI.
- ملاحظات تكامل للوكلاء القادمين: (1) Slider نسبة الخصم في owner/register لا يزال min=5/max=30 كمنطق حقل — التعديل إلى «0 حتى حد الإعدادات الحية» يحتاج قراءة إعدادات حية (DISCOUNT_MAX_PCT) وهو خارج نطاق «عدّل الجملة فقط»؛ (2) StickyMiniCart/CartSheet يعرضان الأجرة فقط لجلسة عميل مسجلة — الزائر يرى النص الشفاف دائماً (سلوك مقصود)؛ (3) خطأ finance.service.ts:352 السابق (Accept خارج headers) ما زال بانتظار وكيل أدمن كما وثّقت 4-d.

---
Task ID: 8 (تكامل)
Agent: منسق الجولة (Z)
Task: دمج مخرجات 4-a..4-d وإصلاح التكامل

Work Log:
- إصلاح 64 خطأ TS ناتجة عن السكمة الحية: +cafeteria (constants/admin×2/FacilitiesList/home/register/public)، +courier (admin/page/UsersTable: تسميات/ألوان/أيقونات مع استيراد Bike)، أسماء تاريخية مولّدة NotificationOut/AuditLog/User/UserDetail عبر ALIASES في gen-api-types.mjs، وصرامة nullable عبر كل البوابات (coercions دقيقة)
- إصلاح exportCsv (Accept داخل headers) + PaymentMethod cast في OrderDetailContent (payment_is_completion اختيارية بصمت موثق)
- إصلاح CheckoutProduct لتقبل undefined (السكمة اختيارية الحقول)
- إصلاح انهيارين حيين: صور إيصالات example.com عبر next/image (→ <img> عادية)، SelectItem بقيمة "" (→ سنتينل "all" + تحويل null عند النداء)
- src/lib/api-error-msg.ts موحّد على العملاء الأربعة (نص/مصفوفة/{message,errors}) — قضى على [object Object]
- تطبيع STC Pay: 05→9665 + تحقق ^9665\d{8}$ + تلميحات
- منزلق خصم المالك: 0–20% خطوة 1 (§8) + zod 0..20 + افتراضي 0

Stage Summary:
- tsc: 0 أخطاء · eslint: 0 أخطاء (5 تحذيرات موروثة) · dev يعمل

---
Task ID: 9 (اختبار E2E حي)
Agent: منسق الجولة (Z)
Task: اختبار كل الأدوار على الحي عبر Agent Browser

Work Log:
- عميل سعودي: دخول → منتج → شيت الطلب: خيار «دفع إلكتروني» ظهر للسعودية ومحفظة مخفية؛ بطاقة الأجرة الحية ظهرت breakdown حرفي «8 لأول 3 كم + 3 كم إضافية × 1.5 = 13» وfee=13 من الحي (مع geo-mock — الصلاحية مرفوضة بيئيًا)؛ طلب #12 أُنشئ؛ SuccessView ب«ادفع الآن»
- شاشة الدفع مع direct: «الدفع الإلكتروني تحت الصيانة» ✅ ثم قلب الأدمن PAYMENT_MODE=embedded من اللوحة (تحقق حي من /finance/settings) → النموذج طلب تحميل CDN → 403 من الساندبوكس → حالة خطأ + إعادة محاولة (سلوك عقد سليم)
- /payment/return بpayment_id وهمي: verify انطلق → خطأ عربي + «تواصل مع الدعم» + أزرار المتابعة ✅
- عميل يمني: كاش + محفظة فقط — صفر أثر إلكتروني ✅
- مالك يمني: /owner/finance بطاقة حية تطابق الخادم (ذمة30/متراكم270/مدفوع240) + رفع إشعار 90 YER ظهر «مقدَّم» فورًا ✅
- أدمن: مراجعة اليمن قبول بملاحظة → المالك تحدث حيًا (330/-60) ✅ · الصرف: نافذة كاملة، الرفض برسالة العقد «لا توجد مستحقات معلّقة لهذا المندوب» كما هي ✅ · دفتر القيود 34 قيد + ترقيم + CSV من الخادم سليم ✅ · لوحة المالكين عمولات YER/SAR + بطاقة تاجر ✅
- مندوب سعودي: /courier/finance الرصيد ٠ + الوجهة المقنّعة SA**7519 «قيد التوثيق» + نموذج STC Pay؛ الخادم 500 على إنشاء الوجهات (curl مؤكد) — انحدار باك إند موثق، الواجهة صمدت
- الوضع الداكن + موبايل 390px: لقطات سليمة، عنوان/نصوص جديدة بلا 30% ✅
- ملاحظات بيئية: dev server قُتل مرتين بضغط الذاكرة (أعيد تشغيله)، CDN مويسر 403، geolocation denied

Stage Summary:
- 12/15 سيناريو مكتملة، 3 معاقة بيئيًا (CDN/500 باك/3DS) — كلها موثقة بجاهزية كاملة في docs/تقرير-الاختبار-المالي-v5.md

---
Task ID: 10 (تسليم)
Agent: منسق الجولة (Z)
Task: حزم الدمج + التقارير

Work Log:
- docs/تقرير-الاختبار-المالي-v5.md + docs/دليل-الدمج-والنشر-v5.md (داخل المستودع ضمن الحزمة)
- قائمة التغيير من git مقابل 8831830: 63 معدلًا + 21 جديدًا (بلا أي حذف؛ merge.sh/bat/capacitor/native-shell/factory-evidence/console لم تُلمس)
- tawfir-front-finance-v5-full.zip (مصدر كامل بلا node_modules/.next/.git/مخلفات الساندبوكس) + tawfir-changes-only-v5.zip (المتغير+الجديد+الأدلة+دليل دمج)
- النسخ في public/ للتحميل من المعاينة

Stage Summary:
- الحزم جاهزة للتنزيل والدمج مع Vercel (التجربة: bun install && bun run build)
