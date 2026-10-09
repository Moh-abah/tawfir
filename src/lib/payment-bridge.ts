"use client";

/**
 * payment-bridge — جسر الدفع على الجوال (جولة الجوال والدفع الإلكتروني v6)
 * ═══════════════════════════════════════════════════════════════════════
 * القرار المعماري الموثق (docs/MOBILE-PAYMENT-DECISIONS.md):
 *
 *  • البطاقات + STC Pay + تحدي 3DS  ← تعمل داخل الـWebView نفسه عبر
 *    نموذج مويسر المدمج (iframe) — صفر خروج من التطبيق (رؤية «دورة
 *    كاملة داخل علامتك»).
 *  • Apple Pay على iOS ← ApplePaySession لا يتوفر داخل WKWebView
 *    (سلوك منصة Apple الموثق) لذا يخفيه نموذج مويسر تلقائيًا هناك.
 *    الحل: زر Apple Pay داخل التطبيق يفتح شاشة الدفع نفسها بوضع
 *    «الورقة النظيفة» (?sf=1) داخل SFSafariViewController — متصفح
 *    داخل التطبيق (لا خروج للتطبيق؛ زر «تم» يعيد المستخدم فورًا) —
 *    وهو السياق الذي تعتمد Apple Pay فيه رسميًا بدون SDK أصلي.
 *  • لا مفتاح سري في أي مسار: المفتاح publishable علني بطبيعته،
 *    والمبلغ في وضع الورقة استرشادي — سلطة التحقق النهائية دائمًا
 *    للباك إند عبر POST /finance/orders/{id}/pay/verify الذي يرفض
 *    أي دفعة لا تطابق الطلب (مبلغ/عملة/طلب آخر).
 *
 * كل الوظائف here: على الويب/SSR → no-op أو false؛ استيرادات
 * Capacitor ديناميكية فلا تدخل حزمة الويب الإنتاجية.
 */

import { useSyncExternalStore } from "react";

import { isNativePlatform } from "@/lib/capacitor";

/* ─── كشف النظام الأساسي ─────────────────────────────────────────── */

export type PaymentPlatform = "web" | "ios" | "android";

/** النظام الحالي — متزامن وآمن على SSR (يُرجع "web"). */
export function getPaymentPlatform(): PaymentPlatform {
 if (!isNativePlatform()) return "web";
 try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Capacitor } = require("@capacitor/core") as typeof import("@capacitor/core");
  const p = Capacitor.getPlatform();
  return p === "ios" ? "ios" : p === "android" ? "android" : "web";
 } catch {
  return "web";
 }
}

/** هل نحن داخل تطبيق iOS الأصلي (وليس الويب/PWA)؟ */
export function isNativeIOS(): boolean {
 return getPaymentPlatform() === "ios";
}

/* ─── وضع «الورقة النظيفة» (?sf=1) ───────────────────────────────── */

/** معامل وضع الورقة النظيفة في الـURL. */
const SF_PARAM = "sf";

/**
 * هل هذه الشاشة مفتوحة كورقة دفع نظيفة داخل SFSafariViewController؟
 * SSR-safe: يقرأ location.search فقط على العميل.
 */
export function isSafariSheetMode(): boolean {
 if (typeof window === "undefined") return false;
 try {
  return new URLSearchParams(window.location.search).get(SF_PARAM) === "1";
 } catch {
  return false;
 }
}

/** معاملات الورقة النظيفة التي يمررها التطبيق (كلها اختيارية بالتحقق). */
export interface SafariSheetParams {
 /** المبلغ بالوحدة الكبرى (ريال) — استرشادي، السلطة للباك إند. */
 amountMajor: number | null;
 orderId: number | null;
 publishableKey: string | null;
 methods: string[];
 /** عملة البوابة من /finance/payments/config (v3.2.1 — من الخادم). */
 currency: string | null;
}

/**
 * قراءة معاملات الورقة النظيفة من الـURL — بقيم null عند الغياب
 * أو عدم الصلاحية (والشاشة تعرض خطأ واضحًا بدل التخمين).
 */
