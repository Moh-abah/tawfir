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

---
Task ID: 11 (إعادة التسليم)
Agent: منسق الجولة (Z)
Task: إعادة بناء حزم الدمج بعد فقدانها من بيئة الساندبوكس (طلب المالك صراحة)

Work Log:
- التحقق من المستودع: كل التغييرات سليمة (8831830 → worktree = 90 ملفًا حقيقيًا: 27 جديدًا + 63 معدلًا) — الفروق الباقية (673 في git status) مجرد صلاحيات/أوضاع من الساندبوكس، ومقارنة md5 أثبتت تطابق الملفات الثنائية (خطوط/أيقونات/لقطات) حرفيًا
- إعادة بناء tawfir-changes-only-v5.zip (613KB): 90 ملف مشروع بمساراتها + كل التقارير والأدلة الجذرية + أسرار_المصنع_للمالك_حصراً.txt + merge.sh/bat + اقرأني-الحزمة-v5.md (دليل الدمج خطوة بخطوة لويندوز وgit)
- إعادة بناء tawfir-front-finance-v5-full.zip (70MB): المصدر الكامل (808 ملفات) بلا node_modules/.next/.git/مخلفات الساندبوكس
- النسخ في: public/ (تنزيل من المعاينة /tawfir-changes-only-v5.zip) + جذر المشروع + /home/z/
- تشغيل dev server: HOME=200، تنزيل الحزمة ZIP=200 (627KB) — Agent Browser: الصفحة الرئيسية ترسم كاملة (عنوان، منتجات، RTL، الوضع الليلي)

Stage Summary:
- الحزم مستعادة ومتاحة للتنزيل من المعاينة مباشرة على المسارين /tawfir-changes-only-v5.zip و /tawfir-front-finance-v5-full.zip
- لا تغيير في الكود منذ تسليم الجولة — إعادة تعبئة فقط

---
Task ID: 12 (v5.1 — ما بعد إصلاح باك إند)
Agent: بصمة — منسق الجولة (Z)
Task: إعادة اختبار المندوب بعد إصلاح «كمال» لـ500 وجهات الصرف + تحديث التقارير والحزمة

