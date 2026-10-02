"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "owner" | "admin" | "console" | "customer" | "courier";

interface SessionState {
  tokens: Record<Role, string | null>;
  /** منشأة المالك المختارة حالياً (لوحة المنشآت) */
  ownerFacilityId: number | null;
  ownerFacilityName: string | null;
  setToken: (role: Role, token: string | null) => void;
  setOwnerFacility: (id: number | null, name?: string | null) => void;
  logoutRole: (role: Role) => void;
  logoutAll: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      tokens: { owner: null, admin: null, console: null, customer: null, courier: null },
      ownerFacilityId: null,
      ownerFacilityName: null,
      setToken: (role, token) =>
        set((s) => ({ tokens: { ...s.tokens, [role]: token } })),
      setOwnerFacility: (id, name) =>
        set({ ownerFacilityId: id, ownerFacilityName: name ?? null }),
      logoutRole: (role) =>
        set((s) => ({ tokens: { ...s.tokens, [role]: null } })),
      logoutAll: () =>
        set({
          tokens: { owner: null, admin: null, console: null, customer: null, courier: null },
          ownerFacilityId: null,
          ownerFacilityName: null,
        }),
    }),
    { name: "tawfir-factory-session" }
  )
);

export type SectionId =
  | "home"
  | "owner-brand"
  | "owner-site"
  | "owner-couriers"
  | "admin-sites"
  | "console"
  | "generated-site"
  | "factory-dev";

interface NavState {
  section: SectionId;
  setSection: (s: SectionId) => void;
}

export const useNav = create<NavState>()((set) => ({
  section: "home",
  setSection: (section) => set({ section }),
}));