export function readSafariSheetParams(): SafariSheetParams {
 const empty: SafariSheetParams = {
  amountMajor: null,
  orderId: null,
  publishableKey: null,
  methods: [],
  currency: null,
 };
 if (typeof window === "undefined") return empty;
 try {
  const q = new URLSearchParams(window.location.search);
  const amt = Number(q.get("amt"));
  const id = Number(q.get("order"));
  const pk = q.get("pk") ?? "";
  const cur = q.get("cur") ?? "";
  const methods = (q.get("m") ?? "")
   .split(",")
   .map((s) => s.trim())
   .filter(Boolean);
  return {
   amountMajor: Number.isFinite(amt) && amt > 0 ? amt : null,
   orderId: Number.isFinite(id) && id > 0 ? id : null,
   publishableKey: pk.startsWith("pk_") ? pk : null,
   methods,
   currency: /^[A-Z]{3}$/.test(cur) ? cur : null,
  };
 } catch {
  return empty;
 }
}

/* ─── Apple Pay على iOS عبر الورقة النظيفة ───────────────────────── */

/** حالة فتح الورقة — النجاح يعني أُغلق الورقة (بأي نتيجة دفع). */
export interface ApplePaySheetResult {
 /** أُغلقت الورقة — المتصل يحدّث حالة الدفع من الخادم بعدها دائمًا. */
 closed: boolean;
 /** خطأ بيئي (الإضافة غير متاحة/فشل الفتح) — يُعرض كرسالة عربية. */
 error?: string;
}

/**
 * هل زر Apple Pay الأصلي (عبر الورقة) يظهر في هذه البيئة؟
 * الشروط: تطبيق iOS أصلي + وسيلة applepay مسموحة من إعدادات الخادم.
 * على الويب/أندرويد: false (الويب يعرض Apple Pay من نموذج مويسر
 * مباشرة في Safari، وأندرويد لا يملك Apple Pay أصلاً).
 */
export function nativeApplePayAvailable(methods: string[]): boolean {
 if (!isNativeIOS()) return false;
 return methods.map((m) => m.toLowerCase()).includes("applepay");
}

/**
 * فتح ورقة Apple Pay: يفتح نفس شاشة الدفع بوضع الورقة النظيفة
 * داخل SFSafariViewController (متصفح داخل التطبيق) — حيث يعرض
 * نموذج مويسر زر Apple Pay تلقائيًا (ApplePaySession متاح هناك).
 *
 * يُرجع عند إغلاق الورقة (زر «تم») — المتصل يستعلم حالة الدفع
 * من الخادم من جديد (لا نعتبر الإغلاق نجاح دفع أبدًا).
 */
export async function openApplePaySheet(orderId: number): Promise<ApplePaySheetResult> {
 if (!isNativeIOS()) {
  return { closed: false, error: "متاح داخل تطبيق iOS فقط" };
 }
 try {
  const { Browser } = await import("@capacitor/browser");

  /* بناء رابط الورقة من الشاشة الحالية: نفس المسار + وضع الورقة
     + معاملات النموذج (المبلغ/المفتاح العلني/الوسائل) — كلها
     علنية بطبيعتها ولا تُمكّن أي تجاوز للتحقق الخلفي. */
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(SF_PARAM, "1");
  /* معاملات الورقة تُمرَّر من المتصل (openApplePaySheetWithContext) */
  const extra = sheetContextStore.take();
  if (extra) {
   if (extra.amountMajor != null) url.searchParams.set("amt", String(extra.amountMajor));
   url.searchParams.set("order", String(orderId));
   if (extra.publishableKey) url.searchParams.set("pk", extra.publishableKey);
   if (extra.methods.length) url.searchParams.set("m", extra.methods.join(","));
   if (extra.currency) url.searchParams.set("cur", extra.currency);
  }

  let resolveClosed: () => void = () => { };
  const closedPromise = new Promise<void>((resolve) => {
   resolveClosed = resolve;
  });

  const listener = await Browser.addListener("browserFinished", () => {
   resolveClosed();
  });

  await Browser.open({ url: url.toString(), presentationStyle: "fullscreen" });

  await closedPromise;
  await listener.remove();
  return { closed: true };
 } catch (err: unknown) {
  return {
   closed: false,
   error:
    err instanceof Error && err.message
     ? `تعذّر فتح نافذة الدفع الآمنة: ${err.message}`
     : "تعذّر فتح نافذة الدفع الآمنة — أعد المحاولة",
  };
 }
}