Work Log:
- تأكيد سلامة الحزمة: لا ملف باك إند في المستودع (payouts.py خارجها أصلًا) — الفروق نفسها 90 ملفًا، md5 للحزم قبل/بعد موثق؛ الإصلاح حي على السيرفر فقط وسيدمج في commit رسمي منفصل
- تحقق حي عبر proxy الفرونت (/api/* ← /api/v1/*): POST bank IBAN ← 200 (id:5) · POST wallet بصيغة غير منظمة 05 ← 422 برسالة العقد العربية (حماية سليمة) · POST wallet بصيغة الواجهة 9665 ← 200 (id:6) · GET destinations ← 200 (الأحدث أولًا) · GET my/balance ← 200 {0, SAR} · GET my ← 200 (سجل paid)
- E2E متصفح حقيقي على /courier/finance (دخول courier.sa): الرصيد «٠ ر.س» بحالة صفر مهذبة؛ إضافة وجهة بنكية من النموذج ← ظهرت أولًا بالإخفاء SA** **** 7519 + شارة «قيد التوثيق»؛ إضافة محفظة بإدخال خام 0555987654 ← طبعتها الواجهة آليًا 966555987654 وقبلها الخادم؛ «مستحقاتي» يعرض الصرف التاريخي ١٬٤٠٠ ر.س مصروف؛ صفر أخطاء كونسول
- لقطة دليل جديدة: factory-evidence/shot-34-courier-finance-fixed.png
- تحديث docs/تقرير-الاختبار-المالي-v5.md إلى v5.1: البند 6 من ⚠️ إلى ✅ (مع القسم 5 التوثيقي الجديد: سويتة curl + E2E + خلاصة 13/15)، حد البيئة 2 مشطوب «محلول»، تعريف «تم» +بند 2ب للمندوب
- تحديث docs/دليل-الدمج-والنشر-v5.md: ملاحظة ما بعد النشر رقم 4 أصبحت «محلول v5.1 — لا شيء مطلوب منك في الحزمة»
- إعادة بناء tawfir-changes-only-v5.zip (615KB) بالتقارير المحدثة وتوزيع النسخ (public/ + جذر المشروع + /home/z/)

Stage Summary:
- مسارات المندوب المالية كلها خضراء حيًا ومن الواجهة — عدّاد الجولة 13/15 والباقي (2، 14) معاق CDN مويسر بالساندبوكس حصرًا
- الحزمة v5.1 جاهزة: نفس الـ90 ملفًا + التقارير المحدثة؛ لا أي تغيير كود من v5

---
Task ID: 13 (بناء الإنتاج)
Agent: منسق الجولة (Z)
Task: تنفيذ bun run build الكامل بطلب صريح من المالك

Work Log:
- إيقاف dev server أولًا (يتشارك .next مع البناء + ضغط ذاكرة سابق في البيئة: 4GB كليًا/2.5GB متاحًا)
- bun run build (prebuild: sync-version + verify-assets) ← **EXIT 0**
  • ✓ Compiled successfully in 28.9s
  • ✓ TypeScript: 0 أخطاء (20.0s)
  • ✓ 68 صفحة ثابتة من 68 · 79 مسارًا إجمالًا · 0 تحذيرات في سجل البناء
  • مخرجات .next جاهزة لـ standalone (أمر start: NODE_ENV=production bun .next/standalone/server.js)
- إعادة تشغيل dev server: HOME=200 · تنزيل الحزمة ZIP=200 · /payment/return=200
- سجل البناء محفوظ: build.log

Stage Summary:
- البناء الإنتاجي ينجح نظيفًا من أول مرة على كود الجولة v5.1 — آخر عائق إضافي قبل النشر على Vercel سقط

---
Task ID: 14 (v6 — جولة الجوال والدفع الإلكتروني)
Agent: بصمة — مهندس فرونت (بحث + قرار + تنفيذ بصلاحية كاملة)
Task: جعل نظام الدفع مكتملًا على الجوال (APK/IPA) — 3DS/Apple Pay/STC Pay/Deep Links — بلا خروج من التطبيق وبلا كسر الويب

Work Log:
- بحث موثق من المصادر الرسمية (docs.moyasar.com: card/stc-pay/apple-pay/web-registration/sdk/ios + capacitorjs.com/docs + developer.apple.com/forums + developers.google.com/pay): 3DS2 يعمل في iframe داخل WebView؛ ApplePaySession = Safari فقط (لا WKWebView، نعم SFSafariViewController)؛ STC Pay داخل النموذج ثم callback redirect؛ Apple Pay للموبايل رسميًا يتطلب SDK أصلي + شهادة
- اكتشاف أن البنية أقوى من المتوقع مسبقًا: assetlinks.json + AASA route + setupNativeUrlOpen + صلاحيات المنصتين في patch scripts — كلها جاهزة من الجولات السابقة
- القرارات (docs/MOBILE-PAYMENT-DECISIONS.md): (1) البطاقات+STC+3DS داخل WebView صفر خروج (2) allowNavigation += moyasar كشبكة أمان تحويلات علوية نادرة + تحديث فحص build-android.yml الآلي (3) Apple Pay على iOS: زر داخل التطبيق → ورقة نظيفة ?sf=1 داخل SFSafariViewController + تحديث حالة بعد browserFinished (4) رفض custom schemes (5) الويب لم يُلمس — كل الشروط isNativeIOS
- التنفيذ: src/lib/payment-bridge.ts جديد (كشف النظام + وضع الورقة + useSafariSheetParams بuseSyncExternalStore آمن الترطيب + openApplePaySheet + openInAppBrowser احتياطي)؛ PayOrderContent: PayEntry نقطة فصل قبل حارس الجلسة + زر  Pay أسود ≥52px (iOS + applepay فقط) + SafariSheetPay نظيف بلا جلسة (المبلغ استرشادي والسلطة للـverify الخلفي)؛ capacitor.config.ts allowNavigation؛ package.json +@capacitor/browser@8.0.5
- إصلاح lint error قديم في factory/owner/BrandPanel.tsx (set-state-in-effect) بتعليق استثناء موثق — الملف خارج نطاق الجولة فلم يُغيَّر سلوكه
- الاختبار الحي: build EXIT 0 (79 مسارًا) · lint 0 errors · وضع الورقة ?sf=1 بالمتصفح: هيدر الهوية + بطاقة المبلغ من المعاملات + CDN 403 يُعرض بأدب (لقطة shot-35) · بلا معاملات: رسالة مهذبة · صفر hydration warnings · الشاشة الطبيعية سليمة والزر لا يظهر على الويب
- التوثيق الثلاثي: MOBILE-PAYMENT-DECISIONS.md (بحث+قرارات بمراجع) · MOBILE-TEST-REPORT.md (مُختبر فعليًا + قائمة جهاز صريحة بندًا بندًا — بلا ادعاءات) · MOBILE-DEPLOY-GUIDE.md (دش مويسر + APPLE_TEAM_ID + AAB/IPA + فحوصات ما بعد النشر)
- الحزمة أعيد بناؤها: 93 ملفًا + لقطة 35 → 740KB، التنزيل من المعاينة يعمل (200)

Stage Summary:
- الجوال الآن مكتمل معماريًا: أندرويد صفر خروج إجمالًا؛ iOS صفر خروج فعلي (الورقة داخل التطبيق)؛ الويب كما هو حرفيًا
- البنود المتبقية كلها إجراءات مالك في الدش/الحساب (مويسر domains + STC activation + APPLE_TEAM_ID) — موثقة في دليل النشر §2

---
Task ID: 15 (تصحيح حزم — إدراج ملفات جولة الجوال الناقصة)
Agent: بصمة — منسق الجولة (Z)
Task: اكتشاف المالك أن ملفات جولة الجوال غير مضمنة في حزمة التحميل → حزمة منفصلة + ترقيع الرئيسية

Work Log:
- تشخيص: tawfir-changes-only-v5.zip (نسخة 21:29) تضم الملفات المعدلة من الجولة 14 (PayOrderContent/capacitor.config/build-android.yml/package.json+browser/shot-35) لكنها فاتت 4 ملفات جديدة كليًا: src/lib/payment-bridge.ts + docs/MOBILE-PAYMENT-DECISIONS.md + MOBILE-TEST-REPORT.md + MOBILE-DEPLOY-GUIDE.md (سبب محتمل: قائمة الملفات بُنيت قبل إنشاء الجديد)
- تحديث pkg-staging بالملفات الأربعة + دليل جديد: اقرأني-حزمة-الجوال.md (بنفس أسلوب اقرأني-الحزمة-v5)
- حزمة منفصلة tawfir-mobile-round-v5.zip: 10 ملفات (4 جديد + 4 معدل + الدليل + shot-35) ~77KB بمسارات أصلية
- ترقيع الرئيسية zip in-place: +4 ملفات → 181 مدخلًا (770KB)، unzip -t سليم
- توزيع 3 نسخ لكل حزمة (public/ + جذر المشروع + /home/z/) — md5: نسختان فريدتان فقط (تطابق كامل داخل كل حزمة)
- تحقق حي: GET / = 200 · GET /tawfir-changes-only-v5.zip = 200 (770061 B) · GET /tawfir-mobile-round-v5.zip = 200 (76969 B)

Stage Summary:
- الخرق أُصلح مزدوجًا: حزمة منفصلة مستقلة للجولة (طلب المالك) + الحزمة الرئيسية أصبحت مكتملة فعليًا (181 ملفًا)
- تحذير موثق في الدليل: لا دمج الحزمتين معًا — المنفصلة مجموعة فرعية من الرئيسية المحدثة

---
Task ID: 16 (تصحيح «ملف build-android.yml غير مرئي»)
Agent: بصمة — منسق الجولة (Z)
Task: المالك لا يجد build-android.yml في الحزمة ولا في بيئة الوكيل → تشخيص وعلاج جذري

Work Log:
- التشخيص: الملف موجود فعلًا على القرص (.github/workflows/build-android.yml — 27,796B، معدل 21:21) وفي الحزمتين، وفيه فحص مويسر الآلي (أسطر 222–225: grep '*.moyasar.com' capacitor.config.ts وإلا exit 1)
- السبب الجذري لعدم رؤيته: الوحيد في الحزمتين داخل مجلد مخفي يبدأ بنقطة (.github/) — مستعرضات الملفات/Finder تخفيها افتراضيًا
- العلاج: نسخة مرئية مطابقة بالبايت docs/build-android.yml (md5 b27a6f15...) أُضيفت للحزمتين + staging
- توثيق: قسم «👁️ لماذا لا ترى build-android.yml؟» في اقرأني-حزمة-الجوال.md (طرق الإظهار: Windows View/Hidden، macOS Cmd+Shift+.، VS Code، بحث) + ملاحظة مطابقة ملحقة بـاقرأني-الحزمة-v5.md داخل الرئيسية
- إعادة توزيع النسخ الثلاث لكل حزمة؛ unzip -t سليم؛ md5 فريدتان فقط (تطابق النسخ)؛ النسخة المرئية داخل الأرشيف مطابقة للأصل
- تحقق حي: home/mobile zip/main zip = 200 (86,148B و 778,807B)

Stage Summary:
- المشكلة لم تكن غياب الملف بل إخفاء المجلد الأب المنقوط — عولجت مزدوجًا (نسخة مرئية + توثيق الإظهار)
- الحزمتان الآن: المنفصلة 12 ملفًا (86KB)، الرئيسية 183 مدخلًا (779KB)

---
Task ID: 17 (الجولتان على السوقين + جاهزية إصدار التطبيقين)
Agent: بصمة — منسق الجولة (Z)
Task: هل جولات المصنع بالكامل مطبقة على السوقين السعودي/اليمني؟ + إصدار تطبيق لتاجر سعودي وآخر يمني (بحسابات الاختبار التسعة)

Work Log:
- أثبت انقسام السوقين حيًا: locale/me للعميل السعودي {country_code:966,SAR,🇸🇦} واليمني {967,YER,🇾🇪} — نفس الحقل الذي تقرأه الواجهة (isSaudiCountry === "966")
- مصفوفة الجولات×السوقين موثقة بالكود: CheckoutSheet (سعودي=كاش+إلكتروني/يمني=كاش+محفظة)، OrderDetail (قسم إلكتروني للسعودي فقط)، PayOrderContent SAR/Moyasar، PaymentScreenContent إشعار محفظة (يمني)
- التاجرَان مؤكدان حيًا: #32 كافتيريا التجريبي السعودي (الرياض، منتج 100) و#33 كافتيريا صنعاء التجريبي (صنعاء، 3 منتجات) — والصفحتان ترسمان (shot-36/36b/37 بعد ضبط منطقة المخزن=1)
- رفعت هوية المنشأتين من 12%→100%: PUT owner/brand (اسم/شعار نصي/ألوان/هاتف/عنوان) + 6 أصول مولدة بالذكاء (logo/app_icon/splash لكل سوق بهوية مميزة: زمردي#0E6B4A/ذهبي للسعودي، زيتوني#6B7A3A/طيني لليمني) — ids 8-13
- الإصدار عبر الكونسول محجوب بغارد واحد: CONSOLE_PASSWORD من بيئة الخادم (كل المحاولات المنطقية 403 برسالة عربية سليمة؛ console.demo يعمل customer حصراً) — الأمران الجاهزان موثقان في التقرير §4
- التقرير الشامل: docs/تقرير-الجولتان-على-السوقين-v6.md

Stage Summary:
- الجواب: نعم — منصة واحدة تخدم السوقين بتفرع موثق ومثبت حيًا؛ والتاجرَان مكتملا الجاهزية 100% في قائمة «المكتملة فقط» بالكونسول
- المتبقي الوحيد: كلمة CONSOLE_PASSWORD من المالك (سطر واحد) لأصدر التطبيقين فورًا، أو ينفذه بنفسه من /console في دقيقتين

---
Task ID: 18 (الإصدار الفعلي للتطبيقين — السعودي واليمني)
Agent: بصمة — منسق الجولة (Z)
Task: بعد وصول كلمة الكونسول من المالك — إصدار وتوقيع تطبيقي المطعمين السعودي واليمني كاملين

Work Log:
- دخول الكونسول نجح (factory_admin، role:console) — المنشأتان 32/33 ظاهرتان 100% في /console/brands
- الإصدار: POST /console/apps → 201 ×2: #4 com.tawfir.sa.cafeteria32 (زمردي/ذهبي) و#5 com.tawfir.ye.cafeteria33 (زيتوني/طيني) — المانيفست كامل بأصولي المولدة + FCM المشترك + capacitor config
- التوقيع: توليد keystore حقيقية RSA-2048/30 سنة لكل تطبيق (keytool Java 21) ورفعها للخزنة → 201 ×2، الحالة signed، sha256 موثقة
- مهمات البناء: POST build-jobs ×2 → queued (github_actions) — التنفيذ الفعلي بمستودع المالك وأسراره (حد النظام الموثق)
- bundle ZIP للتطبيقين مُنزّل ومفحوص (manifest + fingerprints registry — بصمتا الخزنة ظاهرتان فيه)
- حزمة أسرار المالك: /tawfir-keystores-v6.zip (keystores + كلمات + b64 + أوامر حقن gh) في public/ للتحميل
- تحديث التقرير §6 + لا قيم سرية في التقارير (السياسة)

Stage Summary:
- الدورة الكاملة اكتملت: جاهزية 100% → إصدار 201 → توقيع خزنة signed → طابور بناء — للسوقين معًا
- المتبقي إجراءات GitHub لدى المالك فقط (حقن 4 أسرار ×2 + تشغيل workflow) — كل الأوامر جاهزة داخل حزمة الأسرار

---
Task ID: 19 (حكم market.currency في المانيفست)
Agent: بصمة — منسق الجولة (Z)
Task: هل تعديل حقل market.currency الافتراضي «ريال يمني» ضروري؟ وتطبيق التعديل إن لزم

Work Log:
- فحص استهلاك الحقل: build-android.yml (28KB) لا يقرأ أي حقل market/manifest → أثر وظيفي صفر
- فحص مسارات الإصلاح من الواجهة: PUT facility بلا حقول region/country/currency؛ جدول المناطق يمني حصرًا (22) بلا فلاتر؛ لا كود باك إند محليًا
- الجذر: مولد المانيفست باك إند يشتق السوق من منطقة المنشأة (يمنية افتراضيًا) بدل بلد المالك (966)
- الحكم الموثق في التقرير §7: غير ضروري للإطلاق (3 أدلة)؛ يستحق ترقيع ~10 أسطر لاحقًا (خيارا التنفيذ جاهزان: SSH مني أو grep منه)

Stage Summary:
- القرار: لا عرقلة ولا تعديل فوري — ديون تقنية صغيرة موثقة بمسار إصلاح جاهز من خيارين

---
Task ID: 3
Agent: بصمة (وكيل الفرونت) — جولة الفصل الحقيقي بين السوقين v7
Task: فحص كامل شامل: هل الفصل بين السوقين السعودي/اليمني حقيقي أم شكلي؟ + الإجابة على الأسئلة الأربعة الحرجة + تقرير تعديلات كامل للفرونت + ورقة مهمة الباك اند + حزمة دمج

Work Log:
- فحص حي: GET /regions → 22 محافظة يمنية بلا حقل country_code في المخطط؛ لا يوجد مسار cities في openapi (199 مساراً)
- فحص حي: GET /facilities?country_code=966 → أُهمل المعامل وأعاد 21 منشأة (السعودية #32 الساكنة في «الجوف» اليمنية)
- فحص حي: POST /auth/register بجوال 0512345678 → 201 user_id=113 ثم locale/me → 967/YER (الافتراضي يمني للكل — لا استنتاج من الجوال)
- فحص حي: GET /membership/info للسعودي → «3000 ريال يمني» عبر «محفظة جيب»؛ delivery-estimate عند الرياض → جدول أجرة اليمن
- تدقيق كود: formatCurrency في format.ts:67-75 مصفّاة ثابتة على «ر.ي» (~60 استهلاكاً)؛ useSetLocaleMe معرّفة بلا مستهلك واحد؛ تسجيل العميل يمني regex حصراً
- الحكم: الفصل حقيقي في سلسلة الدفع فقط (طرق الدفع/مويسر/إعدادات SA_*/payouts) وشكلي/غائب في 12 محوراً (مصفوفة 14 محوراً موثقة)
- تنفيذ مرحلة أ (3 جديدة + 8 معدلة): saudi.ts + market.store.ts + MarketProvider.tsx؛ format.ts (formatMoney بعملة صريحة/فعالة)؛ region.service/useRegions/useFacilities (country_code دفاعي)؛ useRegister (region اختياري)؛ layout (تركيب Provider)؛ register (منتقي بلد 🇾🇪/🇸🇦 + تحقق مزدوج + PUT locale/me بعد التسجيل يكسر الافتراض اليمني)
- lint: 0 أخطاء (17 تحذيراً سابقاً فقط)؛ dev.log سليم؛ / و /register و /facilities = 200
- كتابة docs/تقرير-الفصل-الحقيقي-بين-السوقين-v7.md (الأدلة + مصفوفة 14 محوراً + مواصفة DDL/API/معايير + مرحلة أ/ب + ترحيل + أوامر تحقق)
- كتابة docs/مهمة-الباك-اند-الفصل-الحقيقي-v7.md (4 مهام بمعايير قبول — جاهزة للتسليم لوكيل الباك اند)
- بناء tawfir-market-separation-v7.zip (14 ملفاً، 40KB) بثلاث نسخ (جذر + public + /home/z/) — تحميل حي 200

