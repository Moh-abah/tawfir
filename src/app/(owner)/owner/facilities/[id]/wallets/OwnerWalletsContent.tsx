"use client";

/**
 * محافظ التحويل — /owner/facilities/{id}/wallets
 * ═══════════════════════════════════════════════════════════════
 * قسم إضافة وإدارة محافظ الدفع للمنشأة (جولة المحافظ):
 * - التاجر يختار محفظة (جوالي، جيب، فلوسك...) ويعبّئ حساب التحويل:
 *   نوعان — «رقم نقطة + اسم النقطة» أو «رقم هاتف + الاسم الظاهر».
 * - كل تاجر لديه عدة محافظ (سقف الخادم: 10) — المعطلة تختفي عن العملاء.
 * - من هنا يشتق العميل قائمة الدفع عند تنفيذ الطلب.
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Store,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { WalletFormDialog } from "@/components/wallets/WalletFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import {
  useCreateFacilityWallet,
  useDeleteFacilityWallet,
  useOwnerFacilityWallets,
  useUpdateFacilityWallet,
} from "@/hooks/useWallets";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { useToast } from "@/hooks/use-toast";
import type { FacilityWalletOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

export default function OwnerWalletsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const facilityId = useMemo(() => {
    const n = Number(params?.id);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [params?.id]);

  const { data: facilities } = useMyFacilities();
  const facility = facilities?.find((f) => f.id === facilityId);

  const walletsQuery = useOwnerFacilityWallets(facilityId || null);
  const wallets: FacilityWalletOut[] = walletsQuery.data ?? [];
  const activeCount = wallets.filter((w) => w.is_active).length;

  /* نموذج الإضافة/التعديل */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FacilityWalletOut | null>(null);
  const [deleting, setDeleting] = useState<FacilityWalletOut | null>(null);

  const createMutation = useCreateFacilityWallet(facilityId);
  const updateMutation = useUpdateFacilityWallet(facilityId);
  const deleteMutation = useDeleteFacilityWallet(facilityId);
  const { toast } = useToast();

  const submitting = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (w: FacilityWalletOut) => {
    setEditing(w);
    setFormOpen(true);
  };

  const handleSubmit = (values: {
    provider_id: number;
    account_type: "point" | "phone";
    point_number?: string;
    point_name?: string;
    phone_number?: string;
    account_name?: string;
    is_active?: boolean;
  }) => {
    if (editing) {
      updateMutation.mutate(
        { walletId: editing.id, data: values },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) =>
            toast({
              title: "تعذّر تحديث المحفظة",
              description: err instanceof Error ? err.message : undefined,
              variant: "destructive",
            }),
        }
      );
    } else {
      createMutation.mutate(
        { ...values, is_active: values.is_active ?? true },
        {
          onSuccess: () => setFormOpen(false),
          onError: (err) =>
            toast({
              title: "تعذّر إضافة المحفظة",
              description: err instanceof Error ? err.message : undefined,
              variant: "destructive",
            }),
        }
      );
    }
  };

  const handleToggleActive = (w: FacilityWalletOut, next: boolean) => {
    updateMutation.mutate(
      { walletId: w.id, data: { is_active: next } },
      {
        onError: (err) =>
          toast({
            title: "تعذّر تحديث الحالة",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
      onError: (err) =>
        toast({
          title: "تعذّر حذف المحفظة",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        }),
    });
  };

  if (!facilityId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState title="معرّف المتجر غير صالح" message="تعذّر تحديد المتجر المطلوب." />
      </main>
    );
  }

  return (
    <PullToRefresh onRefresh={() => walletsQuery.refetch()}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6"
        dir="rtl"
      >
        {/* رأس الصفحة */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              onClick={() => router.back()}
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  محافظ التحويل
                </h1>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                {facility?.name ?? "متجري"} — مفعّلة: {activeCount} من {wallets.length}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/owner/facilities/${facilityId}/payments`}>
              <Button variant="outline" className="gap-2 rounded-full min-h-[44px]">
                <Clock3 className="h-4 w-4" />
                <span className="hidden sm:inline">مدفوعات المطعم</span>
              </Button>
            </Link>
            <Button
              onClick={openAdd}
              className="gap-2 rounded-full min-h-[44px]"
              disabled={wallets.length >= 10}
            >
              <Plus className="h-4 w-4" />
              إضافة محفظة
            </Button>
          </div>
        </div>

        {/* شرح مختصر */}
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-4">
          <p className="text-xs leading-relaxed text-foreground">
            أضف محافظك ليستطيع عملاؤك الدفع بتحويل المبلغ عند الطلب (شامل أجرة
            التوصيل). لكل محفظة نوعان:{" "}
            <span className="font-bold">رقم نقطة</span> مع اسم النقطة، أو{" "}
            <span className="font-bold">رقم هاتف</span> مع الاسم الظاهر في
            التحويل. المعطلة تختفي عن العملاء ولا تُقبل في الطلبات الجديدة.
          </p>
        </div>

        {/* القائمة */}
        {walletsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : walletsQuery.isError ? (
          <ErrorState
            title="تعذّر تحميل المحافظ"
            message={
              walletsQuery.error instanceof Error
                ? walletsQuery.error.message
                : "تحقق من اتصالك بالإنترنت"
            }
            onRetry={() => void walletsQuery.refetch()}
          />
        ) : wallets.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <EmptyState
                icon={Wallet}
                title="لا توجد محافظ تحويل بعد"
                description="أضف أول محفظة ليتمكن عملاؤك من الدفع بالتحويل عند الطلب — الحد الأقصى 10 محافظ."
                action={
                  <Button onClick={openAdd} className="min-h-[44px] gap-2 rounded-full">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    إضافة محفظة
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {wallets.map((w) => {
              const isPoint = w.account_type !== "phone";
              return (
                <li key={w.id}>
                  <Card
                    className={cn(
                      "rounded-2xl border-border/60",
                      !w.is_active && "opacity-70"
                    )}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        {isPoint ? (
                          <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                        ) : (
                          <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">
                            {w.provider_name ?? "محفظة"}
                          </p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {isPoint ? "رقم نقطة" : "تحويل هاتفي"}
                          </span>
                          {!w.is_active && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              معطّلة
                            </span>
                          )}
                        </div>
                        <p dir="ltr" className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-foreground">
                          {w.account_label ??
                            (isPoint ? w.point_number : w.phone_number)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {isPoint ? w.point_name : w.account_name}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Switch
                          checked={w.is_active}
                          onCheckedChange={(v) => handleToggleActive(w, v)}
                          disabled={updateMutation.isPending}
                          aria-label={w.is_active ? "تعطيل المحفظة" : "تفعيل المحفظة"}
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => openEdit(w)}
                            aria-label={`تعديل محفظة ${w.provider_name ?? ""}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleting(w)}
                            aria-label={`حذف محفظة ${w.provider_name ?? ""}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {/* نموذج الإضافة/التعديل */}
        <WalletFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          wallet={editing}
          submitting={submitting}
          onSubmit={handleSubmit}
        />

        {/* حوار تأكيد الحذف */}
        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف المحفظة؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيُحذف حساب التحويل «{deleting?.provider_name} —{" "}
                {deleting?.account_label}» نهائياً. إن أردت إخفاءه عن العملاء
                فقط فاعطّله بدلاً من حذفه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                className="min-h-[44px] flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                نعم، حذف
              </AlertDialogAction>
              <AlertDialogCancel className="min-h-[44px] flex-1 rounded-full">
                إبقاء المحفظة
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </PullToRefresh>
  );
}
