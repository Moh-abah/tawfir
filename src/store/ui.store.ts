"use client";

import { create } from "zustand";

interface UiState {
  theme: "light" | "dark";
  isAdminSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isOwnerSidebarOpen: boolean;
  isOwnerSidebarCollapsed: boolean;
  setTheme: (t: "light" | "dark") => void;
  setAdminSidebarOpen: (open: boolean) => void;
  toggleAdminSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setOwnerSidebarOpen: (open: boolean) => void;
  toggleOwnerSidebar: () => void;
  toggleOwnerSidebarCollapsed: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "dark",
  isAdminSidebarOpen: false,
  isSidebarCollapsed: false, // افتراضياً موسع
  isOwnerSidebarOpen: false,
  isOwnerSidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  setAdminSidebarOpen: (open) => set({ isAdminSidebarOpen: open }),
  toggleAdminSidebar: () =>
    set((s) => ({ isAdminSidebarOpen: !s.isAdminSidebarOpen })),
  toggleSidebarCollapsed: () =>
    set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setOwnerSidebarOpen: (open) => set({ isOwnerSidebarOpen: open }),
  toggleOwnerSidebar: () =>
    set((s) => ({ isOwnerSidebarOpen: !s.isOwnerSidebarOpen })),
  toggleOwnerSidebarCollapsed: () =>
    set((s) => ({ isOwnerSidebarCollapsed: !s.isOwnerSidebarCollapsed })),
}));