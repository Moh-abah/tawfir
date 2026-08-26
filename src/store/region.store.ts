"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RegionState {
  selectedRegionId: number | null;
  setSelectedRegion: (id: number | null) => void;
}

/**
 * مخزن المنطقة المختارة — مثبَّت في localStorage حتى يفتح التطبيق
 * أوفلاين على آخر منطقة تصفّحها المستخدم («آخر بيانات ظهرت سابقاً»).
 *
 * skipHydration: تُعاد الترطبة يدوياً بعد التركيب في (public) layout
 * حتى لا يختلف أول عرض عميل عن الـ HTML المولَّد في الخادم.
 */
export const useRegionStore = create<RegionState>()(
  persist(
    (set) => ({
      selectedRegionId: null,
      setSelectedRegion: (id) => set({ selectedRegionId: id }),
    }),
    {
      name: "wafir-region",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
