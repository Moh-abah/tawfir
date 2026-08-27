"use client";

import { create } from "zustand";

const COOKIE_NAME = "tawfir_admin_token";
const REFRESH_COOKIE_NAME = "tawfir_admin_refresh";
/** يخزن خيار «تذكّرني» بنفس بقاء التوكن (1=7 أيام / 0=جلسة) */
const REMEMBER_COOKIE_NAME = "tawfir_admin_remember";
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
  // maxAge=null → كوكي جلسة (يُمحى عند إغلاق المتصفح)
  const maxAgePart = maxAge === null ? "" : `; Max-Age=${maxAge}`;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/;${maxAgePart}; SameSite=Lax${secure}`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface AuthState {
  accessToken: string | null;
  /** رمز التحديث (7 أيام) — يجعل الجلسة تعيش بعد انتهاء الـ access (15 دقيقة). */
  refreshToken: string | null;
  hydrated: boolean;
  /** remember=true (افتراضي) → كوكي 7 أيام | false → كوكي جلسة فقط */
  setAuth: (token: string, remember?: boolean, refreshToken?: string | null) => void;
  /** بعد تجديد ناجح — استبدال الزوجين بنفس خيار «تذكّرني» المحفوظ */
  updateTokens: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

function persistTokens(token: string, refreshToken: string | null, remember: boolean, set: (s: Partial<AuthState>) => void) {
  writeCookie(COOKIE_NAME, token, remember ? COOKIE_MAX_AGE : null);
  writeCookie(REMEMBER_COOKIE_NAME, remember ? "1" : "0", remember ? COOKIE_MAX_AGE : null);
  if (refreshToken) writeCookie(REFRESH_COOKIE_NAME, refreshToken, remember ? COOKIE_MAX_AGE : null);
  else eraseCookie(REFRESH_COOKIE_NAME);
  set({ accessToken: token, refreshToken, hydrated: true });
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  setAuth: (token, remember = true, refreshToken = null) =>
    persistTokens(token, refreshToken, remember, set),
  updateTokens: (token, refreshToken) =>
    persistTokens(token, refreshToken, readCookie(REMEMBER_COOKIE_NAME) !== "0", set),
  clearAuth: () => {
    eraseCookie(COOKIE_NAME);
    eraseCookie(REFRESH_COOKIE_NAME);
    eraseCookie(REMEMBER_COOKIE_NAME);
    set({ accessToken: null, refreshToken: null });
  },
  hydrate: () => {
    const token = readCookie(COOKIE_NAME);
    const refreshToken = readCookie(REFRESH_COOKIE_NAME);
    set({ accessToken: token, refreshToken, hydrated: true });
  },
}));
