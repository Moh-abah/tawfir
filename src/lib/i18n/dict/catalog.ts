import type { DictEntry } from "@/lib/i18n/index";

/**
 * catalogDict — مفاتيح مجموعة «catalog» (المتاجر/المنتج/البحث/العروض/الفلاتر/التقييمات).
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 */
export const catalogDict: Record<string, DictEntry> = {
  /* ── أنواع المنشآت (بديل لغوي-واعٍ لـ TYPE_LABEL داخل ملفات هذه المجموعة) ── */
  "catalog.type.restaurant": { ar: "مطعم", en: "Restaurant" },
  "catalog.type.cafe": { ar: "مقهى", en: "Café" },
  "catalog.type.cafeteria": { ar: "كافتيريا", en: "Cafeteria" },

  /* ── كارت الوجبة (ProductCard) ── */
  "catalog.product.soldOut": { ar: "نفد", en: "Sold out" },
  "catalog.product.available": { ar: "متوفر", en: "In stock" },
  "catalog.product.qty": { ar: "الكمية: {count}", en: "Qty: {count}" },
  "catalog.product.outRibbon": { ar: "نفدت الكمية", en: "Out of stock" },
  "catalog.product.memberBadge": { ar: "عضو", en: "Member" },
  "catalog.product.memberBadgeAria": { ar: "عضو توفير", en: "Tawfir member" },
  "catalog.product.km": { ar: "{km} كم", en: "{km} km" },
  "catalog.product.detailsAria": {
    ar: "تفاصيل {name}",
    en: "{name} details",
  },
  "catalog.product.zoomAria": {
    ar: "تكبير صورة {name}",
    en: "Zoom {name}'s photo",
  },
  "catalog.product.orderAria": { ar: "اطلب {name}", en: "Order {name}" },
  "catalog.product.soldOutAria": {
    ar: "نفد {name}",
    en: "{name} is sold out",
  },

  /* ── حواجز الدخول المشتركة (طلب/سلة) ── */
  "catalog.auth.loginTitle": { ar: "سجّل الدخول أولاً", en: "Sign in first" },
  "catalog.auth.loginDesc": {
    ar: "يجب تسجيل الدخول لإتمام الطلب.",
    en: "You need to sign in to complete your order.",
  },

  /* ── زر السلة (AddToCartButton) ── */
  "catalog.cart.addAria": { ar: "أضف {name} للسلة", en: "Add {name} to cart" },
  "catalog.cart.inCartAria": {
    ar: "{name} في السلة ({count})",
    en: "{name} in cart ({count})",
  },
  "catalog.cart.title": { ar: "أضف للسلة", en: "Add to cart" },
  "catalog.cart.inCartTitle": { ar: "في السلة: {count}", en: "In cart: {count}" },
  "catalog.cart.replaceTitle": {
    ar: "السلة فيها أصناف من متجر آخر",
    en: "Your cart has items from another store",
  },
  "catalog.cart.replaceDesc": {
    ar: "لا يمكن إضافة وجبات من متجرين في طلب واحد. هل تريد إفراغ السلة وإضافة «{name}» من «{facility}»؟",
    en: "You can't order meals from two stores in one order. Empty the cart and add “{name}” from “{facility}”?",
  },
  "catalog.cart.replaceConfirm": {
    ar: "نعم، استبدل السلة",
    en: "Yes, replace cart",
  },
  "catalog.cart.loginDesc": {
    ar: "أضف للسلة وأكمل الطلب بعد تسجيل الدخول.",
    en: "Add to cart and complete your order after signing in.",
  },
  "catalog.cart.unavailableTitle": { ar: "غير متوفر", en: "Unavailable" },
  "catalog.cart.unavailableDesc": {
    ar: "هذه الوجبة نفدت من المخزون حالياً.",
    en: "This meal is currently out of stock.",
  },

  /* ── كارت العرض الخاص (SpecialOfferCard) ── */
  "catalog.offer.ended": { ar: "انتهى", en: "Ended" },
  "catalog.offer.soldOutAria": {
    ar: "{title} — نفدت الكمية",
    en: "{title} — sold out",
  },
  "catalog.offer.orderAria": {
    ar: "اطلب {title} الآن بسعر العضو",
    en: "Order {title} now at the member price",
  },
  "catalog.offer.discount": { ar: "خصم {rate}%", en: "{rate}% off" },
  "catalog.offer.badge": { ar: "عرض خاص", en: "Special offer" },
  "catalog.offer.remaining": { ar: "متبقي {count}", en: "{count} left" },

  /* ── قائمة المتاجر (FacilitiesList) ── */
  "catalog.storesList.errorTitle": {
    ar: "تعذّر تحميل المتاجر",
    en: "Couldn't load stores",
  },
  "catalog.storesList.errorDesc": {
    ar: "حدث خطأ أثناء جلب المطاعم والكافتيريات والمرافق. حاول مرة أخرى.",
    en: "Something went wrong while fetching restaurants, cafeterias and stores. Please try again.",
  },
  "catalog.storesList.emptyTitle": {
    ar: "لا توجد متاجر في هذه المنطقة",
    en: "No stores in this area",
  },
  "catalog.storesList.emptyDesc": {
    ar: "ترقّب المزيد من المطاعم والكافتيريات والمرافق قريبًا.",
    en: "More restaurants, cafeterias and stores are coming soon.",
  },

  /* ── صفحة المتاجر (FacilitiesContent) ── */
  "catalog.facilities.title": { ar: "المتاجر", en: "Stores" },
  "catalog.facilities.searchPlaceholder": {
    ar: "ابحث عن متجر...",
    en: "Search for a store...",
  },
  "catalog.facilities.filterAll": { ar: "الكل", en: "All" },
  "catalog.facilities.filterRestaurants": { ar: "مطاعم", en: "Restaurants" },
  "catalog.facilities.filterCafeterias": { ar: "كافتيريات", en: "Cafeterias" },
  "catalog.facilities.sortDefault": { ar: "الافتراضي", en: "Default" },
  "catalog.facilities.sortNewest": { ar: "الأحدث", en: "Newest" },
  "catalog.facilities.sortAlpha": { ar: "الأبجدي", en: "A–Z" },
  "catalog.facilities.productCount": { ar: "{count} منتج", en: "{count} items" },
  "catalog.facilities.discount": { ar: "خصم {rate}%", en: "{rate}% off" },
  "catalog.facilities.viewProducts": { ar: "عرض المنتجات", en: "View products" },
  "catalog.facilities.noResultsTitle": { ar: "لا توجد نتائج", en: "No results" },
  "catalog.facilities.noResultsDesc": {
    ar: "جرّب تغيير كلمة البحث أو اختر فلترًا مختلفًا للعثور على ما تبحث عنه",
    en: "Try a different search term or filter to find what you're looking for",
  },
  "catalog.facilities.removeSearchAria": {
    ar: "حذف البحث: {term}",
    en: "Delete search: {term}",
  },
  "catalog.facilities.clearAll": { ar: "مسح الكل", en: "Clear all" },
  "catalog.facilities.errorTitle": {
    ar: "تعذّر تحميل المتاجر",
    en: "Couldn't load stores",
  },
  "catalog.facilities.errorDesc": {
    ar: "حدث خطأ أثناء جلب المتاجر",
    en: "Something went wrong while fetching stores",
  },
  "catalog.facilities.selectRegionTitle": {
    ar: "اختر منطقة لعرض المتاجر",
    en: "Choose an area to see stores",
  },
  "catalog.facilities.selectRegionDesc": {
    ar: "حدد منطقتك من القائمة أعلى الصفحة",
    en: "Pick your area from the list at the top of the page",
  },
  "catalog.facilities.emptyTitle": {
    ar: "لا توجد متاجر في هذه المنطقة",
    en: "No stores in this area",
  },
  "catalog.facilities.emptyDesc": {
    ar: "ترقّب المزيد من المتاجر قريبًا",
    en: "More stores are coming soon",
  },
  "catalog.facilities.resultsCount": {
    ar: "{count} متجر",
    en: "{count} stores",
  },

  /* ── صفحة تفاصيل المتجر (FacilityDetailContent) ── */
  "catalog.facility.detailsTitle": { ar: "تفاصيل المتجر", en: "Store details" },
  "catalog.facility.copyOk": { ar: "تم نسخ الرابط", en: "Link copied" },
  "catalog.facility.copyFail": {
    ar: "تعذّر نسخ الرابط",
    en: "Couldn't copy the link",
  },
  "catalog.facility.unavailable": {
    ar: "غير متاح حاليا",
    en: "Currently unavailable",
  },
  "catalog.facility.order": { ar: "اطلب", en: "Order" },
  "catalog.facility.noProductsYetTitle": {
    ar: "لا توجد منتجات بعد",
    en: "No products yet",
  },
  "catalog.facility.noProductsYetDesc": {
    ar: "هذا المتجر لم يضف أي منتجات حتى الآن. ترقّب التحديثات القادمة!",
    en: "This store hasn't added any products yet. Stay tuned!",
  },
  "catalog.facility.breadcrumbsAria": { ar: "مسار التصفح", en: "Breadcrumb" },
  "catalog.facility.report.inappropriate": {
    ar: "محتوى غير لائق",
    en: "Inappropriate content",
  },
  "catalog.facility.report.wrongInfo": {
    ar: "معلومات خاطئة",
    en: "Incorrect information",
  },
  "catalog.facility.report.closed": { ar: "متجر مغلق", en: "Closed store" },
  "catalog.facility.report.other": { ar: "أخرى", en: "Other" },
  "catalog.facility.report.ok": {
    ar: "تم إرسال البلاغ بنجاح. شكرًا لك",
    en: "Report submitted successfully. Thank you",
  },
  "catalog.facility.report.title": { ar: "إبلاغ عن متجر", en: "Report a store" },
  "catalog.facility.report.desc": {
    ar: "سيتم مراجعة البلاغ واتخاذ الإجراء المناسب",
    en: "Your report will be reviewed and the right action taken",
  },
  "catalog.facility.report.type": { ar: "نوع البلاغ", en: "Report type" },
  "catalog.facility.report.typePlaceholder": {
    ar: "اختر نوع البلاغ",
    en: "Choose a report type",
  },
  "catalog.facility.report.details": {
    ar: "تفاصيل البلاغ",
    en: "Report details",
  },
  "catalog.facility.report.placeholder": {
    ar: "اشرح المشكلة التي واجهتها...",
    en: "Describe the issue you faced...",
  },
  "catalog.facility.report.sending": { ar: "جارٍ الإرسال...", en: "Sending..." },
  "catalog.facility.report.submit": { ar: "إرسال البلاغ", en: "Submit report" },
  "catalog.facility.loadErrorTitle": {
    ar: "تعذّر تحميل المتجر",
    en: "Couldn't load the store",
  },
  "catalog.facility.loadErrorDesc": {
    ar: "حدث خطأ أثناء جلب بيانات المتجر",
    en: "Something went wrong while fetching store details",
  },
  "catalog.facility.notFoundTitle": {
    ar: "المتجر غير موجود",
    en: "Store not found",
  },
  "catalog.facility.notFoundDesc": {
    ar: "لم نتمكن من العثور على هذا المتجر",
    en: "We couldn't find this store",
  },
  "catalog.facility.backToStores": {
    ar: "العودة للمتاجر",
    en: "Back to stores",
  },
  "catalog.facility.backToStoresList": {
    ar: "العودة لقائمة المتاجر",
    en: "Back to all stores",
  },
  "catalog.facility.openInMaps": { ar: "افتح في الخرائط", en: "Open in Maps" },
  "catalog.facility.favAdded": {
    ar: "تمت الإضافة للمفضلة",
    en: "Added to favorites",
  },
  "catalog.facility.favRemoved": {
    ar: "تمت الإزالة من المفضلة",
    en: "Removed from favorites",
  },
  "catalog.facility.favInactive": { ar: "تفضيل", en: "Favorite" },
  "catalog.facility.favActive": { ar: "مفضلة", en: "Favorited" },
  "catalog.facility.favAddAria": {
    ar: "إضافة للمفضلة",
    en: "Add to favorites",
  },
  "catalog.facility.favRemoveAria": {
    ar: "إزالة من المفضلة",
    en: "Remove from favorites",
  },
  "catalog.facility.copyLink": { ar: "نسخ الرابط", en: "Copy link" },
  "catalog.facility.shareX": { ar: "مشاركة على X", en: "Share on X" },
  "catalog.facility.shareWhatsApp": {
    ar: "مشاركة عبر واتساب",
    en: "Share on WhatsApp",
  },
  "catalog.facility.report": { ar: "إبلاغ", en: "Report" },
  "catalog.facility.shareText": {
    ar: "تعرف على {name} على توفير",
    en: "Check out {name} on Tawfir",
  },
  "catalog.facility.defaultShareName": { ar: "هذا المتجر", en: "this store" },
  "catalog.facility.orderNow": { ar: "اطلب الآن", en: "Order now" },
  "catalog.facility.unavailableBtn": { ar: "غير متوفر", en: "Unavailable" },
  "catalog.facility.searchPlaceholder": {
    ar: "ابحث عن منتج...",
    en: "Search for a product...",
  },
  "catalog.facility.productsErrorTitle": {
    ar: "تعذّر تحميل المنتجات",
    en: "Couldn't load products",
  },
  "catalog.facility.productsErrorDesc": {
    ar: "حدث خطأ أثناء جلب المنتجات",
    en: "Something went wrong while fetching products",
  },
  "catalog.facility.noProductsTitle": { ar: "لا توجد منتجات", en: "No products" },
  "catalog.facility.noProductsDesc": {
    ar: "لا توجد منتجات متاحة في هذه الفئة حاليًا",
    en: "No products available in this category right now",
  },
  "catalog.facility.productsCount": {
    ar: "عدد المنتجات: {count}",
    en: "Products: {count}",
  },
  "catalog.facility.showMore": {
    ar: "عرض المزيد ({count} متبقٍ)",
    en: "Show more ({count} left)",
  },
  "catalog.facility.ctaMemberTitle": {
    ar: "خصومات حصرية مع عضوية توفير",
    en: "Exclusive discounts with a Tawfir membership",
  },
  "catalog.facility.ctaGuestTitle": {
    ar: "سجّل واحصل على خصومات حصرية",
    en: "Sign up for exclusive discounts",
  },
  "catalog.facility.ctaMemberDesc": {
    ar: "اشترك في العضوية واستمتع بالخصم الفوري على طلباتك",
    en: "Subscribe and enjoy instant discounts on your orders",
  },
  "catalog.facility.ctaGuestDesc": {
    ar: "أنشئ حساباً مجاناً واستمتع بالخصم الفوري",
    en: "Create a free account and enjoy instant discounts",
  },
  "catalog.facility.subscribe": { ar: "اشترك الآن", en: "Subscribe now" },
  "catalog.facility.register": { ar: "تسجيل", en: "Sign up" },
  "catalog.facility.quickViewAria": {
    ar: "عرض تفاصيل المنتج",
    en: "View product details",
  },

  /* ── صفحة تفاصيل الوجبة (ProductDetailContent) ── */
  "catalog.productDetails.title": { ar: "تفاصيل الوجبة", en: "Meal details" },
  "catalog.productDetails.infoTitle": {
    ar: "معلومات المطعم",
    en: "Restaurant info",
  },
  "catalog.productDetails.loadErrorTitle": {
    ar: "تعذّر تحميل الوجبة",
    en: "Couldn't load the meal",
  },
  "catalog.productDetails.loadErrorDesc": {
    ar: "حدث خطأ أثناء جلب تفاصيل الوجبة. حاول مرة أخرى.",
    en: "Something went wrong while fetching the meal. Please try again.",
  },
  "catalog.productDetails.notFoundTitle": {
    ar: "الوجبة غير موجودة",
    en: "Meal not found",
  },
  "catalog.productDetails.notFoundDesc": {
    ar: "لم نتمكن من العثور على هذه الوجبة. ربما حُذفت أو أن الرابط غير صحيح.",
    en: "We couldn't find this meal. It may have been removed or the link is incorrect.",
  },
  "catalog.productDetails.backHome": {
    ar: "العودة للرئيسية",
    en: "Back to home",
  },
  "catalog.productDetails.zoomHint": { ar: "تكبير", en: "Zoom" },
  "catalog.productDetails.zoomAria": {
    ar: "عرض صورة {name} ملء الشاشة",
    en: "View {name}'s photo in fullscreen",
  },
  "catalog.productDetails.shareAria": {
    ar: "مشاركة {name}",
    en: "Share {name}",
  },
  "catalog.productDetails.copiedTitle": {
    ar: "تم نسخ رابط الوجبة",
    en: "Meal link copied",
  },
  "catalog.productDetails.copiedDesc": {
    ar: "شاركه مع أصدقائك الآن",
    en: "Share it with your friends now",
  },
  "catalog.productDetails.copyFail": { ar: "تعذّر النسخ", en: "Couldn't copy" },
  "catalog.productDetails.shareText": {
    ar: "{name} — {facility} | تطبيق توفير",
    en: "{name} — {facility} | Tawfir app",
  },
  "catalog.productDetails.memberDiscount": {
    ar: "خصم {rate}% للأعضاء",
    en: "{rate}% off for members",
  },
  "catalog.productDetails.subscribeWithRate": {
    ar: "اشترك لخصم {rate}%",
    en: "Subscribe for {rate}% off",
  },
  "catalog.productDetails.subscribe": {
    ar: "اشترك لخصم حصري",
    en: "Subscribe for exclusive discounts",
  },
  "catalog.productDetails.descriptionTitle": { ar: "الوصف", en: "Description" },
  "catalog.productDetails.categoryTitle": { ar: "التصنيف", en: "Category" },
  "catalog.productDetails.unavailableNow": {
    ar: "غير متوفر حالياً",
    en: "Unavailable right now",
  },
  "catalog.productDetails.backToFacility": {
    ar: "العودة إلى {name}",
    en: "Back to {name}",
  },
  "catalog.productDetails.offerBadge": {
    ar: "عرض خاص — خصم {rate}%",
    en: "Special offer — {rate}% off",
  },
  "catalog.productDetails.offerEnded": { ar: "انتهى العرض", en: "Offer ended" },
  "catalog.productDetails.memberExtra": {
    ar: "+ خصم عضوية {rate}%",
    en: "+ {rate}% membership discount",
  },
  "catalog.productDetails.priceForMember": {
    ar: "السعر للعضو",
    en: "Member price",
  },
  "catalog.productDetails.priceNonMember": {
    ar: "السعر بدون عضوية",
    en: "Non-member price",
  },
  "catalog.productDetails.remainingQty": {
    ar: "الكمية المتبقية: {count}",
    en: "Remaining: {count}",
  },
  "catalog.productDetails.subscribeHint": {
    ar: "اشترك في عضوية توفير لتطبيق خصم إضافي على هذا العرض.",
    en: "Subscribe to Tawfir membership for an extra discount on this offer.",
  },

  /* ── قسم التقييمات (RatingsSection) ── */
  "catalog.ratings.aria": { ar: "تقييمات {name}", en: "Reviews of {name}" },
  "catalog.ratings.title": { ar: "التقييمات", en: "Reviews" },
  "catalog.ratings.count": { ar: "{count} تقييم", en: "{count} reviews" },
  "catalog.ratings.excellent": { ar: "تقييم ممتاز! 🌟", en: "Excellent rating! 🌟" },
  "catalog.ratings.veryGood": { ar: "تقييم جيد جداً", en: "Very good rating" },
  "catalog.ratings.good": { ar: "تقييم جيد", en: "Good rating" },
  "catalog.ratings.average": { ar: "تقييم متوسط", en: "Average rating" },
  "catalog.ratings.shareCta": {
    ar: "شارك تجربتك وساعد الآخرين في الاختيار",
    en: "Share your experience and help others choose",
  },
  "catalog.ratings.add": { ar: "أضف تقييمك", en: "Add your review" },
  "catalog.ratings.emptyTitle": {
    ar: "لا توجد تقييمات بعد",
    en: "No reviews yet",
  },
  "catalog.ratings.emptyDesc": {
    ar: "كن أول من يقيّم هذا المنتج ومساعدة الآخرين في الاختيار",
    en: "Be the first to review this product and help others choose",
  },
  "catalog.ratings.yourRating": { ar: "تقييمك", en: "Your review" },
  "catalog.ratings.starsAria": { ar: "{count} نجوم", en: "{count} stars" },
  "catalog.ratings.commentPlaceholder": {
    ar: "اكتب تعليقك (اختياري)...",
    en: "Write your comment (optional)...",
  },
  "catalog.ratings.submit": { ar: "إرسال التقييم", en: "Submit review" },
  "catalog.ratings.pickStars": { ar: "اختر عدد النجوم", en: "Pick a star rating" },
  "catalog.ratings.thanks": { ar: "شكراً لتقييمك! ⭐", en: "Thanks for your review! ⭐" },
  "catalog.ratings.fail": {
    ar: "تعذّر إرسال التقييم",
    en: "Couldn't submit your review",
  },

  /* ── وجبات من نفس المتجر (SimilarMealsSection) ── */
  "catalog.similar.aria": {
    ar: "وجبات من نفس المتجر",
    en: "Meals from the same store",
  },
  "catalog.similar.title": { ar: "من نفس المتجر", en: "From the same store" },
  "catalog.similar.description": {
    ar: "وجبات أخرى من {name} قد تعجبك",
    en: "Other meals from {name} you might like",
  },
  "catalog.similar.viewMenu": { ar: "عرض قائمة المتجر", en: "View store menu" },

  /* ── البحث الموحّد (SearchContent) ── */
  "catalog.search.title": { ar: "البحث", en: "Search" },
  "catalog.search.tabAll": { ar: "الكل", en: "All" },
  "catalog.search.tabMeals": { ar: "وجبات", en: "Meals" },
  "catalog.search.tabStores": { ar: "متاجر", en: "Stores" },
  "catalog.search.tabOffers": { ar: "عروض", en: "Offers" },
  "catalog.search.placeholder": {
    ar: "ابحث عن وجبة أو متجر أو عرض...",
    en: "Search for a meal, store or offer...",
  },
  "catalog.search.aria": { ar: "البحث في توفير", en: "Search Tawfir" },
  "catalog.search.clearAria": { ar: "مسح البحث", en: "Clear search" },
  "catalog.search.tabsAria": { ar: "نوع نتائج البحث", en: "Result types" },
  "catalog.search.filters": { ar: "فلترة", en: "Filters" },
  "catalog.search.filtersAria": {
    ar: "تصفية النتائج وترتيبها",
    en: "Filter and sort results",
  },
  "catalog.search.recentTitle": { ar: "بحثك الأخير", en: "Recent searches" },
  "catalog.search.clearAll": { ar: "مسح الكل", en: "Clear all" },
  "catalog.search.removeAria": {
    ar: "إزالة {term} من البحث الأخير",
    en: "Remove {term} from recent searches",
  },
  "catalog.search.hintTitle": { ar: "ابحث في كل شيء", en: "Search everything" },
  "catalog.search.hintDesc": {
    ar: "وجباتك المفضلة، المطاعم والكافتيريات القريبة، وعروض توفير الحصرية — كلها من حقل بحث واحد.",
    en: "Your favorite meals, nearby restaurants and cafeterias, and exclusive Tawfir offers — all from one search box.",
  },
  "catalog.search.errorTitle": {
    ar: "تعذّر إكمال البحث",
    en: "Search couldn't complete",
  },
  "catalog.search.errorDesc": {
    ar: "حدث خطأ أثناء جلب النتائج. تحقّق من اتصالك وحاول مرة أخرى.",
    en: "Something went wrong while fetching results. Check your connection and try again.",
  },
  "catalog.search.sectionOffers": { ar: "عروض خاصة", en: "Special offers" },
  "catalog.search.resultsAria": { ar: "{count} نتيجة", en: "{count} results" },
  "catalog.search.noMealsMatch": {
    ar: "لا توجد وجبات تطابق «{query}» بفلاتر الحالية",
    en: "No meals match “{query}” with the current filters",
  },
  "catalog.search.noStoresMatch": {
    ar: "لا توجد متاجر تطابق «{query}» بفلاتر الحالية",
    en: "No stores match “{query}” with the current filters",
  },
  "catalog.search.noOffersMatch": {
    ar: "لا توجد عروض خاصة تطابق «{query}» حالياً",
    en: "No special offers match “{query}” right now",
  },
  "catalog.search.noResultsTitle": {
    ar: "لا نتائج لـ «{query}»",
    en: "No results for “{query}”",
  },
  "catalog.search.noResultsDesc": {
    ar: "جرّب كلمة أقصر أو تهجئة مختلفة — أو اكتشف المتاح الآن بالأسفل.",
    en: "Try a shorter keyword or different spelling — or discover what's available below.",
  },
  "catalog.search.suggestTitle": { ar: "جرّب البحث عن", en: "Try searching for" },
  "catalog.search.suggestAria": {
    ar: "اقتراحات بحث",
    en: "Search suggestions",
  },
  "catalog.search.availableNowTitle": {
    ar: "متاح الآن — قد يعجبك",
    en: "Available now — you might like",
  },
  "catalog.search.availableNowAria": {
    ar: "وجبات متاحة الآن",
    en: "Meals available now",
  },
  "catalog.search.noMealsTitle": {
    ar: "لا توجد وجبات مطابقة",
    en: "No matching meals",
  },
  "catalog.search.noMealsDesc": {
    ar: "لا توجد وجبات تطابق «{query}» بفلاتر البحث الحالية. جرّب كلمة أخرى أو خفّف الفلاتر.",
    en: "No meals match “{query}” with the current search filters. Try another keyword or relax the filters.",
  },
  "catalog.search.removeFilters": {
    ar: "إزالة الفلاتر",
    en: "Remove filters",
  },
  "catalog.search.noStoresTitle": {
    ar: "لا توجد متاجر مطابقة",
    en: "No matching stores",
  },
  "catalog.search.noStoresDesc": {
    ar: "لا توجد متاجر تطابق «{query}» في منطقتك الحالية.",
    en: "No stores match “{query}” in your current area.",
  },
  "catalog.search.allStores": { ar: "كل المتاجر", en: "All stores" },
  "catalog.search.noOffersTitle": {
    ar: "لا توجد عروض مطابقة",
    en: "No matching offers",
  },
  "catalog.search.noOffersDesc": {
    ar: "لا توجد عروض خاصة تطابق «{query}» حالياً — عُد لاحقاً لعروض جديدة.",
    en: "No special offers match “{query}” right now — check back for new offers.",
  },
  "catalog.search.allOffers": { ar: "كل العروض", en: "All offers" },
  "catalog.search.defaultType": { ar: "متجر", en: "Store" },

  /* ── Sheet فلاتر البحث (SearchFiltersSheet) ── */
  "catalog.filters.title": { ar: "تصفية النتائج", en: "Filter results" },
  "catalog.filters.description": {
    ar: "اشمل النتائج أو رتّبها بما يناسبك — الفلاتر تُطبَّق فوراً",
    en: "Narrow or sort the results your way — filters apply instantly",
  },
  "catalog.filters.sortTitle": { ar: "الترتيب", en: "Sort by" },
  "catalog.filters.sortAria": { ar: "خيارات الترتيب", en: "Sort options" },
  "catalog.filters.sortDefault": { ar: "الافتراضي", en: "Default" },
  "catalog.filters.sortPriceAsc": {
    ar: "السعر: الأقل أولاً",
    en: "Price: low to high",
  },
  "catalog.filters.sortPriceDesc": {
    ar: "السعر: الأعلى أولاً",
    en: "Price: high to low",
  },
  "catalog.filters.sortName": { ar: "الاسم أ–ي", en: "Name A–Z" },
  "catalog.filters.priceTitle": { ar: "نطاق السعر", en: "Price range" },
  "catalog.filters.priceAll": { ar: "كل الأسعار", en: "All prices" },
  "catalog.filters.priceLt500": { ar: "أقل من ٥٠٠", en: "Under 500" },
  "catalog.filters.priceRange": { ar: "٥٠٠ – ١٠٠٠", en: "500 – 1,000" },
  "catalog.filters.priceGt1000": { ar: "أكثر من ١٠٠٠", en: "Over 1,000" },
  "catalog.filters.priceHint": {
    ar: "الأسعار بالريال اليمني — النطاق يطبَّق على نتائج الوجبات",
    en: "Prices in Yemeni Rial — the range applies to meal results",
  },
  "catalog.filters.categoryTitle": { ar: "التصنيف", en: "Category" },
  "catalog.filters.catAll": { ar: "الكل", en: "All" },
  "catalog.filters.catRestaurants": { ar: "مطاعم", en: "Restaurants" },
  "catalog.filters.catCafeterias": { ar: "كافتيريات", en: "Cafeterias" },
  "catalog.filters.distanceTitle": { ar: "المسافة", en: "Distance" },
  "catalog.filters.distanceAll": { ar: "كل المسافات", en: "Any distance" },
  "catalog.filters.distanceLt2": { ar: "ضمن ٢ كم", en: "Within 2 km" },
  "catalog.filters.distanceLt5": { ar: "ضمن ٥ كم", en: "Within 5 km" },
  "catalog.filters.distanceHint": {
    ar: "تُطبَّق عند توفر بيانات الموقع للوجبات القريبة منك",
    en: "Applies when location data is available for meals near you",
  },
  "catalog.filters.availabilityTitle": { ar: "التوفر", en: "Availability" },
  "catalog.filters.availableOnly": { ar: "المتاح فقط", en: "Available only" },
  "catalog.filters.availableOnlyDesc": {
    ar: "إخفاء الوجبات النافدة من النتائج",
    en: "Hide sold-out meals from the results",
  },
  "catalog.filters.reset": { ar: "إعادة تعيين", en: "Reset" },
  "catalog.filters.showResults": { ar: "عرض النتائج", en: "Show results" },
  "catalog.filters.showResultsCount": {
    ar: "عرض {count} نتيجة",
    en: "Show {count} results",
  },

  /* ── صفحة العروض الخاصة (OffersContent) ── */
  "catalog.offers.title": { ar: "العروض الخاصة", en: "Special offers" },
  "catalog.offers.heading": { ar: "عروض حصرية", en: "Exclusive offers" },
  "catalog.offers.headingDesc": {
    ar: "خصومات إضافية لأعضاء توفير على وجباتك المفضلة — عُد للعروض الجديدة كل يوم.",
    en: "Extra discounts for Tawfir members on your favorite meals — check back every day for new offers.",
  },
  "catalog.offers.errorTitle": {
    ar: "تعذّر تحميل العروض",
    en: "Couldn't load offers",
  },
  "catalog.offers.errorDesc": {
    ar: "حدث خطأ أثناء جلب العروض الخاصة. حاول مرة أخرى.",
    en: "Something went wrong while fetching special offers. Please try again.",
  },
  "catalog.offers.emptyTitle": {
    ar: "لا توجد عروض حالياً",
    en: "No offers right now",
  },
  "catalog.offers.emptyDesc": {
    ar: "ترقّب عروضاً حصرية قريباً — نضيف عروضاً جديدة من مطاعمنا وكافتيرياتنا المشتركة باستمرار. فعّل الإشعارات لتصلك أولاً بأول 🔔",
    en: "Exclusive offers are on the way — we keep adding new offers from our partner restaurants and cafeterias. Turn on notifications to be the first to know 🔔",
  },
  "catalog.offers.browseMeals": { ar: "تصفّح الوجبات", en: "Browse meals" },
};
