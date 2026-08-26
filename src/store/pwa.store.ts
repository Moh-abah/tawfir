"use client";

import { create } from "zustand";

/**
 * الحد الأدنى من واجهة حدث beforeinstallprompt
 * (غير معرّفة في lib.dom القياسية).
 */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PwaStore = {
  /** حدث التثبيت الملتقط (متاح فقط على متصفحات تدعم التثبيت الفوري) */
  promptEvent: InstallPromptEvent | null;
  /** يعمل التطبيق حالياً في وضع standalone (مثبت)؟ */
  standalone: boolean;
  /** الجهاز من عائلة iOS (سفاري — لا يدعم beforeinstallprompt) */
  ios: boolean;
  setPromptEvent: (event: InstallPromptEvent | null) => void;
  setStandalone: (value: boolean) => void;
  setIos: (value: boolean) => void;
};

export const usePwaStore = create<PwaStore>((set) => ({
  promptEvent: null,
  standalone: false,
  ios: false,
  setPromptEvent: (event) => set({ promptEvent: event }),
  setStandalone: (value) => set({ standalone: value }),
  setIos: (value) => set({ ios: value }),
}));
