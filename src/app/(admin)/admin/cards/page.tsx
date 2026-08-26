"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCcw, Store, EyeOff, Eye as EyeIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CardForm } from "@/components/admin/CardForm";
import {
  useAdminCards,
  useDeleteCard,
} from "@/hooks/useAdminCards";
import { useRegions } from "@/hooks/useRegions";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/api.generated";

/* ─── Color cycling for card preview circles ──────── */
const CARD_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-success",
  "bg-chart-4",
  "bg-cat-facility",
  "bg-cat-restaurant",
  "bg-cat-cafe",
];

const TABS = [
  { key: "all" as const, label: "الكل" },
  { key: "published" as const, label: "منشورة" },
  { key: "draft" as const, label: "مسودة" },
  { key: "expired" as const, label: "منتهية" },
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
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-8" />
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

export default function AdminCardsPage() {
  const { data, isLoading, error, refetch } = useAdminCards();
  const deleteCard = useDeleteCard();
  const { data: regions } = useRegions(false);

  const regionMap = useMemo(() => {
    const m = new Map<number, string>();
    regions?.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [regions]);

  const allCards = data?.items ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'expired'>('all');
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

  /* Card statistics */
  const tabCounts = useMemo(() => ({
    all: allCards.length,
    published: allCards.filter((c) => c.is_published).length,
    draft: allCards.filter((c) => !c.is_published).length,
    expired: 0,
  }), [allCards]);

  const totalCards = tabCounts.all;
  const publishedCount = tabCounts.published;
  const draftCount = tabCounts.draft;

  /* Filter cards by published status and search */
  const cards = useMemo(() => {
    let filtered = allCards;
    if (statusFilter === "published") filtered = filtered.filter((c) => c.is_published);
    else if (statusFilter === "draft") filtered = filtered.filter((c) => !c.is_published);
    else if (statusFilter === "expired") filtered = []; // no expired field yet
    if (debounced) filtered = filtered.filter((c) => c.name.toLowerCase().includes(debounced));
    return filtered;
  }, [allCards, statusFilter, debounced]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(card: Card) {
    setEditing(card);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (deletingId === null) return;
    await deleteCard.mutateAsync(deletingId);
    setDeletingId(null);
  }

  function openPreview(card: Card) {
    setSelectedCard(card);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة البطاقات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة بطاقات الخصم على المنصة.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة بطاقة
        </Button>
      </div>

      {/* Card statistics pills */}
      {!isLoading && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 px-3 py-1 text-xs">
            {totalCards} بطاقة
          </Badge>
          <Badge variant="outline" className="gap-1 px-3 py-1 text-xs bg-success/10 text-success border-success/25">
            {publishedCount} منشورة
          </Badge>
          <Badge variant="outline" className="gap-1 px-3 py-1 text-xs bg-accent/10 text-accent border-accent/25">
            {draftCount} مسودة
          </Badge>
        </div>
      )}

      {/* Search input */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم البطاقة..."
          className="pr-9"
          aria-label="بحث"
        />
      </div>

      {/* Status filter tabs with count badges */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors min-h-[44px]",
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
            <span className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
              statusFilter === tab.key
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>المنصة</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>الخصم</TableHead>
              <TableHead>المنشآت المشتركة</TableHead>
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
                      تعذّر تحميل البطاقات.
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
          ) : cards.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center text-sm text-muted-foreground"
                >
                  {statusFilter !== "all"
                    ? "لا توجد بطاقات بهذا الفلتر."
                    : "لا توجد بطاقات."}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {cards.map((card, index) => (
                <TableRow key={card.id} onClick={() => openPreview(card)} className="cursor-pointer even:bg-muted/15 hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-full",
                          CARD_COLORS[index % CARD_COLORS.length]
                        )}
                      />
                      <span className="font-medium">{card.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.platform_name}
                  </TableCell>
                  <TableCell>
                    {regionMap.get(card.region_id) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-secondary">
                      {card.discount_rate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Store className="h-3.5 w-3.5" />
                      {card.facilities.length}
                    </span>
                  </TableCell>
                  <TableCell>
                    {card.is_published ? (
                      <Badge className="bg-success/15 text-success border-success/25 hover:bg-success/15">
                        <EyeIcon className="h-3 w-3 ml-1" />
                        منشورة
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <EyeOff className="h-3 w-3" />
                        مسودة
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="معاينة"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(card);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="تعديل"
                        onClick={() => openEdit(card)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="حذف"
                        onClick={() => setDeletingId(card.id)}
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

      {/* Card Preview Dialog */}
      <Dialog open={selectedCard !== undefined} onOpenChange={(o) => !o && setSelectedCard(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedCard?.name}</DialogTitle>
            <DialogDescription>تفاصيل البطاقة</DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="card-glow space-y-4 rounded-xl border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-secondary/15 text-secondary border-secondary/25">
                  خصم {selectedCard.discount_rate}%
                </Badge>
                <Badge variant="outline">
                  {selectedCard.is_published ? "منشورة" : "مسودة"}
                </Badge>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">المنصة:</span>
                  <span className="font-medium">{selectedCard.platform_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">عدد المنشآت:</span>
                  <span className="font-medium">{selectedCard.facilities.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">المنطقة:</span>
                  <span className="font-medium">{regionMap.get(selectedCard.region_id) ?? "—"}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CardForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه البطاقة؟ لا يمكن التراجع عن هذا الإجراء.
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
