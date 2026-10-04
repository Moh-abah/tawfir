"use client";

/**
 * AdminFinanceEntries — تبويب «دفتر القيود» (Task 4-d)
 * ═══════════════════════════════════════════════════════════════
 *  - فلاتر: entry_type/party_type/currency/status (Select) + party_id
 *    (رقم اختياري) + ترقيم page/per_page=20.
 *  - المبلغ بلون الاتجاه: سالب = destructive، موجب = foreground —
 *    MoneyText بالعملة كما تعيدها الاستجابة.
 *  - تصدير CSV: adminFinanceService.exportCsv() → Blob → ObjectURL
 *    باسم tawfir-finance-entries.csv مع revokeObjectURL (cleanup).
 *  - ملاحظة موثقة: عمولات السعودية قد تظهر بالهللات (amount ×100)
 *    كما تعيدها الاستجابة — الحقل يُعرض من الخادم بلا تحويل.
 */

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { adminFinanceService } from "@/services/finance.service";
import type { EntriesFilter, FinanceEntry } from "@/services/finance.service";
import { useFinanceEntries } from "@/hooks/useFinance";
import {
  ENTRY_STATUS_AR,
  ENTRY_TYPE_AR,
  FinanceStatusBadge,
  MoneyText,
  PARTY_TYPE_AR,
} from "@/components/finance/finance-ui";
import { formatDate } from "@/lib/format";

const PER_PAGE = 20;

/** «الكل» — Radix Select يمنع قيمة "" لهذا نستخدم "all" وتحوّل لnull عند النداء */
const ALL = "all";

