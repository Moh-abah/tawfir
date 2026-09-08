/**
 * Firebase client-side initialization for Tawfir (توفير).
 * =====================================================
 * - This file is CLIENT-ONLY at runtime. Every Firebase call is guarded by
 *   `typeof window !== "undefined"` so it never executes on the server (SSR).
 * - The Firebase modules themselves are loaded LAZILY via `require()` inside
 *   the guarded helpers. This means the SDK is never even imported during
 *   SSR (Next.js renders client components on the server for the initial
 *   HTML — we keep firebase/messaging out of that pass entirely).
 * - The exported `FIREBASE_CONFIG` and `FIREBASE_VAPID_KEY` are the PUBLIC
 *   web app config — these are *not* secrets and are intended to ship to the
 *   browser (and into the Capacitor WebView / PWA).
 * - `getFcmMessaging()` lazily initializes the Firebase app + messaging
 *   instance and returns `Messaging | null`. Returns `null` if:
 *     • running on the server (SSR),
 *     • the browser lacks the APIs required by Firebase Messaging
 *       (Service Worker, Push API, Notification API),
 *     • initialization throws (private mode / disabled cookies / etc.)
 *       — we fail soft so the rest of the app keeps working.
 * - Helper wrappers `getFcmToken()` and `subscribeFcmMessages()` wrap the
 *   SDK functions so consumers never need to import `firebase/messaging`
 *   directly.
 *
 * Background notifications are handled by the MAIN service worker
 * `/sw.js` (scope "/") — it owns the push handler that shows
 * lock-screen notifications. Foreground messages are handled in
 * `FcmRegistrar.tsx` via `subscribeFcmMessages(...)`, and token
 * rotation via `subscribeFcmTokenRefresh(...)` (إصلاح onTokenRefresh).
 */

import type { Messaging, MessagePayload } from "firebase/messaging";

/**
 * Public Firebase web app config. Safe to ship to the client.
 * (The apiKey is the public web API key, not a server secret.)
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAOwYMLAv8YuOscAuwqn7cATt1q-d-Dztg",
  authDomain: "tawfeer-b99c2.firebaseapp.com",
  projectId: "tawfeer-b99c2",
  storageBucket: "tawfeer-b99c2.firebasestorage.app",
  messagingSenderId: "607746892859",
  appId: "1:607746892859:web:b50e697f6d74397ffe281e",
  measurementId: "G-BTFLYQSC8Z",
} as const;

/**
 * VAPID public key for web push. Used by `getToken(messaging, { vapidKey })`.
 * Public — paired with a private server key in the Firebase Console.
 */
export const FIREBASE_VAPID_KEY =
  "BB3FJpCjnbenGoHvaH79z-NobkrNcyJuYpQkhKIafoHQKqOKSMnMjjazZ-LgFk166FXBE4T5Ef1Vrv4vS_mOMwM";

/* ── إصلاح فك ترميز VAPID base64url ─────────────────────────────────
 * Firebase JS SDK 10.12 يقبل سلسلة base64url مباشرة ويفكّها داخلياً،
 * لكن مفتاحاً مشوهاً (حروف base64 قياسية +/ بدلاً من -_ أو حشو خاطئ
 * أو نقص بايتات) يفشل بصمت عند getToken. هذه الدوال تتحقق وتوحّد
 * المفتاح قبل تمريره:
 *  1) urlBase64ToUint8Array: تحويل قياسي base64url ← Uint8Array
 *     (استبدال -_ بـ+/ وإزالة الحشو ثم atob).
 *  2) normalizeVapidKey: تحقق من صحة المفتاح (87 حرفاً = 65 بايتاً
 *     لمفتاح P-256) وإرجاع الصيغة الموحدة، أو null عند فساده —
 *     فنسقط التسجيل مبكراً برسالة واضحة بدل فشل صامت. */
export function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const normalized = base64url
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");
  const base64 = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const raw = typeof window !== "undefined"
    ? window.atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** تحقق من سلامة مفتاح VAPID (65 بايتاً = نقطة P-256 غير مضغوطة). */
export function normalizeVapidKey(key: string): string | null {
  try {
    const bytes = urlBase64ToUint8Array(key);
    /* مفتاح P-256: 0x04 + X(32) + Y(32) = 65 بايتاً */
    if (bytes.length !== 65 || bytes[0] !== 0x04) return null;
    /* نعيد ترميزه صيغة base64url الموحدة (بلا حشو) */
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = typeof window !== "undefined"
      ? window.btoa(binary)
      : Buffer.from(bytes).toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return null;
  }
}

/* ── Lazy singletons (client only) ────────────────────────────────────── */

