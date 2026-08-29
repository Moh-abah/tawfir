"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** الحد الأقصى لعدد الوجبات المشاهدة مؤخراً. */
const MAX_RECENT = 12;

interface RecentlyViewedState {
  /** معرّفات المنتجات المُشاهدة (الأحدث أولاً). */
  productIds: number[];
  /** تسجيل مشاهدة منتج — يرفعه للأمام إن كان موجوداً. */
  trackView: (productId: number) => void;
  /** إزالة الكل. */
  clearRecent: () => void;
}

/**
 * مخزن «شاهدت مؤخراً» — الجولة 13 (ميزة جديدة).
 *
 * نمط المتاجر الكلاسيكي: عند زيارة صفحة وجبة تُسجَّل أعلى القائمة،
 * وتُعرض لاحقاً في شريط بالرئيسية «شاهدت مؤخراً» ليستأنف المستخدم
 * من حيث توقف. محلي بالكامل (localStorage) — لا يحتاج دخولاً.
 *
 * skipHydration + ترطيب يدوي في (public) layout — نفس نمط المخازن الأخرى.
 */
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      productIds: [],
      trackView: (productId) => {
        const current = get().productIds;
        const next = [
          productId,
          ...current.filter((id) => id !== productId),
        ].slice(0, MAX_RECENT);
        set({ productIds: next });
      },
      clearRecent: () => set({ productIds: [] }),
    }),
    {
      name: "tawfir-recently-viewed",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
