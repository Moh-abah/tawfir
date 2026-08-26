"use client";

import { useState, useMemo } from "react";
import { RefreshCcw, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { getAuditLabel } from "@/lib/audit-labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-64" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

/** Map predefined Arabic categories to actual action_type values */
const ACTION_CATEGORY_MAP: Record<string, string[]> = {
  all: [],
  create: ["create", "PRODUCT_CREATED", "PRODUCT_IMPORT"],
  update: ["update", "OWNER_FACILITY_UPDATED", "PRODUCT_UPDATED", "PRODUCT_AVAILABILITY_TOGGLED", "USER_ROLE_UPDATED"],
  delete: ["delete", "PRODUCT_DELETED"],
  login: ["login", "logout", "OWNER_LOGIN"],
};

interface AuditTableProps {
  predefinedFilter?: string;
}

export function AuditTable({ predefinedFilter }: AuditTableProps) {
  const { data, isLoading, error, refetch } = useAdminAuditLogs();
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");

  /* Extract unique action types */
  const uniqueActionTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((log) => set.add(log.action_type));
    return Array.from(set).sort();
  }, [items]);

  /* Determine which action types to include based on both filters */
  const filteredItems = useMemo(() => {
    let result = items;

    /* Apply predefined category filter from parent page */
    if (predefinedFilter && predefinedFilter !== "all") {
      const types = ACTION_CATEGORY_MAP[predefinedFilter];
      if (types && types.length > 0) {
        result = result.filter((log) => types.includes(log.action_type));
      }
    }

    /* Apply internal specific action filter */
    if (actionFilter !== "all") {
      result = result.filter((log) => log.action_type === actionFilter);
    }

    return result;
  }, [items, actionFilter, predefinedFilter]);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /* When predefined filter changes, reset internal filter */
  const effectiveActionTypes = predefinedFilter && predefinedFilter !== "all"
    ? uniqueActionTypes.filter((t) => ACTION_CATEGORY_MAP[predefinedFilter]?.includes(t))
    : uniqueActionTypes;

  return (
    <div className="space-y-4">
      {/* Filter and total count row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">
          إجمالي السجلات: {total}
        </p>
        {effectiveActionTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48 min-h-[44px]">
                <SelectValue placeholder="فلتر حسب النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {effectiveActionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {getAuditLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-10"> </TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>التفاصيل</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-destructive">
                      تعذّر تحميل سجل العمليات.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      className="gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      إعادة المحاولة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : filteredItems.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {actionFilter !== "all" || (predefinedFilter && predefinedFilter !== "all")
                    ? "لا توجد سجلات لهذا الفلتر."
                    : "لا توجد عمليات مسجّلة."}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {filteredItems.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasDetails = log.details && Object.keys(log.details).length > 0;
                return (
                  <>
                    <TableRow
                      key={log.id}
                      className={cn(
                        "even:bg-muted/15 hover:bg-muted/30 transition-colors",
                        hasDetails && "cursor-pointer"
                      )}
                      onClick={() => hasDetails && toggleExpand(log.id)}
                    >
                      <TableCell>
                        {hasDetails && (
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAuditLabel(log.action_type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {log.details
                          ? typeof log.details === "string"
                            ? log.details
                            : JSON.stringify(log.details)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">
                        {log.ip_address || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                    </TableRow>
                    {isExpanded && hasDetails && (
                      <TableRow key={`${log.id}-detail`} className="border-r-4 border-r-primary/30">
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <pre
                            className="max-h-48 overflow-auto rounded-lg bg-background p-3 text-xs leading-relaxed"
                            dir="ltr"
                          >
                            <code>{JSON.stringify(log.details, null, 2)}</code>
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          )}
        </Table>
      </div>
    </div>
  );
}