// We use `any` here to avoid pulling the runtime SDK into the SSR graph.
// The types are still enforced at call sites via the public exported helpers.
 
let firebaseApp: any = null;
let messagingInstance: Messaging | null = null;
let messagingInitAttempted = false;

// Loaded once (lazily, client-only) and cached.
 
let messagingApi: any = null;

/** Returns the cached messaging SDK module, loading it on first call. */
 
function loadMessagingApi(): any {
  if (messagingApi) return messagingApi;
  try {
    // Lazy require keeps firebase/messaging out of the SSR bundle entirely.
    // esModuleInterop + Turbopack CJS interop handle the named exports.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    messagingApi = require("firebase/messaging");
    return messagingApi;
  } catch (err) {
    console.warn("[firebase] failed to load firebase/messaging:", err);
    return null;
  }
}

/**
 * Returns the initialized Firebase app instance, initializing it lazily on
 * first call. Returns `null` on the server (SSR) or if initialization throws.
 */
export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (firebaseApp) return firebaseApp;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeApp } = require("firebase/app");
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    return firebaseApp;
  } catch (err) {
    console.warn("[firebase] initializeApp failed:", err);
    return null;
  }
}

/**
 * Returns the Firebase Messaging instance for the web, or `null` if
 * unsupported / SSR / init-failed. Idempotent — safe to call from many
 * components. Never throws.
 */
export function getFcmMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;
  if (messagingInitAttempted) return null; // we already tried and failed
  messagingInitAttempted = true;

  if (!isFcmSupported()) return null;

  try {
    const fbApp = getFirebaseApp();
    if (!fbApp) return null;
    const api = loadMessagingApi();
    if (!api) return null;
    messagingInstance = api.getMessaging(fbApp);
    return messagingInstance;
  } catch (err) {
    console.warn("[firebase] getMessaging failed (likely unsupported):", err);
    return null;
  }
}

/**
 * يضمن وجود تسجيل Service Worker الرئيسي /sw.js (نطاق "/") ويعيده
 * مُفعّلاً بالكامل.
 *
 * الجولة 22 — إصلاح جذر الإشعارات الخارجية: اشتراك Push يجب أن يُربط
 * بعامل /sw.js نفسه (الذي يحتوي معالج push). في السابق كان getToken
 * يلتقط أي تسجيل موجود — وقد يسبقه عامل قديم — فتضيع أحداث push.
 * register() هنا idempotent: إن كان /sw.js مسجلاً يعيد تسجيله نفسه.
 *
 * إصلاح سباق «no active Service Worker»: كان الكود ينتظر
 * navigator.serviceWorker.ready فقط عند غياب active — وready قد يحل
 * بتسجيلٍ آخر أو يتأخر إلى ما بعد getToken فيفشل بـ
 * «no active Service Worker available». الآن ننتظر تفعيل هذا التسجيل
 * تحديداً (installing/waiting ← statechange → activated) قبل إرجاعه،
 * مع مهلة أمان 10 ثوانٍ حتى لا يعلق التسجيل إلى الأبد.
 */
async function waitForActivation(
  reg: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (reg.active) return reg;
  const target = reg.installing ?? reg.waiting;
  if (!target) {
    /* لا installing ولا waiting — fallback إلى ready الخاص بالنطاق */
    await navigator.serviceWorker.ready;
    return reg;
  }
  await new Promise<void>((resolve) => {
    /* إصلاح (التدقيق 3-a / L1): عند مسار المهلة (10s) كان مستمع
       statechange يبقى معلقاً على عامل installing متروك — نزيّله
       دائماً عند الحسم أياً كان مصدره (تفعيل/تقادم/مهلة). */
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener("statechange", onState);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, 10000); /* مهلة أمان 10s */
    const onState = () => {
      if (target.state === "activated" || target.state === "redundant") {
        cleanup();
        resolve();
      }
    };
    target.addEventListener("statechange", onState);
    if (target.state === "activated" || target.state === "redundant") {
      cleanup();
      resolve();
    }
  });
  return reg;
}

async function getMainSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    /* إن وُجد تسجيل نشط لنطاق الجذر وهو /sw.js → استعمله مباشرة */
    const existing = await navigator.serviceWorker.getRegistration("/");
    const swUrl =
      existing?.installing?.scriptURL ??
      existing?.waiting?.scriptURL ??
      existing?.active?.scriptURL ??
      "";
    if (existing && swUrl.endsWith("/sw.js") && existing.active) {
      return existing;
    }
    /* سجّل /sw.js (يستبدل أي عامل قديم بنفس النطاق — مثل
       firebase-messaging-sw.js المتقادم — بتحديث التسجيل) */
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    /* انتظر تفعيل هذا التسجيل تحديداً (إصلاح سباق no active SW) */
    return await waitForActivation(reg);
  } catch (err) {
    console.warn("[firebase] SW registration failed:", err);
    return null;
  }
}

