"use client";

import { create } from "zustand";

const COOKIE_NAME = "tawfir_admin_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
  // maxAge=null → كوكي جلسة فقط (يُمسح عند إغلاق المتصفح)
  const maxAgeAttr = maxAge === null ? "" : `; Max-Age=${maxAge}`;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/${maxAgeAttr}; SameSite=Lax${secure}`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface AuthState {
  accessToken: string | null;
  /** True until we've checked the cookie on the client. */
  hydrated: boolean;
  /** remember=true (افتراضي) → كوكي 7 أيام | false → كوكي جلسة فقط */
  setAuth: (token: string, remember?: boolean) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  hydrated: false,
  setAuth: (token, remember = true) => {
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
