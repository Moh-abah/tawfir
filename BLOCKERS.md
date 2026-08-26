# BLOCKERS — توفير (الجولة 3)

## FCM Push Notifications (Outside App)

**Status:** موقوف مؤقتاً (Partial — بدون FCM حقيقي)

**Reason:** مكتبة `firebase` غير مثبتة في المشروع. الـ WebSocket المُنفّذ في `src/lib/ws-client.ts` يكفي للإشعارات الفورية **داخل التطبيق**. لتسجيل توكن FCM حقيقي (للإشعارات خارج التطبيق / Push) يجب:

1. تثبيت firebase: `bun add firebase`
2. إعداد `firebase-messaging-sw.js` في `public/` (Service Worker منفصل)
3. الحصول على `firebaseConfig` من مشروع Firebase Console
4. استبدال منطق التوليد في `src/components/shared/FcmRegistrar.tsx` بـ:
   ```ts
   import { getMessaging, getToken } from "firebase/messaging";
   import { initializeApp } from "firebase/app";
   // ... init app with config, then getToken(messaging, { vapidKey })
   ```
5. تسجيل الـ VAPID key في الباك إند إن لزم.

**Workaround الحالي:** `FcmRegistrar.tsx` يولّد pseudo-token فريد لكل جلسة، يُسجّله في `/fcm/token` (للتحقق من أن المسار يعمل)، ويحذفه عند الخروج. الـ WebSocket يغطّي الإشعارات الفورية الكاملة أثناء استخدام التطبيق.
