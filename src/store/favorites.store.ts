"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** الحد الأقصى لعدد المفضلات المحفوظة محلياً. */
const MAX_FAVORITES = 30;

interface FavoritesState {
  /** معرّفات المنتجات المفضلة (الأحدث أولاً). */
  favoriteIds: number[];
  /** تبديل حالة مفضلة لمنتج. */
  toggleFavorite: (productId: number) => boolean;
  /** هل المنتج مفضل؟ */
  isFavorite: (productId: number) => boolean;
  /** إزالة كل المفضلات. */
  clearFavorites: () => void;
}

/**
 * مخزن المفضلة — الجولة 10 (ميزة جديدة).
 *
 * المفضلة محلية بالكامل (localStorage) مثل نمط «آخر منطقة تصفّحها» —
 * لا تحتاج تسجيل دخول ولا أي API خادمي، وتعمل أوفلاين.
 *
 * skipHydration: تُعاد الترطيب يدوياً بعد التركيب في (public) layout
 * حتى لا يختلف أول عرض عميل عن الـ HTML المولَّد في الخادم — نفس
 * نمط region.store.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (productId) => {
        const current = get().favoriteIds;
        const exists = current.includes(productId);
        const next = exists
          ? current.filter((id) => id !== productId)
          : [productId, ...current].slice(0, MAX_FAVORITES);
        set({ favoriteIds: next });
        return !exists;
      },
      isFavorite: (productId) => get().favoriteIds.includes(productId),
      clearFavorites: () => set({ favoriteIds: [] }),
    }),
    {
      name: "tawfir-favorites",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
