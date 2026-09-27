"use client";

/**
 * قارئ مخزون المشاركات (share_target) من IndexedDB
 * ═══════════════════════════════════════════════════════════════
 * Service Worker يعترض مشاركات نظام التشغيل (POST multipart) ويخزّنها
 * في قاعدة tawfir-pwa-queue → متجر share-target بالمفتاح "latest"
 * ثم يعيد توجيه المتصفح إلى صفحة المعاينة. هذه الواجهة هي الطرف
 * المقابل في الصفحة: تقرأ المخزون مرة واحدة وتمسحه بعد القراءة.
 *
 * ⚠ يجب أن تبقى أسماء القاعدة/المتجر متطابقة مع src/lib/pwa/sw-source.ts
 */

export interface SharedStash {
  title: string;
  text: string;
  url: string;
  file: Blob | null;
  fileName: string;
  fileType: string;
  receivedAt: number;
}

const QUEUE_DB_NAME = "tawfir-pwa-queue";
const QUEUE_DB_VERSION = 1;
const SHARE_STORE = "share-target";
const SHARE_KEY = "latest";

/** يقرأ آخر مشاركة مستلمة (بلا حذف — آمن مع StrictMode/إعادة التركيب). */
export function readSharedStash(): Promise<SharedStash | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const openReq = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VERSION);
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains("outbox")) {
          db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(SHARE_STORE)) {
          db.createObjectStore(SHARE_STORE);
        }
      };
      openReq.onsuccess = () => {
        const db = openReq.result;
        try {
          const tx = db.transaction(SHARE_STORE, "readonly");
          const getReq = tx.objectStore(SHARE_STORE).get(SHARE_KEY);
          getReq.onsuccess = () => {
            resolve((getReq.result as SharedStash | undefined) ?? null);
          };
          getReq.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
          tx.onerror = () => {
            try {
              db.close();
            } catch {
              /* تجاهل */
            }
            resolve(null);
          };
        } catch {
          try {
            db.close();
          } catch {
            /* تجاهل */
          }
          resolve(null);
        }
      };
      openReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** يمسح المخزون بعد الاستهلاك الفعلي (نداء صريح من الصفحة). */
export function clearSharedStash(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    try {
      const openReq = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VERSION);
      openReq.onsuccess = () => {
        const db = openReq.result;
        try {
          const tx = db.transaction(SHARE_STORE, "readwrite");
          tx.objectStore(SHARE_STORE).delete(SHARE_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            try {
              db.close();
            } catch {
              /* تجاهل */
            }
            resolve();
          };
        } catch {
          try {
            db.close();
          } catch {
            /* تجاهل */
          }
          resolve();
        }
      };
      openReq.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
