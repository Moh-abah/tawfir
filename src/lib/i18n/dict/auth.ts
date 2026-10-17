import type { DictEntry } from "@/lib/i18n/index";

/**
 * authDict — مفاتيح مجموعة «auth» (جولة التدويل — بصمة 40-d).
 * تشمل: شاشات الدخول/التسجيل/استعادة كلمة المرور + رسائل تحقق Zod
 * + شاشات نجاح التسجيل والـOTP.
 * كل مفتاح {ar, en} — العربية نص الكود الأصلي حرفياً.
 */
export const authDict: Record<string, DictEntry> = {
  /* ─── مبدّل الدور (عميل / مندوب) ─── */
  "auth.tab.customer": { ar: "دخول كعميل", en: "Customer sign-in" },
  "auth.tab.courier": { ar: "مندوب توصيل", en: "Delivery courier" },
  "auth.tab.a11y": { ar: "نوع الحساب", en: "Account type" },

  /* ─── الدخول ─── */
  "auth.login.titleCustomer": { ar: "أهلاً بك من جديد", en: "Welcome back" },
  "auth.login.titleCourier": {
    ar: "دخول مندوبي توفير",
    en: "Tawfir courier sign-in",
  },
  "auth.login.descCustomer": {
    ar: "أدخل بياناتك للوصول إلى بطاقتك وحسابك — وفّر أكثر.. عِش أجمل",
    en: "Enter your details to access your card and account — Save more.. live better",
  },
  "auth.login.descCourier": {
    ar: "جاهز لاستقبال نداءات اليوم؟ لننطلق — نفس تطبيق توفير بصلاحيات المندوب",
    en: "Ready for today's delivery calls? Let's go — the same Tawfir app with courier permissions",
  },
  "auth.identifier.customer": {
    ar: "البريد الإلكتروني أو رقم الجوال",
    en: "Email or phone number",
  },
  "auth.identifier.courier": {
    ar: "البريد الإلكتروني أو جوال المندوب",
    en: "Courier email or phone number",
  },
  "auth.identifier.required": {
    ar: "البريد الإلكتروني أو رقم الجوال مطلوب",
    en: "Email or phone number is required",
  },
  "auth.password": { ar: "كلمة المرور", en: "Password" },
  "auth.password.required": {
    ar: "كلمة المرور مطلوبة",
    en: "Password is required",
  },
  "auth.forgot": { ar: "نسيت كلمة المرور؟", en: "Forgot password?" },
  "auth.expired.title": { ar: "انتهت الجلسة", en: "Session expired" },
  "auth.expired.desc": {
    ar: "يرجى تسجيل الدخول من جديد",
    en: "Please sign in again",
  },
  "auth.login.busy": { ar: "جارٍ الدخول...", en: "Signing in..." },
  "auth.login.courierCta": {
    ar: "دخول لوحة المندوب",
    en: "Enter courier dashboard",
  },
  "auth.login.cta": { ar: "تسجيل الدخول", en: "Sign in" },
  "auth.login.courierError": {
    ar: "تعذّر تسجيل الدخول كمندوب",
    en: "Courier sign-in failed",
  },
  "auth.login.error": { ar: "تعذّر تسجيل الدخول", en: "Sign-in failed" },

  /* ─── صندوق تسجيل المندوب من شاشة الدخول ─── */
  "auth.courier.boxTitle": {
    ar: "ليس لديك حساب مندوب؟",
    en: "No courier account yet?",
  },
  "auth.courier.boxDesc": {
    ar: "انضم لفريق توصيل توفير وابدأ باستقبال النداءات اليوم",
    en: "Join Tawfir's delivery team and start receiving calls today",
  },
  "auth.courier.registerCta": {
    ar: "إنشاء حساب مندوب توصيل",
    en: "Create a courier account",
  },
  "auth.noAccount": {
    ar: "ليس لديك حساب؟",
    en: "Don't have an account?",
  },
  "auth.registerNow": { ar: "سجّل الآن", en: "Register now" },
  "auth.workWithUs": {
    ar: "تريد العمل معنا في التوصيل؟",
    en: "Want to work with us in delivery?",
  },
  "auth.courierSignup": {
    ar: "أنشئ حساب مندوب توصيل",
    en: "Create a courier account",
  },
  "auth.backToCustomer": {
    ar: "العودة لدخول العملاء",
    en: "Back to customer sign-in",
  },
  "auth.backHome": { ar: "العودة للرئيسية", en: "Back to home" },

  /* ─── التسجيل: الترويسة والمراحل ─── */
  "auth.reg.joinLine": {
    ar: "انضم إلى توفير — كل وجباتك.. بخصومات حصرية",
    en: "Join Tawfir — every meal.. with exclusive discounts",
  },
  "auth.step.personal": { ar: "البيانات الشخصية", en: "Personal details" },
  "auth.step.password": { ar: "كلمة المرور", en: "Password" },
  "auth.step.confirm": { ar: "تأكيد الحساب", en: "Account verification" },
  "auth.reg.progress": { ar: "تقدم التسجيل", en: "Signup progress" },

  /* ─── التسجيل: اللوحة الجانبية ─── */
  "auth.reg.sideTitle": { ar: "انضم لعائلة توفير", en: "Join the Tawfir family" },
  "auth.reg.sideDesc": {
    ar: "سجّل الآن واحصل على بطاقة خصم تنفعك في عشرات المتاجر",
    en: "Sign up now and get a discount card that works at dozens of stores",
  },
  "auth.reg.benefit1": {
    ar: "خصومات حصرية على جميع المتاجر المشتركة",
    en: "Exclusive discounts at all participating stores",
  },
  "auth.reg.benefit2": {
    ar: "بطاقة عضوية رقمية بعد الموافقة اليدوية",
    en: "A digital membership card after manual approval",
  },
  "auth.reg.benefit3": {
    ar: "عروض حصرية ومزايا مميزة",
    en: "Exclusive offers and special perks",
  },

  /* ─── حقول النماذج ─── */
  "auth.field.fullName": { ar: "الاسم الكامل", en: "Full name" },
  "auth.field.fullNamePh": { ar: "مثال: أحمد محمد", en: "e.g. Ahmed Mohammed" },
  "auth.field.email": {
    ar: "البريد الإلكتروني (اختياري)",
    en: "Email (optional)",
  },
  "auth.field.phone": { ar: "رقم الجوال", en: "Phone number" },
  "auth.field.phoneHint": {
    ar: "يتعرّف النظام على سوقك تلقائياً من رقم جوالك وموقعك — عملتك وطرق الدفع والمتاجر تُحدَّد تلقائياً.",
    en: "The system detects your market automatically from your phone number and location — your currency, payment methods and stores are set for you.",
  },
  "auth.field.region": { ar: "المنطقة", en: "Region" },
  "auth.field.regionSaudi": {
    ar: "المنطقة (السعودية)",
    en: "Region (Saudi Arabia)",
  },
  "auth.field.passwordConfirm": {
    ar: "تأكيد كلمة المرور",
    en: "Confirm password",
  },

  /* ─── رسائل التحقق (Zod) ─── */
  "auth.err.nameMin": {
    ar: "الاسم يجب أن يكون حرفين على الأقل",
    en: "Name must be at least 2 characters",
  },
  "auth.err.emailInvalid": {
    ar: "صيغة البريد الإلكتروني غير صحيحة",
    en: "Invalid email format",
  },
  "auth.err.phoneRequired": { ar: "أدخل رقم الجوال", en: "Enter your phone number" },
  "auth.err.passwordMin": {
    ar: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    en: "Password must be at least 8 characters",
  },
  "auth.err.passwordConfirmRequired": {
    ar: "تأكيد كلمة المرور مطلوب",
    en: "Password confirmation is required",
  },
  "auth.err.regionRequired": {
    ar: "يرجى اختيار منطقة",
    en: "Please choose a region",
  },
  "auth.err.regionSaudiRequired": {
    ar: "يرجى اختيار منطقة سوقك (السعودية)",
    en: "Please choose a region in your market (Saudi Arabia)",
  },
  "auth.err.phoneSaudi": {
    ar: "أدخل رقم جوال سعودي صحيح — يبدأ بـ 05 و10 خانات (مثال: 0501234567)",
    en: "Enter a valid Saudi phone number — starts with 05 and has 10 digits (e.g. 0501234567)",
  },
  "auth.err.phoneYemen": {
    ar: "أدخل رقم جوال يمني صحيح (يبدأ بـ 70/71/73/77/78)",
    en: "Enter a valid Yemeni phone number (starts with 70/71/73/77/78)",
  },
  "auth.err.phoneYemenMin": {
    ar: "رقم الجوال يجب أن يكون 9 أرقام",
    en: "Phone number must be 9 digits",
  },
  "auth.err.passwordMismatch": {
    ar: "كلمتا المرور غير متطابقتين",
    en: "Passwords do not match",
  },

  /* ─── قوة كلمة المرور ─── */
  "auth.pw.strong": { ar: "قوية", en: "Strong" },
  "auth.pw.medium": { ar: "متوسطة", en: "Medium" },
  "auth.pw.weak": { ar: "ضعيفة", en: "Weak" },

  /* ─── مرحلة OTP ─── */
  "auth.otp.whatsappTitle": {
    ar: "تأكيد ملكية الرقم عبر واتساب",
    en: "Verify phone ownership via WhatsApp",
  },
  "auth.otp.sending": {
    ar: "جارٍ إرسال كود التحقق إلى واتساب...",
    en: "Sending the verification code to WhatsApp...",
  },
  "auth.otp.sendError": {
    ar: "تعذّر إرسال كود التحقق",
    en: "Failed to send the verification code",
  },

  /* ─── أزرار التسجيل ─── */
  "auth.reg.sendingCode": { ar: "جارٍ إرسال الكود...", en: "Sending the code..." },
  "auth.reg.registering": { ar: "جارٍ التسجيل...", en: "Registering..." },
  "auth.reg.cta": { ar: "تسجيل العضوية", en: "Register membership" },
  "auth.reg.haveAccount": {
    ar: "لديك حساب بالفعل؟",
    en: "Already have an account?",
  },

  /* ─── غطاء إنشاء الحساب ─── */
  "auth.creating.title": {
    ar: "جارٍ إنشاء حسابك...",
    en: "Creating your account...",
  },
  "auth.creating.desc": {
    ar: "تحقّقنا من رقمك — نُنشئ حسابك الآن ونجلب بطاقة عضويتك.",
    en: "We verified your number — creating your account and fetching your membership card now.",
  },

  /* ─── شاشة نجاح التسجيل ─── */
  "auth.success.title": { ar: "تم إنشاء حسابك!", en: "Your account is created!" },
  "auth.success.titleGift": {
    ar: "تم إنشاء حسابك! 🎁",
    en: "Your account is created! 🎁",
  },
  "auth.success.fallbackDesc": {
    ar: "أهلاً بك في منصة توفير",
    en: "Welcome to the Tawfir platform",
  },
  "auth.success.freeCardTitle": {
    ar: "حصلت على عضوية توفير المجانية",
    en: "You got the free Tawfir membership",
  },
  "auth.success.freeCardDesc": {
    ar: "ستظهر بطاقة عضويتك مع رقم العضوية في صفحة حسابك بعد تسجيل الدخول.",
    en: "Your membership card with the membership number will appear on your account page after signing in.",
  },
  "auth.success.badgeDiscount": {
    ar: "خصومات حصرية للعضوية",
    en: "Exclusive membership discounts",
  },
  "auth.success.badgeSubscribe": { ar: "اشترك الآن", en: "Subscribe now" },
  "auth.success.subscribeTitle": {
    ar: "اشترك في عضوية توفير واستمتع بخصومات حصرية",
    en: "Subscribe to Tawfir membership and enjoy exclusive discounts",
  },
  "auth.success.subscribeDesc": {
    ar: "موافقة يدوية خلال 24-48 ساعة. عند الموافقة تظهر بطاقة عضويتك في حسابك.",
    en: "Manual approval within 24–48 hours. Once approved, your membership card appears in your account.",
  },
  "auth.success.accountCta": { ar: "حسابي", en: "My account" },
  "auth.success.browseCta": { ar: "تصفّح الوجبات", en: "Browse meals" },

  /* ─── استعادة كلمة المرور ─── */
  "auth.reset.title": {
    ar: "تعيين كلمة مرور جديدة",
    en: "Set a new password",
  },
  "auth.reset.desc": {
    ar: "أدخل كلمة المرور الجديدة لحسابك لإتمام الاستعادة",
    en: "Enter your account's new password to finish recovery",
  },
  "auth.reset.doneTitle": {
    ar: "تم تعيين كلمة المرور الجديدة",
    en: "New password has been set",
  },
  "auth.reset.toastDesc": {
    ar: "سجّل دخولك الآن بكلمة المرور الجديدة",
    en: "Sign in now with your new password",
  },
  "auth.reset.redirecting": {
    ar: "سيتم تحويلك لصفحة الدخول خلال لحظات...",
    en: "Redirecting you to the sign-in page in a moment...",
  },
  "auth.reset.invalidLink": { ar: "رابط غير صالح", en: "Invalid link" },
  "auth.reset.invalidLinkDesc": {
    ar: "رابط إعادة التعيين ناقص أو منتهٍ — اطلب رابطاً جديداً من صفحة الدخول.",
    en: "The reset link is missing or expired — request a new one from the sign-in page.",
  },
  "auth.reset.backToLogin": {
    ar: "العودة لتسجيل الدخول",
    en: "Back to sign in",
  },
  "auth.reset.newPassword": {
    ar: "كلمة المرور الجديدة",
    en: "New password",
  },
  "auth.reset.minHint": { ar: "8 أحرف على الأقل", en: "At least 8 characters" },
  "auth.reset.errMin": {
    ar: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
    en: "The new password must be at least 8 characters",
  },
  "auth.reset.errMismatch": {
    ar: "التأكيد لا يطابق كلمة المرور الجديدة",
    en: "The confirmation does not match the new password",
  },
  "auth.reset.errGeneric": {
    ar: "تعذّر إعادة التعيين — قد يكون الرابط منتهياً",
    en: "Reset failed — the link may have expired",
  },
  "auth.reset.saving": { ar: "جارٍ الحفظ...", en: "Saving..." },
  "auth.reset.saveCta": {
    ar: "حفظ كلمة المرور الجديدة",
    en: "Save new password",
  },
};
