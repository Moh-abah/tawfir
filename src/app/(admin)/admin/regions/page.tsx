"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCcw, Map as MapIcon, Store, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { RegionForm } from "@/components/admin/RegionForm";
import {
  useAdminRegions,
  useDeleteRegion,
} from "@/hooks/useAdminRegions";
import { useAdminFacilities } from "@/hooks/useAdminFacilities";
import { cn } from "@/lib/utils";
import type { Region } from "@/types/api.generated";

/* ─── Border color cycling ──────────────────────── */
const BORDER_COLORS = [
  "border-r-primary",
  "border-r-secondary",
  "border-r-accent",
];

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function AdminRegionsPage() {
  const { data: regions, isLoading, error, refetch } = useAdminRegions();
  const { data: facilitiesData } = useAdminFacilities(1, 200);
  const deleteRegion = useDeleteRegion();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Region | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(search.trim().toLowerCase());
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  /* Count facilities per region */
  const facilityCountByRegion = useMemo(() => {
    const map = new Map<number, number>();
    facilitiesData?.items?.forEach((f) => {
      map.set(f.region_id, (map.get(f.region_id) ?? 0) + 1);
    });
    return map;
  }, [facilitiesData]);

  const filteredRegions = useMemo(() => {
    if (!regions) return [];
    if (!debounced) return regions;
    return regions.filter((r) => r.name.toLowerCase().includes(debounced));
  }, [regions, debounced]);

  const regionsWithFacilities = useMemo(() => {
    if (!regions) return 0;
    return regions.filter((r) => (facilityCountByRegion.get(r.id) ?? 0) > 0).length;
  }, [regions, facilityCountByRegion]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(region: Region) {
    setEditing(region);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (deletingId === null) return;
    await deleteRegion.mutateAsync(deletingId);
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة المناطق</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إضافة وتعديل وحذف المناطق المتاحة على المنصة.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة منطقة
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم..."
          className="pr-9"
          aria-label="بحث"
        />
      </div>

      {/* Visual stats row */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MapIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{regions?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">إجمالي المناطق</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{regionsWithFacilities}</p>
              <p className="text-xs text-muted-foreground">مناطق تحتوي منشآت</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>المعرّف (slug)</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المنشآت</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
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
                      تعذّر تحميل المناطق.
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
          ) : filteredRegions.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {debounced ? "لا توجد مناطق تطابق البحث." : "لا توجد مناطق بعد. ابدأ بإضافة منطقة جديدة."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {filteredRegions.map((region, index) => {
                const fCount = facilityCountByRegion.get(region.id) ?? 0;
                return (
                  <TableRow
                    key={region.id}
                    className={cn(BORDER_COLORS[index % BORDER_COLORS.length])}
                  >
                    <TableCell className="font-medium">{region.name}</TableCell>
                    <TableCell className="text-muted-foreground" dir="ltr">
                      {region.slug}
                    </TableCell>
                    <TableCell>
                      {region.is_active ? (
                        <Badge>مفعّلة</Badge>
                      ) : (
                        <Badge variant="secondary">معطّلة</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Store className="h-3.5 w-3.5" />
                        {fCount > 0 ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {fCount}
                          </Badge>
                        ) : (
                          <span className="text-xs">0</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="تعديل"
                          onClick={() => openEdit(region)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="حذف"
                          onClick={() => setDeletingId(region.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          )}
        </Table>
      </div>

      <RegionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه المنطقة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}