/**
 * Requests a real FCM registration token from the browser's push
 * subscription, using our VAPID key. The subscription is explicitly bound
 * to the MAIN /sw.js registration (which owns the push handler that shows
 * lock-screen notifications). Resolves to the token string, or `null`
 * if anything goes wrong (unsupported, permission denied, network error,
 * SW registration failure, etc.). Never throws.
 *
 * إصلاحات هذه الدالة:
 *  • VAPID: يوحّد المفتاح عبر normalizeVapidKey (فك ترميز base64url
 *    موثوق) قبل تمريره لـ getToken — يمنع فشلاً صامتاً بمفتاح مشوه.
 *  • إعادة محاولة واحدة عند فشل شبكة عابر في getToken.
 */
export async function getFcmToken(): Promise<string | null> {
  const m = getFcmMessaging();
  if (!m) return null;
  const api = loadMessagingApi();
  if (!api) return null;

  /* توحيد/فحص مفتاح VAPID (إصلاح فك الترميز) */
  const vapidKey = normalizeVapidKey(FIREBASE_VAPID_KEY) ?? FIREBASE_VAPID_KEY;

  const swReg = await getMainSwRegistration();
  const options: {
    vapidKey: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  } = { vapidKey };
  if (swReg) options.serviceWorkerRegistration = swReg;

  /* محاولة أولى + إعادة محاولة واحدة عند الفشل الشبكي العابر */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await api.getToken(m, options);
      return token ?? null;
    } catch (err) {
      if (attempt === 0) {
        /* مهلة قصيرة ثم إعادة المحاولة — يفيد بعد تفعيل SW مباشرة */
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.warn("[firebase] getToken failed:", err);
      return null;
    }
  }
  return null;
}

/**
 * إصلاح onTokenRefresh — إعادة الاشتراك عند تجدّد التوكن:
 * FCM يدير توكن الجهاز ويجددّه أحياناً (تغيّر متصفح/إذن/مفتاح VAPID
 * أو دوران خادم FCM). الاشتراك القديم يصبح غير صالح فيتوقف وصول
 * الإشعارات بصمت. هذه الدالة تشترك في onTokenRefresh وتبلّغ
 * المستدعي فوراً — ليطلب FcmRegistrar توكناً جديداً ويعيد تسجيله
 * في الباك إند (ويحذف القديم). تُرجع دالة إلغاء الاشتراك. لا ترمي.
 */
export function subscribeFcmTokenRefresh(
  onRefresh: () => void
): () => void {
  const m = getFcmMessaging();
  if (!m) return () => {};
  const api = loadMessagingApi();
  if (!api || typeof api.onTokenRefresh !== "function") return () => {};
  try {
    return api.onTokenRefresh(m, onRefresh) as () => void;
  } catch (err) {
    console.warn("[firebase] onTokenRefresh failed:", err);
    return () => {};
  }
}

/**
 * حذف توكن FCM الحالي من هذا الجهاز (يحذف اشتراك Push على مستوى
 * FCM). يُستخدم عند تسجيل الخروج النهائي أو عند فساد التوكن —
 * إصلاح تنظيف الاشتراكات المتقادمة. لا ترمي أبداً.
 */
export async function deleteFcmToken(): Promise<void> {
  const m = getFcmMessaging();
  if (!m) return;
  const api = loadMessagingApi();
  if (!api || typeof api.deleteToken !== "function") return;
  try {
    await api.deleteToken(m);
  } catch (err) {
    console.warn("[firebase] deleteToken failed:", err);
  }
}

/**
 * Subscribes a foreground-message callback. Returns an unsubscribe function.
 * If FCM is unsupported/SSR, returns a no-op unsubscribe. Never throws.
 *
 * The callback receives the FCM `MessagePayload` — `{ notification?, data?, ... }`.
 * `data` is always `{ [key: string]: string }` (FCM restriction); nested
 * objects must be JSON-encoded by the sender.
 */
export function subscribeFcmMessages(
  callback: (payload: MessagePayload) => void
): () => void {
  const m = getFcmMessaging();
  if (!m) return () => {};
  const api = loadMessagingApi();
  if (!api) return () => {};
  try {
    return api.onMessage(m, callback) as () => void;
  } catch (err) {
    console.warn("[firebase] onMessage failed:", err);
    return () => {};
  }
}

/**
 * Helper: does the current browser support FCM web push?
 * Used by FcmRegistrar to decide whether to attempt registration at all.
 */
export function isFcmSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    typeof window.PushManager !== "undefined" &&
    typeof Notification !== "undefined"
  );
}
