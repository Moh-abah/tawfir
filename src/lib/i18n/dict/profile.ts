import type { DictEntry } from "@/lib/i18n/index";

/**
 * profileDict — مفاتيح مجموعة «profile» (جولة التدويل — بصمة 40-d).
 * تشمل: صفحة الحساب بكل حالاتها + بطاقة العضوية + العضوية المجانية +
 * الاشتراك + سجل التوفير + الإشعارات + المفضلة + الفوتر + النصوص
 * المشتركة (كوكيز/انقطاع/عودة للأعلى) + بطاقة اللغة.
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 */
export const profileDict: Record<string, DictEntry> = {
  /* ─── عناوين الشاشات ─── */
  "profile.screenTitle": { ar: "الملف الشخصي", en: "Profile" },
  "profile.subscribeScreenTitle": {
    ar: "اشترك في العضوية",
    en: "Subscribe to membership",
  },
  "profile.savingsScreenTitle": { ar: "سجل التوفير", en: "Savings history" },
  "profile.favoritesScreenTitle": { ar: "المفضلة", en: "Favorites" },

  /* ─── صفحة الحساب: الزائر ─── */
  "profile.guest.welcome": { ar: "أهلاً بك في توفير", en: "Welcome to Tawfir" },
  "profile.guest.desc": {
    ar: "سجّل الدخول لعرض بطاقتك وطلباتك، أو أنشئ حساباً جديداً واشترك في عضوية توفير لتحصل على خصومات حصرية.",
    en: "Sign in to view your card and orders, or create a new account and subscribe to Tawfir membership for exclusive discounts.",
  },
  "profile.registerCta": { ar: "إنشاء حساب", en: "Create account" },

  /* ─── بطاقة بياناتي ─── */
  "profile.data.title": { ar: "بياناتي", en: "My details" },
  "profile.data.desc": {
    ar: "يمكنك تعديل الاسم ورقم الجوال — البريد الإلكتروني ثابت",
    en: "You can edit your name and phone number — email is fixed",
  },
  "profile.field.email": { ar: "البريد الإلكتروني", en: "Email" },
  "profile.data.editTitle": { ar: "تعديل البيانات", en: "Edit details" },
  "profile.saved.title": { ar: "تم حفظ التعديلات", en: "Changes saved" },
  "profile.saved.desc": {
    ar: "تم تحديث بياناتك بنجاح",
    en: "Your details were updated successfully",
  },
  "profile.saveError": {
    ar: "تعذّر حفظ التعديلات",
    en: "Failed to save changes",
  },
  "profile.saveCta": { ar: "حفظ التعديلات", en: "Save changes" },
  "profile.meError": {
    ar: "تعذّر تحميل بيانات الحساب",
    en: "Failed to load account details",
  },

  /* ─── شارة الطلب قيد المراجعة ─── */
  "profile.pending.title": {
    ar: "طلب العضوية قيد المراجعة",
    en: "Membership request under review",
  },
  "profile.pending.badge": { ar: "قيد المراجعة", en: "Under review" },
  "profile.pending.date": { ar: "تاريخ الطلب: {date}", en: "Request date: {date}" },
  "profile.pending.noDate": {
    ar: "طلبك قيد المراجعة من قبل فريقنا",
    en: "Your request is being reviewed by our team",
  },
  "profile.pending.desc": {
    ar: "تُراجع طلبات العضوية يدوياً خلال 24-48 ساعة. عند الموافقة ستظهر بطاقة عضويتك هنا.",
    en: "Membership requests are reviewed manually within 24–48 hours. Once approved, your membership card will appear here.",
  },
  "profile.pending.resubscribe": { ar: "أعد الاشتراك", en: "Re-subscribe" },

  /* ─── حالة بلا عضوية ─── */
  "profile.noMembership.title": {
    ar: "ليس لديك عضوية بعد",
    en: "No membership yet",
  },
  "profile.noMembership.desc": {
    ar: "اشترك في عضوية توفير السنوية واحصل على خصومات حصرية على كل طلباتك. موافقة يدوية خلال 24-48 ساعة.",
    en: "Subscribe to the annual Tawfir membership and get exclusive discounts on all your orders. Manual approval within 24–48 hours.",
  },
  "profile.noMembership.note": {
    ar: "إن أرسلت طلب اشتراك من جهاز آخر، فقد يكون قيد المراجعة أو لم يُستوفَ بعد. لا يمكننا عرض سبب الرفض هنا — تواصل معنا أو أعد الاشتراك من جديد.",
    en: "If you submitted a subscription request from another device, it may still be under review or not yet completed. We can't show the rejection reason here — contact us or subscribe again.",
  },
  "profile.subscribeCta": {
    ar: "اشترك في عضوية توفير",
    en: "Subscribe to Tawfir membership",
  },
  "profile.quickSavings": { ar: "سجل التوفير", en: "Savings history" },
  "profile.quickFavorites": { ar: "مفضلتي", en: "My favorites" },
  "profile.logout": { ar: "خروج", en: "Log out" },

  /* ─── بطاقة اللغة (إعدادات الحساب) ─── */
  "profile.language.title": { ar: "اللغة / Language", en: "Language / اللغة" },
  "profile.language.desc": {
    ar: "بدّل واجهة التطبيق بين العربية والإنجليزية — يُحفظ اختيارك على جهازك.",
    en: "Switch the app interface between Arabic and English — your choice is saved on your device.",
  },
  "profile.language.current": { ar: "اللغة الحالية", en: "Current language" },
  "profile.language.arabic": { ar: "العربية", en: "Arabic" },
  "profile.language.english": { ar: "الإنجليزية", en: "English" },

  /* ─── بطاقة الترحيب الذكية ─── */
  "profile.hero.greetingMorning": { ar: "صباح الخير", en: "Good morning" },
  "profile.hero.greetingEvening": { ar: "مساء الخير", en: "Good evening" },
  "profile.hero.badgeMember": {
    ar: "عضوية توفير النشطة",
    en: "Active Tawfir membership",
  },
  "profile.hero.badgeNoMember": {
    ar: "بدون عضوية — الخصم غير مفعّل",
    en: "No membership — discount not active",
  },
  "profile.hero.saved": { ar: "وفّرت", en: "Saved" },
  "profile.hero.a11y": { ar: "ملفك الشخصي", en: "Your profile" },

  /* ─── الأسئلة الشائعة ─── */
  "profile.faq.title": { ar: "الأسئلة الشائعة", en: "FAQ" },
  "profile.faq.q1": { ar: "ما هي منصة توفير؟", en: "What is Tawfir?" },
  "profile.faq.a1": {
    ar: "منصة توفير تتيح لك طلب وجباتك من المطاعم والكافتيريات المشتركة، مع إمكانية الاشتراك في عضوية سنوية تمنحك خصومات على كل طلباتك.",
    en: "Tawfir lets you order your meals from participating restaurants and cafeterias, with an optional annual membership that gives you discounts on every order.",
  },
  "profile.faq.q2": {
    ar: "كيف أشترك في العضوية؟",
    en: "How do I subscribe to the membership?",
  },
  "profile.faq.a2": {
    ar: "بعد تسجيل حساب جديد، اضغط «اشترك في العضوية» من صفحة حسابك واتبع خطوات التحويل الموضّحة هناك (بيانات الحساب ومبلغ الاشتراك السنوي). سيُراجع المشرف طلبك خلال 24-48 ساعة.",
    en: "After creating a new account, tap \"Subscribe to membership\" on your account page and follow the transfer steps shown there (account details and the annual subscription amount). An admin will review your request within 24–48 hours.",
  },
  "profile.faq.q3": {
    ar: "كيف تُطبَّق خصومات العضوية؟",
    en: "How are membership discounts applied?",
  },
  "profile.faq.a3": {
    ar: "تمنحك العضوية خصومات على كل طلباتك من المتاجر المشتركة طوال فترتها السنوية — تُطبَّق تلقائياً عند الطلب إن كانت عضويتك مفعّلة. نسبة الخصم يحددها كل متجر.",
    en: "Your membership gives you discounts on every order from participating stores throughout its annual period — applied automatically at checkout when your membership is active. Each store sets its own discount rate.",
  },
  "profile.faq.q4": {
    ar: "هل يمكنني الطلب بدون عضوية؟",
    en: "Can I order without a membership?",
  },
  "profile.faq.a4": {
    ar: "نعم، يمكنك تصفّح الوجبات والطلب بدون عضوية بسعر رسمي بلا خصم. للاستفادة من الخصومات الحصرية اشترك في عضوية توفير.",
    en: "Yes, you can browse meals and order without a membership at the regular price with no discount. To enjoy the exclusive discounts, subscribe to Tawfir membership.",
  },
  "profile.faq.q5": {
    ar: "متى تُفعّل عضويتي؟",
    en: "When is my membership activated?",
  },
  "profile.faq.a5": {
    ar: "بعد رفع صورة التحويل، يراجع المشرف طلبك خلال 24-48 ساعة. تُفعّل العضوية فور الموافقة وتظهر بطاقتك في حسابك تلقائياً.",
    en: "After you upload the transfer receipt, an admin reviews your request within 24–48 hours. The membership is activated upon approval and your card appears in your account automatically.",
  },
  "profile.faq.q6": {
    ar: "كيف تُحسب أجرة التوصيل؟",
    en: "How is the delivery fee calculated?",
  },
  "profile.faq.a6": {
    ar: "أجرة التوصيل تُحسب حسب المسافة بين المتجر وموقعك وتُعرض لك بوضوح قبل تأكيد الطلب.",
    en: "The delivery fee is calculated based on the distance between the store and your location, and is clearly shown before you confirm the order.",
  },
  "profile.faq.q7": {
    ar: "كيف أتحكم في بياناتي؟",
    en: "How do I manage my data?",
  },
  "profile.faq.a7": {
    ar: "اضغط أيقونة المستخدم أعلى الشاشة لفتح حسابك وعدّل بياناتك (الاسم، الجوال) مباشرة. البريد الإلكتروني ثابت ولا يمكن تغييره.",
    en: "Tap the user icon at the top of the screen to open your account and edit your details (name, phone) directly. The email is fixed and cannot be changed.",
  },

  /* ─── تواصل معنا ─── */
  "profile.contact.title": { ar: "تواصل معنا", en: "Contact us" },
  "profile.contact.phone": { ar: "الهاتف", en: "Phone" },
  "profile.contact.address": { ar: "العنوان", en: "Address" },
  "profile.contact.addressValue": {
    ar: "الجمهورية اليمنية — صنعاء",
    en: "Republic of Yemen — Sana'a",
  },
  "profile.contact.serviceArea": { ar: "منطقة الخدمة", en: "Service area" },
  "profile.contact.serviceAreaValue": {
    ar: "جميع مناطق الجمهورية اليمنية",
    en: "All regions of the Republic of Yemen",
  },
  "profile.contact.whatsappA11y": {
    ar: "تواصل معنا عبر واتساب",
    en: "Contact us via WhatsApp",
  },

  /* ─── حذف الحساب (منطقة الخطر) ─── */
  "profile.delete.a11y": {
    ar: "منطقة الخطر — حذف الحساب",
    en: "Danger zone — delete account",
  },
  "profile.delete.title": { ar: "منطقة الخطر", en: "Danger zone" },
  "profile.delete.desc": {
    ar: "حذف حسابك نهائيًا إجراء لا يمكن التراجع عنه. إن كنت متأكدًا من رغبتك في مغادرة توفير نهائيًا يمكنك بدء الإجراء من هنا.",
    en: "Permanently deleting your account is irreversible. If you're sure you want to leave Tawfir for good, you can start the process here.",
  },
  "profile.delete.cta": {
    ar: "حذف الحساب نهائيًا",
    en: "Delete account permanently",
  },
  "profile.delete.dialogTitle": {
    ar: "حذف الحساب نهائيًا؟",
    en: "Delete your account permanently?",
  },
  "profile.delete.dialogDesc": {
    ar: "رحيلك يحزّننا! قبل اتخاذ القرار، إليك ما سيحدث لحسابك — هذا الإجراء لا يمكن التراجع عنه إطلاقًا.",
    en: "We're sad to see you go! Before you decide, here's what will happen to your account — this action can never be undone.",
  },
  "profile.delete.c1": {
    ar: "حذف بياناتك الشخصية (الاسم ورقم الجوال) نهائيًا من توفير.",
    en: "Your personal data (name and phone number) will be permanently deleted from Tawfir.",
  },
  "profile.delete.c2": {
    ar: "إلغاء عضويتك وبطاقتك إن كانت فعّالة، ومحو مفضلتك وسلة التسوق.",
    en: "Your membership and card will be cancelled if active, and your favorites and shopping cart will be cleared.",
  },
  "profile.delete.c3": {
    ar: "لن تستطيع استعادة هذا الحساب — ستحتاج إنشاء حساب جديد للتسجيل مجددًا.",
    en: "You won't be able to recover this account — you'll need to create a new account to sign up again.",
  },
  "profile.delete.c4": {
    ar: "طلباتك السابقة: ستُزال هويتك الشخصية منها حفظًا على السجلات التجارية للمتاجر — لن تُنسب إليك بعد الآن.",
    en: "Your past orders: your personal identity will be removed from them to preserve the stores' commercial records — they will no longer be attributed to you.",
  },
  "profile.delete.finalTitle": {
    ar: "تأكيد أخير — لا يمكن التراجع",
    en: "Final confirmation — cannot be undone",
  },
  "profile.delete.finalDesc": {
    ar: "عند الضغط على الزر أدناه سيُحذف حسابك فورًا وتُمسح بياناتك الشخصية نهائيًا، ولن يكون بإمكانك — أو أي أحد — استعادته بأي طريقة. هل أنت متأكد تمامًا؟",
    en: "Pressing the button below will delete your account immediately and erase your personal data permanently — neither you nor anyone else will be able to recover it. Are you absolutely sure?",
  },
  "profile.delete.deleting": {
    ar: "جارٍ حذف الحساب...",
    en: "Deleting account...",
  },
  "profile.delete.finalCta": {
    ar: "حذف حسابي نهائيًا",
    en: "Delete my account permanently",
  },
  "profile.delete.back": { ar: "تراجع", en: "Go back" },

  /* ─── بطاقة العضوية ─── */
  "profile.card.expiredBadge": { ar: "منتهية", en: "Expired" },
  "profile.card.discountBadge": {
    ar: "خصم {percent}%",
    en: "{percent}% discount",
  },
  "profile.card.title": {
    ar: "بطاقة الخصومات الذكية",
    en: "Smart discounts card",
  },
  "profile.card.copyHint": {
    ar: "اضغط مطولاً لنسخ رقم العضوية",
    en: "Press and hold to copy the membership number",
  },
  "profile.card.type": { ar: "نوع العضوية", en: "Membership type" },
  "profile.card.typeValue": { ar: "عضوية {type}", en: "{type} membership" },
  "profile.card.tagline": { ar: "وفّر أكثر.. عِش أجمل", en: "Save more.. live better" },
  "profile.card.expiry": { ar: "تاريخ الانتهاء", en: "Expires" },
  "profile.card.noMemberGreeting": {
    ar: "أهلاً {name} — اشترك في العضوية",
    en: "Hello {name} — subscribe to membership",
  },
  "profile.card.subscribeTitle": {
    ar: "اشترك في عضوية توفير",
    en: "Subscribe to Tawfir membership",
  },
  "profile.card.noMemberDesc": {
    ar: "خصومات حصرية للعضوية في كل المتاجر المشتركة",
    en: "Exclusive membership discounts at every participating store",
  },
  "profile.card.subscribeCta": {
    ar: "اشترك في العضوية",
    en: "Subscribe to membership",
  },
  "profile.card.visitorDesc": {
    ar: "وفّر أكثر.. عِش أجمل — خصومات حصرية للعضوية",
    en: "Save more.. live better — exclusive membership discounts",
  },
  "profile.card.visitorCta": {
    ar: "سجّل واحصل على بطاقتك",
    en: "Sign up and get your card",
  },
  "profile.card.skeletonA11y": {
    ar: "جارٍ تحميل بطاقة العضوية",
    en: "Loading membership card",
  },

  /* ─── العضوية المجانية ─── */
  "profile.free.toastGranted": {
    ar: "تم منح العضوية المجانية",
    en: "Free membership granted",
  },
  "profile.free.toastGrantedDesc": {
    ar: "احصل على عضويتك المجانية بنجاح",
    en: "Your free membership was granted successfully",
  },
  "profile.free.toastNetwork": {
    ar: "يتطلب هذا الإجراء اتصالاً بالإنترنت",
    en: "This action requires an internet connection",
  },
  "profile.free.toastAlready": {
    ar: "لديك عضوية بالفعل",
    en: "You already have a membership",
  },
  "profile.free.toastDisabled": {
    ar: "العضوية المجانية غير مفعّلة",
    en: "Free membership is not enabled",
  },
  "profile.free.toastError": {
    ar: "تعذّر منح العضوية",
    en: "Failed to grant membership",
  },
  "profile.free.successTitle": {
    ar: "🎁 تم منحك عضوية توفير المجانية!",
    en: "🎁 You've been granted the free Tawfir membership!",
  },
  "profile.free.successDesc": {
    ar: "احصل على خصومات حصرية في كل المتاجر المشتركة — بلا رسوم.",
    en: "Get exclusive discounts at every participating store — free of charge.",
  },
  "profile.free.badge": { ar: "خصومات حصرية", en: "Exclusive discounts" },
  "profile.free.header": {
    ar: "عضوية توفير المجانية 🎁",
    en: "Free Tawfir membership 🎁",
  },
  "profile.free.headerDesc": {
    ar: "احصل على بطاقة الخصومات الذكية مجاناً — بلا دفع ولا رفع إيصال",
    en: "Get the smart discounts card for free — no payment, no receipt upload",
  },
  "profile.free.badgeInstant": {
    ar: "موافقة فورية بلا انتظار",
    en: "Instant approval, no waiting",
  },
  "profile.free.instructionsFallback": {
    ar: "فريق توفير يمنحك العضوية السنوية مجاناً خلال هذه الفترة — لا حاجة لتحويل بنكي ولا رفع إيصال. فقط اضغط الزر وستظهر بطاقتك فوراً.",
    en: "The Tawfir team is granting the annual membership for free during this period — no bank transfer or receipt upload needed. Just tap the button and your card appears instantly.",
  },
  "profile.free.benefitsTitle": { ar: "ماذا تحصل عليه؟", en: "What do you get?" },
  "profile.free.benefitsDesc": {
    ar: "مزايا العضوية المجانية كاملة كالعضوية المدفوعة",
    en: "All the benefits of the paid membership, completely free",
  },
  "profile.free.b1": {
    ar: "بطاقة عضوية رقمية بنفس صيغة العضوية المدفوعة (16 خانة)",
    en: "A digital membership card in the same format as the paid one (16 digits)",
  },
  "profile.free.b2": {
    ar: "خصومات حصرية على كل طلباتك من المتاجر المشتركة في توفير",
    en: "Exclusive discounts on every order from Tawfir's participating stores",
  },
  "profile.free.b3": {
    ar: "عروض حصرية ومزايا مميزة لمدة سنة كاملة",
    en: "Exclusive offers and perks for a full year",
  },
  "profile.free.b4": {
    ar: "لا حاجة لتحويل بنكي ولا رفع إيصال — كلها فورية",
    en: "No bank transfer or receipt upload — everything is instant",
  },
  "profile.free.ctaBusy": {
    ar: "جارٍ منح العضوية...",
    en: "Granting membership...",
  },
  "profile.free.cta": { ar: "تفعيل فوري مجاني", en: "Free instant activation" },
  "profile.free.ctaDiscount": {
    ar: "تفعيل فوري مجاني — {label}",
    en: "Free instant activation — {label}",
  },
  "profile.free.footerNote": {
    ar: "عند الضغط سيتم إنشاء بطاقة عضويتك فوراً وستظهر هنا وفي حسابك.",
    en: "Tapping the button creates your membership card instantly — it will appear here and in your account.",
  },
  "profile.free.cardTypeValue": {
    ar: "عضوية سنوية مجانية",
    en: "Free annual membership",
  },

  /* ─── الاشتراك في العضوية ─── */
  "profile.sub.copyDone": { ar: "تم النسخ", en: "Copied" },
  "profile.sub.copyFail": { ar: "تعذّر النسخ", en: "Copy failed" },
  "profile.sub.copyFailDesc": {
    ar: "انسخ القيمة يدوياً من الحقل",
    en: "Copy the value manually from the field",
  },
  "profile.sub.copy": { ar: "نسخ", en: "Copy" },
  "profile.sub.copied": { ar: "نُسخ", en: "Copied" },
  "profile.sub.copyA11y": { ar: "نسخ {label}", en: "Copy {label}" },
  "profile.sub.dropTitle": {
    ar: "اسحب صورة التحويل هنا أو اضغط للرفع",
    en: "Drag the transfer receipt here or tap to upload",
  },
  "profile.sub.dropHint": {
    ar: "PNG أو JPG · الحد الأقصى 2 ميجابايت",
    en: "PNG or JPG · Max 2 MB",
  },
  "profile.sub.removeImage": { ar: "إزالة الصورة", en: "Remove image" },
  "profile.sub.previewA11y": {
    ar: "معاينة صورة التحويل",
    en: "Transfer receipt preview",
  },
  "profile.sub.errType": { ar: "صيغة غير مدعومة", en: "Unsupported format" },
  "profile.sub.errTypeDesc": {
    ar: "ارفع صورة بصيغة PNG أو JPG فقط",
    en: "Upload a PNG or JPG image only",
  },
  "profile.sub.errSize": { ar: "حجم كبير جداً", en: "File too large" },
  "profile.sub.errSizeDesc": {
    ar: "الحد الأقصى 2 ميجابايت",
    en: "Maximum size is 2 MB",
  },
  "profile.sub.successTitle": { ar: "تم استلام طلبك!", en: "Request received!" },
  "profile.sub.successDesc": {
    ar: "سيراجع فريقنا صورة التحويل خلال 24-48 ساعة، وستُفعَّل عضويتك فور الموافقة.",
    en: "Our team will review your transfer receipt within 24–48 hours, and your membership will be activated as soon as it's approved.",
  },
  "profile.sub.memberTitle": { ar: "أنت عضو بالفعل!", en: "You're already a member!" },
  "profile.sub.memberDesc": {
    ar: "عضويتك في توفير مفعّلة. استمتع بخصومات حصرية على كل طلباتك القادمة.",
    en: "Your Tawfir membership is active. Enjoy exclusive discounts on all your upcoming orders.",
  },
  "profile.sub.errFile": {
    ar: "يجب رفع صورة التحويل لإتمام الطلب",
    en: "You must upload the transfer receipt to complete the request",
  },
  "profile.sub.receivedFallback": {
    ar: "تم استلام طلب العضوية بنجاح",
    en: "Membership request received successfully",
  },
  "profile.sub.toastSent": { ar: "تم إرسال الطلب", en: "Request sent" },
  "profile.sub.toastInvalid": { ar: "بيانات غير صالحة", en: "Invalid data" },
  "profile.sub.toastError": {
    ar: "تعذّر إرسال الطلب",
    en: "Failed to send request",
  },
  "profile.sub.header": {
    ar: "اشترك في عضوية توفير",
    en: "Subscribe to Tawfir membership",
  },
  "profile.sub.headerDesc": {
    ar: "مبلغ سنوي ثابت {amount} · خصومات حصرية على كل الوجبات",
    en: "Fixed annual amount {amount} · exclusive discounts on every meal",
  },
  "profile.sub.badgeManual": {
    ar: "موافقة يدوية خلال 24-48 ساعة",
    en: "Manual approval within 24–48 hours",
  },
  "profile.sub.step1Title": {
    ar: "حوّل مبلغ الاشتراك",
    en: "Transfer the subscription amount",
  },
  "profile.sub.step1Desc": {
    ar: "حوّل المبلغ إلى المحفظة التالية ثم ارفع صورة التحويل",
    en: "Transfer the amount to the following wallet, then upload the receipt",
  },
  "profile.sub.fieldAmount": { ar: "المبلغ المطلوب", en: "Amount due" },
  "profile.sub.fieldAccountName": {
    ar: "اسم صاحب الحساب",
    en: "Account holder name",
  },
  "profile.sub.fieldWallet": { ar: "المحفظة", en: "Wallet" },
  "profile.sub.fieldAccountNumber": { ar: "رقم الحساب", en: "Account number" },
  "profile.sub.step2Title": {
    ar: "ارفع صورة التحويل",
    en: "Upload the transfer receipt",
  },
  "profile.sub.step2Desc": {
    ar: "لقطة شاشة أو صورة واضحة لإيصال التحويل",
    en: "A screenshot or clear photo of the transfer receipt",
  },
  "profile.sub.sending": { ar: "جارٍ إرسال الطلب...", en: "Sending request..." },
  "profile.sub.sendCta": {
    ar: "أرسل طلب الاشتراك",
    en: "Send subscription request",
  },
  "profile.sub.footerNote": {
    ar: "ستُراجع صورتك خلال 24-48 ساعة. عند الموافقة ستظهر بطاقة عضويتك في حسابك.",
    en: "Your receipt will be reviewed within 24–48 hours. Once approved, your membership card will appear in your account.",
  },
  "profile.sub.loginRequired": { ar: "سجّل الدخول أولاً", en: "Sign in first" },
  "profile.sub.loginRequiredDesc": {
    ar: "يجب تسجيل الدخول للاشتراك في عضوية توفير.",
    en: "You must sign in to subscribe to Tawfir membership.",
  },
  "profile.sub.errMe": {
    ar: "تعذّر تحميل بياناتك",
    en: "Failed to load your details",
  },
  "profile.sub.errMeDesc": {
    ar: "تعذّر التحقق من حالة عضويتك. تحقق من اتصالك بالإنترنت.",
    en: "Couldn't verify your membership status. Check your internet connection.",
  },
  "profile.sub.errInfo": {
    ar: "تعذّر تحميل بيانات التحويل",
    en: "Failed to load transfer details",
  },
  "profile.sub.errInfoDesc": {
    ar: "تعذّر جلب معلومات الاشتراك. تحقق من اتصالك بالإنترنت.",
    en: "Couldn't load the subscription info. Check your internet connection.",
  },

  /* ─── سجل التوفير ─── */
  "profile.savings.loginTitle": {
    ar: "سجّل الدخول لرؤية سجل توفيرك",
    en: "Sign in to see your savings history",
  },
  "profile.savings.loginDesc": {
    ar: "عند تسجيل الدخول ستظهر هنا كل ما وفّرته بفضل عضويتك.",
    en: "Once signed in, everything you've saved thanks to your membership will appear here.",
  },
  "profile.savings.headline": {
    ar: "كم وفّرت بفضل عضويتك؟",
    en: "How much have you saved with your membership?",
  },
  "profile.savings.subheadline": {
    ar: "تتبع توفيرك من خصومات العضوية في كل المتاجر المشتركة",
    en: "Track your membership-discount savings across all participating stores",
  },
  "profile.savings.howTitle": {
    ar: "كيف تحسب التوفير؟",
    en: "How is savings calculated?",
  },
  "profile.savings.howDesc": {
    ar: "نحسب الفرق بين السعر الأصلي والسعر الذي دفعته (بعد خصم العضوية) لكل طلب من المتاجر المشتركة. صافي التوفير = إجمالي التوفير ناقص قيمة الاشتراك (للعضوية المدفوعة). عائد الاستثمار (ROI) يوضح نسبة الفائدة مقابل ما دفعته للاشتراك.",
    en: "We calculate the difference between the original price and what you paid (after the membership discount) for each order from participating stores. Net savings = total savings minus the subscription cost (for paid membership). Return on investment (ROI) shows the gain relative to what you paid for the subscription.",
  },
  "profile.savings.cta": {
    ar: "تصفّح المتاجر المشتركة لزيادة توفيرك",
    en: "Browse participating stores to grow your savings",
  },
  "profile.savings.cardTitle": { ar: "سجل التوفير", en: "Savings history" },
  "profile.savings.ordersWithDiscount": {
    ar: "{count} طلب بخصم",
    en: "{count} discounted orders",
  },
  "profile.savings.totalLabel": {
    ar: "إجمالي ما وفّرته بفضل العضوية",
    en: "Total saved with your membership",
  },
  "profile.savings.thisMonth": { ar: "هذا الشهر", en: "This month" },
  "profile.savings.thisYear": { ar: "هذه السنة", en: "This year" },
  "profile.savings.membershipValue": { ar: "قيمة العضوية", en: "Membership cost" },
  "profile.savings.free": { ar: "مجانية", en: "Free" },
  "profile.savings.net": { ar: "صافي التوفير", en: "Net savings" },
  "profile.savings.roi": {
    ar: "عائد الاستثمار (ROI)",
    en: "Return on investment (ROI)",
  },
  "profile.savings.m0": {
    ar: "ابدأ الطلب من المتاجر المشتركة لتوفّر بفضل العضوية",
    en: "Start ordering from participating stores to save with your membership",
  },
  "profile.savings.m1": {
    ar: "وفّرت أكثر من قيمة اشتراكك بـ {percent}%! العضوية تستحق التجديد 🎉",
    en: "You saved more than your subscription cost by {percent}%! The membership is worth renewing 🎉",
  },
  "profile.savings.m2": {
    ar: "عضويتك المجانية توفّر لك — استمتع بالخصومات الحصرية!",
    en: "Your free membership is saving you money — enjoy the exclusive discounts!",
  },
  "profile.savings.m3": {
    ar: "استمر في الطلب لزيادة توفيرك",
    en: "Keep ordering to grow your savings",
  },

  /* ─── الإشعارات ─── */
  "profile.notif.unreadCount": {
    ar: "لديك {count} إشعار غير مقروء",
    en: "You have {count} unread notifications",
  },
  "profile.notif.allRead": {
    ar: "كل إشعاراتك مقروءة",
    en: "All your notifications are read",
  },
  "profile.notif.markAll": {
    ar: "تعليم الكل كمقروء",
    en: "Mark all as read",
  },
  "profile.notif.tabAll": { ar: "الكل", en: "All" },
  "profile.notif.tabUnread": { ar: "غير المقروء", en: "Unread" },
  "profile.notif.filterA11y": {
    ar: "تصفية الإشعارات حسب الفئة",
    en: "Filter notifications by category",
  },
  "profile.notif.catOrders": { ar: "الطلبات", en: "Orders" },
  "profile.notif.catOffers": { ar: "العروض", en: "Offers" },
  "profile.notif.catMembership": { ar: "العضوية", en: "Membership" },
  "profile.notif.catSystem": { ar: "النظام", en: "System" },
  "profile.notif.errTitle": {
    ar: "تعذّر تحميل الإشعارات",
    en: "Failed to load notifications",
  },
  "profile.notif.errDesc": {
    ar: "تأكد من اتصالك بالإنترنت ثم أعد المحاولة.",
    en: "Check your internet connection and try again.",
  },
  "profile.notif.emptyCat": {
    ar: "لا توجد إشعارات في هذه الفئة",
    en: "No notifications in this category",
  },
  "profile.notif.emptyUnread": {
    ar: "لا توجد إشعارات غير مقروءة",
    en: "No unread notifications",
  },
  "profile.notif.emptyAll": { ar: "لا توجد إشعارات", en: "No notifications" },
  "profile.notif.emptyCatDesc": {
    ar: "جرّب فئة أخرى أو اعرض كل الإشعارات.",
    en: "Try another category or view all notifications.",
  },
  "profile.notif.emptyUnreadDesc": {
    ar: "تم تعليم كل إشعاراتك كمقروءة.",
    en: "All your notifications have been marked as read.",
  },
  "profile.notif.emptyAllDesc": {
    ar: "ستظهر هنا إشعارات الطلبات والعضوية والعروض الجديدة.",
    en: "Order, membership and new-offer notifications will appear here.",
  },
  "profile.notif.unreadA11y": { ar: "غير مقروء", en: "Unread" },
  "profile.notif.groupToday": { ar: "اليوم", en: "Today" },
  "profile.notif.groupYesterday": { ar: "أمس", en: "Yesterday" },
  "profile.notif.groupOlder": { ar: "أقدم", en: "Earlier" },
  "profile.notif.prev": { ar: "السابق", en: "Previous" },
  "profile.notif.next": { ar: "التالي", en: "Next" },
  "profile.notif.pageOf": {
    ar: "صفحة {page} من {pages} ({total})",
    en: "Page {page} of {pages} ({total})",
  },

  /* ─── المفضلة ─── */
  "profile.fav.clearAll": { ar: "إزالة الكل", en: "Remove all" },
  "profile.fav.confirmClear": { ar: "تأكيد؟", en: "Confirm?" },
  "profile.fav.clearA11y": {
    ar: "إزالة كل المفضلات",
    en: "Remove all favorites",
  },
  "profile.fav.confirmA11y": {
    ar: "تأكيد إزالة كل المفضلات",
    en: "Confirm removing all favorites",
  },
  "profile.fav.cleared": {
    ar: "تمت إزالة كل المفضلات",
    en: "All favorites removed",
  },
  "profile.fav.loading": {
    ar: "جارٍ تحميل مفضلتك...",
    en: "Loading your favorites...",
  },
  "profile.fav.countOne": {
    ar: "{count} وجبة في مفضلتك",
    en: "{count} meal in your favorites",
  },
  "profile.fav.countMany": {
    ar: "{count} وجبات في مفضلتك",
    en: "{count} meals in your favorites",
  },
  "profile.fav.emptyTitle": {
    ar: "لا توجد مفضلات بعد",
    en: "No favorites yet",
  },
  "profile.fav.emptyDesc": {
    ar: "اضغط على أيقونة القلب في أي وجبة لإضافتها هنا — تبقى مفضلاتك محفوظة على جهازك.",
    en: "Tap the heart icon on any meal to add it here — your favorites are saved on your device.",
  },
  "profile.fav.availableA11y": {
    ar: "وجبات مفضلة متوفرة",
    en: "Available favorite meals",
  },
  "profile.fav.outOfStockA11y": {
    ar: "وجبات مفضلة نفدت مؤقتاً",
    en: "Favorite meals temporarily out of stock",
  },
  "profile.fav.outOfStock": {
    ar: "نفدت مؤقتاً ({count})",
    en: "Temporarily out of stock ({count})",
  },

  /* ─── الفوتر ─── */
  "profile.footer.about": {
    ar: "منصة توفير توصّل بينك وبين أفضل العروض في مدينتك — عضوية واحدة، ووفّر على كل طلب بخصومات حصرية للعضوية.",
    en: "Tawfir connects you with the best offers in your city — one membership, and save on every order with exclusive membership discounts.",
  },
  "profile.footer.quickLinks": { ar: "روابط سريعة", en: "Quick links" },
  "profile.footer.linkRegister": {
    ar: "تسجيل العضوية",
    en: "Membership registration",
  },
  "profile.footer.linkPrivacy": { ar: "سياسة الخصوصية", en: "Privacy policy" },
  "profile.footer.rights": {
    ar: "جميع الحقوق محفوظة لتوفير {year}",
    en: "All rights reserved to Tawfir {year}",
  },

  /* ─── التنقل السفلي (تسميات إضافية غير موجودة في nav.*) ─── */
  "profile.nav.a11y": { ar: "التنقل الرئيسي", en: "Main navigation" },
  "profile.nav.activeOrdersA11y": {
    ar: "الطلبات النشطة",
    en: "Active orders",
  },
  "profile.nav.cartA11y": { ar: "سلة الطلبات", en: "Order cart" },

  /* ─── الموافقة على الكوكيز ─── */
  "profile.cookies.text": {
    ar: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. بالاستمرار في التصفح فإنك توافق على سياسة الخصوصية.",
    en: "We use cookies to improve your experience. By continuing to browse you agree to the privacy policy.",
  },
  "profile.cookies.reject": { ar: "رفض", en: "Reject" },
  "profile.cookies.accept": { ar: "موافق", en: "Accept" },

  /* ─── شريحة انقطاع الإنترنت ─── */
  "profile.offline.ownerPortal": {
    ar: "تتطلب بوابة المتاجر اتصالاً بالإنترنت",
    en: "The stores portal requires an internet connection",
  },
  "profile.offline.noConnection": {
    ar: "لا يتوفر اتصال بالإنترنت",
    en: "No internet connection available",
  },
  "profile.offline.restored": {
    ar: "تم استعادة الاتصال",
    en: "Connection restored",
  },

  /* ─── زر العودة للأعلى ─── */
  "profile.scrollToTop": { ar: "العودة للأعلى", en: "Back to top" },

  /* ─── حالة خطأ عامة ─── */
  "profile.errState.message": {
    ar: "لم نتمكن من تحميل البيانات. يرجى المحاولة مرة أخرى.",
    en: "We couldn't load the data. Please try again.",
  },
};
