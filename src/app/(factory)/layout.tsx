import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

/**
 * تخطيط مجموعة «المصنع» — يتداخل داخل التخطيط الجذر القائم في tawfir-front
 * (لا يكرر html/body). يضيف فقط: عنوان الصفحة + موجّه إشعارات sonner
 * الذي تستعمله مكوّنات المصنع (حزمة sonner موجودة أصلاً في package.json).
 */
export const metadata: Metadata = {
  title: "توفير — مصنع المنصات",
  description:
    "حزمة الهوية، مصنع المواقع، مناديب التاجر، وسكربت تعبئة التطبيقات — متصلة مباشرة بالباك إند الحي api.tawfir.giize.com.",
};

export default function FactoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
