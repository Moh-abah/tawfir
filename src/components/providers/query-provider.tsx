"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * QueryProvider — موفّر TanStack Query المركزي لتطبيق tawfir-front
 *
 * يُلَفّ التطبيق بالكامل من التخطيط الجذر (src/app/layout.tsx) بحيث تعمل
 * كل useQuery / useQueryClient في جميع المجموعات (public / owner / admin /
 * courier / factory) أثناء البناء على Vercel (prerendering) وفي التشغيل.
 *
 * مهم: هذا الملف جديد 100% ولا يستبدل أي ملف موجود.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
 // إنشاء العميل مرة واحدة لعمر الجلسة — النمط الرسمي الآمن مع SSR/prerender
 // (لا تنشئ QueryClient على مستوى الوحدة/الملف وإلا تشاركه كل الزوار على الخادم)
 const [queryClient] = useState(
  () =>
   new QueryClient({
    defaultOptions: {
     queries: {
      // دقيقة واحدة صلاحية للبيانات — أنسب للوحات التاجر/المندوب/الإدارة
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
     },
     mutations: {
      retry: 0,
     },
    },
   })
 );

 return (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
 );
}

export default QueryProvider;
