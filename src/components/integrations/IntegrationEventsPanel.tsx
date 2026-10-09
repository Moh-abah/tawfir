"use client";

/**
 * IntegrationEventsPanel.tsx — تبويب «سجل الأحداث» (أدمن)
 * أول مكان يُنظر إليه عند أي دعم — سريع وقابل للتصفية.
 * فلاتر: المزود / معرف الطلب · الحد الافتراضي 100 صف.
 * الحمولة (payload) لا تُعرض كاملة — أيقونة تفتح Dialog بـ JSON منسق.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Info, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useIntegrationEvents } from "@/hooks/useIntegrations";
import { integrationErrorText } from "@/services/integrations.service";
import {
  EventDirectionIcon,
  eventStatusBadge,
  ProviderBadge,
} from "./integrations-ui";

export function IntegrationEventsPanel({ focusOrderId }: { focusOrderId?: number | null }) {
  const [provider, setProvider] = useState<string>("all");
  const [orderIdInput, setOrderIdInput] = useState<string>(
    focusOrderId != null ? String(focusOrderId) : ""
  );
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payloadText, setPayloadText] = useState<string>("");

  const parsedOrderId = orderIdInput.trim() ? Number(orderIdInput.trim()) : null;
  const query = useIntegrationEvents({
    provider: provider === "all" ? null : provider,
    order_id: parsedOrderId != null && !Number.isNaN(parsedOrderId) ? parsedOrderId : null,
    limit: 100,
  });

  const events = useMemo(() => {
    const list = query.data ?? [];
    return [...list].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [query.data]);

  function openPayload(e: (typeof events)[number]) {
    try {
      setPayloadText(JSON.stringify(e.payload ?? e, null, 2));
    } catch {
      setPayloadText(String(e.payload ?? "—"));
    }
    setPayloadOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* الفلاتر */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="events-provider" className="text-xs font-medium text-muted-foreground">
            المزود
          </label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="events-provider" className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المزودين</SelectItem>
              <SelectItem value="foodics">فودكس</SelectItem>
              <SelectItem value="supermile">سوبرمايل</SelectItem>
              <SelectItem value="deliverect">دليفيرِكت</SelectItem>
              <SelectItem value="bridge">جسر الحالة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="events-order" className="text-xs font-medium text-muted-foreground">
            معرف الطلب
          </label>
          <Input
            id="events-order"
            type="number"
            min={1}
            dir="ltr"
            placeholder="order_id"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => {
            setProvider("all");
            setOrderIdInput("");
          }}
        >
          <RotateCcw className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          تصفير
        </Button>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          {events.length} حدثاً
        </span>
      </div>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {integrationErrorText(query.error)}
        </div>
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
          <Info className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium">لا أحداث مطابقة</p>
          <p className="text-xs text-muted-foreground">
            تظهر الأحداث فور كل عملية من شاشات التكامل (اتصال/مزامنة/توصيل/دفع).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الوقت</TableHead>
                <TableHead className="text-right">المزود</TableHead>
                <TableHead className="text-right">نوع الحدث</TableHead>
                <TableHead className="text-right">الاتجاه</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الطلب</TableHead>
                <TableHead className="text-right">الحمولة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e, i) => {
                const badge = eventStatusBadge(e.status);
                return (
                  <TableRow key={e.id ?? i}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {e.created_at ? formatDate(e.created_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <ProviderBadge provider={e.provider ?? undefined} />
                    </TableCell>
                    <TableCell dir="ltr" className="text-left font-mono text-xs">
                      {e.event_type ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EventDirectionIcon direction={e.direction} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.order_id != null ? (
                        <Link
                          href={`/admin/orders?order=${e.order_id}`}
                          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        >
                          #{e.order_id}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        aria-label="عرض الحمولة"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/60"
                        onClick={() => openPayload(e)}
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* حوار الحمولة — تصحيح أدمن فقط */}
      <Dialog open={payloadOpen} onOpenChange={setPayloadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>حمولة الحدث (تصحيح)</DialogTitle>
            <DialogDescription>نص JSON منسق كما ورد من الخادم.</DialogDescription>
          </DialogHeader>
          <pre
            dir="ltr"
            className="max-h-[50vh] overflow-auto rounded-lg bg-muted/60 p-3 text-left font-mono text-[11px] leading-relaxed"
          >
            {payloadText}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
