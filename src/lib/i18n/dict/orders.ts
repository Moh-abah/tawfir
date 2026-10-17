import type { DictEntry } from "@/lib/i18n/index";

/**
 * ordersDict — مفاتيح مجموعة «orders» (قائمة الطلبات + تفاصيل الطلب +
 * بطاقة التتبّع) — بصمة 40-c. كل مفتاح {ar, en} — العربية نص الكود الأصلي
 * حرفياً. بيانات الخادم (أسماء الأصناف/المتاجر/الوسوم المركبة/الأكواد)
 * تُعرض كما هي دون ترجمة.
 */
export const ordersDict: Record<string, DictEntry> = {
  /* ─── حالات الطلب (مرآة ORDER_STATUS_LABEL — الثابت المشترك لا يُلمس) ─── */
  "orders.status.pending": { ar: "بانتظار التأكيد", en: "Awaiting confirmation" },
  "orders.status.confirmed": { ar: "مؤكَّد", en: "Confirmed" },
  "orders.status.preparing": { ar: "قيد التحضير", en: "Being prepared" },
  "orders.status.out_for_delivery": { ar: "في الطريق إليك", en: "On the way to you" },
  "orders.status.delivered": { ar: "تم التوصيل", en: "Delivered" },
  "orders.status.cancelled": { ar: "ملغى", en: "Cancelled" },

  /* ─── قائمة الطلبات ─── */
  "orders.filterAll": { ar: "الكل", en: "All" },
  "orders.filterAria": { ar: "فلترة الطلبات حسب الحالة", en: "Filter orders by status" },
  "orders.subtitle": {
    ar: "تابع حالة طلباتك الحالية والسابقة",
    en: "Track the status of your current and past orders",
  },
  "orders.searchPlaceholder": { ar: "ابحث برقم الطلب...", en: "Search by order number…" },
  "orders.searchAria": { ar: "البحث برقم الطلب", en: "Search by order number" },
  "orders.clearSearch": { ar: "مسح البحث", en: "Clear search" },
  "orders.loginTitle": { ar: "سجّل الدخول لعرض طلباتك", en: "Sign in to view your orders" },
  "orders.loginDesc": {
    ar: "عند تسجيل الدخول ستظهر هنا كل طلباتك السابقة وحالتها.",
    en: "Once you sign in, all your past orders and their status will appear here.",
  },
  "orders.createAccount": { ar: "إنشاء حساب", en: "Create account" },
  "orders.newBadge": { ar: "طلب جديد!", en: "New order!" },
  "orders.orderNo": { ar: "طلب رقم", en: "Order no." },
  "orders.cardAria": { ar: "تفاصيل الطلب رقم {id}", en: "Order #{id} details" },
  "orders.store": { ar: "المتجر", en: "Store" },
  "orders.storeFallback": { ar: "متجر", en: "Store" },
  "orders.reorder": { ar: "أعد الطلب", en: "Reorder" },
  "orders.reorderAria": {
    ar: "إعادة طلب رقم {id} بنفس الأصناف",
    en: "Reorder #{id} with the same items",
  },
  "orders.viewDetails": { ar: "عرض التفاصيل", en: "View details" },
  "orders.loadFailedTitle": { ar: "تعذّر تحميل الطلبات", en: "Couldn't load orders" },
  "orders.loadFailed": {
    ar: "تعذّر تحميل طلباتك. تحقق من اتصالك بالإنترنت.",
    en: "Couldn't load your orders. Check your internet connection.",
  },
  "orders.noResults": { ar: "لا نتائج مطابقة", en: "No matching results" },
  "orders.noResultsDesc": {
    ar: "لا يوجد طلب برقم يحتوي \"{query}\" ضمن هذه القائمة.",
    en: "No order with a number containing \"{query}\" in this list.",
  },
  "orders.noneYet": { ar: "لا توجد طلبات بعد", en: "No orders yet" },
  "orders.noneYetDesc": {
    ar: "ابدأ أول طلب الآن وستجده هنا عند الحاجة.",
    en: "Place your first order now and you'll find it here whenever you need it.",
  },
  "orders.activeNow": { ar: "طلبك الجاري الآن", en: "Your active order" },
  "orders.activeLine": { ar: "طلب #{id} — {facility}", en: "Order #{id} — {facility}" },
  "orders.trackActiveAria": {
    ar: "تتبّع طلبك الجاري رقم {id}",
    en: "Track your active order #{id}",
  },
  "orders.elapsedSuffix": { ar: "على طلبك", en: "on your order" },
  "orders.track": { ar: "تتبّع", en: "Track" },

  /* ─── شارات طلب المحفظة (قائمة الطلبات) ─── */
  "orders.badge.pending": { ar: "بانتظار المراجعة", en: "Pending review" },
  "orders.badge.approved": { ar: "تم الدفع", en: "Paid" },
  "orders.badge.rejected": { ar: "مرفوض", en: "Rejected" },
  "orders.badge.partial": { ar: "بانتظار التكملة", en: "Awaiting completion" },
  "orders.walletBadge": { ar: "محفظة", en: "Wallet" },

  /* ─── حالة إيصالة الدفع (تفاصيل الطلب) ─── */
  "orders.receiptStatus.pending": { ar: "بانتظار المراجعة", en: "Pending review" },
  "orders.receiptStatus.approved": { ar: "تم تأكيد الدفع", en: "Payment confirmed" },
  "orders.receiptStatus.rejected": { ar: "مرفوض", en: "Rejected" },
  "orders.receiptStatus.partial_requested": {
    ar: "بانتظار تكملة الدفعة",
    en: "Awaiting payment completion",
  },

  /* ─── تلميحات الوقت المتوقع ─── */
  "orders.eta.pending": {
    ar: "بانتظار تأكيد المتجر — عادةً خلال دقائق قليلة",
    en: "Awaiting store confirmation — usually within a few minutes",
  },
  "orders.eta.confirmed": {
    ar: "تم التأكيد! سيبدأ التحضير قريباً",
    en: "Confirmed! Preparation will start soon",
  },
  "orders.eta.preparing": {
    ar: "وجبتك قيد التحضير الآن 🍳 — المعتاد 15-30 دقيقة",
    en: "Your meal is being prepared 🍳 — typically 15–30 minutes",
  },
  "orders.eta.out_for_delivery": {
    ar: "طلبك في الطريق إليك 🛵 — عادةً خلال 15-25 دقيقة",
    en: "Your order is on the way 🛵 — typically 15–25 minutes",
  },

  /* ─── وسائل الدفع (عرض حصراً — القيم المرسلة لا تُلمس) ─── */
  "orders.payMethod.cash": { ar: "نقداً عند الاستلام", en: "Cash on delivery" },
  "orders.payMethod.wallet": { ar: "محفظة / تحويل يدوي", en: "Wallet / manual transfer" },

  /* ─── تفاصيل الطلب — الحالات العامة ─── */
  "orders.detailTitle": { ar: "تفاصيل الطلب", en: "Order details" },
  "orders.loginDetailTitle": {
    ar: "سجّل الدخول لعرض تفاصيل الطلب",
    en: "Sign in to view order details",
  },
  "orders.loginDetailDesc": {
    ar: "لا يمكن عرض تفاصيل الطلب دون تسجيل الدخول.",
    en: "Order details can't be shown without signing in.",
  },
  "orders.invalidId": { ar: "معرّف الطلب غير صالح", en: "Invalid order ID" },
  "orders.cantDetermine": {
    ar: "تعذّر تحديد الطلب المطلوب.",
    en: "Couldn't determine the requested order.",
  },
  "orders.detailLoadFailed": {
    ar: "تعذّر تحميل تفاصيل الطلب. تحقق من اتصالك بالإنترنت.",
    en: "Couldn't load order details. Check your internet connection.",
  },
  "orders.notFound": { ar: "الطلب غير موجود", en: "Order not found" },
  "orders.notFoundDesc": {
    ar: "ربما حُذف هذا الطلب أو لا تملك صلاحية الوصول إليه.",
    en: "This order may have been deleted, or you don't have access to it.",
  },
  "orders.backToOrders": { ar: "العودة لطلباتي", en: "Back to My Orders" },
  "orders.itemFallback": { ar: "صنف", en: "Item" },

  /* ─── إعادة الطلب ─── */
  "orders.writeAddressTitle": {
    ar: "اكتب عنوانك النصي المختصر",
    en: "Write your short text address",
  },
  "orders.addressHelp": {
    ar: "يساعد المندوب عند وصوله لبابك",
    en: "It helps the courier reach your door",
  },
  "orders.pickWalletTitle": {
    ar: "اختر محفظة الدفع أولاً",
    en: "Choose a payment wallet first",
  },
  "orders.pickWalletDesc": {
    ar: "من قائمة محافظ المتجر",
    en: "From the store's wallet list",
  },
  "orders.reorderSuccess": {
    ar: "تم استلام طلبك الجديد #{id}",
    en: "Your new order has been received — #{id}",
  },
  "orders.reorderWalletDesc": {
    ar: "أكمل الدفع من شاشة الدفع — حوّل وارفع إشعار التحويل",
    en: "Complete payment from the payment screen — transfer and upload the receipt",
  },
  "orders.reorderCashDesc": {
    ar: "نفس وجبات طلبك السابق — تابع حالته الآن",
    en: "Same meals as your previous order — follow it now",
  },
  "orders.reorderFailed": { ar: "تعذّر إعادة الطلب", en: "Couldn't reorder" },
  "orders.reorderFailedDesc": {
    ar: "قد يكون أحد الأصناف غير متوفر الآن — جرّب الطلب يدوياً.",
    en: "An item may be unavailable right now — try ordering manually.",
  },
  "orders.reorderTitle": { ar: "إعادة الطلب", en: "Reorder" },
  "orders.reorderDesc": {
    ar: "من {facility} — عدّل الكميات والعنوان ثم أكّد",
    en: "From {facility} — adjust quantities and address, then confirm",
  },
  "orders.reorderSame": { ar: "أعد الطلب نفسه", en: "Reorder the same items" },
  "orders.itemsCount": { ar: "الأصناف ({count})", en: "Items ({count})" },
  "orders.decQtyAria": { ar: "إنقاص كمية {name}", en: "Decrease {name} quantity" },
  "orders.incQtyAria": { ar: "زيادة كمية {name}", en: "Increase {name} quantity" },
  "orders.removeAria": { ar: "إزالة {name}", en: "Remove {name}" },
  "orders.allRemoved": {
    ar: "أزلت كل الأصناف — أضف أصنافاً من المتجر لإعادة الطلب.",
    en: "You removed every item — add items from the store to reorder.",
  },
  "orders.fromPrevOrder": {
    ar: "من طلبك السابق — حدّثه بـ«تحديث» إن تغيّر مكان استلامك",
    en: "From your previous order — update it if your pickup spot changed",
  },
  "orders.loadLocation": {
    ar: "حمّل موقعك لتصل شحنتك إلى بابك",
    en: "Load your location so your delivery reaches your door",
  },
  "orders.addressLabel": { ar: "عنوان التوصيل", en: "Delivery address" },
  "orders.addressPlaceholder": {
    ar: "الحي / الشارع / معلّم مميّز...",
    en: "District / street / landmark…",
  },
  "orders.notesPlaceholder": { ar: "مثال: بلا صلصة حارة...", en: "e.g., no spicy sauce…" },
  "orders.estimatedTotal": { ar: "الإجمالي التقديري", en: "Estimated total" },
  "orders.repriceNote": {
    ar: "تُعاد حساب الأسعار النهائية حسب توفّر الأصناف وخصم عضويتك الحالي عند التأكيد.",
    en: "Final prices are recalculated at confirmation based on item availability and your current membership discount.",
  },
  "orders.confirmReorder": { ar: "تأكيد إعادة الطلب", en: "Confirm reorder" },

  /* ─── احتفال التوصيل ─── */
  "orders.deliveredAria": { ar: "تم التوصيل بنجاح", en: "Delivered successfully" },
  "orders.deliveredTitle": { ar: "وصل طلبك بنجاح، بالعافية!", en: "Your order arrived — enjoy!" },
  "orders.fromStore": { ar: "من {facility}", en: "From {facility}" },
  "orders.tookPrefix": { ar: "استغرق التوصيل", en: "Delivery took" },
  "orders.deliveryMinutes": { ar: "{minutes} دقيقة", en: "{minutes} min" },
  "orders.orderAgain": { ar: "اطلب مرة أخرى", en: "Order again" },
  "orders.receipt": { ar: "الإيصال", en: "Receipt" },
  "orders.receiptAria": { ar: "عرض إيصال الطلب", en: "View order receipt" },

  /* ─── التتبّع والإلغاء ─── */
  "orders.trackAria": { ar: "تتبّع حالة الطلب", en: "Order status tracking" },
  "orders.cancelledNote": {
    ar: "تم إلغاء هذا الطلب ولن يُنفَّذ. لأي استفسار تواصل مع المتجر.",
    en: "This order was cancelled and won't be processed. For any questions, contact the store.",
  },
  "orders.cancelling": { ar: "جارٍ الإلغاء...", en: "Cancelling…" },
  "orders.cancelOrder": { ar: "إلغاء الطلب", en: "Cancel order" },
  "orders.cancelTitle": {
    ar: "هل أنت متأكد من إلغاء طلبك؟",
    en: "Are you sure you want to cancel your order?",
  },
  "orders.cancelDesc": {
    ar: "سيُلغى الطلب #{id} من {facility} وتُسترجع الكميات للمخزون. لا يمكن التراجع عن هذا الإجراء.",
    en: "Order #{id} from {facility} will be cancelled and the quantities returned to stock. This action can't be undone.",
  },
  "orders.cancelYes": { ar: "نعم، إلغاء الطلب", en: "Yes, cancel the order" },
  "orders.cancelNo": { ar: "إبقاء الطلب", en: "Keep the order" },

  /* ─── أصناف الطلب والفاتورة ─── */
  "orders.itemsAria": { ar: "أصناف الطلب", en: "Order items" },
  "orders.itemsHeading": { ar: "أصناف الطلب ({count})", en: "Order items ({count})" },
  "orders.discountApplied": { ar: "خصم مطبّق", en: "Discount applied" },
  "orders.qtyLabel": { ar: "الكمية:", en: "Qty:" },
  "orders.unitPriceLabel": { ar: "سعر الوحدة:", en: "Unit price:" },
  "orders.feeTransparency": { ar: "شفافية الأجرة:", en: "Fee transparency:" },
  "orders.km": { ar: "كم", en: "km" },
  "orders.kmWithVal": { ar: "{km} كم", en: "{km} km" },
  "orders.billedPrefix": { ar: "— تُحتسب", en: "— billed as" },
  "orders.billedAs": { ar: "— تُحتسب {km} كم", en: "— billed as {km} km" },
  "orders.billedPerKm": { ar: "{km} كم × {price}", en: "{km} km × {price}" },
  "orders.perKmSuffix": { ar: "× {price}/كم", en: "× {price}/km" },

  /* ─── بطاقة الدفع بالمحفظة ─── */
  "orders.walletStatusAria": { ar: "حالة الدفع بالمحفظة", en: "Wallet payment status" },
  "orders.walletPayment": { ar: "الدفع بالمحفظة", en: "Wallet payment" },
  "orders.awaitingTransfer": { ar: "بانتظار تحويلك", en: "Awaiting your transfer" },
  "orders.walletLabel": { ar: "المحفظة:", en: "Wallet:" },
  "orders.partialNeeded": {
    ar: "💰 مطلوب تكملة الدفعة — المتبقي: {amount}",
    en: "💰 Payment completion required — remaining: {amount}",
  },
  "orders.rejectionReason": { ar: "سبب الرفض: {reason}", en: "Rejection reason: {reason}" },
  "orders.completionUnderReview": {
    ar: "تم استلام إشعار المتبقي — بانتظار مراجعة التاجر.",
    en: "The remaining-amount receipt was received — awaiting the merchant's review.",
  },
  "orders.receiptUnderReview": {
    ar: "إشعار التحويل في مراجعة المتجر — سيؤكد الطلب بعد التحقق.",
    en: "The transfer receipt is under store review — the order will be confirmed after verification.",
  },
  "orders.completePayment": { ar: "إتمام الدفع — {total}", en: "Complete payment — {total}" },
  "orders.transferRemaining": {
    ar: "تحويل المتبقي ورفع الإشعار",
    en: "Transfer the remaining & upload the receipt",
  },
  "orders.viewPayScreen": { ar: "عرض شاشة الدفع", en: "View payment screen" },
  "orders.transferReceived": {
    ar: "تم استلام تحويلك ({amount}) — شكراً لك 🙏",
    en: "Your transfer was received ({amount}) — thank you 🙏",
  },

  /* ─── قسم الدفع الإلكتروني (تفاصيل الطلب — السعودية) ─── */
  "orders.paymentHeading": { ar: "الدفع", en: "Payment" },
  "orders.payStatusFailed": {
    ar: "تعذّر جلب حالة الدفع — أعد المحاولة",
    en: "Couldn't fetch payment status — retry",
  },
  "orders.paidConfirmed": {
    ar: "تم تأكيد دفعتك عبر بوابة الدفع — لا حاجة لأي دفع إضافي، ويمكنك متابعة الطلب كالمعتاد.",
    en: "Your payment was confirmed via the gateway — no further payment needed; continue with your order as usual.",
  },
  "orders.payNowHint": {
    ar: "ادفع قيمة الطلب الآن بأمان عبر مويسر (بطاقة أو Apple Pay) — الدفع الإلكتروني اختياري حتى لو اخترت الكاش عند الاستلام.",
    en: "Pay for your order securely now via Moyasar (card or Apple Pay) — electronic payment is optional even if you chose cash on delivery.",
  },
  "orders.payNowElectronic": { ar: "ادفع الآن إلكترونيًا", en: "Pay now electronically" },

  /* ─── معلومات الطلب ─── */
  "orders.infoAria": { ar: "معلومات التوصيل والدفع", en: "Delivery & payment info" },
  "orders.infoHeading": { ar: "معلومات الطلب", en: "Order information" },
  "orders.dateLabel": { ar: "تاريخ الطلب", en: "Order date" },
  "orders.notesLabel": { ar: "ملاحظات", en: "Notes" },

  /* ─── بطاقة التتبّع المنقحة ─── */
  "orders.codeCopied": { ar: "تم نسخ كود التسليم", en: "Delivery code copied" },
  "orders.copyManually": { ar: "انسخ الكود يدوياً", en: "Copy the code manually" },
  "orders.codeHeading": {
    ar: "كود التسليم — اقرأه للمندوب عند وصوله لبابك",
    en: "Delivery code — read it to the courier at your door",
  },
  "orders.codeAria": {
    ar: "كود التسليم {code} — انقر لنسخه",
    en: "Delivery code {code} — tap to copy",
  },
  "orders.tapToCopy": { ar: "انقر لنسخ الكود", en: "Tap to copy the code" },
  "orders.duration": { ar: "مدة التوصيل: {minutes} دقيقة", en: "Delivery time: {minutes} min" },
};
