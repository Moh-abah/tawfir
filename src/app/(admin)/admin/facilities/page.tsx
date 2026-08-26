"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCcw, Search, ImageOff, MapPin, Download, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton } from "@/components/shared/ImageWithSkeleton";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminFacilities,
  useDeleteFacility,
} from "@/hooks/useAdminFacilities";
import { useRegions } from "@/hooks/useRegions";
import { FacilityForm } from "@/components/admin/FacilityForm";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { resolveImageUrl } from "@/lib/format";
import type { Facility, FacilityType } from "@/types/api.generated";

const TYPE_LABELS: Record<FacilityType, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
  public_facility: "مرفق عام",
};

type FilterType = FacilityType | "all";

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "restaurant", label: "مطاعم" },
  { value: "cafe", label: "كافيهات" },
];

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

function FacilityImage({ src, name }: { src: string | null; name: string }) {
  const resolved = resolveImageUrl(src);
  if (!resolved) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    <ImageWithSkeleton
      src={resolved}
      alt={name}
      className="h-10 w-10 shrink-0 rounded-lg"
    />
  );
}

export default function AdminFacilitiesPage() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useAdminFacilities();
  const deleteFacility = useDeleteFacility();
  const { data: regions } = useRegions(false);

  const regionMap = useMemo(() => {
    const m = new Map<number, string>();
    regions?.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [regions]);

  const allFacilities = data?.items ?? [];

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | undefined>(undefined);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(search.trim().toLowerCase());
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const filtered = useMemo(() => {
    return allFacilities.filter((f) => {
      const matchType = typeFilter === "all" || f.type === typeFilter;
      const matchSearch = !debounced || f.name.toLowerCase().includes(debounced);
      return matchType && matchSearch;
    });
  }, [allFacilities, debounced, typeFilter]);

  async function confirmDelete() {
    if (deletingId === null) return;
    await deleteFacility.mutateAsync(deletingId);
    setDeletingId(null);
  }

  function openCreate() {
    setEditingFacility(undefined);
    setFormOpen(true);
  }

  function openEdit(facility: Facility) {
    setEditingFacility(facility);
    setFormOpen(true);
  }

  const hasActiveFilter = typeFilter !== "all" || debounced !== "";
  const showEmptyForFilter = !isLoading && !error && allFacilities.length > 0 && filtered.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة المنشآت</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة المطاعم والمقاهي والمرافق العامة.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة منشأة
        </Button>
      </div>

      {/* Search + Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المنشأة..."
            className="rounded-full pr-9"
            aria-label="بحث"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 min-h-[44px]"
            onClick={() => toast({ title: "قريبًا" })}
          >
            <MapPin className="h-4 w-4" />
            عرض الخريطة
          </Button>
          <Button
            variant="outline"
            className="gap-2 min-h-[44px]"
            onClick={() => toast({ title: "قريبًا" })}
          >
            <Download className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTypeFilter(tf.value)}
            className={cn(
              "min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors",
              typeFilter === tf.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Results counter */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          عرض {filtered.length} من {data?.total ?? allFacilities.length} منشأة
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"> </TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>الترتيب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-destructive">
                      تعذّر تحميل المنشآت.
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
          ) : showEmptyForFilter ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      لا توجد نتائج تطابق البحث أو الفلتر.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : allFacilities.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      لا توجد منشآت بعد.
                    </p>
                    <Button className="gap-2" onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      أول منشأة
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {filtered.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell>
                    <FacilityImage src={facility.image_url} name={facility.name} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>{facility.name}</span>
                      {facility.discount_rate != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          <BadgePercent className="h-3 w-3" aria-hidden="true" />
                          خصم {facility.discount_rate}%
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TYPE_LABELS[facility.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {regionMap.get(facility.region_id) ?? "—"}
                  </TableCell>
                  <TableCell>{facility.display_order}</TableCell>
                  <TableCell>
                    {facility.is_visible ? (
                      <Badge>ظاهرة</Badge>
                    ) : (
                      <Badge variant="secondary">مخفية</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="تعديل"
                        className="h-8 w-8"
                        onClick={() => openEdit(facility)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="حذف"
                        onClick={() => setDeletingId(facility.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      <Dialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه المنشأة؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeletingId(null)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FacilityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingFacility}
      />
    </div>
  );
}
