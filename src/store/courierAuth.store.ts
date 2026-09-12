"use client";

/**
 * courierAuth.store — مخزن جلسة بوابة المندوب (البوابة الرابعة).
 * ═══════════════════════════════════════════════════════════════
 * جزيرة مستقلة تماماً (قاعدة §7-2): كوكي مستقل `tawfir_courier_*` —
 * لا يتقاطع مطلقاً مع كوكيات العميل/المالك/المشرف في المتصفح نفسه
 * (يمكن لمندوب أن يكون عميلاً أيضاً على الجهاز ذاته).
 *
 * النمط مستنسخ حرفياً من customerAuth.store (أنماط الثيم القائمة).
 */

import { create } from "zustand";

const COOKIE_NAME = "tawfir_courier_token";
const REFRESH_COOKIE_NAME = "tawfir_courier_refresh";
/** 7 أيام — عمر توكن التجديد عند الخادم */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

interface CourierAuthState {
  accessToken: string | null;
  /** رمز التحديث (7 أيام) — يجعل الجلسة تعيش بعد انتهاء الـ access (15 دقيقة). */
  refreshToken: string | null;
  hydrated: boolean;
  /** تسجيل دخول المندوب — يخزّن الزوجين معاً. */
  setAuth: (token: string, refreshToken?: string | null) => void;
  /** بعد تجديد ناجح — استبدال الزوجين (التدوير يُبطل القديم فوراً). */
  updateTokens: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useCourierAuthStore = create<CourierAuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  setAuth: (token, refreshToken = null) => {
    writeCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
    if (refreshToken)
      writeCookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_MAX_AGE);
    else eraseCookie(REFRESH_COOKIE_NAME);
    set({ accessToken: token, refreshToken, hydrated: true });
  },
  updateTokens: (token, refreshToken) => {
    writeCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
    writeCookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_MAX_AGE);
    set({ accessToken: token, refreshToken, hydrated: true });
  },
  clearAuth: () => {
    eraseCookie(COOKIE_NAME);
    eraseCookie(REFRESH_COOKIE_NAME);
    set({ accessToken: null, refreshToken: null });
  },
  hydrate: () => {
    const token = readCookie(COOKIE_NAME);
    const refreshToken = readCookie(REFRESH_COOKIE_NAME);
    set({ accessToken: token, refreshToken, hydrated: true });
  },
}));
