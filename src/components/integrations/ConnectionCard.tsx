"use client";

/**
 * ConnectionCard.tsx — بطاقة مزود (غرفة التحكم — أدمن)
 * ═══════════════════════════════════════════════════════
 * الحالات الكاملة من العقد: معطّل / جارٍ الاتصال / متصل / خطأ.
 * - بلا اتصال: زر «إنشاء اتصال» → نموذج PUT /connections
 *   (المفاتيح اختيارية إن كانت في ملف الخادم — حقول كلمة مرور).
 * - مع اتصال: مفتاح تشغيل (تأكيد عند لايف) + مفاتيح مقنّعة كبادجات
 *   للقراءة فقط + توكن فوديكس (تجديد) + مزامنة المنيو (فودكس).
 * - كل خطأ من الخادم يُعرض كما ورد (detail عربي) — لا صياغة.
 */
import { useMemo, useState } from "react";
import { KeyRound, Loader2, RefreshCw, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useAdminFacilities } from "@/hooks/useAdminFacilities";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  integrationErrorText,
  type IntegrationProvider,
  type IntegrationsConnection,
} from "@/services/integrations.service";
import {
  connectionVisual,
  ENVIRONMENT_BADGE,
  providerLabel,
  AlertLine,
} from "./integrations-ui";
import {
  useRefreshConnectionToken,
  useSaveConnection,
  useToggleConnection,
} from "@/hooks/useIntegrations";
import { FoodicsSyncButton } from "./FoodicsSyncButton";

const PROVIDER_HINT: Record<string, string> = {
  foodics: "بطاقة منيو المطعم والطلبات — الربط النهائي يتم من زر «اربط كاشيرك» في صفحة التاجر.",
  supermile: "مزود التوصيل الخارجي — بعد التفعيل يُسنَد التوصيل تلقائياً حسب حسم المنفذ لكل متجر.",
  deliverect: "قنوات الطلب الوسيطة — الحد الأدنى في هذه الجولة: الاتصال ودفع الطلبات فقط.",
};

interface CredentialRow {
  key: string;
  value: string;
}

