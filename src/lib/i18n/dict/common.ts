import type { DictEntry } from "@/lib/i18n/index";

/**
 * commonDict — مفاتيح مشتركة (أزرار عامة/حالات/شبكة) — بصمة.
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 */
export const commonDict: Record<string, DictEntry> = {
  /* أزرار عامة */
  "common.retry": { ar: "إعادة المحاولة", en: "Try again" },
  "common.retryLater": {
    ar: "تحقق من اتصالك ثم أعد المحاولة.",
    en: "Check your connection and try again.",
  },
  "common.loading": { ar: "جارٍ التحميل…", en: "Loading…" },
  "common.save": { ar: "حفظ", en: "Save" },
  "common.cancel": { ar: "إلغاء", en: "Cancel" },
  "common.close": { ar: "إغلاق", en: "Close" },
  "common.back": { ar: "رجوع", en: "Back" },
  "common.continue": { ar: "متابعة", en: "Continue" },
  "common.confirm": { ar: "تأكيد", en: "Confirm" },
  "common.search": { ar: "بحث", en: "Search" },
  "common.viewAll": { ar: "عرض الكل", en: "View all" },
  "common.empty": { ar: "لا يوجد شيء هنا بعد", en: "Nothing here yet" },
  "common.error": { ar: "حدث خطأ", en: "Something went wrong" },
  "common.offline": {
    ar: "لا يوجد اتصال بالإنترنت",
    en: "No internet connection",
  },
  "common.refresh": { ar: "تحديث", en: "Refresh" },
  "common.share": { ar: "مشاركة", en: "Share" },
  "common.optional": { ar: "اختياري", en: "Optional" },
  "common.required": { ar: "إلزامي", en: "Required" },
  "common.sar": { ar: "ر.س", en: "SAR" },
  "common.yer": { ar: "ر.ي", en: "YER" },

  /* التنقل السفلي — تُملأ من MobileBottomNav فعلياً عبر المفاتيح أدناه */
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.search": { ar: "البحث", en: "Search" },
  "nav.orders": { ar: "طلباتي", en: "My Orders" },
  "nav.ordersTab": { ar: "الطلبات", en: "Orders" },
  "nav.account": { ar: "حسابي", en: "Account" },
  "nav.cart": { ar: "السلة", en: "Cart" },
  "nav.favorites": { ar: "المفضلة", en: "Favorites" },
  "nav.facilities": { ar: "المتاجر", en: "Stores" },
  "nav.offers": { ar: "العروض", en: "Offers" },
  "nav.notifications": { ar: "الإشعارات", en: "Notifications" },
  "nav.more": { ar: "المزيد", en: "More" },

  /* مفاتيح مشتركة مضافة (جولة التدويل 40-c — إضافة حصراً) */
  "common.orderNumber": { ar: "رقم الطلب:", en: "Order number:" },
  "common.signIn": { ar: "تسجيل الدخول", en: "Sign in" },

  /* شريط التحميل والترحيب */
  "common.loadingBar": { ar: "جارٍ التحميل", en: "Loading" },
  "common.appTagline": {
    ar: "كل ما تحتاجه من متاجر منطقتك — بسرعة وشفافية",
    en: "Everything you need from local stores — fast and transparent",
  },

  /* الهيدر الرئيسي */
  "header.login": { ar: "دخول", en: "Sign in" },
  "header.courierPanel": { ar: "فتح لوحة المندوب", en: "Open courier dashboard" },
};