/* ─── حاوية سياق الورقة (بلا حالة React — استدعاء مباشر) ─────────── */

const sheetContextStore: {
 ctx: SafariSheetParams | null;
 set: (ctx: SafariSheetParams) => void;
 take: () => SafariSheetParams | null;
} = {
 ctx: null,
 set(ctx) {
  this.ctx = ctx;
 },
 take() {
  const c = this.ctx;
  this.ctx = null;
  return c;
 },
};

/**
 * تمرير معاملات النموذج للورقة قبل فتحها — يُستدعى من شاشة الدفع
 * حيث القيم الحية متوفرة (config + order).
 */
export function setApplePaySheetContext(ctx: SafariSheetParams): void {
 sheetContextStore.set(ctx);
}

/* ─── hook قراءة معاملات الورقة (آمن للترطيب) ─────────────────── */

/* كاش على مستوى الوحدة: getSnapshot يجب أن يعيد نفس المرجع بين
   النداءات (Object.is) وإلا دخل React حلقة إعادة رسم لا نهائية —
   معاملات الورقة ثابتة طوال عمر الصفحة فالكاش بلا مخاطرة. */
let cachedSheetParams: SafariSheetParams | null = null;
let cachedSheetSearch = "";

function getSheetSnapshot(): SafariSheetParams {
 const search = typeof window !== "undefined" ? window.location.search : "";
 if (cachedSheetParams === null || cachedSheetSearch !== search) {
  cachedSheetSearch = search;
  cachedSheetParams = readSafariSheetParams();
 }
 return cachedSheetParams;
}

const noopSubscribe = () => () => { };
const serverSheetSnapshot = (): SafariSheetParams | null => null;

/**
 * قراءة معاملات الورقة النظيفة كـhook — آمن للترطيب (useSyncExternalStore):
 * الخادم يرى null (يُرسم حالة محايدة)، والعميل يقرأ الـURL الحقيقي
 * فور الترطيب بلا تحذير اختلاف. يُرجع null أيضاً إن لم يكن الوضع sf=1.
 */
export function useSafariSheetParams(): SafariSheetParams | null {
 if (!isSafariSheetMode()) return null;
 // eslint-disable-next-line react-hooks/rules-of-hooks -- الوضع sf=1 ثابت طوال عمر الصفحة
 return useSyncExternalStore(noopSubscribe, getSheetSnapshot, serverSheetSnapshot);
}

/* ─── احتياط عام: متصفح داخل التطبيق لأي مسار دفع ────────────────── */

/**
 * فتح رابط في متصفح داخل التطبيق (SFSafariViewController / Chrome
 * Custom Tabs) — احتياط عام إن احتاج مسار الدفع ذلك يومًا
 * (مثال: تحويل علوي لبنك لا يعمل داخل الـWebView).
 * يُرجع عند إغلاق المتصفح. على الويب: لا يفعل شيئًا (يعيد خطأ بيئي).
 */
export async function openInAppBrowser(url: string): Promise<ApplePaySheetResult> {
 if (!isNativePlatform()) {
  return { closed: false, error: "متاح داخل التطبيق فقط" };
 }
 try {
  const { Browser } = await import("@capacitor/browser");
  let resolveClosed: () => void = () => { };
  const closedPromise = new Promise<void>((resolve) => {
   resolveClosed = resolve;
  });
  const listener = await Browser.addListener("browserFinished", () => {
   resolveClosed();
  });
  await Browser.open({ url });
  await closedPromise;
  await listener.remove();
  return { closed: true };
 } catch (err: unknown) {
  return {
   closed: false,
   error: err instanceof Error && err.message ? err.message : "تعذّر فتح المتصفح",
  };
 }
}
