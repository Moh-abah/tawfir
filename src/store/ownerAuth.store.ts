"use client";

import { create } from "zustand";

const COOKIE_NAME = "tawfir_owner_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days when remember me is checked
// عندما لا يُ checked "تذكّرني" نستخدم كوكي جلسة (لا Max-Age) فيُمحى عند إغلاق المتصفح

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number | null) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  // maxAge === null → كوكي جلسة (يُمحى عند إغلاق المتصفح)
  const maxAgePart = maxAge === null ? "" : `; Max-Age=${maxAge}`;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/;${maxAgePart}; SameSite=Lax${secure}`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface OwnerAuthState {
  accessToken: string | null;
  hydrated: boolean;
  /** remember=true → كوكي 7 أيام. remember=false/null → كوكي جلسة فقط */
  setAuth: (token: string, remember?: boolean) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useOwnerAuthStore = create<OwnerAuthState>((set) => ({
  accessToken: null,
  hydrated: false,
  setAuth: (token, remember = true) => {
    // remember=false → null (كوكي جلسة) | remember=true → 7 أيام
    writeCookie(COOKIE_NAME, token, remember ? COOKIE_MAX_AGE : null);
    set({ accessToken: token, hydrated: true });
  },
  clearAuth: () => {
    eraseCookie(COOKIE_NAME);
    set({ accessToken: null });
  },
  hydrate: () => {
    const token = readCookie(COOKIE_NAME);
    set({ accessToken: token, hydrated: true });
  },
}));
