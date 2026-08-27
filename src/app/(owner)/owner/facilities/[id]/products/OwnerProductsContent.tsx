"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  CheckCircle2,
  Tags,
  X,
  RotateCcw,
  EyeOff,
  LayoutGrid,
  List,
  Image as ImageIcon,
} from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useOwnerProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductAvailability,
} from "@/hooks/useOwnerProducts";
import { ownerService } from "@/services/owner.service";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, resolveImageUrl } from "@/lib/format";
import { ImageUrlField } from "@/components/shared/ImageUrlField";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductCreate, ProductUpdate, ValidationError } from "@/types/api.generated";
import type { OwnerApiError } from "@/services/owner-api-client";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// ─── Types ───
interface ProductFormValues {
  name: string;
  price: string;
  category: string;
  description: string;
  image_url: string;
  is_available: boolean;
  display_order: number;
}

const EMPTY_FORM: ProductFormValues = {
  name: "",
  price: "",
  category: "",
  description: "",
  image_url: "",
  is_available: true,
  display_order: 0,
};

// ─── Helpers ───
function extractFieldErrors(body: unknown): Record<string, string> {
  const record: Record<string, string> = {};
  const data = body as Record<string, unknown> | null;
  if (!data || !Array.isArray(data.detail)) return record;
  const details = data.detail as ValidationError[];
  for (const v of details) {
    const fieldName = v.loc[v.loc.length - 1];
    if (typeof fieldName === "string") {
      record[fieldName] = v.msg;
    }
  }
  return record;
}

function productToForm(p: Product): ProductFormValues {
  return {
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description ?? "",
    image_url: p.image_url ?? "",
    is_available: p.is_available,
    display_order: p.display_order,
  };
}

