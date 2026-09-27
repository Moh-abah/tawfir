import type { Metadata } from "next";
import { QuickNotesContent } from "@/components/pwa/QuickNotesContent";

/**
 * وجهة note_taking (new_note_url في الـmanifest) — «ملاحظة جديدة»
 * من نظام التشغيل تفتح هذه الصفحة جاهزة للكتابة الفورية.
 */
export const metadata: Metadata = {
  title: "ملاحظة جديدة | توفير",
  robots: { index: false, follow: false },
};

export default function NewNotePage() {
  return <QuickNotesContent />;
}