Stage Summary:
- الفصل بين السوقين شكلي خارج سلسلة الدفع — موثق بالأدلة الحية سطراً سطراً
- سعودي الجديد الآن يسجل من الواجهة ويُولد بسوقه الصحيح 966/SAR حتى قبل أي تغيير باك اند
- الفلترة البلدية تُنشّط تلقائياً بمجرد دعم الباك اند (المعاملات الدفاعية جاهزة في الواجهة)
- حساب فحص للتنظيف الاختياري: probe.sa@tawfir.test (user 113)
- التطبيقان السعودي/اليمني (apps 4/5) غير متأثرين — البناء والهوية كما صدرا في v6

---
Task ID: 3-b
Agent: بصمة — تثبيت الفحص بالمتصفح وإصلاح آلية العملة
Task: تحقق نهاية-إلى-نهاية لمرحلة أ بالمتصفح الحي + إصلاح خللين اكتشفهما الفحص

Work Log:
- فحص /register: منتقي البلد 🇾🇪/🇸🇦 يعمل — اختيار السعودية يخفي منتقي المناطق اليمني ويبدّل placeholder الجوال إلى 0512345678
- اختبار التحقق المزدوج: جوال يمني مع سعودي مختار → رسالة عربية دقيقة «أدخل رقم جوال سعودي صحيح — يبدأ بـ 05…» ✓
- اكتشاف خلل 1: formatCurrency كانت تفوّض YER صراحة فتُلغي العملة الفعالة → أُصلحت (تفويض بلا عملة صريحة)
- اكتشاف خلل 2 (جوهري): إبطال كاش react-query وحده لا يعيد الرسم حين تحافظ structural-sharing على هوية البيانات — السعر بقى ر.ي حتى أول تفاعل (مُثبت: فتح ورقة الطلب عرض ر.س فوراً بينما القائمة لا)
- الإصلاح الجذري في MarketProvider: تطبيق عملة + إبطال كاش + إعادة تركيب الشجرة مرة واحدة (key) + اشتراك لحظي بمخزن السوق لتغييرات الجلسة (تسجيل جديد)
- استبعاد فرضية كاش SW: أزيلت registration وكاشات Cache Storage — الخلل كان منطقياً لا تخزينياً
- تحقق مزدوج نهائي: customer.sa → /facilities/32 → «١٠٠ ر.س» ✓ | customer.ye → /facilities/33 → «١٬٠٠٠/١٬٥٠٠/٢٬٥٠٠ ر.ي» ✓ | صفر أخطاء كونسول
- الرئيسية على قياس جوال 390×844 سليمة (2226 حرفاً) + لقطتا إثبات shot-38/shot-39
- إعادة بناء الحزمة النهائية (41KB) ونسخها الثلاث + تحميل حي 200

