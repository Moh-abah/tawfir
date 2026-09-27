"use client";

/**
 * محافظي — /courier/wallets (جولة المحافظ)
 * ═══════════════════════════════════════════════════════════════
 * قسم المحافظ الشخصية للمندوب: يضيف المحافظ التي يستلم عليها أجور
 * التوصيل — التاجر يراها في بطاقة المندوب/المهمة ليحوّل له.
 * نفس نمط محافظ المتجر (نقطة/هاتف) بسقف خادم مختلف: 5 محافظ.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
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
import { CourierScreenHeader } from "@/components/courier/CourierBottomNav";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCreateCourierWallet,
  useDeleteCourierWallet,
  useMyCourierWallets,
  useUpdateCourierWallet,
} from "@/hooks/useWallets";
import { useToast } from "@/hooks/use-toast";
import type { CourierWalletOut } from "@/types/api.generated";
import { cn } from "@/lib/utils";

export default function CourierWalletsContent() {
  const router = useRouter();
  const walletsQuery = useMyCourierWallets();
  const wallets: CourierWalletOut[] = walletsQuery.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourierWalletOut | null>(null);
  const [deleting, setDeleting] = useState<CourierWalletOut | null>(null);

  const createMutation = useCreateCourierWallet();
  const updateMutation = useUpdateCourierWallet();
  const deleteMutation = useDeleteCourierWallet();
  const { toast } = useToast();

  const submitting = createMutation.isPending || updateMutation.isPending;

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

  if (walletsQuery.isLoading) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </main>
    );
  }

  if (walletsQuery.isError) {
    return (
      <main className="mx-auto max-w-lg space-y-4 p-4">
        <CourierScreenHeader title="محافظي" icon={Wallet} />
        <WaitMode
          reason={
            walletsQuery.error instanceof Error
              ? walletsQuery.error.message
              : "تعذّر تحميل محافظك"
          }
          onRetry={() => void walletsQuery.refetch()}
          isRetrying={walletsQuery.isRefetching}
        />
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-lg space-y-4 p-4 pb-24"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <CourierScreenHeader title="محافظي" icon={Wallet} />
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          onClick={() => router.back()}
          aria-label="رجوع"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      {/* شرح */}
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-4">
        <p className="text-xs leading-relaxed text-foreground">
          أضف محافظك الشخصية التي تستلم عليها أجور التوصيل — صاحب المطعم يراها
          في بطاقة المهمة ويحوّل لك عليها. الحد الأقصى 5 محافظ.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">
          محافظك: {wallets.length} / 5
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2 rounded-full min-h-[44px]"
          disabled={wallets.length >= 5}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          إضافة محفظة
        </Button>
      </div>

      {wallets.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <p className="font-extrabold text-foreground">لا توجد محافظ بعد</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              أضف أول محفظة ليستطيع التجار تحويل أجور توصيلك إليها.
            </p>
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
                      <p
                        dir="ltr"
                        className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-foreground"
                      >
                        {w.account_label ?? (isPoint ? w.point_number : w.phone_number)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isPoint ? w.point_name : w.account_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Switch
                        checked={w.is_active}
                        onCheckedChange={(v) =>
                          updateMutation.mutate(
                            { walletId: w.id, data: { is_active: v } },
                            {
                              onError: (err) =>
                                toast({
                                  title: "تعذّر تحديث الحالة",
                                  description:
                                    err instanceof Error ? err.message : undefined,
                                  variant: "destructive",
                                }),
                            }
                          )
                        }
                        disabled={updateMutation.isPending}
                        aria-label={w.is_active ? "تعطيل المحفظة" : "تفعيل المحفظة"}
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => {
                            setEditing(w);
                            setFormOpen(true);
                          }}
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

      <Link
        href="/courier/profile"
        className="flex justify-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        العودة لملفي
      </Link>

      <WalletFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        wallet={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المحفظة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُحذف حساب التحويل «{deleting?.provider_name} — {deleting?.account_label}»
              نهائياً ولن يراه التاجر بعد الآن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              className="min-h-[44px] flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleting &&
                deleteMutation.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
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
    </motion.main>
  );
}
