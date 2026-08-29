"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { OwnerAuthGuard } from "@/components/owner/OwnerAuthGuard";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerMobileTopBar } from "@/components/owner/OwnerMobileTopBar";
import { OwnerMobileBottomNav } from "@/components/owner/OwnerMobileBottomNav";
import { OwnerMobileMenuSheet } from "@/components/owner/OwnerMobileMenuSheet";

/**
 * هيكل بوابة المالك (عميل) — الواجهة والحراسة.
 * فُصل عن layout.tsx ليصبح الـ layout مكوّن Server يستطيع
 * تصدير ميتا تطبيق المالك الديناميكية.
 *
 * الجولة 9 (المهمة 8): إعادة تصميم موبايل-أولاً Native.
 * - الديسكتوب (≥md): السايدبار القديم (OwnerSidebar)
 * - الموبايل (<md): شريط علوي 56px + شريط سفلي 4 تبويبات + Sheet قائمة
 */
export function OwnerPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // استخراج facilityId من المسار لتمريره لقائمة ☰
  let facilityId: number | null = null;
  if (pathname) {
    const m = pathname.match(/\/owner\/facilities\/(\d+)/);
    if (m) facilityId = Number(m[1]);
  }

  return (
    <OwnerAuthGuard>
      <div className="flex min-h-screen flex-col">
        {/* شريط علوي موبايل 56px (md:hidden) — ☰ + اسم المتجر + جرس */}
        <OwnerMobileTopBar
          onOpenMenu={() => setMenuOpen(true)}
          className="md:hidden"
        />

        <div className="flex flex-1">
          {/* سايدبار ديسكتوب فقط — md:flex */}
          <OwnerSidebar />
          <main
            className="no-mobile-scrollbar flex-1 overflow-x-hidden"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
              {/* إضافة مساحة سفلية على الموبايل للشريط السفلي الثابت 56px */}
              <div className="pb-16 md:pb-0">{children}</div>
            </div>
          </main>
        </div>

        {/* شريط سفلي موبايل 56px (md:hidden) — 4 تبويبات */}
        <OwnerMobileBottomNav
          onOpenMenu={() => setMenuOpen(true)}
          className="md:hidden"
        />

        {/* Sheet قائمة ☰ — يفتحه زر ☰ + زر «القائمة» */}
        <OwnerMobileMenuSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          facilityId={facilityId}
        />
      </div>
    </OwnerAuthGuard>
  );
}
