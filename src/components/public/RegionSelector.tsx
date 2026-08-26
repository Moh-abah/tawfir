"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useRegions } from "@/hooks/useRegions";
import { useRegionStore } from "@/store/region.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * منتقي المنطقة — سلوك Native (الجولة 4):
 *  - الموبايل: نص فقط (بلا dropdown) → يفتح BottomSheet بأسفل الشاشة
 *    بقائمة المناطق (rounded-t-2xl + مقبض سحب + safe-area)
 *  - الديسكتوب (sm+): Select كما هو
 *  - التبديل عبر CSS فقط (sm:hidden / hidden sm:flex) — صفر اختلاف ترطيب
 */
export function RegionSelector() {
  const { data, isLoading, error, refetch } = useRegions();
  const selectedRegionId = useRegionStore((s) => s.selectedRegionId);
  const setSelectedRegion = useRegionStore((s) => s.setSelectedRegion);
  const prefersReduced = usePrefersReducedMotion();

  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedRegion = data?.find((r) => r.id === selectedRegionId);

  const handleMobileSelect = (id: number) => {
    setSelectedRegion(id);
    setSheetOpen(false);
  };

  /* ── حالة الخطأ ───────────────────────────────── */
  if (error) {
    return (
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <span className="text-sm text-destructive">تعذّر تحميل المناطق</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="native-tap"
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  /* ── لا مناطق ─────────────────────────────────── */
  if (!isLoading && (!data || data.length === 0)) {
    return (
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <span className="text-sm text-muted-foreground">لا توجد مناطق</span>
      </div>
    );
  }

  return (
    <>
      {/* ── الموبايل: زر نص فقط → BottomSheet ── */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setSheetOpen(true)}
        aria-label="اختيار المنطقة"
        aria-haspopup="dialog"
        className="native-tap h-9 max-w-full gap-1 rounded-full px-2.5 sm:hidden"
      >
        {!prefersReduced && !selectedRegionId && (
          <motion.span
            className="relative flex h-2 w-2 shrink-0"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          </motion.span>
        )}
        <MapPin
          className="h-4 w-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="max-w-[120px] truncate text-xs font-bold text-foreground">
          {selectedRegion?.name ?? "اختر منطقتك"}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Button>

      {/* ── الديسكتوب: Select كما هو ── */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {!prefersReduced && !selectedRegionId && (
          <motion.span
            className="relative hidden h-2.5 w-2.5 sm:flex"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </motion.span>
        )}
        {selectedRegionId != null && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="hidden h-5 w-5 items-center justify-center rounded-full bg-primary/15 sm:flex"
          >
            <Check className="h-3.5 w-3.5 text-primary" />
          </motion.span>
        )}
        <Select
          value={selectedRegionId != null ? String(selectedRegionId) : undefined}
          onValueChange={(val) => setSelectedRegion(Number(val))}
        >
          <SelectTrigger
            className="hidden h-9 w-56 sm:flex"
            aria-label="اختيار المنطقة"
          >
            <SelectValue placeholder="اختر منطقتك" />
          </SelectTrigger>
          <SelectContent>
            {data?.map((region) => (
              <SelectItem key={region.id} value={String(region.id)}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── BottomSheet المناطق (موبايل) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[env(safe-area-inset-bottom)] max-h-[70dvh]"
        >
          <div className="bottom-sheet-grip mt-2" aria-hidden="true" />
          <SheetHeader className="pb-2 text-right">
            <SheetTitle className="flex items-center gap-2 text-base text-right">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              اختر منطقتك
            </SheetTitle>
          </SheetHeader>
          <div
            className="scroll-area-thin max-h-[52dvh] space-y-1 overflow-y-auto px-4 pb-4"
            role="listbox"
            aria-label="قائمة المناطق"
          >
            {isLoading ? (
              data == null &&
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))
            ) : (
              data?.map((region) => {
                const active = region.id === selectedRegionId;
                return (
                  <button
                    key={region.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => handleMobileSelect(region.id)}
                    className={cn(
                      "native-tap flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 py-3 text-right text-sm font-bold transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{region.name}</span>
                    {active && (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
