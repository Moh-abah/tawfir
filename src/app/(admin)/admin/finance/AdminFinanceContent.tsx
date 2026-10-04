"use client";

/**
 * AdminFinanceContent — لوحة الأدمن المالية الشاملة (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 * أكبر شاشة في الجولة المالية v2 — خمسة تبويبات:
 *   1) الإعدادات المالية — تعديل حي لمفاتيح /finance/settings
 *   2) إشعارات اليمن — مراجعة تسديدات التحويل البنكي (قبول/رفض)
 *   3) الصرف للمندوبين — payouts + مزامنة مويسر + تنفيذ صرف
 *   4) دفتر القيود — entries بفلاتر وترقيم + تصدير CSV
 *   5) لوحة المالكين — overview: عمولات/ذمم/بطاقة تاجر
 *
 * كل البيانات من adminFinanceService عبر hooks useFinance حصراً —
 * لا نداءات مباشرة من المكوّنات (عقد الجولة المالية v2).
 */

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BellRing,
  ScrollText,
  Settings2,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminFinanceSettings from "@/components/admin/AdminFinanceSettings";
import AdminYemenNotifications from "@/components/admin/AdminYemenNotifications";
import AdminPayouts from "@/components/admin/AdminPayouts";
import AdminFinanceEntries from "@/components/admin/AdminFinanceEntries";
import AdminOwnersOverview from "@/components/admin/AdminOwnersOverview";

interface FinanceTab {
  value: string;
  label: string;
  icon: LucideIcon;
}

const FINANCE_TABS: FinanceTab[] = [
  { value: "settings", label: "الإعدادات المالية", icon: Settings2 },
  { value: "yemen", label: "إشعارات اليمن", icon: BellRing },
  { value: "payouts", label: "الصرف للمندوبين", icon: Banknote },
  { value: "entries", label: "دفتر القيود", icon: ScrollText },
  { value: "owners", label: "لوحة المالكين", icon: Users },
];

export default function AdminFinanceContent() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">المالية</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مركز التحكم المالي — إعدادات حية تسرّي فوراً، مراجعة تسديدات اليمن،
          صرف المناديب، دفتر القيود وذمم التجار.
        </p>
      </div>

      <Tabs defaultValue="settings" dir="rtl" className="gap-4">
        {/* شريط تبويبات قابل للتمرير أفقياً على الموبايل */}
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1">
          {FINANCE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="min-h-[44px] flex-1 gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs sm:flex-none sm:text-sm"
            >
              <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="settings" className="mt-2">
          <AdminFinanceSettings />
        </TabsContent>
        <TabsContent value="yemen" className="mt-2">
          <AdminYemenNotifications />
        </TabsContent>
        <TabsContent value="payouts" className="mt-2">
          <AdminPayouts />
        </TabsContent>
        <TabsContent value="entries" className="mt-2">
          <AdminFinanceEntries />
        </TabsContent>
        <TabsContent value="owners" className="mt-2">
          <AdminOwnersOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
