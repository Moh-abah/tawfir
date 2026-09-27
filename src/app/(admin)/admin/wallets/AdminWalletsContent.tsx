"use client";

/**
 * المحافظ والتحويلات — /admin/wallets
 * ═══════════════════════════════════════════════════════════════
 * شاشة الإدارة لجولة المحافظ اليمنية (الدفع بالتحويل اليدوي):
 *  - علم تشغيل/إيقاف الدفع عبر المحافظ (حي — تحديث ذاتي كل 30 ثانية).
 *  - النظرة الشاملة: إجماليات طلبات المحافظ ومبالغها
 *    (مؤكد / بانتظار المراجعة / بانتظار التكملة / مرفوض)
 *    + توزيع حسب المحفظة + أعلى المتاجر مستقبِلاً للتحويلات.
 *  - دليل المحافظ اليمنية (CRUD): جوالي، جيب، فلوسك... — الاسم والرمز
 *    والترتيب والتفعيل (التعطيل بدل الحذف عند وجود استخدام).
 *
 * كل البيانات من نقاط الإدارة الحية:
 *  GET /admin/wallets/overview • /admin/wallet-providers •
 *  /admin/settings/wallet-payments (+ PATCH) • CRUD للمزوّدين.
 */

import { useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  useAdminWalletOverview,
  useAdminWalletProviders,
  useAdminPaymentsFlag,
  useSetAdminPaymentsFlag,
  useCreateWalletProvider,
  useUpdateWalletProvider,
  useDeleteWalletProvider,
} from "@/hooks/useWallets";
import { formatCurrency } from "@/lib/format";
import type { WalletProviderOut } from "@/types/api-extra";
import { cn } from "@/lib/utils";

/* ─── بطاقة إحصائية ─────────────────────────────────────────── */

interface StatCardProps {
  icon: typeof Wallet;
  label: string;
  count: number | undefined;
  amount: number | undefined;
  tone: string;
}

