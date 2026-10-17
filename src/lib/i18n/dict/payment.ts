import type { DictEntry } from "@/lib/i18n/index";

/**
 * paymentDict — مفاتيح مجموعة «payment» (شاشة الدفع الإلكتروني + شاشة
 * العودة/التحقق + نصوص حالة نموذج مويسر) — بصمة 40-c.
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 * عقد «الدفع أولاً» مقدس في الترجمة: العنوان "Secure payment gateway"
 * والنجاح بعد verify حصراً "Payment successful — your order has been
 * received" — ولا يُعلن أي استلام قبل الدفع في المسار الإلكتروني.
 * ما يُرسل للخادم/لِمويسر (قيم payment_method، هللات المبلغ، init)
 * لا يُترجم ولا يُلمس إطلاقاً.
 */
export const paymentDict: Record<string, DictEntry> = {
  /* ─── عناوين وبوابات شاشة الدفع ─── */
  "payment.electronic": { ar: "الدفع الإلكتروني", en: "Secure payment gateway" },
  "payment.secureFormAria": { ar: "نموذج الدفع الآمن", en: "Secure payment gateway" },
  "payment.redirectingLogin": {
    ar: "جارٍ تحويلك لتسجيل الدخول…",
    en: "Redirecting you to sign in…",
  },
  "payment.marketUnknown": { ar: "تعذّر تحديد سوقك", en: "Couldn't determine your market" },
  "payment.saudiOnly": {
    ar: "الدفع الإلكتروني متاح للسوق السعودي فقط",
    en: "Electronic payment is available in the Saudi market only",
  },
  "payment.saudiOnlyBody": {
    ar: "طلبك في سوق يعتمد الدفع نقداً عند الاستلام (كاش) — أو التحويل عبر محفظة المتجر من شاشة الدفع الخاصة بالطلب.",
    en: "Your order is in a market that settles by cash on delivery — or wallet transfer from the order's payment screen.",
  },
  "payment.backToOrder": { ar: "العودة إلى الطلب", en: "Back to the order" },
  "payment.backToOrderLink": { ar: "رجوع إلى الطلب", en: "Back to the order" },
  "payment.alreadyPaid": { ar: "مدفوع سابقًا", en: "Already paid" },
  "payment.alreadyPaidBody": {
    ar: "هذا الطلب مدفوع بالكامل — لا حاجة لأي دفع إضافي. يمكنك متابعة حالة الطلب من صفحة الطلب.",
    en: "This order is fully paid — no additional payment is needed. You can follow the order from its page.",
  },
  "payment.continueOrder": { ar: "متابعة الطلب", en: "Continue order" },
  "payment.checkConnection": {
    ar: "تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
    en: "Check your internet connection and try again.",
  },
  "payment.orderLoadFailed": { ar: "تعذّر تحميل الطلب", en: "Couldn't load the order" },
  "payment.configFailed": {
    ar: "تعذّر تحميل إعدادات الدفع",
    en: "Couldn't load payment settings",
  },
  "payment.notInMarket": {
    ar: "الدفع الإلكتروني غير متاح في سوقك",
    en: "Electronic payment isn't available in your market",
  },
  "payment.notInMarketBody": {
    ar: "سوقك يسدد عبر إشعارات التحويل — ادفع نقداً عند الاستلام أو ارفع إشعار التحويل من شاشة الدفع الخاصة بالطلب.",
    en: "Your market settles via transfer receipts — pay cash on delivery or upload the transfer receipt from the order's payment screen.",
  },
  "payment.maintenance": { ar: "الدفع الإلكتروني تحت الصيانة", en: "Electronic payment under maintenance" },
  "payment.maintenanceBody": {
    ar: "بوابة الدفع الإلكتروني غير متاحة حالياً من إدارة المنصة. الدفع عند الاستلام (كاش) متاح دائماً — والمتابعة إلى طلبك لا تتأثر.",
    en: "The electronic payment gateway is currently unavailable by platform management. Cash on delivery is always available — and continuing to your order is unaffected.",
  },

  /* ─── ملخص المبلغ والنموذج المدمج ─── */
  "payment.amountAria": { ar: "ملخص المبلغ المطلوب", en: "Amount due summary" },
  "payment.amountForOrder": { ar: "المبلغ المطلوب لطلب رقم", en: "Amount due for order" },
  "payment.applePayAria": {
    ar: "الدفع عبر Apple Pay — يفتح نافذة دفع آمنة داخل التطبيق",
    en: "Pay with Apple Pay — opens a secure payment window inside the app",
  },
  "payment.applePayHint": {
    ar: "يفتح داخل التطبيق — تعود فورًا بضغطة «تم»",
    en: "Opens inside the app — you return instantly with one tap of “Done”",
  },
  "payment.sheetError": {
    ar: "تعذّر فتح نافذة الدفع الآمنة — أعد المحاولة",
    en: "Couldn't open the secure payment window — try again",
  },
  "payment.securityNote": {
    ar: "بيانات بطاقتك لا تلمس خوادمنا — تُعالج داخل بوابة مويسر المشفّرة، ونحن نتحقق من الدفعة تلقائياً بعد إتمامها.",
    en: "Your card details never touch our servers — they're processed inside Moyasar's encrypted gateway, and we verify the payment automatically once it's completed.",
  },
  "payment.preparing": {
    ar: "جارٍ تحضير شاشة الدفع…",
    en: "Preparing the payment screen…",
  },

  /* ─── وضع الورقة النظيفة (Apple Pay داخل iOS) ─── */
  "payment.safariTitle": { ar: "توفير — دفع آمن عبر مويسر", en: "Tawfir — secure payment via Moyasar" },
  "payment.safariIncomplete": {
    ar: "رابط الدفع غير مكتمل — أغلق هذه النافذة واضغط زر Apple Pay من شاشة الدفع داخل التطبيق من جديد.",
    en: "The payment link is incomplete — close this window and tap the Apple Pay button from the in-app payment screen again.",
  },
  "payment.safariPreparing": {
    ar: "جارٍ تجهيز نموذج الدفع…",
    en: "Preparing the payment form…",
  },
  "payment.safariDoneNote": {
    ar: "بعد إتمام الدفع أغلق هذه النافذة بـ«تم» — ستظهر حالة الطلب محدّثة داخل التطبيق فورًا.",
    en: "After completing payment, close this window with “Done” — the order status updates inside the app immediately.",
  },

  /* ─── شاشة العودة والتحقق الحتمي (/payment/return) ─── */
  "payment.returnTitle": { ar: "نتيجة الدفع", en: "Payment result" },
  "payment.returnPreparing": {
    ar: "جارٍ تجهيز نتيجة الدفع…",
    en: "Preparing the payment result…",
  },
  "payment.gatewayStatus": {
    ar: "حالة الدفعة من بوابة الدفع:",
    en: "Payment status from the gateway:",
  },
  "payment.recheckReassure": {
    ar: "إذا خُصم المبلغ من بطاقتك ولم تكتمل الحالة فلا تقلق — تحقّق مجددًا أو تواصل مع الدعم وسيُطابق المبلغ تلقائياً.",
    en: "If the amount left your card but the status isn't final, don't worry — verify again or contact support and the amount will be matched automatically.",
  },
  "payment.reverify": { ar: "تحقق مجددًا", en: "Verify again" },
  "payment.sessionExpired": {
    ar: "انتهت جلستك قبل التحقق من الدفعة",
    en: "Your session ended before the payment could be verified",
  },
  "payment.sessionExpiredBody": {
    ar: "سجّل الدخول ثم عد إلى هذه الصفحة — مبلغك محفوظ ومرتبط بالطلب.",
    en: "Sign in and come back to this page — your amount is saved and linked to the order.",
  },
  "payment.autoRetrying": {
    ar: "لم تُعتمد الدفعة بعد — نتحقق تلقائيًا خلال لحظات…",
    en: "The payment isn't approved yet — verifying automatically within moments…",
  },
  "payment.notApproved": { ar: "لم تُعتمد الدفعة بعد", en: "The payment isn't approved yet" },
  "payment.notApprovedNote": {
    ar: "في حالات نادرة يتأخر تأكيد البوابة ثوانٍ معدودة. إذا خُصم المبلغ وبقيت هذه الرسالة فاضغط «تحقق مجددًا» أو تواصل مع الدعم — لا تتكرر الدفعة إطلاقاً.",
    en: "In rare cases the gateway's confirmation lags a few seconds. If the amount was deducted and this message stays, tap “Verify again” or contact support — the payment is never duplicated.",
  },
  "payment.verifyFailed": { ar: "تعذّر التحقق من الدفعة", en: "Couldn't verify the payment" },
  "payment.contactSupport": {
    ar: "تواصل مع الدعم — ولا تحاول الدفع مرة أخرى قبل حسم حالة هذه الدفعة.",
    en: "Contact support — and don't attempt to pay again before this payment's status is settled.",
  },
  "payment.verifying": { ar: "جارٍ التحقق من دفعتك", en: "Verifying your payment" },
  "payment.verifyingBody": {
    ar: "لحظات فقط — نطابق الدفعة مع بوابة الدفع وطلبك",
    en: "Just a moment — we're matching the payment with the gateway and your order",
  },
  "payment.successTitle": {
    ar: "تم الدفع بنجاح",
    en: "Payment successful — your order has been received",
  },
  "payment.alreadyPaidShort": {
    ar: "هذا الطلب مدفوع بالكامل — لا حاجة لأي دفع إضافي",
    en: "This order is fully paid — no additional payment needed",
  },
  "payment.thanksPreparing": {
    ar: "شكراً لك — سيبدأ المتجر بتحضير طلبك",
    en: "Thank you — the store will start preparing your order",
  },
  "payment.missingParams": {
    ar: "رابط نتيجة الدفع غير مكتمل",
    en: "The payment result link is incomplete",
  },
  "payment.missingParamsBody": {
    ar: "لم نتمكن من تحديد الطلب أو الدفعة من الرابط. إن كنت دفعت فعلاً فلا تقلق — راجع طلباتك أو تواصل مع الدعم لحسم الحالة.",
    en: "We couldn't determine the order or payment from the link. If you did pay, don't worry — check your orders or contact support to settle the status.",
  },
  "payment.goToOrders": { ar: "الذهاب إلى طلباتي", en: "Go to My Orders" },

  /* ─── نصوص حالة نموذج مويسر (عرض حصراً — عقد init لا يُلمس) ─── */
  "payment.formPreparing": {
    ar: "جارٍ تجهيز نموذج الدفع الآمن…",
    en: "Preparing the secure payment form…",
  },
  "payment.formInitFailed": {
    ar: "تعذّر تهيئة بوابة الدفع — أعد المحاولة",
    en: "Couldn't initialize the payment gateway — try again",
  },
  "payment.gatewayLoadFailed": {
    ar: "تعذّر تحميل بوابة الدفع — تحقق من اتصالك بالإنترنت ثم أعد المحاولة",
    en: "Couldn't load the payment gateway — check your internet connection and try again",
  },
  "payment.gatewayRetry": {
    ar: "تعذّر تحميل بوابة الدفع — أعد المحاولة",
    en: "Couldn't load the payment gateway — try again",
  },
  "payment.gatewayFailed": {
    ar: "تعذّر تحميل بوابة الدفع",
    en: "Couldn't load the payment gateway",
  },
};
