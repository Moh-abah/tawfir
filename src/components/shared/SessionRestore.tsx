"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { useAuthStore } from "@/store/auth.store";
import { attemptRefresh } from "@/services/token-refresh";
import type { TokenOut } from "@/types/api.generated";

/**
 * استعادة الجلسة عند الإقلاع (الجولة 18 + توسيع الجولة 22):
 *
 * المشكلة المكتشفة في QA: كوكي access عمره 15 دقيقة، بينما كوكي refresh
 * يعيش 7 أيام. عند انتهاء/فقدان كوكي access وبقاء refresh صالح كان التطبيق
 * يُظهر المستخدم كضيف حتى أول طلب 401 — تجربة «تسجيل خروج صامت» مزعجة.
 *
 * الحل: عند أول تركيب، إن وُجد refresh بلا access نجرّب التجديد فوراً.
 * محاولة واحدة فقط لكل دور ولكل إقلاع (ref guard) — الفشل يُترك
 * للمسار العادي (401).
 *
 * الجولة 22 — التوسيع: كان يشمل العميل فقط. الآن يشمل الأدوار الثلاثة
 * (العميل ← المالك ← المشرف) — كل متجر له كوكيزه المستقلة:
 *   • tawfir_customer_refresh → customerAuth.store
 *   • tawfir_owner_refresh    → ownerAuth.store
 *   • tawfir_admin_refresh    → auth.store
 * نجرّب الدور الأول الذي يملك refresh صالحاً بلا access (الأولوية للعميل
 * لأنه البوابة الافتراضية على نفس النطاق) — أدوار أخرى قد تكون مسجلة
 * كذلك في المتصفح نفسه، فتُستعاد دورها عند دخول بوابتها لاحقاً عبر
 * مسار 401 العادي.
 */

/** دالة استعادة موحّدة لدور واحد — تعيد true إذا استُعيدت جلسة فعلية */
async function restoreRole(
  role: "customer" | "owner" | "admin",
  hydrate: () => void,
  getState: () => { accessToken: string | null; refreshToken: string | null },
  updateTokens: (access: string, refresh: string) => void,
): Promise<boolean> {
  /* ترطيب المتجر إن لم يُرتَّب بعد (قراءة الكوكيز) */
  hydrate();

  const { accessToken, refreshToken } = getState();
  /* لا داعي للتجديد: إما جلسة حية أو لا refresh أصلاً */
  if (accessToken || !refreshToken) return false;

  const tokens: TokenOut | null = await attemptRefresh(role, () =>
    getState().refreshToken,
  );
  if (!tokens) return false;

  /* refresh_token اختياري في TokenOut — نسقط على المخزن إن غاب
     (نفس نمط عملاء API). إن لم يُعثر refresh صالح نتجاهل. */
  const newRefresh = tokens.refresh_token ?? getState().refreshToken;
  if (!newRefresh) return false;
  updateTokens(tokens.access_token, newRefresh);
  return true;
}

export function SessionRestore() {
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    void (async () => {
      /* 1) العميل — البوابة الرئيسية */
      const customerRestored = await restoreRole(
        "customer",
        () => {
          const store = useCustomerAuthStore.getState();
          if (!store.hydrated) store.hydrate();
        },
        () => useCustomerAuthStore.getState(),
        (a, r) => useCustomerAuthStore.getState().updateTokens(a, r),
      ).catch(() => false);

      /* 2) المالك — بوابة المتاجر */
      const ownerRestored = await restoreRole(
        "owner",
        () => {
          const store = useOwnerAuthStore.getState();
          if (!store.hydrated) store.hydrate();
        },
        () => useOwnerAuthStore.getState(),
        (a, r) => useOwnerAuthStore.getState().updateTokens(a, r),
      ).catch(() => false);

      /* 3) المشرف — لوحة التحكم */
      const adminRestored = await restoreRole(
        "admin",
        () => {
          const store = useAuthStore.getState();
          if (!store.hydrated) store.hydrate();
        },
        () => useAuthStore.getState(),
        (a, r) => useAuthStore.getState().updateTokens(a, r),
      ).catch(() => false);

      /* إبطال استعلامات الهوية والبيانات لتلتقط أي جلسة استُعادت */
      if (customerRestored || ownerRestored || adminRestored) {
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        await queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      }
    })();
  }, [queryClient]);

  return null;
}
