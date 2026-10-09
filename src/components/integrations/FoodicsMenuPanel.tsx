"use client";

/**
 * FoodicsMenuPanel.tsx — تبويب «منيو فودكس» (أدمن)
 * جدول قراءة فقط: الاسم · السعر · حالة الربط · المعرف الخارجي.
 * حدود v4.1 مقصودة: لا تحرير ولا حذف ولا ربط منتج محلي —
 * ومن حاول الربط يرى التلميح المتعاقد عليه.
 */
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  useFoodicsMenu,
  useIntegrationsConnections,
} from "@/hooks/useIntegrations";
import { integrationErrorText } from "@/services/integrations.service";
import { AlertLine } from "./integrations-ui";
import { FoodicsSyncButton } from "./FoodicsSyncButton";

export function FoodicsMenuPanel() {
  const [facilityId, setFacilityId] = useState<string>("");
  const parsedFacilityId = facilityId.trim() ? Number(facilityId.trim()) : null;
  const menu = useFoodicsMenu(parsedFacilityId);
  const connections = useIntegrationsConnections();

  const foodicsConnection =
    (connections.data ?? []).find((c) => String(c.provider).toLowerCase() === "foodics") ?? null;

  const items = menu.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="menu-facility"
            className="text-xs font-medium text-muted-foreground"
          >
            معرف المنشأة (اختياري — اتركه فارغاً للاتصال العام)
          </label>
          <Input
            id="menu-facility"
            type="number"
            min={1}
            dir="ltr"
            placeholder="facility_id"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="h-9 w-52"
          />
        </div>
        <FoodicsSyncButton facilityId={parsedFacilityId} variant="default" />
      </div>

      {menu.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {integrationErrorText(menu.error)}
        </div>
      ) : menu.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium">لا منيو بعد</p>
          <p className="text-xs text-muted-foreground">
            فعّل الاتصال واضغط «مزامنة المنيو الآن» لجلب منيو فودكس.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">حالة الربط</TableHead>
                <TableHead className="text-right">المعرف الخارجي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={item.id ?? i}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell dir="ltr" className="text-left font-mono text-xs">
                    {item.price != null ? String(item.price) : "—"}
                  </TableCell>
                  <TableCell>
                    {String(item.status ?? "unmapped").toLowerCase() === "mapped" ? (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/30"
                      >
                        مربوط
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                        غير مربوط
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell dir="ltr" className="text-left font-mono text-[11px] text-muted-foreground">
                    {item.external_id ?? item.remote_id ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* تذييل: العدد + آخر مزامنة من الاتصال */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>عدد العناصر: {items.length}</span>
        {foodicsConnection?.last_sync_at && (
          <span>آخر مزامنة: {formatDate(foodicsConnection.last_sync_at)}</span>
        )}
      </div>

      {/* حدود v4.1 المقصودة */}
      <AlertLine>
        الجدول للقراءة فقط — <strong className="text-foreground">الربط بالمنتجات المحلية يأتي في
        الجولة القادمة</strong>. لا تحرير ولا حذف في هذه المرحلة.
      </AlertLine>
    </div>
  );
}
