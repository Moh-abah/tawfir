/**
 * Firebase Cloud Messaging Service Worker for Tawfir (توفير).
 * =========================================================
 * A SEPARATE service worker (compat API) for FCM background push.
 * Lives at /firebase-messaging-sw.js (root scope "/") — independent from
 * the main /sw.js (caching SW). Both can coexist at scope "/" because
 * they have different script URLs; the browser keeps each registered
 * separately and dispatches events to each independently.
 *
 * Why compat (importScripts) instead of modular?
 *   Service Workers can't use ES module imports unless served with the
 *   `{ type: "module" }` flag in registration — Firebase's auto-registration
 *   of /firebase-messaging-sw.js uses the classic form. The compat SDK
 *   (firebase-app-compat.js + firebase-messaging-compat.js) is loaded via
 *   importScripts, the canonical pattern from Firebase docs.
 *
 * Behavior:
 *   • `push` event: parse the FCM payload (notification or data-only),
 *     display a Tawfir-branded notification (icon + badge + RTL/Arabic),
 *     and `stopImmediatePropagation()` to prevent firebase-messaging-compat
 *     from ALSO displaying a duplicate notification. We register our push
 *     listener BEFORE calling firebase.messaging() so our listener runs
 *     first in the listener list.
 *   • `notificationclick`: focus an existing tab (and navigate it to the
 *     target URL) or open a new one.
 *   • Click URL resolution: derives a deep link from the notification type
 *     + data fields (order_id → /orders/{id}, etc.) so tapping a
 *     notification takes the user straight to the relevant screen.
 *
 * Version: matches the installed client SDK (firebase@10.12.0) so the
 * SW and client agree on protocol.
 */

// 1) Firebase compat SDKs (loaded synchronously by importScripts).
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// 2) Initialize the Firebase app (same PUBLIC config as the client).
firebase.initializeApp({
  apiKey: "AIzaSyAOwYMLAv8YuOscAuwqn7cATt1q-d-Dztg",
  authDomain: "tawfeer-b99c2.firebaseapp.com",
  projectId: "tawfeer-b99c2",
  storageBucket: "tawfeer-b99c2.firebasestorage.app",
  messagingSenderId: "607746892859",
  appId: "1:607746892859:web:b50e697f6d74397ffe281e",
  measurementId: "G-BTFLYQSC8Z",
});

// 3) Register OUR `push` listener BEFORE calling firebase.messaging().
//    firebase.messaging() (next line) installs firebase's own `push`
//    listener AFTER ours, so ours runs first and can call
//    event.stopImmediatePropagation() to prevent duplicates.
self.addEventListener("push", handlePush, false);

// 4) Initialize messaging — registers firebase's push listener (after ours).
const messaging = firebase.messaging();

// 5) onBackgroundMessage is the firebase-compat callback for data-only
//    background messages. We no-op here because our `push` handler above
//    already shows the notification and stops propagation. Registering
//    an empty callback keeps the firebase-messaging-compat internal
//    state happy (some versions log warnings if no handler is set).
messaging.onBackgroundMessage(function (_payload) {
  /* no-op — handled by handlePush */
});

// 6) notificationclick — focus existing tab + navigate, or open new one.
self.addEventListener("notificationclick", handleNotificationClick, false);

/* ─── Helpers ─────────────────────────────────────────────────────────── */

// Brand assets (Tawfir identity, served from /public/icons/).
const BRAND_ICON = "/icons/icon-192.png";
const BRAND_BADGE = "/icons/icon-192.png";
const BRAND_TITLE = "توفير";

/**
 * Resolves the click target URL from the notification type + data fields.
 * Mirrors the routing logic in src/lib/notifications-meta.ts (hrefFor).
 */
function resolveClickUrl(type, data) {
  data = data || {};
  if (data.order_id) return "/orders/" + data.order_id;
  if (data.product_id) return "/products/" + data.product_id;
  if (data.facility_id) return "/owner";
  switch (type) {
    case "membership_received":
    case "membership_approved":
    case "membership_rejected":
    case "membership_expiring":
      return "/account";
    case "facility_approved":
    case "facility_rejected":
    case "owner_registered":
      return "/owner";
    case "special_offer_new":
    case "special_offer_ending":
    case "special_offer_soldout":
      return "/offers";
    default:
      return "/";
  }
}

/** Parses the incoming push payload from the PushEvent. */
function parsePayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch (_e) {
    try {
      return { data: { body: event.data.text() } };
    } catch (_e2) {
      return {};
    }
  }
}

/** Builds a NotificationOptions object with Tawfir branding. */
function buildNotificationOptions(title, body, type, data) {
  const tagBase = type ? "tawfir-" + type : "tawfir-notif";
  const tag =
    data.order_id ? tagBase + "-" + data.order_id
      : data.product_id ? tagBase + "-" + data.product_id
      : tagBase;
  return {
    body: body,
    icon: BRAND_ICON,
    badge: BRAND_BADGE,
    dir: "rtl",          // Arabic RTL
    lang: "ar",
    tag: tag,           // collapses duplicates of the same notification
    renotify: true,     // re-alert the user even if same tag
    data: Object.assign({}, data, {
      url: resolveClickUrl(type, data),
      type: type,
    }),
  };
}

/* ─── Event handlers ──────────────────────────────────────────────────── */

function handlePush(event) {
  try {
    const payload = parsePayload(event);
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || BRAND_TITLE;
    const body = notif.body || data.body || "";
    const type = data.notification_type || data.type || "";
    const options = buildNotificationOptions(title, body, type, data);

    event.waitUntil(self.registration.showNotification(title, options));

    // Prevent firebase-messaging-compat's push listener (registered AFTER
    // ours) from also displaying — would create a duplicate notification.
    event.stopImmediatePropagation();
  } catch (err) {
    // Last-resort: try to show a generic Tawfir notification so the user
    // is at least aware *something* arrived.
    try {
      event.waitUntil(
        self.registration.showNotification(BRAND_TITLE, {
          body: "لديك إشعار جديد",
          icon: BRAND_ICON,
          badge: BRAND_BADGE,
          dir: "rtl",
          lang: "ar",
          data: { url: "/" },
        })
      );
    } catch (_e) {
      /* give up silently — push permission may be missing */
    }
  }
}

function handleNotificationClick(event) {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || "/";

  event.waitUntil(
    (async function () {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Try to focus an existing tab on the same origin and navigate it.
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(targetUrl);
            } else if ("postMessage" in client) {
              client.postMessage({ type: "tawfir-navigate", url: targetUrl });
            }
            return;
          } catch (_e) {
            // continue to next client
          }
        }
      }
      // No existing tab — open a new one to the target URL.
      try {
        await self.clients.openWindow(targetUrl);
      } catch (_e) {
        /* ignore */
      }
    })()
  );
}

/* ─── Lifecycle (logging only — no caching, no fetch interception) ───── */

self.addEventListener("install", function (event) {
  // Activate immediately — don't wait for tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  // Take control of all open clients immediately.
  event.waitUntil(self.clients.claim());
});

// NOTE: We intentionally do NOT add a `fetch` listener here. The main /sw.js
// owns the caching layer (precache + runtime strategies). This SW is purely
// for FCM background push + click handling. Adding a fetch listener would
// conflict with /sw.js or duplicate network traffic.
