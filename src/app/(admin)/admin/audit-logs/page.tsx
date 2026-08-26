"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { AuditTable } from "@/components/admin/AuditTable";
import { getAuditLabel } from "@/lib/audit-labels";
import { exportToCSV } from "@/lib/csv-export";

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "جميع الإجراءات" },
  { value: "create", label: "إنشاء" },
  { value: "update", label: "تعديل" },
  { value: "delete", label: "حذف" },
  { value: "login", label: "تسجيل دخول" },
];

export default function AdminAuditLogsPage() {
  const { data } = useAdminAuditLogs();
  const total = data?.total ?? 0;
  const allLogs = data?.items ?? [];
  const [actionFilter, setActionFilter] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">سجل العمليات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجل عمليات الدخول والإضافة والتعديل والحذف على لوحة التحكم.
            <span className="mr-2 font-medium text-foreground">
              إجمالي السجلات: {total}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48 min-h-[44px]">
              <SelectValue placeholder="فلتر الإجراءات" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2 min-h-[44px]"
            disabled={allLogs.length === 0}
            onClick={() => {
              exportToCSV(
                "audit-logs.csv",
                ["المعرّف", "النوع", "المستخدم", "IP", "التاريخ", "التفاصيل"],
                allLogs.map((log) => [
                  String(log.id),
                  getAuditLabel(log.action_type),
                  log.user_id != null ? String(log.user_id) : "نظام",
                  log.ip_address || "",
                  log.created_at,
                  log.details ? JSON.stringify(log.details) : "",
                ]),
              );
            }}
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      <AuditTable predefinedFilter={actionFilter} />

      {allLogs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          عرض {allLogs.length} من {total} سجل
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        يتم تحديث السجل تلقائيًا عند العودة للنافذة.
      </p>
    </div>
  );
}