export function ConnectionCard({
  provider,
  connection,
}: {
  provider: IntegrationProvider;
  connection: IntegrationsConnection | null;
}) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmLiveOpen, setConfirmLiveOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  const visual = connectionVisual(connection);
  const env = String(connection?.environment ?? "").toLowerCase();
  const envBadge = ENVIRONMENT_BADGE[env];
  const isFacilityScope = String(connection?.scope_type ?? "") === "facility";
  const toggle = useToggleConnection();
  const refresh = useRefreshConnectionToken();

  const maskedEntries = useMemo(
    () => Object.entries(connection?.credentials_masked ?? {}),
    [connection]
  );

  function handleToggle(next: boolean) {
    if (!connection) return;
    const isLive = String(connection.environment ?? "").toLowerCase() === "live";
    if (isLive && next) {
      setPendingEnabled(true);
      setConfirmLiveOpen(true);
      return;
    }
    toggle.mutate(
      { connectionId: connection.connection_id, enabled: next },
      {
        onSuccess: () =>
          toast({ title: next ? "تم تفعيل الاتصال" : "تم إيقاف الاتصال" }),
        onError: (e) => toast({ title: integrationErrorText(e), variant: "destructive" }),
      }
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {providerLabel(provider)}
              <Badge variant="outline" className={cn("shrink-0", visual.className)}>
                {visual.pulsing && (
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                )}
                {visual.label}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed">
              {PROVIDER_HINT[provider]}
            </CardDescription>
          </div>
          {connection ? (
            <Switch
              checked={Boolean(connection.enabled)}
              onCheckedChange={handleToggle}
              disabled={toggle.isPending}
              aria-label={connection.enabled ? "إيقاف الاتصال" : "تفعيل الاتصال"}
            />
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {!connection ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              لا يوجد اتصال بهذا المزود بعد — النظام يعمل بمحركه الداخلي 100%.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setCreateOpen(true)}
            >
              إنشاء اتصال
            </Button>
          </div>
        ) : (
          <>
            {/* البيئة والنطاق */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {envBadge && (
                <Badge variant="outline" className={envBadge.className}>
                  البيئة: {envBadge.label}
                </Badge>
              )}
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                النطاق: {isFacilityScope ? "منشأة" : "عام"}
              </Badge>
              {isFacilityScope && connection.facility_name && (
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  <Store className="ml-1 h-3 w-3" aria-hidden="true" />
                  {connection.facility_name}
                  {connection.facility_id != null && (
                    <span dir="ltr" className="mr-1 font-mono text-[10px] opacity-70">
                      #{connection.facility_id}
                    </span>
                  )}
                </Badge>
              )}
              {isFacilityScope && (
                <span className="text-[11px] text-muted-foreground">إعداد خاص بهذا المتجر</span>
              )}
            </div>

            {/* حالة التوكن */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                نوع المصادقة: <span dir="ltr" className="font-mono">{connection.auth_type ?? "—"}</span>
              </span>
              {connection.has_access_token ? (
                <>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    توكن فعّال
                  </Badge>
                  {connection.token_expires_at && (
                    <span>ينتهي: {formatDate(connection.token_expires_at)}</span>
                  )}
                  {provider === "foodics" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={refresh.isPending}
                      onClick={() =>
                        refresh.mutate(connection.connection_id, {
                          onSuccess: () => toast({ title: "تم تجديد التوكن" }),
                          onError: (e) =>
                            toast({ title: integrationErrorText(e), variant: "destructive" }),
                        })
                      }
                    >
                      {refresh.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      تجديد التوكن
                    </Button>
                  )}
                </>
              ) : null}
            </div>

            {/* المفاتيح المقنّعة — للقراءة فقط */}
            {maskedEntries.length > 0 && (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  المفاتيح مقنّعة (للقراءة فقط):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {maskedEntries.map(([k, v]) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="border-border bg-muted/50 font-mono text-[11px]"
                      dir="ltr"
                    >
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* آخر مزامنة وآخر رسالة */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {connection.last_sync_at && (
                <p>آخر مزامنة: {formatDate(connection.last_sync_at)}</p>
              )}
              {connection.last_message && (
                <p
                  className={cn(
                    "leading-relaxed",
                    String(connection.status).toLowerCase() === "error" && "text-destructive"
                  )}
                >
                  آخر رسالة: {connection.last_message}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      {connection && provider === "foodics" && (
        <CardFooter className="pt-0">
          <FoodicsSyncButton facilityId={connection.facility_id ?? null} />
        </CardFooter>
      )}

      {/* نموذج إنشاء الاتصال */}
      <CreateConnectionDialog
        provider={provider}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* تأكيد التفعيل على لايف */}
      <AlertDialog open={confirmLiveOpen} onOpenChange={setConfirmLiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تفعيل اتصال على بيئة لايف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الاتصال على البيئة الحية للمزود — تأكد من المفاتيح قبل التفعيل.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingEnabled(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (connection && pendingEnabled != null) {
                  toggle.mutate(
                    { connectionId: connection.connection_id, enabled: pendingEnabled },
                    {
                      onSuccess: () => toast({ title: "تم تفعيل الاتصال" }),
                      onError: (e) =>
                        toast({ title: integrationErrorText(e), variant: "destructive" }),
                    }
                  );
                }
                setPendingEnabled(null);
              }}
            >
              تفعيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ─── نموذج إنشاء/تحديث الاتصال ──────────────────────────── */

function CreateConnectionDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: IntegrationProvider;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { toast } = useToast();
  const save = useSaveConnection();
  const facilities = useAdminFacilities(1, 50, null);
  const facilityItems = facilities.data?.items ?? [];

  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [scopeType, setScopeType] = useState<"global" | "facility">("global");
  const [facilityId, setFacilityId] = useState<string>("");
  const [rows, setRows] = useState<CredentialRow[]>([{ key: "", value: "" }]);
  const [serverError, setServerError] = useState<string | null>(null);

  function reset() {
    setEnvironment("sandbox");
    setScopeType("global");
    setFacilityId("");
    setRows([{ key: "", value: "" }]);
    setServerError(null);
  }

  function submit() {
    setServerError(null);
    const credentials: Record<string, string> = {};
    for (const r of rows) {
      const k = r.key.trim();
      if (k && r.value.trim()) credentials[k] = r.value.trim();
    }
    save.mutate(
      {
        provider,
        environment,
        scope_type: scopeType,
        facility_id: scopeType === "facility" && facilityId ? Number(facilityId) : null,
        credentials: Object.keys(credentials).length ? credentials : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "تم حفظ الاتصال", description: providerLabel(provider) });
          reset();
          onOpenChange(false);
        },
        onError: (e) => setServerError(integrationErrorText(e)),
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إنشاء اتصال — {providerLabel(provider)}</DialogTitle>
          <DialogDescription>
            المفاتيح اختيارية هنا إن كانت معوّضة في ملف الخادم. المفاتيح المقنّعة تظهر مع
            البطاقة بعد الحفظ — لا تكتبها في أي مكان آخر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`env-${provider}`}>البيئة</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as "sandbox" | "live")}>
                <SelectTrigger id={`env-${provider}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">ساندبوكس</SelectItem>
                  <SelectItem value="live">لايف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`scope-${provider}`}>النطاق</Label>
              <Select
                value={scopeType}
                onValueChange={(v) => {
                  setScopeType(v as "global" | "facility");
                  if (v === "global") setFacilityId("");
                }}
              >
                <SelectTrigger id={`scope-${provider}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">عام</SelectItem>
                  <SelectItem value="facility">منشأة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scopeType === "facility" && (
            <div className="space-y-1.5">
              <Label htmlFor={`facility-${provider}`}>المنشأة</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger id={`facility-${provider}`} dir="rtl">
                  <SelectValue placeholder="اختر المتجر" />
                </SelectTrigger>
                <SelectContent>
                  {facilityItems.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>المفاتيح (اختياري)</Label>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.4fr] gap-2">
                <Input
                  placeholder="اسم المفتاح"
                  value={row.key}
                  onChange={(e) =>
                    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
                  }
                  dir="ltr"
                  autoComplete="off"
                />
                <Input
                  type="password"
                  placeholder="قيمة المفتاح"
                  value={row.value}
                  onChange={(e) =>
                    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                  }
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline"
              onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}
            >
              + إضافة مفتاح آخر
            </button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              إدخال المفاتيح بحقول كلمة مرور — بلا معاينة ولا نسخ، أمنياً ومقصوداً.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden="true" />}
            حفظ الاتصال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