export default function AdminFinanceEntries() {
  const [entryType, setEntryType] = useState(ALL);
  const [partyType, setPartyType] = useState(ALL);
  const [currency, setCurrency] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [partyId, setPartyId] = useState("");
  const [page, setPage] = useState(1);

  /* تصدير CSV */
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filter: EntriesFilter = {
    page,
    per_page: PER_PAGE,
    entry_type: entryType === ALL ? null : entryType,
    party_type: partyType === ALL ? null : partyType,
    currency: currency === ALL ? null : currency,
    status: status === ALL ? null : status,
    party_id: partyId.trim() === "" ? null : Number(partyId),
  };

  const query = useFinanceEntries(filter);

  /* أي تغيير فلتر يعيد الترقيم للصفحة الأولى */
  const resetPage = () => setPage(1);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await adminFinanceService.exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tawfir-finance-entries.csv";
      link.click();
      /* cleanup — مهلة قصيرة لضمان اكتمال التنزيل قبل الإبطال */
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "تعذّر تصدير القيود — أعد المحاولة."
      );
    } finally {
      setExporting(false);
    }
  };

  const data = query.data;
  const items = data?.items ?? [];
  const pages = data?.pages ?? 0;
  const total = data?.total ?? 0;

  const selectField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`entries-${id}`} className="text-xs font-bold">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => { onChange(v); resetPage(); }}>
        <SelectTrigger id={`entries-${id}`} className="min-h-[44px] w-full bg-background" dir="rtl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── الفلاتر ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {selectField(
          "entry-type",
          "نوع القيد",
          entryType,
          setEntryType,
          [
            { value: ALL, label: "الكل" },
            ...Object.entries(ENTRY_TYPE_AR).map(([value, label]) => ({ value, label })),
          ]
        )}
        {selectField(
          "party-type",
          "الطرف",
          partyType,
          setPartyType,
          [
            { value: ALL, label: "الكل" },
            ...Object.entries(PARTY_TYPE_AR).map(([value, label]) => ({ value, label })),
          ]
        )}
        {selectField(
          "currency",
          "العملة",
          currency,
          setCurrency,
          [
            { value: ALL, label: "الكل" },
            { value: "SAR", label: "ر.س (SAR)" },
            { value: "YER", label: "ر.ي (YER)" },
          ]
        )}
        {selectField(
          "status",
          "الحالة",
          status,
          setStatus,
          [
            { value: ALL, label: "الكل" },
            ...Object.entries(ENTRY_STATUS_AR).map(([value, label]) => ({ value, label })),
          ]
        )}
        <div className="space-y-1.5">
          <Label htmlFor="entries-party-id" className="text-xs font-bold">
            رقم الطرف
          </Label>
          <Input
            id="entries-party-id"
            type="number"
            min={1}
            inputMode="numeric"
            dir="ltr"
            value={partyId}
            onChange={(e) => {
              setPartyId(e.target.value);
              resetPage();
            }}
            placeholder="اختياري"
            className="min-h-[44px] bg-background text-left"
          />
        </div>
      </div>

      {/* ── رأس الجدول: العنوان + تصدير CSV ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {data
            ? `صفحة ${data.page} من ${pages || 1} — المجموع ${total} قيد`
            : "جارٍ التحميل..."}
        </p>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="min-h-[44px] gap-1.5 rounded-full"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden="true" />
            )}
            تصدير CSV
          </Button>
          {exportError && (
            <p role="alert" className="text-[11px] font-bold text-destructive">
              {exportError}
            </p>
          )}
        </div>
      </div>

      {/* ── الحالات الثلاث ── */}
      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title="تعذّر تحميل دفتر القيود"
          message={
            query.error instanceof Error
              ? query.error.message
              : "لم نتمكن من جلب القيود. أعد المحاولة."
          }
          onRetry={() => query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="لا قيود مطابقة للفلاتر"
          description="جرّب توسيع الفلاتر أو الانتقال لصفحة أخرى."
        />
      ) : (
        <>
          {/* جدول — سطح المكتب */}
          <div className="hidden max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-border/60 md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الطرف</TableHead>
                  <TableHead className="text-right">الطلب</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                  <TableHead className="text-right">ملاحظة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="tabular-nums font-bold">{e.id}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-bold">
                      {ENTRY_TYPE_AR[e.entry_type] ?? e.entry_type}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {PARTY_TYPE_AR[e.party_type] ?? e.party_type} #{e.party_id}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {e.order_id != null ? `#${e.order_id}` : "—"}
                    </TableCell>
                    <TableCell>
                      <EntryAmount entry={e} />
                    </TableCell>
                    <TableCell>
                      <FinanceStatusBadge status={e.status} dictionary={ENTRY_STATUS_AR} />
                    </TableCell>
                    <TableCell>
                      {e.ref_id ? (
                        <span
                          dir="ltr"
                          className="inline-block max-w-[120px] truncate font-mono text-[11px] text-muted-foreground"
                          title={e.ref_id}
                        >
                          {e.ref_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={e.note ?? undefined}>
                      {e.note || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(e.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* بطاقات — موبايل */}
          <div className="grid gap-3 md:hidden">
            {items.map((e) => (
              <Card key={e.id} className="rounded-2xl border-border/60 shadow-soft">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">
                        {ENTRY_TYPE_AR[e.entry_type] ?? e.entry_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PARTY_TYPE_AR[e.party_type] ?? e.party_type} #{e.party_id}
                        {e.order_id != null && ` · طلب #${e.order_id}`}
                      </p>
                    </div>
                    <FinanceStatusBadge status={e.status} dictionary={ENTRY_STATUS_AR} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <EntryAmount entry={e} strong className="text-base" />
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(e.created_at)}
                    </span>
                  </div>
                  {(e.ref_id || e.note) && (
                    <dl className="space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs">
                      {e.ref_id && (
                        <div className="flex justify-between gap-2">
                          <dt className="shrink-0 text-muted-foreground">المرجع</dt>
                          <dd dir="ltr" className="truncate font-mono text-[11px] text-foreground">
                            {e.ref_id}
                          </dd>
                        </div>
                      )}
                      {e.note && (
                        <div className="flex justify-between gap-2">
                          <dt className="shrink-0 text-muted-foreground">ملاحظة</dt>
                          <dd dir="auto" className="text-foreground">{e.note}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── ترقيم الصفحات ── */}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || query.isFetching}
              className="min-h-[44px] gap-1 rounded-full"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              السابق
            </Button>
            <p className="text-xs font-bold text-muted-foreground">
              {data
                ? `صفحة ${data.page} من ${pages || 1} — المجموع ${total} قيد`
                : "—"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={pages === 0 || page >= pages || query.isFetching}
              className="min-h-[44px] gap-1 rounded-full"
            >
              التالي
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* ── ملاحظة موثقة (هللات السعودية) ── */}
          <p className="rounded-xl bg-amber-500/10 p-3 text-[11px] font-bold leading-relaxed text-amber-700 dark:text-amber-400">
            ملاحظة موثقة: عمولات السعودية قد تظهر بالهللات في القيود
            (amount ×100) كما تعيدها الاستجابة — الحقل يُعرض من الخادم
            كما هو بلا أي تحويل في الواجهة.
          </p>
        </>
      )}
    </div>
  );
}

/* ─── مبلغ القيد بلون الاتجاه (سالب = destructive) ──────────── */

function EntryAmount({
  entry,
  strong = true,
  className,
}: {
  entry: FinanceEntry;
  strong?: boolean;
  className?: string;
}) {
  return (
    <MoneyText
      amount={entry.amount}
      currency={entry.currency}
      strong={strong}
      className={`${entry.amount < 0 ? "text-destructive" : "text-foreground"} ${className ?? ""}`}
    />
  );
}