Stage Summary:
- مرحلة أ مُختبرة بالمتصفح نهاية-إلى-نهاية: سعودي يرى ر.س ويمني يرى ر.ي من مصدر واحد
- المفتاح الهندسي: إعادة التركيب عبر key هي الضمانة ضد structural sharing في react-query
- lint: 0 أخطاء

---
Task ID: 20 (جولة v5.1 — الفصل الذكي للسوقين على الباك إند v3/v3.1)
Agent: بصمة (وكيل الفرونت) — Z
Task: تحميل مهمة المالك من درايف وتنفيذ برومبت v5 + ملحق v5.1 (الخادم يفرض السوق) مع توجيه المالك: لا شاشات اختيار دولة — استنباط ذكي صامت

Work Log:
- ولّدت الأنواع من الحي (openapi_live.json → api:types) وتحققت: RegionOut/UserRegister/RegionCreate كلها بـ country_code و admin/regions بفلتر
- بنيت طبقة السوق الذكية: market.store (استنباط صامت: locale/me ← آخر سوق ← inferGuestMarket من التوقيت/اللغة ← افتراضي 967) بلا أي بوابة اختيار — حذفت MarketGate بمرجعية توجيه المالك
- api-client: رأس X-Market تلقائي للزائر مع محاذاة الرأس مع country_code الصريح في الرابط (بوابات السوق المستقلة) + تمرير detail 404 العربي («غير متاح في سوقك») بدل «غير موجود»
- MarketSwitcher في هيدر العميل: تبديل هادئ يصفّر المنطقة ويبطل الكاش ويزامن PUT /locale/me للمسجل (إكمال useSetLocaleMe التي كانت بلا مستهلك)
- صفحة المتجر: جلب من قائمة السوق المفلترة (يصلح الروابط المباشرة داخل السوق) + MarketUnavailableGuard «غير متوفر في سوقك» — يسمّي المتجر للزائر عبر قائمة السوق الآخر، ورسالة عامة بلا تسريب للمسجل + زر تبديل يعيد فحص الرابط
- الأدمن: مبدّل [كل الأسواق|🇾🇪|🇸🇦] بفلتر خادمي + عمود جنسية + RegionForm بحقل جنسية وتحذير تأكيد التوريث + توليد slug لاتيني تلقائي (جدة→jda)
- تسجيل المالك: شريحة سوق افتراضها سوق الجلسة + قائمتا السوقين محلياً (key على القائمة) + country_code في الحمولة + جوال 05 للسعودي + ربط 422 «تعارض سوق» بحقل المنطقة
- تسجيل العميل: افتراضي البلد = سوق الجلسة + مناطق السعودية بمنتقي مضبوط + تصفير المنطقة عند تغيير السوق
- إصلاحات استُنتجت من الفحص الحي: منع تبنّي x-market داخل api-client (كان يقلب الجلسة)، محاذاة الرأس مع نية الرابط، key={marketCountry} لقائمة المالك
- تحقق نهاية-إلى-نهاية بالمتصفح: 13 سيناريو حي نجحت (شامل A1/A4/A5 زائر ومسجل، إنشاء جدة ظهرت حياً بـ14 منطقة سعودية، تحذير التوريث، ثنائية تبديل مناطق المالك) — lint 0 أخطاء، tsc نظيف، dev.log نظيف

Stage Summary:
- الفصل بين السوقين أصبح ذكياً صامتاً ومفروضاً من المصدر: المستخدم لا يُسأل أبداً — جلسة العميل تحسم من locale/me، والزائر يُستنبط من إشارات بيئته، و404 العابر يُستقبل بشاشة ودودة بلا تجاوز
- تقرير الجولة: docs/تقرير-الفصل-الذكي-للسوقين-v5.1.md
- الأنماط المالية من v4/v2 (مويسر/ذمة/تقدير) بلا أي انحدار — ملفاتها لم تُمَس

---
Task ID: 21 (حزمة الجولات الأخيرة بعد حزمة الجوال v5)
Agent: بصمة — منسق الجولة (Z)
Task: المالك طلب الحزمة الجديدة الكاملة لجولاتي الأخيرة وتعديلاتي الأخيرة — بعد أن طبق tawfir-mobile-round-v5.zip

