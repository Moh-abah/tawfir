import type { Metadata } from "next";
import { MonitorSmartphone } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

/**
 * تخطيط الكونسول المنفصل — /console
 * عزل متعمد ومعلن:
 *  - تخطيط مستقل بشريط داكن خاص — لا يشارك هيدر/فوتر المصنع ولا الموقع العام
 *  - جلسة كونسول مستقلة (zustand persist بمفتاح tawfir-factory-session — لا يمس مخازن اللوحات القائمة)
 *  - توكن /console/auth/login مرفوض 401 على أي مسار آخر (مثبت بالاختبار الحي)
 *  - noindex: أداة داخلية لا تُفهرس
 */
export const metadata: Metadata = {
  title: "الكونسول المنفصل — مصنع توفير",
  description:
    "غرفة تحكم المصنع: جاهزية الهوية، إصدار التطبيقات ببصمة فريدة، خزنة keystore، البناء، سجل البصمات.",
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold">الكونسول المنفصل — مصنع «توفير»</p>
              <p className="text-[11px] text-stone-400">
                صفحة مستقلة تماماً — جلسة وتوكن معزولان عن كل اللوحات
              </p>
            </div>
          </div>
          <a
            href="/factory"
            className="rounded-lg border border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            ← المركز الرئيسي للمصنع
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-auto border-t border-stone-800 bg-stone-900 pb-[env(safe-area-inset-bottom)] text-center">
        <p className="px-4 py-3 text-[11px] text-stone-500">
          الكونسول المنفصل · دخول حصري factory_admin · كل العقود من openapi.json — الأخطاء تُعرض حرفياً
        </p>
      </footer>

      <Toaster />
    </div>
  );
}
