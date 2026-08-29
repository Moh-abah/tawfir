"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { attemptRefresh } from "@/services/token-refresh";

/**
 * استعادة الجلسة عند الإقلاع (الجولة 18):
 *
 * المشكلة المكتشفة في QA: كوكي access عمره 15 دقيقة، بينما كوكي refresh
 * يعيش 7 أيام. عند انتهاء/فقدان كوكي access وبقاء refresh صالح كان التطبيق
 * يُظهر المستخدم كضيف حتى أول طلب 401 — تجربة «تسجيل خروج صامت» مزعجة.
 *
 * الحل: عند أول تركيب، إن وُجد refresh بلا access نجرّب التجديد فوراً.
 * محاولة واحدة فقط لكل إقلاع (ref guard) — الفشل يُترك للمسار العادي (401).
 */
export function SessionRestore() {
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    /* ترطيب متجر الجلسة إن لم يُرتَّب بعد (قراءة الكوكيز) */
    const store = useCustomerAuthStore.getState();
    if (!store.hydrated) store.hydrate();

    const { accessToken, refreshToken } = useCustomerAuthStore.getState();
    /* لا داعي للتجديد: إما جلسة حية أو لا refresh أصلاً */
    if (accessToken || !refreshToken) return;

    attemptRefresh("customer", () => useCustomerAuthStore.getState().refreshToken)
      .then((tokens) => {
        if (!tokens) return;
        /* refresh_token اختياري في TokenOut — نسقط على المخزن إن غاب
           (نفس نمط customer-api-client). إن لم يُعثر refresh صالح نتجاهل. */
        const newRefresh =
          tokens.refresh_token ?? useCustomerAuthStore.getState().refreshToken;
        if (!newRefresh) return;
        const { updateTokens } = useCustomerAuthStore.getState();
        updateTokens(tokens.access_token, newRefresh);
        /* إبطال استعلامات الهوية والطلبات لتلتقط الجلسة المستعادة */
        queryClient.invalidateQueries({ queryKey: ["me"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      })
      .catch(() => {
        /* تجديد فاشل (شبكة/خادم) — الجلسة تُترك للضيف مؤقتاً؛
           أول طلب 401 سيمر بمسار التجديد العادي */
      });
  }, [queryClient]);

  return null;
}