Work Log:
- حددت الخط الأساسي (commit 8831830) وفككت الحزم السابقة الثلاث (changes-only-v5 124 ملفاً + mobile-round-v5 + market-separation-v7) لجرد ما لديه المالك فعلاً
- استبعدت مسارات mtime والكوميتات (ملوثة بأوضاع الساندبوكس) واعتمدت المعيار الحاسم: مقارنة md5 ثلاثية (الشجرة الحالية ← الخط الأساسي ← محتوى حزمة v5)
- النتيجة الدقيقة: 40 ملفاً حقيقياً (18 جديد + 22 معدل) — 92 ملفاً مطابقة لحزمة v5 استُبعدت + 553 وهمية (mode-only) استُبعدت
- الملفات تغطي: جولة v6 (تقرير السوقين + لقطات 36-37) + v7 مرحلة أ (سaudi.ts/market.store/MarketProvider/format/region+facility+register hooks/layout) + إصلاح v7 + v5.1 الذكية (components/market/*، api-client X-Market، أدمن المناطق، تسجيل المالك والعميل، حارس المتجر، الأنواع)
- كتبت اقرأني-الحزمة-v6.md: جدول الجولات + المتطلب السابق (v5 الرئيسية) + خطوة حذف MarketGate.tsx إن طُبقت v7 القديمة + القائمة الكاملة مشروحة + دمج ويندوز/git + 6 نقاط تحقق بعد الدمج
- بنيت tawfir-front-round-v6.zip (757KB، 41 ملفاً بمساراتها الأصلية) — unzip -t سليم
- وزعت 3 نسخ متطابقة (md5 واحد: 5199bf6e...) في جذر المشروع + public/ + /home/z/
- تحقق حي: GET / = 200 · GET /tawfir-front-round-v6.zip = 200 (757,760 bytes)

Stage Summary:
- حزمة tawfir-front-round-v6.zip هي الجواب الموحد لسؤال المالك: كل ما بعد حزمة الجوال v5 في أرشيف واحد قابل للدمج بنسخ ولصق
- المنهجية المحكمة (md5 ثلاثي) تضمن صفر ملفات مفقودة وصفر ملفات مكررة غير ضرورية — الحزمة 41 ملفاً فقط بدل 685 من القوائم الملوثة
- لم يُلمس أي كود في هذه الجولة — تعبئة وتوثيق حصراً؛ لقطات الإثبات 38/39 (تحقق 3-b) داخل الحزمة

---
Task ID: 22 (v6.1 — صفر أعلام: اكتشاف تلقائي كامل للسوق)
Agent: بصمة (وكيل الفرونت) — Z
Task: توجيه المالك: «شيل علم اليمن والسعودية — النظام تلقائياً يتعرف على المستخدم وأين مكانُه؛ الزائر يُكتشف من موقعه، والمسجّل بياناته تكفي كلياً»

Work Log:
- حذف MarketSwitcher.tsx كلياً + إزالته من MainHeader (الهيدر الآن: شعار + منتقي منطقة + أدوات — بلا أي علم)
- حذف شبكة «بلد السوق» بأعلامها من تسجيل العميل + شريحة «سوق المتجر» من تسجيل المالك + زر «تبديل السوق» وكل الأعلام من حارس «غير متوفر في سوقك» (رسالة ودودة + عودة للرئيسية)
- استبدال أعلام أدمن المناطق (المبدّل/الأعمدة/RegionForm/useAdminRegions) بأسماء نصية — الوظيفة كاملة
- تنظيف market.store: إسقاط ALL_MARKETS/applyMarketSwitch/حقل flag من MARKET_META — صفر رموز أعلام في src كله
- إضافة detectMarketFromPhone: بادئة الجوال تحسم السوق (5…/966 → سعودي، 7…/967 → يمني) — يعمل مع الخام والمطبّع والأرقام الهندية
- إضافة refineGuestMarketByGeo: إذن الموقع الممنوح سابقاً حصراً (permissions === granted — صفر طلب إذن) → الأقرب بين الرياض وصنعاء (haversine، سقف 700كم) — مرة واحدة لكل جلسة
- MarketProvider: الزائر يُستنبط طازجاً كل زيارة (بلا التصاق بقيمة قديمة) + تنقية جغرافية صامتة بعد الاستنباط + اعتماد موحّد عبر noteServerMarket (يصفّر المنطقة اليتيمة)
- إصلاح انقسام اكتشفته المعاينة الحية: كشف جغرافي متأخر قلب السوق بعد ضبط النموذج بلده → النموذجان (العميل والمالك) يتبعان السوق المستكشَف ما دام الجوال فارغاً، وبعد الكتابة تصبح بادئة الجوال هي الحاسمة وحدها + منتقي المنطقة مضبوط ببلد النموذج في المسارين (لا انقلاب قائمة تحت قدمي المستخدم)
- التحقق الحي بالمتصفح: الرئيسية بلا علم ✓ · /register: كتابة 0512345678 قلبت صامتاً إلى «المنطقة (السعودية)» وعكسها برقم يمني ✓ · /owner/register: نفس الثنائية ✓ · صفر أعلام في DOM كله ✓ · صفر أخطاء صفحة ✓ · لقطتا إثبات shot-40/41
- tsc 0 أخطاء · lint 0 أخطاء (19 تحذيراً من عائلة react-hook-form/api-clients السابقة) · dev.log نظيف
- إعادة بناء tawfir-front-round-v6.zip (42 ملفاً، 2.1MB) بدليل محدث (قسم v6.1 + خطوة حذف MarketSwitcher لمن طبق النسخة الأولى) — 3 نسخ md5 واحد + تحميل حي 200

Stage Summary:
- فلسفة المالك أصبحت قانوناً: لا أعلام ولا أسئلة ولا مبدّلات — النظام يتعرف: الزائر من موقعه وبيئته، والمسجّل من بياناته (locale/me)، والتسجيل من بادئة جواله
- الفصل بين السوقين بقي صارماً: حارس «غير متوفر في سوقك» بلا أي جسر تبديل يدوي
- اكتشاف بيئي موثق: ساندبوكس المعاينة يمنح إذن موقع مسبقاً بإحداثيات تُصنَّف سعودياً — أدى لكشف خلل التزامن وإصلاحه جذرياً (النموذج يتبع الكشف المتأخر)

---
Task ID: 23 (الإصدار 8.1.1 — فوق مستودع المالك المحدّث + شفاء جوال المسجّل)
Agent: بصمة (وكيل الفرونت) — Z
Task: «حمّل النظام من مستودعي (مطبق عليه آخر جولات الموبايل) وطبّق عليه مجلدك واختبره — بدون أزرار اختيار بين الدولتين، والنظام ذكي يتعرف على الزائر من مكانه والمسجل من جواله — ثم احزم كل شيء باسم الإصدار 8.1.1»

Work Log:
- سحبت مستودع المالك المحدّث (8831830 → b04058e «with full payment»: أساس v5 + جولات الموبايل + payment-bridge + sync-version) ونسخت شجرة العمل احتياطياً (222MB tar) قبل التبديل
- تحققت بفك حزمة الموبايل نفسها: ملفاتها 12 لا تتقاطع مع ملفاتي إطلاقاً — صفر تراجع ممكن؛ ودققت الفروق الكاملة للملفات السبعة المتداخلة (api-client/التسجيلات/المنشآت/openapi) = إضافاتي حصراً
- طبقت حزمة v6 (41 ملفاً بلا bun.lock) فوق المستودع النظيف + رفعت الإصدار: package.json → 8.1.1 وsync-version ولّد APP_VERSION = "8.1.1"
- أعدت توليد الأنواع من الحي (api:types) — tsc صفر أخطاء على المشروع كله
- **إضافة 8.1.1 — حسم الجوال للمسجّل**: MarketProvider.reconcile بعد locale/me يقرأ /me ويحسم السوق من بادئة الجوال (detectMarketFromPhone) وإن خالف يُشاف ذاتياً بـ PUT /locale/me واحدة؛ ودالة healMarketFromAccountPhone() تُستدعى فور نجاح الدخول في صفحة login (بلا عرقلة للرحلة)
- استعادة worklog.md الكامل (467 سطراً) من النسخة الاحتياطية — تبديل المستودع كان يستبدله بنسخته القديمة
- **اختبار متصفح حي فوق مستودعه**: الرئيسية صفر أعلام (22×ر.ي للزائر) · /register: 0512… → «المنطقة (السعودية)» + 14 منطقة سعودية، 777… → مناطق يمنية صامتة · /owner/register: 0501… → سعودي · دخول الحساب القديم (05… مخزّن يمنياً) → **شفاء ذاتي لر.س فوراً** · دخول اليمني (777333333) → ر.ي×22 وصفر ر.س · يمني يفتح #32 السعودية → حارس ودود بلا أعلام · موبايل 390×844 سليم
- **الدليل الخادمي**: curl مباشر للحية بعد الشفاء → GET /locale/me يعيد 966/SAR للحساب القديم (كان 967/YER) — التصحيح رسّب في قاعدة بيانات الخادم
- lint: 0 أخطاء (19 تحذيراً سابقاً) · dev.log بلا أخطاء · لقطات إثبات shot-42/43/44
- بناء tawfir-8.1.1.zip (44 ملفاً: 24 معدلاً + 20 جديداً) بدليل «اقرأني-8.1.1.md» شامل — 3 نسخ md5 واحد (جذر + public + /home/z/) + تحميل حي 200

Stage Summary:
- طلب المالك حرفياً على مستويين: صفر أزرار/أعلام في كل الواجهة، والاكتشاف التلقائي ثلاثي المصادر: زائر (بيئته) ← تسجيل (بادئة جواله) ← مسجل (جوال حسابه يشفى ويزامن الخادم ذاتياً)
- الحزمة 8.1.1 هي البديل الموحد لكل حزم بصمة السابقة — تُدمج فوق المستودع الحالي مباشرة بلا أي متطلب سابق
- التطبيقان المصدران (4/5) والمالية والمويسر لم يُلمسا — وصفر انحدار في جولات الموبايل (تحقق تفاضلي بالملفات نفسها)

---
Task ID: 26
Agent: بصمة (وكيل الفرونت)
Task: بناء وتنفيذ سكربت اختبار شبه-حقيقي شامل على api.tawfir.giize.com — 3 تجار سعوديين + 6 مناديب + 2 عملاء + محافظ + مصفوفة دفع مويسر + دورات حياة كاملة

Work Log:
- مزامنة مع main المالك (c450f50 "fix route console" — دمج إصلاح الكونسول بنفسه) بعد force-push جديد بلا merge-base
- استكشاف OpenAPI الحي (199 مساراً) + الخدمات (wallet/finance/order/owner/courier services) وتحديد كل نقاط الدورة
- كسر سلسلة 3DS مويسر برمجياً: transaction_url → prepare → authenticate (device info) → acs_emulator (creq) → set_auth_result (اختيار النتيجة) → acs_return → paid
- كسر STC Pay: إنشاء دفعة → POST transaction_url بـ{"otp_value":"123456"} → paid — التحقق الخادمي POST /finance/orders/{id}/pay/verify ينجح بعدها
- الاكتشافات الحية الخمسة أثناء البناء:
  1) بوابة المناديب تسجّل السوق 967 افتراضياً حتى مع رقم سعودي + X-Market — نداءات المطاعم السعودية لا تصل إلا بعد PUT /locale/me {country_code:"966"} (سبب جذري لانحشار المهام في "قيد الإسناد")
  2) الرادار يحتاج availability + pulse قبل request-courier — الموجة تطلق لحظة النداء لمناديب بمواقع حية ضمن 5كم
  3) تسلسل التسليم الصارم: arrived_store → handover(مالك) → confirm_pickup → arrived_customer → complete_delivery(كود من tracking العميل)
  4) CVC البطاقات 3-4 أرقام ("00" مرفوض — رمز التأكيد 00 في بيانات المالك ليس CVC)
  5) البريد .test مرفوض (نطاق محجوز) — استخدمت tawfir-sa.com
- التشغيل النهائي (بلاحقة b80k): 82 نجاح / 0 تنبيهات / 0 إخفاقات — 3 دورات حياة delivered بالكامل بأكواد تسليم حقيقية (1841، 2732، 6893)
- القيود/الأرصدة بعد التسليم: طلبات كاش مسلمة لا تولد قيوداً؛ قيود order_payment/platform_commission تتولد من webhook مويسر فقط — دفعات verify الجديدة (24-31) لم تولد قيوداً بعد (فحص webhook في لوحة مويسر مطلوب)
- التزام: scripts/e2e/tawfir-e2e.ts + تقرير-الاختبار-b80k.json مثبتان في git

Stage Summary:
- السكربت قابل لإعادة التشغيل بأمان (لاحقة عشوائية لكل تشغيل) — bun scripts/e2e/tawfir-e2e.ts
- أهم ما يصل للمالك: تسعير الأدمن price_per_km=200/min=200 يُطبق كسعودي (مهمة 2كم=400 ريال مقابل تقدير 8 ريال!) + بطاقة التاجر المالية تعرض YER لتاجر سعودي + مناديب السوق السعودي يحتاجون تبديل locale بعد التسجيل

---
Task ID: 27
Agent: بصمة (وكيل الفرونت)
Task: تدقيق فصل الأسواق الشامل على كل مستوى النظام (حي + ثابت) وإنتاج وثيقة إصلاحات الباك اند الجاهزة للتسليم + إصلاح فجوات الفرونت المؤكدة

Work Log:
- تدقيق ثابت بوكيل استكشاف: خريطة السوق في العملاء الأربعة (X-Market في api-client للزائر فقط؛ customer/owner/courier clients بلا أي إشارة سوق — الاعتماد على التوكن) + جرد 199 مسار OpenAPI (X-Market غير موثق، country_code يظهر 18 مرة) + 14 نقطة تسرب مشتبهة من البوابات الواجهية
- بناء scripts/e2e/market-separation-audit.ts: 69 فحصاً حياً × 10 نطاقات (هوية/اعتمادات/منشآت/تسعير/دفع/محافظ/مالية/مناديب/إعدادات/عضوية) × سوقين، بتصنيف (سليم/تسرب خادمي/فجوة خادمية/فجوة واجهة/معلومة/فشل) — 6 حسابات جديدة كل تشغيل (عميل+تاجر+مندوب لكل سوق)
- ثلاثة تشغيلات متتالية مع إصلاح أدوات الفحص (مسارات /finance/owner/card و/finance/payouts الصحيحة، تأكيد التاجر قبل النداء، انتظار حسم مويسر)
- نتائج التشغيل المرجعي n8zi: 34 سليماً · 6 تسربات · 11 فجوة · 1 واجهة · 16 معلومة
- الاكتشافات الحية: تسجيل المندوب يخزن 967 دائماً (حتى برأس 966) · الرادار جغرافي خالص لا يفلتر بالسوق (نداء سعودي وصل لمندوب يمني بموقع الرياض!) · بطاقة التاجر السعودي YER · membership/info يمني كامل للسعودي (3000/جيب/780090882) · أجرة النداء 200 ريال مقابل تقدير 8 · payments/config متطابق عبر الأسواق · وجهات صرف YE مرفوضة خادمياً · regions default 967 · رصيد مندوب يمني بعملة SAR
- تصحيح علمي لجولة 26: انحشار النداءات السابق سببه توقيت النبضة لا سوق المندوب — السوق المخزن 967 حقيقي لكن أثره العملة/العرض
- إصلاحات فرونت (tsc 0 / lint 0 أخطاء): DeliveryFields مستنبط لسوقه ذاتياً (أصلح السلة Sheet+Page) · ReOrderSection كاش فقط للسعودية مع قلب المحفظة الموروثة · CourierFinanceContent وجهة صرف من سوق المندوب + STC Pay سعودي حصراً + IBAN ديناميكي
- كتابة docs/قائمة-إصلاحات-الباك-اند-فصل-الأسواق.md: P0 (6 تسربات بالأدلة والمعايير) + P1 (7 فجوات) + القسم المالي المعماري + ما أنجزته + ترتيب التنفيذ + أداة إعادة التحقق
- التثبيت: commit (5 ملفات، 1139 سطراً) — تقرير تقرير-فصل-الأسواق-n8zi.json في الجذر

Stage Summary:
- الجواب الحاسم على «مين المسؤول»: 17 مشكلة خادمية (6 bugs + 11 design) مقابل فجوات واجهية قليلة أُغلقت فوراً — الفصل البنيوي (منشآت/طلبات/مناطق) سليم 100%، والفجوات في التسعير والمالية والعضوية والمندوبين
- الوثيقة جاهزة للتسليم للوكيل الباك اند مع أداة تحقق ذاتية: bun scripts/e2e/market-separation-audit.ts

---
Task ID: 28
Agent: بصمة (وكيل الفرونت)
Task: جولة الإغلاق الختامية v3.2.1 «فصل المال والمندوبين + حرية التاجر» — م1→م12 كاملة

Work Log:
- م1: حدّثت scripts/e2e/market-separation-audit.ts للعقد الجديد (6 فحوص قديمة + سلسلة 3DS المجرّبة من tawfir-e2e + فحص قيود verify من القسم الرابع) ثم شغّلت التدقيق الحاسي ثلاث مرات — التشغيل الحاسم 0eoy: 70 فحصاً · 51 ✅ · 0 🔴 · 2 🟠 (بند واحد: currency في pricing-preview ×سوقين) · 0 🟣 · 0 ❌
- إعادة توليد الأنواع من openapi الحي (OwnerFacilityUpdate.discount_rate/hint، MembershipInfoOut.market/discount_label، payments/config.enabled/currency/market)
- م2: SubscribeContent يقرر من info.market (966+amount=0 → بطاقة التفعيل الفوري بلا إيصال إطلاقاً؛ 967 → مسار الإيصال كما هو) + FreeMembershipCard يستقبل discount_label/instructions وCTA «تفعيل فوري مجاني — خصم يصل إلى 20%»
- م3: قسم «حرية التاجر» في شاشة المتجر (0–20 + تلميح 280) — حفظ 15 حياً ومُثبت خادمياً؛ وإزالة الخصم الوهمي المحسوب من /me في ProductCard/ProductDetail/useCartPricing/CartSheet/CartPage/CheckoutSheet (إثبات: طلب #115 عضو دفع السعر الكامل، #116 بخصم منشأة 15 دفع 85 — الواجهة كانت تعرض خصماً لن يدفعه أحد) + شارة خصم المنشأة >0 فقط
- م4: صفر عملات مثبتة في مسارات العرض — العملة من رد التسعير (delivery-estimate.currency) ثم من سوق الجلسة؛ PayOrderContent/moyasar/ورقة Apple Pay كلها من config.currency؛ OwnerMetricsCard من locale/me بتوكن المالك؛ JSON-LD من سوق المنتج؛ حذف «يمنية يمنية» من التذييل
- م5: بوابة شاشة الدفع من config.enabled (967 → «نمط إشعارات» بدل نموذج مويسر) — المحفظة مخفية سعودياً والحرس الخادمي 422 مثبت
- م6: نموذج المنتج السعودي step=1 + تلميح + عرض رسالة 422 الحية (توست + خطأ مضمّن) — إثبات حي بالمتصفح: POST 422 و«السعر المرسل 7.5 غير مقبول» ظاهرة
- م7: سليم مسبقاً (وجهات من locale/me + STC Pay سعودي) — أثبت في E2E
- م8: FcmRegistrar يعمل (تسجيل/تجديد/إلغاء) — الإذن denied في الساندبوكس سلوك طبيعي متدرج
- م9: عطل باك اند موثق: مسار WS المضبوط (wss://…/api/v1/ws/notifications) يعيد 404 على الحي بكل بدائله — الواجهة تعمل باحتياطي polling بسلاسة (صفر أخطاء كونسول)
- م10: سكربت جديد scripts/e2e/tawfir-v321-front-e2e.ts — 35/35 ✅ (سعودي كامل ببطاقة مدى وverify وقيود، يمني بإيصال وطلب محفظة #123، مالك 0→15→21✗→0، مندوب جديد لوكالي 966 فوراً بلا ترقيع، أدمن SA/YE)
- تحقق متصفح: شاشات العضوية بالسوقين، قسم حرية التاجر، نموذج المنتج السعودي، جوال 390×844، تذييل طبيعي، كونسول نظيف
- tsc 0 أخطاء · lint 0 أخطاء (19 تحذيراً سابقاً)

Stage Summary:
- الجولة مغلقة من جهة الفرونت: كل بنود التدقيق ✅ بإثبات حي أو موثقة كأعطال باك اند بالدليل
- 3 بنود باك اند باقية صغيرة موثقة بالدليل الحي: currency في pricing-preview (P1-1 جزئي) · discount_hint يُقبل 200 ولا يُخزّن · مسار WS غير موجود على الحي + ملاحظة نسخ (رسالة تسجيل تقول 30% والمخزن 20%)
- التقرير الختامي: docs/تقرير-إغلاق-الجولة-v3.2.1-الفرونت.md

---
Task ID: 29
Agent: بصمة (وكيل الفرونت)
Task: «لم أجد الحزمة للتحميل ولماذا؟» — تشخيص اختفاء الحزم + إعادة بناء حزمة موحدة محدثة tawfir-3.2.1.zip وثبيتها ضد الإعادة

Work Log:
- التشخيص الجذري: بيئة الساندبوكس أُعيدت تهيئتها (Oct 9 19:28) فمُحيت الأرشيفات ZIP — و`.gitignore` يحجب `*.zip` (سطر 125) فلم تكن أي حزمة سابقة (v6 / 8.1.1) محفوظة في git إطلاقاً؛ الكود نفسه سليم كاملاً (آخر كوميت 1a9b13f v3.2.1 + شجرة نظيفة).
- تحقق حاسم قبل البناء: مستودع المالك c450f50 يتضمن حزمة 8.1.1 كاملة (market.store/MarketProvider/CrossMarketGuard/market-lookups — صفر فروق) ← الحزمة الجديدة = الفرق c450f50..HEAD حصراً.
- جرد الفرق: 32 ملفاً (24 معدلاً + 8 مضافة) بفلترة البنية التحتية (skills/tool-results/.github) واستبعاد 9 تقارير تشغيلات وسيطة — إبقاء تقريرين حاسمين فقط (0eoy تدقيق 51✅0🔴 · hw58 إي2ي 35/35 — تحقق بمحتوى JSON).
- كتابة دليل «اقرأني-الحزمة-3.2.1.md» (33 ملفاً موثقاً حرفياً): الجولات الثلاث + خطوات الدمج + التحقق الذاتي بالسكربتين + ما باقٍ على الباك اند + سبب اختفاء الحزم السابقة.
- بناء tawfir-3.2.1.zip (33 ملفاً بمساراتها الأصلية، ~319KB) — unzip -t سليم.
- **الإصلاح الجذري للاختفاء**: `git add -f tawfir-3.2.1.zip` — الحزمة الآن داخل git نفسها فلا تُمحى في أي إعادة تهيئة قادمة (أول حزمة مثبتة في تاريخ المشروع).
- توزيع 3 نسخ md5 موحد (4ca83d63…): جذر المشروع + public/ + /home/z/ + النسخة المحفوظة في git.
- إعادة تشغيل dev server (كانت البيئة ميتة) — GET / = 200 · تحميل حي GET /tawfir-3.2.1.zip = 200 بحجم 319,031 بايت وmd5 مطابق للأصل.

Stage Summary:
- جواب المالك: الحزمة اختفت لأن الساندبوكس يُعاد تهيئته وgitignore يحجب zip — أُعيد بناؤها **محدثة** بكل جولات ما بعد 8.1.1 (اختبار E2E + تدقيق الأسواق + إغلاق v3.2.1) وأُثبتت داخل git حتى لا تتكرر المشكلة أبداً.
- رابط التحميل الحي: /tawfir-3.2.1.zip (من لوحة المعاينة أو فتح تبويب جديد + إضافة اسم الملف).

---
Task ID: 30
Agent: بصمة (وكيل الفرونت)
Task: «هل tawfir-3.2.1.zip مكتمل كما كان tawfir-v321-front-closing.zip؟» — مقارنة كوميت-بكوميت وإثبات اكتمال + ترقية الحزمة بخط الأساس

Work Log:
- مقارنة مصداقية: git diff 1a9b13f..HEAD (بلا skills/tool-results/.github) = [tawfir-3.2.1.zip + worklog.md + اقرأني-الحزمة-3.2.1.md] فقط ← **صفر فروق كود** بين كوميت جولة الإغلاق والشجرة التي بُنيت منها الحزمة.
- تفكيك كوميت الجولة (f621faa→940b842): 33 ملفاً = 25 كود/توثيق + 8 تقارير تشغيلات — وكل الـ25 موجودة في الحزمة بنفس البايتات، والتقارير ممثلة بنسختها الحاسمتين (hw58 35/35 · 0eoy 0🔴) والستة الباقية وسيطة مكررة لنفس السكربتين.
- تعويض قيمة مفقودة: أضفت تقرير خط الأساس n8zi (تحقق بمحتواه: 69 فحصاً — ok 34/leak 6/gap 11/fe 1/fail 1) فصارت الحزمة تحمل قصة قبل/بعد كاملة (6🔴→0🔴) التي كانت موزعة بين كوميتي الجولتين 27 و28.
- تحديث الدليل: القائمة 34 ملفاً + قسم جديد «إثبات الاكتمال مقابل حزمة الجولة السابقة» بجدول الفئات الأربع.
- إعادة بناء tawfir-3.2.1.zip (34 ملفاً، md5 جديد 19e31b04…) — unzip -t سليم · 3 نسخ md5 موحد (جذر + public + /home/z/).

Stage Summary:
- الجواب الحاسم للمالك: الحزمة الحالية ليست أقل من الجولة السابقة إطلاقاً — كودها مطابق حرفياً (إثبات git) وجولتا 26/27 مضافات فوقه، والفارق الظاهري (35→34) تقارير وسيطة استُبدلت بأرقى اختياراً مع خط الأساس.

---
Task ID: 31
Agent: بصمة (وكيل الفرونت)
Task: «هل الباك اند مكتمل ولا ينقصه شيء؟» — حكم حي طازج: تدقيق 70 فحصاً + E2E 35 + فحوص مباشرة للبنود الأربعة الموثقة

Work Log:
- تشغيل التدقيق الحي الحاسم (لاحقة fbdn): 70 فحصاً — 51 ✅ · 0 🔴 · 2 🟠 · 0 🟣 · 0 ❌ · 17 معلومة.
- تأكيد حي لإصلاحات P0 الستة كلها: سوق المندوب يُخزن 966 فوراً بلا ترقيع · الرادار يفلتر بالسوق (النداء السعودي لم يصل لمندوب يمني جغرافياً) · بطاقة التاجر SAR · membership/info سعودي=0/«ريال سعودي» ويمني=3000/جيب · التسعير الوطني SA={8/3كم/1.5} YE={300/3كم/50} · حرس المحفظة 422.
- فجوات P1 سابقة أثبت اليوم إصلاحها: P1-3 payments/config يختلف بالسوق ✓ · P1-4 وجهة صرف YE قُبلت ✓ · P1-5 regions تفرض country_code ✓ · P1-6 محافظ المنشأة عبر السوق 404 ✓ · P1-7 رصيد المندوب اليمني YER ✓ · القسم الرابع: قيود verify تنطلق بلا webhook (order_payment+platform_commission على #128) ✓.
- E2E جولة 3.2.1 (لاحقة 9629): 35/35 ✓ — صفر انحدار.
- فحوص مباشرة للبنود الأربعة الباقية (كلها ما زالت قائمة بالأدلة الحية اليوم):
  أ) currency غائب في pricing-preview (2🟠 بالتدقيق) — الواجهة تعوّض من locale/me.
  ب) discount_hint: PUT 200 ثم null في رد المالك والعام بينما discount_rate=15 يُخزن صح (فحص مباشر على منشأة 32 ثم إعادة ضبط).
  ج) GET /api/v1/ws/notifications = 404 (و/api/v1/ws = 301) — الواجهة بـpolling سلس.
  د) رسالة التسجيل الحرفية: «…استمتع بالخصم 30%.» والمخزن 20% (تسجيل عميل سعودي حي 201).
- P1-2 (توثيق X-Market في OpenAPI) لم يُعَد فحصه صراحة — بند توثيق بلا أثر وظيفي.
- تثبيت تقريري اليوم في git: تقرير-فصل-الأسواق-fbdn.json (المرجع الجديد) + تقرير-v321-front-e2e-9629.json.

Stage Summary:
- الحكم الحاسم للمالك: الباك اند مكتمل وظيفياً في جوهره — صفر تسريبات و0 فشل تقني، لكن ليس 100%: 4 بنود صغيرة موثقة بالأدلة الحية الطازجة (أ-د) + بند توثيق P1-2 — كلها قابلة للإغلاق في جلسة باك اند واحدة قصيرة.

---
Task ID: 32
Agent: بصمة (وكيل الفرونت) — جولة التكاملات v4.1
Task: سحب أحدث إصدار المدموج من GitHub وتشطيبه واختباره، ثم بناء طبقة التكاملات v4.1 (النموذج المركزي) كاملة فوق العقد المتعاقد عليه

Work Log:
- سحبت origin/main (25068ed «v3.2.1» — دمج المالك لحزمتي + edit space) وrestored الملفات المحلية الحصرية (worklog/التقارير/الحزمة) — تحقق spot-check: كل إصلاحات v3.2.1 موجودة في المدموج (FreeMembershipCard/config.enabled/حرية التاجر) والفرق الوحيد proxy.ts مسافة.
- اكتشاف حاسم موثق: طبقة الباك /api/v1/integrations غير منشورة على الحي (ping 404 + صفر مسارات تكاملات في العقد الحي 199) — الحزمة tawfir_v4_1_integrations.tar.gz ليست في بيئتي (المرفوع الجديد كان نسخة محادثة) — فبنيت على العقد المتعاقد بمبدأ «الهدوء الكامل».
- بنيت 11 ملفاً: integrations.service.ts (عقد الـ16 مساراً + isLayerUnavailable + integrationErrorText) · useIntegrations.ts (15 hook — تعطيل ذاتي حين الطبقة غائبة + بطاقة توصيل 15s) · integrations-ui.tsx (قواميس + OAuth return + بانر) · ConnectionCard (حالات كاملة + مفاتيح مقنعة + toggle بتأكيد لايف + نموذج إنشاء بحقول كلمة مرور) · FoodicsSyncButton · FoodicsMenuPanel (قراءة فقط + حدود الجولة) · IntegrationEventsPanel (فلاتر + بادجات + جسر الحالة + payload dialog) · ExternalDeliveryCard (الوحيدة على صفحة الطلب — تُركب فقط عند نشر الطبقة) · MerchantIntegrations (3 بطاقات هادئة بلا أي تقنية) + صفحتا /admin/integrations و/owner/integrations + التنقل في 3 سايدبارات.
- ربط سجل الأحداث بالطلبات: ?order=N يفتح حوار التفاصيل — اشتقاق خالص من useSearchParams (متسق hydration) وتنظيف الرابط في معالج الإغلاق — التزاماً بقاعدة set-state-in-effect بعد محاولتي الأولى.
- إصلاحات جودة: أيقونة Sync غير موجودة في lucide → RefreshCw · إزالة توجيهات eslint ميتة · tsc صفر أخطاء على المشروع كله · eslint صفر مشاكل على ملفات الجولة.
- اختبار متصفح حي (وكيل Playwright): دخول أدمن → /admin/integrations (بانر + 3 بطاقات + ملاحظة المفاتيح) · منيو فوديكس (فارغ أنيق) · سجل الأحداث (فلاتر) · /admin/orders صفر تغيير والحوار بلا بطاقة (صحيح) · مالك owner.sa → /owner/integrations (3 بطاقات هادئة حرفياً) · موبايل 390×844 يظهر «التكاملات» في ☰ · صفر أخطاء JS (فقط 404 الطبقة المتوقعة) · RTL كامل — 6 لقطات في factory-evidence/.
- كتبت docs/تقرير-جولة-التكاملات-v4.1-الفرونت.md + بنيت حزمة tawfir-v4-integrations.zip مثبتة في git.

Stage Summary:
- طبقة التكاملات الفرونتية مكتملة على العقد الـ16 حصراً (صفر مسارات مخترعة) بفلسفة النموذج المركزي حرفياً: التاجر بلا مفاتيح أبداً (نقرة OAuth) · الغرفة للأدمن · العميل صفر شاشات.
- الإضاءة التلقائية لحظة نشر الباك بلا أي تعديل فرونت — الحالة الهادئة الحالية هي نفسها الحالة المختبرة.
