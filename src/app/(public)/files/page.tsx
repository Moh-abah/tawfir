import type { Metadata } from "next";
import { FilesHandlerContent } from "@/components/pwa/FilesHandlerContent";

/**
 * وجهة فتح الملفات لتطبيق العميل (file_handlers في الـmanifest) —
 * فتح صورة/PDF من نظام التشغيل واختيار «توفير» يعرضها هنا عبر launchQueue.
 */
export const metadata: Metadata = {
  title: "فتح ملفات | توفير",
  robots: { index: false, follow: false },
};

export default function FilesPage() {
  return <FilesHandlerContent />;
}
