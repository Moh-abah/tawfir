import type { DictEntry } from "@/lib/i18n/index";

/**
 * homeDict — مفاتيح مجموعة «home» (الرئيسية + البانر الترحيبي + منتقي المنطقة).
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 */
export const homeDict: Record<string, DictEntry> = {
  /* ── التصنيفات الدائرية (page.tsx) ── */
  "home.categories.all": { ar: "الكل", en: "All" },
  "home.categories.restaurants": { ar: "مطاعم", en: "Restaurants" },
  "home.categories.restaurant": { ar: "مطاعم", en: "Restaurants" },
  "home.categories.cafes": { ar: "مقاهي", en: "Cafés" },
  "home.categories.cafe": { ar: "مقاهي", en: "Cafés" },
  "home.categories.cafeterias": { ar: "كافتيريات", en: "Cafeterias" },
  "home.categories.cafeteria": { ar: "كافتيريات", en: "Cafeterias" },
  "home.categories.aria": {
    ar: "تصفية العروض حسب الفئة",
    en: "Filter offers by category",
  },

  /* ── قسم العضوية (Hero) ── */
  "home.hero.aria": { ar: "بطاقة العضوية", en: "Membership card" },

  /* ── قسم العروض الحصرية + البحث ── */
  "home.offers.aria": { ar: "أحدث الوجبات", en: "Latest meals" },
  "home.offers.title": { ar: "عروض حصرية", en: "Exclusive offers" },
  "home.offers.description": {
    ar: "اكتشف أحدث الوجبات من مطاعمنا وكافتيرياتنا المشتركة",
    en: "Discover the latest meals from our partner restaurants and cafeterias",
  },
  "home.offers.clearFilters": { ar: "إلغاء التصفية", en: "Clear filters" },
  "home.offers.errorTitle": { ar: "تعذّر تحميل العروض", en: "Couldn't load offers" },
  "home.offers.errorMessage": {
    ar: "حدث خطأ أثناء جلب الوجبات. حاول مرة أخرى.",
    en: "Something went wrong while fetching meals. Please try again.",
  },
  "home.search.placeholder": {
    ar: "ابحث عن وجبة بالاسم...",
    en: "Search meals by name...",
  },
  "home.search.aria": { ar: "البحث في الوجبات", en: "Search meals" },
  "home.recent.aria": { ar: "بحثك الأخير", en: "Recent searches" },
  "home.recent.removeAria": {
    ar: "إزالة {term} من البحث الأخير",
    en: "Remove {term} from recent searches",
  },

  /* ── حالات فراغ قسم العروض ── */
  "home.empty.title": { ar: "لا توجد وجبات مطابقة", en: "No matching meals" },
  "home.empty.searchDesc": {
    ar: "لا توجد وجبات تطابق «{query}». جرّب كلمة أخرى.",
    en: "No meals match “{query}”. Try another keyword.",
  },
  "home.empty.searchDescType": {
    ar: "لا توجد وجبات تطابق «{query}» في {type}. جرّب كلمة أخرى.",
    en: "No meals match “{query}” in {type}. Try another keyword.",
  },
  "home.empty.typeDesc": {
    ar: "لا توجد {type} متاحة الآن. جرّب فئة أخرى أو عُد لاحقاً.",
    en: "No {type} available right now. Try another category or check back later.",
  },
  "home.empty.defaultDesc": {
    ar: "ترقّب المزيد من الوجبات قريباً من مطاعمنا المشتركة.",
    en: "More meals from our partner restaurants are coming soon.",
  },
  "home.empty.showAll": { ar: "عرض كل الوجبات", en: "Show all meals" },
  "home.empty.searchStores": {
    ar: "ابحث في المتاجر والعروض",
    en: "Search stores and offers",
  },

  /* ── قسم الأقرب إليك ── */
  "home.nearby.aria": { ar: "الأقرب إليك", en: "Closest to you" },
  "home.nearby.title": { ar: "الأقرب إليك", en: "Closest to you" },
  "home.nearby.description": {
    ar: "وجبات على بُعد بضعة كيلومترات من موقعك الحالي",
    en: "Meals just a few kilometers from your current location",
  },
  "home.nearby.locate": { ar: "حدد موقعي", en: "Locate me" },
  "home.nearby.relocate": { ar: "إعادة تحديد الموقع", en: "Update my location" },
  "home.nearby.radiusAria": {
    ar: "نطاق البحث بالكيلومتر",
    en: "Search radius in kilometers",
  },
  "home.nearby.km": { ar: "{km} كم", en: "{km} km" },
  "home.nearby.enableHint": {
    ar: "اضغط «حدد موقعي» لعرض الوجبات الأقرب إليك مرتبة بالمسافة.",
    en: "Tap “Locate me” to see the closest meals sorted by distance.",
  },
  "home.nearby.unsupportedTitle": { ar: "غير مدعوم", en: "Not supported" },
  "home.nearby.unsupportedDesc": {
    ar: "متصفحك لا يدعم تحديد الموقع.",
    en: "Your browser doesn't support geolocation.",
  },
  "home.nearby.locatedTitle": { ar: "تم تحديد موقعك", en: "Location found" },
  "home.nearby.deniedDesc": {
    ar: "لم نتمكن من تحديد موقعك — يرجى السماح بالوصول إلى الموقع من إعدادات المتصفح.",
    en: "We couldn't get your location — allow location access in your browser settings.",
  },
  "home.nearby.unavailableDesc": {
    ar: "الموقع غير متاح حالياً — تحقّق من اتصالك بالشبكة أو حاول لاحقاً.",
    en: "Location is unavailable right now — check your connection or try again later.",
  },
  "home.nearby.timeoutDesc": {
    ar: "انتهت مهلة تحديد الموقع — حاول مرة أخرى.",
    en: "Getting your location timed out — please try again.",
  },
  "home.nearby.failDesc": {
    ar: "تعذّر تحديد موقعك. حاول مرة أخرى.",
    en: "Couldn't get your location. Please try again.",
  },
  "home.nearby.failTitle": {
    ar: "تعذّر تحديد موقعك",
    en: "Couldn't get your location",
  },
  "home.nearby.errorTitle": {
    ar: "تعذّر تحميل الوجبات القريبة",
    en: "Couldn't load nearby meals",
  },
  "home.nearby.errorMessage": {
    ar: "حدث خطأ أثناء جلب الوجبات من حولك. حاول مرة أخرى.",
    en: "Something went wrong while fetching meals around you. Please try again.",
  },
  "home.nearby.emptyTitle": { ar: "لا توجد وجبات قريبة", en: "No nearby meals" },
  "home.nearby.emptyDesc": {
    ar: "لا توجد وجبات متاحة في نطاق {km} كم من موقعك حالياً — جرّب توسيع النطاق.",
    en: "No meals available within {km} km of your location right now — try a wider radius.",
  },

  /* ── كارت المتجر في الرئيسية ── */
  "home.facility.discountUntil": {
    ar: "خصم حتى {rate}%",
    en: "Up to {rate}% off",
  },
  "home.facility.open": { ar: "مفتوح", en: "Open" },
  "home.facility.closed": { ar: "مغلق", en: "Closed" },
  "home.facility.openAria": { ar: "مفتوح الآن", en: "Open now" },
  "home.facility.closedAria": { ar: "مغلق حالياً", en: "Closed now" },
  "home.facility.favAdd": { ar: "إضافة للمفضلة", en: "Add to favorites" },
  "home.facility.favRemove": {
    ar: "إزالة من المفضلة",
    en: "Remove from favorites",
  },
  "home.facility.favLoginTitle": {
    ar: "سجّل الدخول للمفضلة",
    en: "Sign in to save favorites",
  },
  "home.facility.favLoginDesc": {
    ar: "المفضلة تتيح لك استقبال إشعارات العروض الجديدة",
    en: "Favorites let you receive alerts about new offers",
  },
  "home.facility.discount": { ar: "خصم {rate}%", en: "{rate}% off" },
  "home.facility.browse": { ar: "تصفّح المنتجات", en: "Browse products" },

  /* ── قسم المتاجر في الرئيسية ── */
  "home.stores.aria": { ar: "المتاجر", en: "Stores" },
  "home.stores.title": { ar: "المتاجر المشتركة", en: "Partner stores" },
  "home.stores.description": {
    ar: "استعرض المطاعم والكافتيريات المشتركة في منطقتك",
    en: "Browse the partner restaurants and cafeterias in your area",
  },
  "home.stores.errorTitle": {
    ar: "تعذّر تحميل المتاجر",
    en: "Couldn't load stores",
  },
  "home.stores.errorMessage": {
    ar: "حدث خطأ أثناء جلب المتاجر. حاول مرة أخرى.",
    en: "Something went wrong while fetching stores. Please try again.",
  },
  "home.stores.selectRegionTitle": {
    ar: "اختر منطقتك لعرض المتاجر",
    en: "Choose your area to see stores",
  },
  "home.stores.selectRegionDesc": {
    ar: "حدد منطقتك من القائمة في الأعلى لاستعراض المتاجر المشتركة قربك.",
    en: "Pick your area from the list above to browse partner stores near you.",
  },
  "home.stores.emptyTitle": {
    ar: "لا توجد متاجر في منطقتك بعد",
    en: "No stores in your area yet",
  },
  "home.stores.emptyDesc": {
    ar: "جرّب منطقة أخرى أو عُد لاحقاً — نضيف متاجر جديدة باستمرار.",
    en: "Try another area or check back later — we add new stores all the time.",
  },

  /* ── قسم العروض الخاصة (SpecialOffersSection) ── */
  "home.specialOffers.aria": { ar: "العروض الخاصة", en: "Special offers" },
  "home.specialOffers.title": { ar: "عروض خاصة", en: "Special offers" },
  "home.specialOffers.description": {
    ar: "خصومات إضافية لأعضاء توفير",
    en: "Extra discounts for Tawfir members",
  },

  /* ── قسم مفضلتي (FavoritesSection) ── */
  "home.favorites.aria": { ar: "مفضلتي", en: "My favorites" },
  "home.favorites.title": { ar: "مفضلتي", en: "My favorites" },
  "home.favorites.description": {
    ar: "وجباتك المفضلة — بلمسة واحدة",
    en: "Your favorite meals — one tap away",
  },
  "home.favorites.clear": { ar: "مسح الكل", en: "Clear all" },
  "home.favorites.clearAria": { ar: "مسح كل المفضلات", en: "Clear all favorites" },
  "home.favorites.loadingAria": {
    ar: "جارٍ تحميل المفضلة",
    en: "Loading favorites",
  },
  "home.favorites.goneDesc": {
    ar: "المنتجات التي أضفتها للمفضلة لم تعد متاحة الآن — أضف وجبات جديدة من العروض بالضغط على القلب ♥",
    en: "Products you favorited are no longer available — add new meals from the offers by tapping the heart ♥",
  },
  "home.favorites.cardsAria": { ar: "بطاقات المفضلة", en: "Favorite cards" },

  /* ── قسم شاهدت مؤخراً (RecentlyViewedSection) ── */
  "home.recentlyViewed.aria": { ar: "شاهدت مؤخراً", en: "Recently viewed" },
  "home.recentlyViewed.title": { ar: "شاهدت مؤخراً", en: "Recently viewed" },
  "home.recentlyViewed.description": {
    ar: "استأنف من حيث توقفت — آخر الوجبات التي تصفّحتها",
    en: "Pick up where you left off — your recently browsed meals",
  },

  /* ── المتاجر المفضلة (FavoriteFacilitiesSection) ── */
  "home.favFacilities.aria": { ar: "المتاجر المفضلة", en: "Favorite stores" },
  "home.favFacilities.title": { ar: "متجري المفضل", en: "My favorite stores" },
  "home.favFacilities.emptyTitle": {
    ar: "لا توجد متاجر مفضلة بعد",
    en: "No favorite stores yet",
  },
  "home.favFacilities.emptyDesc": {
    ar: "اضغط زر القلب على أي متجر لتتلقى إشعارات فورية عند نشر عروضه الجديدة ⚡",
    en: "Tap the heart on any store to get instant alerts when it posts new offers ⚡",
  },
  "home.favFacilities.notifyHint": {
    ar: "إشعارات العروض الجديدة ⚡",
    en: "New offer alerts ⚡",
  },
  "home.favFacilities.typeRestaurant": { ar: "مطعم", en: "Restaurant" },
  "home.favFacilities.typeCafe": { ar: "كافتيريا", en: "Cafeteria" },
  "home.favFacilities.typeStore": { ar: "متجر", en: "Store" },
  "home.favFacilities.notifyOn": { ar: "إشعارات مفعّلة", en: "Alerts on" },
  "home.favFacilities.notifyOff": { ar: "إشعارات معطّلة", en: "Alerts off" },
  "home.favFacilities.notifyDisableAria": {
    ar: "إيقاف إشعارات العروض",
    en: "Turn off offer alerts",
  },
  "home.favFacilities.notifyEnableAria": {
    ar: "تفعيل إشعارات العروض",
    en: "Turn on offer alerts",
  },

  /* ── البانر الترحيبي (WelcomeBanner) ── */
  "home.welcome.text": {
    ar: "مرحبًا بك في توفير! سجّل واحصل على خصومات حصرية مع العضوية",
    en: "Welcome to Tawfir! Sign up and unlock exclusive member discounts",
  },
  "home.welcome.register": { ar: "تسجيل", en: "Sign up" },

  /* ── منتقي المنطقة (RegionSelector) ── */
  "home.regions.error": {
    ar: "تعذّر تحميل المناطق",
    en: "Couldn't load areas",
  },
  "home.regions.empty": { ar: "لا توجد مناطق", en: "No areas available" },
  "home.regions.selectAria": { ar: "اختيار المنطقة", en: "Choose your area" },
  "home.regions.placeholder": { ar: "اختر منطقتك", en: "Choose your area" },
  "home.regions.sheetTitle": { ar: "اختر منطقتك", en: "Choose your area" },
  "home.regions.listAria": { ar: "قائمة المناطق", en: "Areas list" },
};
