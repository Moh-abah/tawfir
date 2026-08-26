"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsersTable } from "@/components/admin/UsersTable";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { exportToCSV } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/api.generated";

type RoleFilter = UserRole | "all";

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "customer", label: "عميل" },
  { value: "owner", label: "مالك" },
  { value: "admin", label: "مشرف" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: usersData } = useAdminUsers(debounced);
  const allUsers = usersData?.items ?? [];
  const total = usersData?.total ?? 0;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(search.trim());
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة العملاء</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عرض العملاء المسجّلين على المنصة والبحث فيهم.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 min-h-[44px]"
          disabled={allUsers.length === 0}
          onClick={() => {
            exportToCSV(
              "users.csv",
              ["الاسم", "البريد", "الجوال", "الدور", "تاريخ التسجيل"],
              allUsers.map((u) => [
                u.full_name,
                u.email,
                u.phone || "",
                u.role,
                u.created_at,
              ]),
            );
          }}
        >
          <Download className="h-4 w-4" />
          تصدير CSV
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد..."
          className="pr-9"
          aria-label="بحث"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((rf) => (
          <button
            key={rf.value}
            onClick={() => setRoleFilter(rf.value)}
            className={cn(
              "min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors",
              roleFilter === rf.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {rf.label}
          </button>
        ))}
      </div>

      <UsersTable search={debounced} roleFilter={roleFilter} />

      {allUsers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          عرض {allUsers.length} من {total} مستخدم
        </p>
      )}
    </div>
  );
}