"use client";

/**
 * /courier/tasks — سجل مهامي (شاشة 7/11).
 * GET /courier/tasks?period=&status=&page= — فلترة زمنية (الكل/اليوم/
 * الأسبوع/الشهر) وحالية (المنجزة/الملغاة) + ترقيم صفحات.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCourierTasksHistory } from "@/hooks/useCourier";
import type { CourierTask } from "@/services/courier-api-client";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIODS = [
  { v: "all", l: "الكل" },
  { v: "today", l: "اليوم" },
  { v: "week", l: "الأسبوع" },
  { v: "month", l: "الشهر" },
] as const;

const STATUSES = [
  { v: undefined, l: "الكل" },
  { v: "completed" as const, l: "المنجزة" },
  { v: "cancelled" as const, l: "الملغاة" },
] as const;

function TaskRow({ task, index }: { task: CourierTask; index: number }) {
  const completed = task.status === "completed";
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={cn(
        "rounded-2xl border p-4 shadow-soft",
        completed
          ? "border-primary/25 bg-card"
          : "border-destructive/25 bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              completed
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {completed ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-foreground">
              {task.facility_name ?? "متجر"} · طلب #{task.order_id}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {task.created_at
                ? new Date(task.created_at).toLocaleString("ar", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-sm font-black text-foreground">
            {formatCurrency(task.fee)}
          </p>
          <p
            className={cn(
              "text-[10px] font-bold",
              completed ? "text-primary" : "text-destructive",
            )}
          >
            {task.status_ar}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground" dir="rtl">
        {task.distance_display} · {task.breakdown}
      </p>
    </motion.li>
  );
}

export default function CourierTasksHistoryPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["v"]>("all");
  const [status, setStatus] = useState<"completed" | "cancelled" | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useCourierTasksHistory({ period, status, page });

  const items = (data?.items ?? []) as CourierTask[];
  const totalPages = Number(data?.pages ?? 0) || 1;

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-8">
      <CourierScreenHeader
        title="مهامي"
        subtitle="سجل مهامك المنجزة والملغاة"
        icon={ClipboardList}
      />

      {/* فلاتر الفترة */}
      <section aria-label="فلاتر السجل">
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-area-thin">
          {PERIODS.map((p) => (
            <Button
              key={p.v}
              size="sm"
              variant={period === p.v ? "default" : "outline"}
              onClick={() => {
                setPeriod(p.v);
                setPage(1);
              }}
              aria-pressed={period === p.v}
              className="h-10 shrink-0 rounded-xl px-4 text-xs font-bold native-tap"
            >
              {p.l}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s.l}
              size="sm"
              variant={status === s.v ? "default" : "outline"}
              onClick={() => {
                setStatus(s.v);
                setPage(1);
              }}
              aria-pressed={status === s.v}
              className="h-10 flex-1 rounded-xl text-xs font-bold native-tap"
            >
              {s.l}
            </Button>
          ))}
        </div>
      </section>

      {/* القائمة */}
      {isLoading ? (
        <ul className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <WaitMode
          reason={error instanceof Error ? error.message : "تعذّر تحميل سجل مهامك"}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا مهام في هذه الفترة"
          description="غيّر الفلتر أو ابدأ باستقبال النداءات من الرئيسية"
        />
      ) : (
        <ul className="space-y-3" dir="rtl">
          {items.map((t, i) => (
            <TaskRow key={t.task_id} task={t} index={i} />
          ))}
        </ul>
      )}

      {/* الترقيم */}
      {totalPages > 1 && (
        <nav
          aria-label="ترقيم الصفحات"
          className="flex items-center justify-center gap-3 pt-1"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-10 gap-1 rounded-xl native-tap"
            aria-label="الصفحة السابقة"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            السابق
          </Button>
          <span className="text-xs font-bold text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-10 gap-1 rounded-xl native-tap"
            aria-label="الصفحة التالية"
          >
            التالي
            <ChevronLeft
              className="h-4 w-4 rotate-180"
              aria-hidden="true"
            />
          </Button>
        </nav>
      )}
    </main>
  );
}