function StatCard({ icon: Icon, label, count, amount, tone }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-soft">
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-lg font-black tabular-nums text-foreground">
            {count ?? "—"}
          </p>
          <p className="truncate text-[11px] font-bold tabular-nums text-muted-foreground">
            {amount === undefined ? "" : formatCurrency(amount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── قائمة التوزيع (حسب المحفظة / أعلى المتاجر) ────────────── */

interface RankRow {
  id: number;
  name: string;
  orders: number;
  amount: number;
}

function RankedRows({ rows, emptyText }: { rows: RankRow[]; emptyText: string }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row, i) => (
        <li key={row.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate text-sm font-bold text-foreground">
                {row.name}
              </span>
            </div>
            <div className="shrink-0 text-left">
              <p className="text-sm font-black tabular-nums text-foreground">
                {formatCurrency(row.amount)}
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {row.orders} طلب
              </p>
            </div>
          </div>
          {/* شريط نسبة المبلغ من الأعلى */}
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(4, (row.amount / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── شاشة التحميل ──────────────────────────────────────────── */

function WalletsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="جارٍ تحميل المحافظ والتحويلات">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/* ─── الشاشة الرئيسية ───────────────────────────────────────── */

export default function AdminWalletsContent() {
  const overview = useAdminWalletOverview();
  const providers = useAdminWalletProviders();
  const flag = useAdminPaymentsFlag();
  const setFlag = useSetAdminPaymentsFlag();
  const createProvider = useCreateWalletProvider();
  const updateProvider = useUpdateWalletProvider();
  const deleteProvider = useDeleteWalletProvider();

  /* نموذج إضافة/تعديل محفظة الدليل */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WalletProviderOut | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WalletProviderOut | null>(null);

  const providerRows = useMemo(() => {
    return [...(providers.data ?? [])].sort(
      (a, b) => a.display_order - b.display_order
    );
  }, [providers.data]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setDisplayOrder("");
    setFormOpen(true);
  };

  const openEdit = (p: WalletProviderOut) => {
    setEditing(p);
    setName(p.name);
    setCode(p.code ?? "");
    setDisplayOrder(String(p.display_order ?? ""));
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const orderNum = parseInt(displayOrder, 10);
    if (editing) {
      updateProvider.mutate(
        {
          id: editing.id,
          data: {
            name: trimmedName,
            code: code.trim() || null,
            display_order: Number.isFinite(orderNum) ? orderNum : editing.display_order,
          },
        },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createProvider.mutate(
        {
          name: trimmedName,
          code: code.trim() || null,
          display_order: Number.isFinite(orderNum) ? orderNum : undefined,
        },
        { onSuccess: () => setFormOpen(false) }
      );
    }
  };

  const toggleActive = (p: WalletProviderOut, is_active: boolean) =>
    updateProvider.mutate({ id: p.id, data: { is_active } });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProvider.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  /* حالة التحميل */
  if (overview.isLoading && providers.isLoading) {
    return <WalletsSkeleton />;
  }

  /* خطأ النظرة الشاملة — الشاشة بلا معنى بدونه */
  if (overview.isError) {
    return (
      <div className="space-y-6">
        <HeaderBlock
          onRefresh={() => overview.refetch()}
          refreshing={overview.isFetching}
        />
        <ErrorState
          title="تعذّر تحميل النظرة الشاملة"
          message="تحقق من الاتصال ثم أعد المحاولة."
          onRetry={() => overview.refetch()}
        />
      </div>
    );
  }

  const o = overview.data;
  const flagOn = flag.data?.wallet_payments_enabled ?? o?.wallet_payments_enabled ?? false;
  const refreshing = overview.isFetching || providers.isFetching;

  const handleRefresh = () => {
    overview.refetch();
    providers.refetch();
    flag.refetch();
  };

  return (
    <div className="space-y-6">
      <HeaderBlock onRefresh={handleRefresh} refreshing={refreshing} />

      {/* ── علم تشغيل/إيقاف الدفع عبر المحافظ (حي) ── */}
      <Card
        className={cn(
          "rounded-2xl border-border/60 shadow-soft transition-colors",
          flagOn && "border-primary/40"
        )}
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                flagOn ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <Wallet className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-foreground">
                الدفع عبر المحافظ اليمنية
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {flagOn
                  ? "مفعّل — العملاء يحوّلون للمحافظ والتجار يستقبلون الإشعارات."
                  : "معطّل — لن يقبل النظام طلبات الدفع عبر المحافظ."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-center">
            {flag.isLoading ? (
              <Skeleton className="h-6 w-11 rounded-full" />
            ) : (
              <Switch
                checked={flagOn}
                disabled={setFlag.isPending}
                onCheckedChange={(v) => setFlag.mutate(v)}
                aria-label="تشغيل أو إيقاف الدفع عبر المحافظ"
              />
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-extrabold",
                flagOn
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {flagOn ? "مفعّل" : "معطّل"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── ملخص الدليل والمحافظ المسجلة ── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Chip>
          الدليل: {o ? `${o.active_providers_count}/${o.providers_count}` : "—"} محفظة نشطة
        </Chip>
        <Chip>محافظ تجار: {o?.facility_wallets_count ?? "—"}</Chip>
        <Chip>محافظ مندوبين: {o?.courier_wallets_count ?? "—"}</Chip>
      </div>

      {/* ── الإجماليات ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          icon={Wallet}
          label="طلبات المحافظ"
          count={o?.wallet_orders_count}
          amount={o?.wallet_orders_amount}
          tone="bg-primary/15 text-primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="دفع مؤكد"
          count={o?.approved_count}
          amount={o?.approved_amount}
          tone="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          icon={Clock3}
          label="بانتظار المراجعة"
          count={o?.pending_count}
          amount={o?.pending_amount}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-400"
        />
        <StatCard
          icon={TrendingUp}
          label="بانتظار تكملة الدفعة"
          count={o?.partial_requested_count}
          amount={o?.partial_requested_amount}
          tone="bg-secondary/20 text-secondary-foreground"
        />
        <StatCard
          icon={XCircle}
          label="مرفوض"
          count={o?.rejected_count}
          amount={undefined}
          tone="bg-destructive/10 text-destructive"
        />
      </div>

      {/* ── التوزيع: حسب المحفظة + أعلى المتاجر ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/60 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              حسب المحفظة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedRows
              rows={(o?.by_provider ?? []).map((r) => ({
                id: r.provider_id,
                name: r.provider_name,
                orders: r.orders_count,
                amount: r.approved_amount,
              }))}
              emptyText="لا تحويلات مؤكدة بعد — ستظهر المحافظ هنا مع أول دفعاتكم."
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              أعلى المتاجر مستقبِلاً للتحويلات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedRows
              rows={(o?.top_facilities ?? []).map((r) => ({
                id: r.facility_id,
                name: r.facility_name,
                orders: r.orders_count,
                amount: r.approved_amount,
              }))}
              emptyText="لا مبالغ مؤكدة بعد — ستظهر المتاجر الأنشط هنا."
            />
          </CardContent>
        </Card>
      </div>

      {/* ── دليل المحافظ اليمنية (CRUD) ── */}
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">دليل المحافظ اليمنية</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              تظهر المحافظ النشطة للعملاء والتجار والمندوبين عند إضافة محافظهم.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            className="gap-1.5 rounded-full"
            disabled={createProvider.isPending}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة محفظة
          </Button>
        </CardHeader>
        <CardContent>
          {providers.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : providers.isError ? (
            <ErrorState
              title="تعذّر تحميل دليل المحافظ"
              onRetry={() => providers.refetch()}
            />
          ) : providerRows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="الدليل فارغ"
              description="أضف أول محفظة يمنية (جوالي، جيب، فلوسك...) لتظهر في قوائم الدفع."
              action={
                <Button onClick={openCreate} className="gap-1.5 rounded-full">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  إضافة محفظة
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {providerRows.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-black text-muted-foreground">
                      {p.display_order}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-bold text-foreground">
                        {p.name}
                        {p.code && (
                          <span
                            dir="ltr"
                            className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                          >
                            {p.code}
                          </span>
                        )}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] font-bold",
                          p.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                      >
                        {p.is_active ? "نشطة" : "معطّلة — مخفية عن القوائم"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Switch
                      checked={p.is_active}
                      disabled={updateProvider.isPending}
                      onCheckedChange={(v) => toggleActive(p, v)}
                      aria-label={`تفعيل محفظة ${p.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => openEdit(p)}
                      aria-label={`تعديل محفظة ${p.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                      aria-label={`حذف محفظة ${p.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── حوار إضافة/تعديل محفظة ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل محفظة" : "إضافة محفظة للدليل"}</DialogTitle>
            <DialogDescription>
              الاسم هو ما يراه الجميع في قوائم اختيار المحفظة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-provider-name">اسم المحفظة *</Label>
              <Input
                id="wallet-provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: جوالي"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-provider-code">رمز تقني (اختياري)</Label>
              <Input
                id="wallet-provider-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: jawali"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-provider-order">ترتيب العرض</Label>
              <Input
                id="wallet-provider-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-full">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !name.trim() || createProvider.isPending || updateProvider.isPending
              }
              className="gap-1.5 rounded-full"
            >
              {(createProvider.isPending || updateProvider.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {editing ? "حفظ التعديل" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── تأكيد الحذف ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              حذف «{deleteTarget?.name}» من الدليل؟
            </AlertDialogTitle>
            <AlertDialogDescription>
              إن كانت المحفظة مستخدمة في محافظ تجار أو مندوبين فقد يرفض الخادم
              الحذف — عندئذٍ عطّلها فقط وستختفي من كل القوائم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteProvider.isPending}
              className="gap-1.5 rounded-full bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteProvider.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── عناصر صغيرة ───────────────────────────────────────────── */

function HeaderBlock({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">المحافظ والتحويلات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          النظرة الشاملة على الدفع بالتحويل اليدوي وإدارة دليل المحافظ اليمنية.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 self-start rounded-full sm:self-center"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          aria-hidden="true"
        />
        تحديث
      </Button>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 font-bold text-muted-foreground">
      {children}
    </span>
  );
}
