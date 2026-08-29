"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePwaStore } from "@/store/pwa.store";
import { isNativePlatform } from "@/lib/capacitor";

export type PwaPortal = "customer" | "owner";

/**
 * مفاتيح رفض زر التثبيت لكل بوابة (localStorage).
 * بعد الرفض أو التثبيت لا تظهر مطالبة beforeinstallprompt مجدداً.
 */
const DISMISS_KEY: Record<PwaPortal, string> = {
  customer: "tawfir_install_dismissed",
  owner: "tawfir_install_dismissed_owner",
};

/* حدث داخلي لإشعار المتجر عند التخزين من نفس التبويب */
const DISMISS_EVENT = "tawfir-install-dismissed-change";

function isDismissed(portal: PwaPortal): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY[portal]) === "1";
  } catch {
    return false;
  }
}

function subscribeToDismiss(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function usePwaInstall(portal: PwaPortal) {
  const { promptEvent, standalone, ios, setPromptEvent } = usePwaStore();

  /* قراءة الرفض من localStorage عبر useSyncExternalStore:
     لقطة الخادم «مرفوض» (إخفاء) حتى لا يختلف الترطيب،
     ولقطة العميل القيمة الحقيقية */
  const dismissed = useSyncExternalStore(
    subscribeToDismiss,
    () => isDismissed(portal),
    () => true
  );

  /* يختفي داخل تطبيق Native (Capacitor) — التثبيت يتم عبر متجر Play،
     لا حاجة لزر PWA. يختفي أيضاً بعد التثبيت أو الرفض. */
  const canShow =
    !isNativePlatform() &&
    !standalone &&
    !dismissed &&
    (Boolean(promptEvent) || ios);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY[portal], "1");
    } catch {
      /* التخزين غير متاح — الإخفاء لهذه الجلسة فقط */
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, [portal]);

  const install = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unsupported"
  > => {
    const event = usePwaStore.getState().promptEvent;
    if (!event) return "unsupported";
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "dismissed") {
      /* رفض المستخدم لمطالبة المتصفح — نعتبره رفضاً دائماً */
      setPromptEvent(null);
      dismiss();
    }
    return choice.outcome;
  }, [dismiss, setPromptEvent]);

  return {
    canShow,
    canPrompt: Boolean(promptEvent),
    isIos: ios,
    isStandalone: standalone,
    install,
    dismiss,
  };
}
