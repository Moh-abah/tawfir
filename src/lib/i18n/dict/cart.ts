import type { DictEntry } from "@/lib/i18n/index";

/**
 * cartDict — مفاتيح مجموعة «cart» (السلة + Checkout + التوصيل) — بصمة 40-c.
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 * عقد «الدفع أولاً» محفوظ في الترجمات: زر الدفع الإلكتروني ينقل لشاشة
 * الدفع فوراً ولا يُعلن استلام الطلب إلا بعد إتمام الدفع (payment.*).
 */
export const cartDict: Record<string, DictEntry> = {
  /* ─── عناوين وأقسام ─── */
  "cart.title": { ar: "سلة الطلبات", en: "Cart" },
  "cart.orderNow": { ar: "اطلب الآن", en: "Order now" },
  "cart.completeDetails": {
    ar: "أكمل بياناتك لتأكيد الطلب",
    en: "Complete your details to confirm the order",
  },
  "cart.mealSummary": { ar: "ملخص الوجبة", en: "Meal summary" },
  "cart.orderDetails": { ar: "بيانات الطلب", en: "Order details" },
  "cart.invoiceSummary": { ar: "ملخص الفاتورة", en: "Invoice summary" },
  "cart.qtySection": { ar: "اختيار الكمية", en: "Quantity" },
  "cart.quantity": { ar: "الكمية", en: "Quantity" },
  "cart.pricingSection": { ar: "حساب السعر", en: "Price breakdown" },
  "cart.notesSection": { ar: "ملاحظات الطلب", en: "Order notes" },

  /* ─── حالة المنتج والكميات ─── */
  "cart.soldOut": { ar: "نفد", en: "Sold out" },
  "cart.available": { ar: "متوفر", en: "Available" },
  "cart.qtyAvailable": { ar: "الكمية: {count}", en: "In stock: {count}" },
  "cart.decreaseQty": { ar: "إنقاص الكمية", en: "Decrease quantity" },
  "cart.increaseQty": { ar: "زيادة الكمية", en: "Increase quantity" },
  "cart.removeItem": { ar: "حذف {name} من السلة", en: "Remove {name} from the cart" },
  "cart.perUnit": { ar: "/ للوحدة", en: "/ unit" },
  "cart.lineTotal": { ar: "المجموع", en: "Total" },
  "cart.unavailableNow": { ar: "غير متوفر حالياً", en: "Not available right now" },

  /* ─── الفاتورة والمبالغ ─── */
  "cart.unitPrice": { ar: "سعر الوحدة", en: "Unit price" },
  "cart.originalPrice": { ar: "السعر الأصلي", en: "Original price" },
  "cart.subtotal": { ar: "الإجمالي الفرعي", en: "Subtotal" },
  "cart.subtotalPlain": { ar: "المجموع الفرعي", en: "Subtotal" },
  "cart.total": { ar: "الإجمالي", en: "Total" },
  "cart.plusFee": { ar: "{subtotal} + الأجرة", en: "{subtotal} + delivery fee" },
  "cart.plusFeeSuffix": { ar: "+ الأجرة", en: "+ fee" },
  "cart.deliveryFee": { ar: "أجرة التوصيل", en: "Delivery fee" },
  "cart.deliveryFeeLabel": { ar: "رسوم التوصيل", en: "Delivery fee" },
  "cart.feeByDistance": {
    ar: "تُحسب حسب المسافة عند التأكيد",
    en: "Calculated by distance at confirmation",
  },
  "cart.feeAfterLocation": {
    ar: "تُحسب حسب المسافة بعد تحديد موقعك",
    en: "Calculated by distance once your location is set",
  },
  "cart.feeAtConfirm": {
    ar: "تُحسب عند تأكيد الطلب",
    en: "Calculated at order confirmation",
  },
  "cart.calculatingFee": { ar: "جارٍ حساب الأجرة…", en: "Calculating the fee…" },
  "cart.calculatingFeeDistance": {
    ar: "جارٍ حساب الأجرة من مسافة موقعك…",
    en: "Calculating the fee from your location…",
  },
  "cart.feeEstimateFailed": {
    ar: "تعذّر حساب الأجرة الآن — ستُحسب بدقة عند تأكيد الطلب",
    en: "Couldn't estimate the fee now — it will be calculated precisely at confirmation",
  },
  "cart.estimatedFee": {
    ar: "أجرة التوصيل التقديرية: {fee}",
    en: "Estimated delivery fee: {fee}",
  },
  "cart.loadLocationForEstimate": {
    ar: "حمّل موقعك لعرض تقدير أجرة التوصيل",
    en: "Load your location to see the delivery fee estimate",
  },
  "cart.estimateDisclaimer": {
    ar: "تقدير استرشادي — الحساب النهائي عند تأكيد الطلب",
    en: "Indicative estimate — the final calculation happens at confirmation",
  },
  "cart.outOfRange": {
    ar: "{distance} — خارج نطاق التوصيل (الحد الأقصى {max} كم)",
    en: "{distance} — outside the delivery range (max {max} km)",
  },
  "cart.impreciseAddress": { ar: "عنوان غير محدد بدقة", en: "Imprecise address" },
  "cart.serverConfirmed": {
    ar: "الإجمالي النهائي يؤكده الخادم عند إنشاء الطلب",
    en: "The final total is confirmed by the server when the order is created",
  },
  "cart.facilityDiscountNote": {
    ar: "خصم المنشأة (إن فعّلها التاجر) يُطبَّق تلقائياً عند تأكيد الطلب",
    en: "The facility discount (if enabled by the merchant) applies automatically at confirmation",
  },
  "cart.facilityDiscountNoteServer": {
    ar: "خصم المنشأة (إن فعّلها التاجر) يُطبَّق من الخادم عند تأكيد الطلب — والإجمالي النهائي من رد الطلب",
    en: "The facility discount (if enabled by the merchant) is applied by the server at confirmation — the final total comes from the order response",
  },
  "cart.originalTotalOne": {
    ar: "المجموع الأصلي ({count} صنف)",
    en: "Original total ({count} item)",
  },
  "cart.originalTotalMany": {
    ar: "المجموع الأصلي ({count} أصناف)",
    en: "Original total ({count} items)",
  },
  "cart.handoverNoFee": {
    ar: "استلام من المتجر — بلا أجرة",
    en: "Store pickup — no delivery fee",
  },
  "cart.termsNote": {
    ar: "بالضغط على «تأكيد الطلب» أنت توافق على شروط الاستخدام وسياسة الخصوصية.",
    en: "By tapping “Confirm order” you agree to the Terms of Use and Privacy Policy.",
  },

  /* ─── العروض الخاصة والعضوية ─── */
  "cart.specialOffer": { ar: "عرض خاص — خصم {rate}%", en: "Special offer — {rate}% off" },
  "cart.membershipDiscountExtra": {
    ar: "+ خصم عضوية {rate}%",
    en: "+ {rate}% membership discount",
  },
  "cart.offerDiscount": { ar: "خصم العرض الخاص", en: "Special offer discount" },
  "cart.membershipDiscount": { ar: "خصم العضوية", en: "Membership discount" },
  "cart.upsellText": {
    ar: "اشترك في عضوية توفير لخصم حصري",
    en: "Subscribe to Tawfir membership for an exclusive discount",
  },
  "cart.subscribe": { ar: "اشترك", en: "Subscribe" },
  "cart.membershipUpsell": { ar: "اشترك بالعضوية ووفّر أكثر", en: "Subscribe and save more" },
  "cart.membershipUpsellDesc": {
    ar: "خصومات حصرية على كل وجباتك من المتاجر المشتركة.",
    en: "Exclusive discounts on every meal from member stores.",
  },

  /* ─── أزرار التأكيد (عقد «الدفع أولاً») ─── */
  "cart.confirmOrder": { ar: "تأكيد الطلب", en: "Confirm order" },
  "cart.confirmWithTotal": {
    ar: "تأكيد الطلب — {total}",
    en: "Confirm order — {total}",
  },
  "cart.confirmWallet": {
    ar: "تأكيد الطلب والدفع بالمحفظة",
    en: "Confirm order & pay by wallet",
  },
  "cart.payElectronic": {
    ar: "الدفع الإلكتروني وإتمام الطلب",
    en: "Pay electronically & complete order",
  },
  "cart.preparingPay": {
    ar: "جارٍ تجهيز شاشة الدفع...",
    en: "Preparing the payment screen…",
  },
  "cart.sending": { ar: "جارٍ إرسال الطلب...", en: "Sending your order…" },
  "cart.sendingShort": { ar: "جارٍ الإرسال...", en: "Sending…" },
  "cart.confirming": { ar: "جارٍ التأكيد...", en: "Confirming…" },
  "cart.electronicNote": {
    ar: "تُفتح شاشة الدفع الآمنة (مويسر) لإدخال بيانات بطاقتك — يُستلم طلبك بعد إتمام الدفع",
    en: "The secure payment screen (Moyasar) opens for your card details — your order is received only after payment is completed",
  },

  /* ─── أخطاء النموذج ─── */
  "cart.writeAddress": {
    ar: "اكتب عنوانك النصي المختصر — يساعد المندوب عند وصوله لبابك",
    en: "Write your short text address — it helps the courier reach your door",
  },
  "cart.writeAddressShort": {
    ar: "اكتب عنوانك النصي المختصر لإتمام الطلب",
    en: "Write your short text address to complete the order",
  },
  "cart.missingLocation": {
    ar: "حمّل موقعك أولاً — المندوب يحتاجه لإيصال طلبك",
    en: "Load your location first — the courier needs it to deliver your order",
  },
  "cart.requiresInternet": {
    ar: "يتطلب هذا الإجراء اتصالاً بالإنترنت.",
    en: "This action requires an internet connection.",
  },
  "cart.orderFailed": {
    ar: "تعذّر إتمام الطلب. حاول مرة أخرى.",
    en: "Couldn't complete the order. Please try again.",
  },
  "cart.pickWallet": {
    ar: "اختر محفظة الدفع أولاً — من قائمة محافظ المتجر",
    en: "Choose a payment wallet first — from the store's wallet list",
  },
  "cart.pickWalletNote": {
    ar: "اختر محفظة المتجر لإتمام الدفع بالتحويل",
    en: "Choose the store wallet to complete the transfer payment",
  },

  /* ─── النجاح والسلة الفارغة ─── */
  "cart.toastReceived": {
    ar: "تم استلام طلبك بنجاح #{id}",
    en: "Your order has been received — #{id}",
  },
  "cart.toastReceivedShort": {
    ar: "تم استلام طلبك بنجاح",
    en: "Your order has been received",
  },
  "cart.orderReceived": { ar: "تم استلام طلبك", en: "Your order has been received" },
  "cart.successBody": {
    ar: "تابع حالة طلبك في صفحة طلباتي. سنُحدّث الحالة لحظياً عند تأكيد المتجر وتحضير الطلب ووصوله إليك.",
    en: "Follow your order in My Orders — its status updates live as the store confirms, prepares, and delivers it.",
  },
  "cart.successBodyLive": {
    ar: "تابع حالة طلبك لحظياً — سنُحدّثها عند تأكيد المتجر وتحضير الطلب ووصوله إليك.",
    en: "Follow your order status live — updated as the store confirms, prepares, and delivers it.",
  },
  "cart.cashSuccessBody": {
    ar: "ستظهر حالة طلبك في صفحة طلباتي. تابع الاستلام لإتمام الطلب عند وصوله.",
    en: "Your order status appears in My Orders. Keep receiving updates until it arrives.",
  },
  "cart.completeWalletNow": {
    ar: "أكمل الدفع الآن: حوّل المبلغ إلى محفظة المتجر وارفع صورة إشعار التحويل.",
    en: "Complete payment now: transfer the amount to the store wallet and upload the receipt photo.",
  },
  "cart.walletLastStep": { ar: "خطوة أخيرة — إتمام الدفع", en: "Last step — complete payment" },
  "cart.walletTransfer": {
    ar: "حوّل المبلغ المطلوب ({amount}) إلى محفظة المتجر من شاشة الدفع، ثم ارفع صورة إشعار التحويل.",
    en: "Transfer the amount ({amount}) to the store wallet from the payment screen, then upload a photo of the transfer receipt.",
  },
  "cart.goToPayment": { ar: "الذهاب لشاشة الدفع", en: "Go to payment screen" },
  "cart.later": { ar: "لاحقاً — من صفحة طلباتي", en: "Later — from My Orders" },
  "cart.trackOrder": { ar: "تتبّع الطلب", en: "Track order" },
  "cart.backHome": { ar: "العودة للرئيسية", en: "Back to home" },
  "cart.browseMore": { ar: "تصفّح المزيد", en: "Browse more" },
  "cart.emptyShort": { ar: "سلتك فارغة حالياً", en: "Your cart is empty right now" },
  "cart.emptyTitle": { ar: "سلتك فارغة", en: "Your cart is empty" },
  "cart.emptyDesc": {
    ar: "أضف وجباتك المفضلة من المتاجر بالضغط على أيقونة السلة في كل وجبة، ثم أكمل الطلب دفعة واحدة.",
    en: "Add your favourite meals from stores by tapping the cart icon on any meal, then complete your order in one go.",
  },
  "cart.emptyPageDesc": {
    ar: "أضف وجباتك المفضلة من المتاجر بالضغط على أيقونة السلة في كل وجبة، ثم أكمل الطلب دفعة واحدة من هنا.",
    en: "Add your favourite meals from stores by tapping the cart icon on any meal, then complete your order in one go from here.",
  },
  "cart.browseMeals": { ar: "تصفّح الوجبات", en: "Browse meals" },
  "cart.browseStores": { ar: "تصفّح المتاجر", en: "Browse stores" },
  "cart.specialOffers": { ar: "العروض الخاصة", en: "Special offers" },

  /* ─── إدارة السلة ─── */
  "cart.clear": { ar: "إفراغ", en: "Clear" },
  "cart.clearAria": { ar: "إفراغ السلة", en: "Clear the cart" },
  "cart.clearAllAria": { ar: "إفراغ السلة كاملة", en: "Clear the entire cart" },
  "cart.clearedToast": { ar: "تم إفراغ السلة", en: "Cart cleared" },
  "cart.visitStore": { ar: "زيارة المتجر", en: "Visit store" },
  "cart.loginNote": {
    ar: "سجّل الدخول لإتمام الطلب — ستبقى أصناف سلتك محفوظة كما هي.",
    en: "Sign in to complete the order — your cart items stay saved as they are.",
  },
  "cart.itemsFromOne": {
    ar: "{count} صنف من {facility}",
    en: "{count} item from {facility}",
  },
  "cart.itemsFromMany": {
    ar: "{count} أصناف من {facility}",
    en: "{count} items from {facility}",
  },
  "cart.itemsInCartOne": {
    ar: "{count} صنف في السلة",
    en: "{count} item in the cart",
  },
  "cart.itemsInCartMany": {
    ar: "{count} أصناف في السلة",
    en: "{count} items in the cart",
  },
  "cart.viewCartAria": {
    ar: "عرض السلة — {count} أصناف",
    en: "View cart — {count} items",
  },
  "cart.yourCart": { ar: "سلتك", en: "Your cart" },
  "cart.completeOrderOne": {
    ar: "{count} صنف — أكمل الطلب",
    en: "{count} item — complete your order",
  },
  "cart.completeOrderMany": {
    ar: "{count} أصناف — أكمل الطلب",
    en: "{count} items — complete your order",
  },
  "cart.cartBadgeAria": { ar: "السلة — {count} أصناف", en: "Cart — {count} items" },

  /* ─── طريقة الاستلام والموقع (DeliveryFields) ─── */
  "cart.receiveMethod": { ar: "طريقة الاستلام", en: "Receiving method" },
  "cart.delivery": { ar: "توصيل", en: "Delivery" },
  "cart.deliveryDefault": {
    ar: "الافتراضي — المندوب يوصل إليك",
    en: "Default — the courier brings it to you",
  },
  "cart.handover": { ar: "تسليم يدوي", en: "Handover" },
  "cart.handoverHint": { ar: "استلام من المتجر", en: "Pick up from the store" },
  "cart.deliveryLocation": { ar: "موقع التوصيل", en: "Delivery location" },
  "cart.notRequiredHandover": {
    ar: "غير مطلوب — استلام من المتجر",
    en: "Not required — store pickup",
  },
  "cart.locationLoaded": { ar: "موقعك محمّل", en: "Location loaded" },
  "cart.fullAddress": { ar: "العنوان التفصيلي", en: "Detailed address" },
  "cart.addressOptionalHandover": {
    ar: "(اختياري في الاستلام من المتجر)",
    en: "(optional for store pickup)",
  },
  "cart.addressPlaceholder": {
    ar: "الحي، الشارع، أقرب نقطة دالة...",
    en: "District, street, nearest landmark…",
  },
  "cart.addressRequiredNote": {
    ar: "العنوان النصي مختصراً إلزامي — يساعد المندوب عند وصوله لبابك",
    en: "A short text address is required — it helps the courier reach your door",
  },

  /* ─── طريقة الدفع (DeliveryFields) ─── */
  "cart.paymentMethod": { ar: "طريقة الدفع", en: "Payment method" },
  "cart.payCash": { ar: "الدفع عند الاستلام (كاش)", en: "Cash on delivery" },
  "cart.payElectronicLabel": {
    ar: "دفع إلكتروني (بطاقة/Apple Pay)",
    en: "Electronic payment (card / Apple Pay)",
  },
  "cart.electronicOptionHint": {
    ar: "تُفتح شاشة الدفع الآمنة لإدخال بيانات بطاقتك — يُستلم طلبك بعد إتمام الدفع",
    en: "The secure payment screen opens for your card details — your order is received only after payment is completed",
  },
  "cart.payWallet": { ar: "محفظة / تحويل يدوي", en: "Wallet / manual transfer" },
  "cart.walletHint": {
    ar: "حوّل من محفظتك وارفع صورة الإشعار",
    en: "Transfer from your wallet and upload the receipt photo",
  },
  "cart.chooseWallet": {
    ar: "اختر محفظة المتجر التي ستحوّل إليها",
    en: "Choose the store wallet to transfer to",
  },
  "cart.notes": { ar: "ملاحظات (اختياري)", en: "Notes (optional)" },
  "cart.notesPlaceholder": { ar: "مثلاً: بلا فلفل حار...", en: "e.g., no hot peppers…" },
};
