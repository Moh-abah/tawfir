"use client";

import { create } from "zustand";

const COOKIE_NAME = "tawfir_customer_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface CustomerAuthState {
  accessToken: string | null;
  /** True until we've checked the cookie on the client. */
  hydrated: boolean;
  setAuth: (token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>((set) => ({
  accessToken: null,
  hydrated: false,
  setAuth: (token) => {
    writeCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
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
