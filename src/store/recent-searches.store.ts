"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** الحد الأقصى لعدد عمليات البحث المحفوظة. */
const MAX_RECENT = 5;

interface RecentSearchesState {
  /** آخر كلمات البحث (الأحدث أولاً) — بلا فراغات زائدة. */
  searches: string[];
  /** إضافة/تحديث كلمة بحث (ترتفع للأمام إن كانت موجودة). */
  addRecentSearch: (term: string) => void;
  /** إزالة كلمة واحدة. */
  removeRecentSearch: (term: string) => void;
  /** مسح الكل. */
  clearRecentSearches: () => void;
}

/**
 * مخزن «بحثك الأخير» — الجولة 10 (ميزة جديدة).
 *
 * محلي بالكامل (localStorage) — لا يحتاج تسجيل دخول. يُعرض كرقائق (chips)
 * أسفل حقل البحث في الرئيسية عندما يكون الحقل فارغاً.
 */
export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set, get) => ({
      searches: [],
      addRecentSearch: (term) => {
        const clean = term.trim().slice(0, 40);
        if (clean.length < 2) return;
        const rest = get().searches.filter((s) => s !== clean);
        set({ searches: [clean, ...rest].slice(0, MAX_RECENT) });
      },
      removeRecentSearch: (term) =>
        set({ searches: get().searches.filter((s) => s !== term) }),
      clearRecentSearches: () => set({ searches: [] }),
    }),
    {
      name: "tawfir-recent-searches",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
