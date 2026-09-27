import type { Metadata } from "next";
import { FilesHandlerContent } from "@/components/pwa/FilesHandlerContent";

/**
 * وجهة فتح الملفات لبوابة المالك (file_handlers في manifest المالك) —
 * فتح صور المنتجات/الفواتير من مدير الملفات واختيار «توفير مالك».
 * داخل src/app/owner (تخطيط خفيف بلا حماية بوابة) — المعاينة لا تحتاج
 * صلاحيات، وعمليات الرفع الفعلية تبقى داخل البوابة المحمية.
 */
export const metadata: Metadata = {
  title: "فتح ملفات | توفير مالك",
  robots: { index: false, follow: false },
};

export default function OwnerFilesPage() {
  return <FilesHandlerContent />;
}
