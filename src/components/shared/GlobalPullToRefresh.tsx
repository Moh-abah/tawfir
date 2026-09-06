"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

/**
 * السحب للتحديث العام — يُركّب في (public)/layout.tsx ليُحلّ محل مؤشر
 * المتصفح الافتراضي في كل صفحات العميل بمؤشر توفير المخصص (نمط نيتفليكس).
 *
 * عند التحديث:
 *  1) يُبطّل كل استعلامات React Query الرئيسية (تُعاد من الباك إند)
 *  2) يُطلق router.refresh() لإعادة تشغيل Server Components
 *  3) ينتظر كلاهما (مدة عرض دنيا مضمونة في PullToRefresh)
 *
 * يُحاط به كل أبناء الـlayout عدا شاشات الدخول (login/register/reset-password)
 * لأنها لا تحتاج تحديث بيانات.
 */
const GLOBAL_QUERY_KEYS = [
  ["products"],
  ["products-nearby"],
  ["special-offers"],
  ["facilities"],
  ["cards"],
  ["orders"],
  ["notifications"],
  ["unread-count"],
  ["membership-info"],
  ["me"],
  ["regions"],
] as const;

export function GlobalPullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([
      ...GLOBAL_QUERY_KEYS.map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
      router.refresh(),
    ]);
  }, [queryClient, router]);

  return <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>;
}