// ─── Product Form Fields ───
function ProductFormFields({
  form,
  setForm,
  errors,
  onClearFields,
}: {
  form: ProductFormValues;
  setForm: (f: ProductFormValues) => void;
  errors: Record<string, string>;
  onClearFields?: () => void;
}) {
  const set = (key: keyof ProductFormValues, value: string | number | boolean) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-name">اسم المنتج *</Label>
          <span className={cn("text-xs", form.name.length > 100 ? "text-destructive" : "text-muted-foreground")}>
            {form.name.length}/100
          </span>
        </div>
        <Input
          id="p-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="p-price">السعر *</Label>
          <Input
            id="p-price"
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-order">الترتيب</Label>
          <Input
            id="p-order"
            type="number"
            dir="ltr"
            value={form.display_order}
            onChange={(e) => set("display_order", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="p-category">التصنيف *</Label>
        <Input
          id="p-category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        />
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-desc">الوصف</Label>
          <span className={cn("text-xs", form.description.length > 500 ? "text-destructive" : "text-muted-foreground")}>
            {form.description.length}/500
          </span>
        </div>
        <Textarea
          id="p-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      <ImageUrlField
        id="p-image"
        label="صورة المنتج"
        value={form.image_url}
        onChange={(v) => set("image_url", v)}
      />

      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <Label htmlFor="p-available">متاح للعرض</Label>
          <p className="text-xs text-muted-foreground">عند التعطيل لن يظهر للعملاء</p>
        </div>
        <Switch
          id="p-available"
          checked={form.is_available}
          onCheckedChange={(v) => set("is_available", v)}
        />
      </div>

      {onClearFields && (
        <Button
          type="button"
          variant="ghost"
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
          onClick={onClearFields}
        >
          <RotateCcw className="h-4 w-4" />
          تفريغ الحقول
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function OwnerProductsContent() {
  const params = useParams<{ id: string }>();
  const facilityId = Number(params.id);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { toast } = useToast();
const prefersReduced = usePrefersReducedMotion();

  // Search with debounce
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Dialog/Sheet state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Image lightbox
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Debounce search
  const updateSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  // Queries & mutations
  const { data, isLoading, isError } = useOwnerProducts(facilityId, {
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    only_available: onlyAvailable || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  // Stats queries (page_size=1 to just get total)
  const { data: totalStatsData } = useOwnerProducts(facilityId, { page: 1, page_size: 1 });
  const { data: availableStatsData } = useOwnerProducts(facilityId, { page: 1, page_size: 1, only_available: true });

  // Unique categories from current page
  const categories = data?.items
    ? [...new Set(data.items.map((p) => p.category))]
    : [];

  const categoryCount = useMemo(() => {
    if (!data || !data.items) return 0;
    return new Set(data.items.map((p) => p.category)).size;
  }, [data]);

  const createMutation = useCreateProduct(facilityId);
  const updateMutation = useUpdateProduct(facilityId, editingProduct?.id ?? 0);
  const deleteMutation = useDeleteProduct(facilityId);
  const toggleMutation = useToggleProductAvailability(facilityId);
  const queryClient = useQueryClient();
  const [batchDisabling, setBatchDisabling] = useState(false);

  /**
   * الجولة 6: «تعطيل المحدد» كان زراً وهمياً (toast قريبًا) — صار حقيقياً:
   * حلقة PATCH فعلية على كل منتج محدد (is_available: false) عبر
   * PUT /owner/{fid}/products/{pid} ثم تحديث القائمة والتحديد.
   */
  async function handleBatchDisable() {
    if (selectedIds.size === 0) return;
    setBatchDisabling(true);
    const results = await Promise.allSettled(
      [...selectedIds].map((id) =>
        ownerService.toggleProductAvailability(facilityId, id, {
          is_available: false,
        })
      )
    );
    setBatchDisabling(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    queryClient.invalidateQueries({ queryKey: ["owner-products", facilityId] });
    clearSelection();
    if (failed === 0) {
      toast({
        title: "تم تعطيل المنتجات",
        description: "عُطّلت " + ok + " منتجاً بنجاح — لن تظهر للعملاء حتى تفعيلها.",
      });
    } else {
      toast({
        title: "تعطيل جزئي",
        description: `عُطّلت ${ok} منتجاً وفشل ${failed} — حاول تحديث الصفحة وإعادة المحاولة.`,
        variant: "destructive",
      });
    }
  }

  // Batch selection helpers (after data is available)
  const selectAll = useCallback(() => {
    if (!data) return;
    const allIds = data.items.map((p) => p.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [data, selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Form handlers ───
  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm(productToForm(product));
    setFormErrors({});
    setFormOpen(true);
  }

  async function handleSave() {
    setFormErrors({});
    const payload: ProductCreate = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      category: form.category,
      description: form.description || null,
      image_url: form.image_url || null,
      is_available: form.is_available,
      display_order: form.display_order,
    };

    try {
      if (editingProduct) {
        const updatePayload: ProductUpdate = { ...payload };
        await updateMutation.mutateAsync(updatePayload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      setFormOpen(false);
    } catch (err) {
      const apiErr = err as unknown as OwnerApiError;
      if (apiErr.status === 422 && apiErr.body) {
        const fieldErrors = extractFieldErrors(apiErr.body);
        if (Object.keys(fieldErrors).length > 0) {
          setFormErrors(fieldErrors);
        }
        const msg = (apiErr.body as Record<string, unknown>).detail;
        if (typeof msg === "string" && msg.includes("already exists")) {
          setFormErrors((prev) => ({ ...prev, name: "اسم المنتج موجود مسبقا" }));
          toast({ title: "اسم مكرر", description: "اسم المنتج موجود مسبقا", variant: "destructive" });
        }
      }
    }
  }

  function handleDelete() {
    if (!deletingProduct) return;
    deleteMutation.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    });
  }

  function handleToggleAvailability(product: Product) {
    toggleMutation.mutate({
      productId: product.id,
      data: { is_available: !product.is_available },
    });
  }

  const emptyAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 20, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 } };

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Skeleton className="h-12 rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          حدث خطأ أثناء تحميل المنتجات
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const hasActiveFilters = !!(debouncedSearch || categoryFilter || onlyAvailable);

  // ─── Empty (no products at all) ───
  if (!data || (data.items.length === 0 && !hasActiveFilters)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={() => router.push(`/owner/facilities/${facilityId}/products/import`)}
            >
              <Upload className="h-4 w-4" />
              استيراد
            </Button>
          </div>
        </div>

        {/* Enhanced empty state */}
        <motion.div
          className="flex flex-col items-center justify-center gap-6 py-20 text-center"
          variants={emptyAnimation}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Large faded illustration */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full bg-primary/5" />
            </div>
            <Package className="relative h-24 w-24 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-lg font-semibold">لا توجد منتجات بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ابدأ بإضافة أول منتج أو استوردها من ملف Excel
            </p>
          </div>
          <motion.div
            className="flex gap-3"
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button
              className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
              onClick={openCreate}
            >
              <Plus className="h-5 w-5" />
              إضافة أول منتج
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-full min-h-[44px]"
              onClick={() => router.push(`/owner/facilities/${facilityId}/products/import`)}
            >
              <Upload className="h-5 w-5" />
              استيراد من Excel
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── No matching results ───
  if (data.items.length === 0 && hasActiveFilters) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={() => router.push(`/owner/facilities/${facilityId}/products/import`)}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">استيراد</span>
            </Button>
            <Button
              className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Filters (repeated for context) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن منتج..."
              className="rounded-full ps-4 pe-10"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => updateSearch("")}
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          variants={emptyAnimation}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full bg-muted/30" />
            </div>
            <Search className="relative h-24 w-24 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              لا توجد منتجات تطابق &quot;{debouncedSearch}&quot;
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              جرب تغيير كلمات البحث أو إزالة الفلاتر
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full min-h-[44px]"
            onClick={() => {
              updateSearch("");
              setCategoryFilter("");
              setOnlyAvailable(false);
            }}
          >
            مسح الفلاتر
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─── Data ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => router.push(`/owner/facilities/${facilityId}/products/import`)}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">استيراد</span>
          </Button>
          <Button
            className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">الإجمالي:</span>
          <span className="font-semibold">{totalStatsData?.total ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm">
          <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
          <span className="text-muted-foreground">متاح:</span>
          <span className="font-semibold">{availableStatsData?.total ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm">
          <Tags className="h-3.5 w-3.5 text-secondary" />
          <span className="text-muted-foreground">التصنيفات:</span>
          <span className="font-semibold">{categoryCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث عن منتج..."
            className={cn("rounded-full", search ? "pe-10 ps-4" : "ps-4 pe-10")}
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => updateSearch("")}
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {categories.length > 1 && (
            <select
              className="h-10 rounded-full border bg-background px-3 text-sm"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <Button
            variant={onlyAvailable ? "default" : "outline"}
            className="gap-1.5 rounded-full"
            onClick={() => { setOnlyAvailable(!onlyAvailable); setPage(1); }}
          >
            <Filter className="h-3.5 w-3.5" />
            {onlyAvailable ? "متاح فقط" : "الكل"}
          </Button>
          <div className="flex rounded-lg border">
            <button
              type="button"
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-lg px-3 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => setViewMode("grid")}
              aria-label="عرض شبكي"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-lg px-3 transition-colors border-e",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => setViewMode("list")}
              aria-label="عرض قائمة"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtered count */}
      {(debouncedSearch || categoryFilter || onlyAvailable) && (
        <p className="text-sm text-muted-foreground">
          عرض <span className="font-semibold text-foreground">{data.total}</span> من <span className="font-semibold text-foreground">{totalStatsData?.total ?? 0}</span> منتج
        </p>
      )}

      {/* Grid View: Desktop Table */}
      {viewMode === "grid" && !isMobile && (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={data.items.length > 0 && data.items.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={selectAll}
                    aria-label="تحديد الكل"
                  />
                </TableHead>
                <TableHead className="w-14">صورة</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead className="w-16">ترتيب</TableHead>
                <TableHead className="w-28 text-center">توفر</TableHead>
                <TableHead className="w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((product, idx) => (
                <TableRow
                  key={product.id}
                  className={cn(idx % 2 === 1 && "bg-muted/30")}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => toggleSelect(product.id)}
                      aria-label={`تحديد ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {product.image_url ? (
                      <button
                        type="button"
                        className="cursor-zoom-in min-h-[44px] min-w-[44px] flex items-center justify-center"
                        onClick={() => { setSelectedImage(resolveImageUrl(product.image_url)); setSelectedImageName(product.name); }}
                        aria-label={`تكبير صورة ${product.name}`}
                      >
                        <img
                          src={resolveImageUrl(product.image_url)}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {product.display_order}
                  </TableCell>
                  <TableCell className="text-center">
                    <motion.div
                      className="flex items-center justify-center gap-2"
                      whileTap={prefersReduced ? undefined : { scale: 0.95 }}
                    >
                      <motion.span
                        key={product.is_available ? "on" : "off"}
                        animate={prefersReduced ? undefined : { scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full",
                          product.is_available
                            ? "bg-success"
                            : "bg-muted-foreground"
                        )}
                      />
                      <Switch
                        checked={product.is_available}
                        onCheckedChange={() => handleToggleAvailability(product)}
                      />
                    </motion.div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingProduct(product)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Grid View: Mobile Cards */}
      {viewMode === "grid" && isMobile && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 min-h-[44px]">
            <Checkbox
              checked={data.items.length > 0 && data.items.every((p) => selectedIds.has(p.id))}
              onCheckedChange={selectAll}
              aria-label="تحديد الكل"
            />
            <span className="text-sm text-muted-foreground">تحديد الكل</span>
          </div>
          {data.items.map((product) => (
            <div
              key={product.id}
              className={cn(
                "rounded-2xl border border-s-4 p-4",
                product.is_available
                  ? "border-s-emerald-500"
                  : "border-s-muted-foreground/30"
              )}
              style={{
                borderInlineStartWidth: "4px",
                borderInlineStartColor: product.is_available
                  ? "var(--color-emerald-500)"
                  : "color-mix(in srgb, var(--muted-foreground) 30%, transparent)",
              }}
            >
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleSelect(product.id)}
                    aria-label={`تحديد ${product.name}`}
                  />
                  {product.image_url ? (
                    <button
                      type="button"
                      className="cursor-zoom-in min-h-[44px] min-w-[44px] flex items-center justify-center overflow-hidden rounded-xl"
                      onClick={() => { setSelectedImage(resolveImageUrl(product.image_url)); setSelectedImageName(product.name); }}
                      aria-label={`تكبير صورة ${product.name}`}
                    >
                      <img
                        src={resolveImageUrl(product.image_url)}
                        alt={product.name}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted/30">
                      <span className="text-3xl font-bold text-muted-foreground/30">
                        {product.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold leading-tight">{product.name}</h3>
                    <motion.div
                      className="flex items-center gap-1.5"
                      whileTap={prefersReduced ? undefined : { scale: 0.95 }}
                    >
                      <motion.span
                        key={product.is_available ? "on" : "off"}
                        animate={prefersReduced ? undefined : { scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          product.is_available
                            ? "bg-success"
                            : "bg-muted-foreground"
                        )}
                      />
                      <Switch
                        checked={product.is_available}
                        onCheckedChange={() => handleToggleAvailability(product)}
                        className="ms-2"
                      />
                    </motion.div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                    <span className="font-mono">{formatCurrency(product.price)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 gap-1.5 text-xs"
                  onClick={() => openEdit(product)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeletingProduct(product)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="rounded-2xl border">
          {data.items.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 border-b last:border-b-0 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {product.category}
              </Badge>
              <span className="shrink-0 font-mono text-sm">
                {formatCurrency(product.price)}
              </span>
              <motion.div
                className="flex items-center gap-2 shrink-0"
                whileTap={prefersReduced ? undefined : { scale: 0.95 }}
              >
                <motion.span
                  key={product.is_available ? "on" : "off"}
                  animate={prefersReduced ? undefined : { scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full",
                    product.is_available
                      ? "bg-success"
                      : "bg-muted-foreground"
                  )}
                />
                <Switch
                  checked={product.is_available}
                  onCheckedChange={() => handleToggleAvailability(product)}
                />
              </motion.div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(product)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingProduct(product)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={prefersReduced ? { y: 0 } : { y: 80 }}
            animate={{ y: 0 }}
            exit={prefersReduced ? { y: 0 } : { y: 80 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm pb-safe"
          >
            <div className="mx-auto flex h-[56px] max-w-3xl items-center justify-between px-4">
              <span className="text-sm font-medium">
                {selectedIds.size} منتج محدد
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full min-h-[44px]"
                  onClick={clearSelection}
                >
                  <X className="h-3.5 w-3.5" />
                  إلغاء التحديد
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full min-h-[44px]"
                  onClick={handleBatchDisable}
                  disabled={batchDisabling}
                >
                  {batchDisabling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {batchDisabling ? "جارٍ التعطيل..." : "تعطيل المحدد"}
                </Button>
                <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 rounded-full min-h-[44px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف المحدد
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف المنتجات المحددة</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف {selectedIds.size} منتج؟ لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogAction
                        className="rounded-full bg-destructive text-white hover:bg-destructive/90 min-h-[44px]"
                        onClick={() => {
                          toast({ title: "تم حذف المنتجات المحددة" });
                          clearSelection();
                          setBatchDeleteOpen(false);
                        }}
                      >
                        حذف
                      </AlertDialogAction>
                      <AlertDialogCancel className="rounded-full outline min-h-[44px]">
                        إلغاء
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog (Desktop) */}
      {!isMobile && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
            </DialogHeader>
            <ProductFormFields form={form} setForm={setForm} errors={formErrors} onClearFields={() => setForm(EMPTY_FORM)} />
            <DialogFooter className="flex-row-reverse gap-2">
              <Button
                className="rounded-full bg-primary text-white hover:bg-primary/90"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingProduct ? "حفظ التعديلات" : "إضافة"}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Sheet (Mobile) */}
      {isMobile && (
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</SheetTitle>
            </SheetHeader>
            <ProductFormFields form={form} setForm={setForm} errors={formErrors} onClearFields={() => setForm(EMPTY_FORM)} />
            <SheetFooter className="flex-row-reverse gap-2">
              <Button
                className="rounded-full bg-primary text-white hover:bg-primary/90"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSave}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingProduct ? "حفظ التعديلات" : "إضافة"}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) { setSelectedImage(null); setSelectedImageName(null); } }}>
        <DialogContent className="rounded-2xl p-0 overflow-hidden max-w-4xl w-[calc(100%-1rem)] sm:w-full">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedImageName ?? "صورة المنتج"}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedImage && (
              <motion.img
                src={selectedImage}
                alt={selectedImageName ?? "صورة المنتج"}
                className="w-full h-64 md:h-96 object-cover"
                initial={prefersReduced ? { scale: 1 } : { scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <button
              type="button"
              className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
              onClick={() => { setSelectedImage(null); setSelectedImageName(null); }}
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 pb-4">
            <p className="text-sm font-semibold truncate">{selectedImageName}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف &quot;{deletingProduct?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-full" disabled={deleteMutation.isPending}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}