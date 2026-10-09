"use client";

/**
 * ExternalDeliveryCard.tsx — بطاقة التوصيل الخارجي في صفحة الطلب (أدمن)
 * ═════════════════════════════════════════════════════════════════════
 * الوحيدة المسموح إضافتها على صفحة الطلب (تعهد الصفر — بلا إعادة تخطيط):
 * - مؤشر المنفذ الحي: GET /dispatch/resolve/{facility_id}
 * - زر «إرسال للتوصيل الخارجي»: فقط عندما status ∈ {paid, confirmed,
 *   preparing} والمنفذ خارجي.
 * - بطاقة الحالة الحية من /external-deliveries?order_id (تحديث 15s):
 *   حالة موحدة بأيقونة + «تتبع حي» (tracking_url من آخر رد — تاب جديد)
 *   + إلغاء للسجل الحي فقط مع تأكيد.
 * - زر ثانوي «دفع إلى دليفيرِكت» عند وجود اتصال مفعّل فقط.
 * - كل 422: Toast بنص الخادم العربي كما هو.
 */
import { useState } from "react";
import { ExternalLink, RefreshCw, Truck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useCancelExternalDelivery,
  useDeliverectPush,
  useExternalDeliveries,
  useExternalDispatch,
  useDispatchResolve,
  useIntegrationsConnections,
} from "@/hooks/useIntegrations";
import {
  integrationErrorText,
  isLayerUnavailable,
  resolvedProviderName,
  type ExternalDeliveryOut,
} from "@/services/integrations.service";
import {
  externalDeliveryStatus,
  isLiveExternalDelivery,
  MiniEventMirror,
} from "./integrations-ui";
import { useIntegrationEvents } from "@/hooks/useIntegrations";

const DISPATCHABLE_STATUSES = new Set(["paid", "confirmed", "preparing"]);

export function ExternalDeliveryCard({
  orderId,
  facilityId,
  orderStatus,
}: {
  orderId: number;
  facilityId: number | null | undefined;
  orderStatus: string | null | undefined;
}) {
  const { toast } = useToast();
  const [cancelTarget, setCancelTarget] = useState<ExternalDeliveryOut | null>(null);

  const resolve = useDispatchResolve(facilityId ?? null);
  const deliveries = useExternalDeliveries(orderId);
  const connections = useIntegrationsConnections();
  const dispatch = useExternalDispatch();
  const cancel = useCancelExternalDelivery();
  const push = useDeliverectPush();
  const events = useIntegrationEvents({ provider: null, order_id: orderId, limit: 20 });

  /* الطبقة غير منشورة على الخادم → البطاقة كلها لا تُركَّب (الوضع الافتراضي للعميل والمشغل) */
  const resolveErr = resolve.error;
  const deliveriesErr = deliveries.error;
  const layerDown =
    (resolve.isError && isLayerUnavailable(resolveErr)) ||
    (deliveries.isError && isLayerUnavailable(deliveriesErr));
  if (layerDown) return null;

  const provider = resolvedProviderName(resolve.data);
  const isExternal = provider !== "manual";
  const canDispatch =
    isExternal && DISPATCHABLE_STATUSES.has(String(orderStatus ?? "").toLowerCase());

  const records = deliveries.data ?? [];
  const liveRecord = records.find(isLiveExternalDelivery) ?? null;
  const closedRecords = records.filter((d) => !isLiveExternalDelivery(d));

  const deliverectEnabled = (connections.data ?? []).some(
    (c) => String(c.provider).toLowerCase() === "deliverect" && c.enabled
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
          التوصيل الخارجي
          {resolve.isLoading ? (
            <span className="text-xs text-muted-foreground">جارٍ حسم المنفذ…</span>
          ) : resolve.isError ? (
            <span className="text-xs text-destructive">{integrationErrorText(resolve.error)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              هذا المتجر يتوصّل حالياً بـ:{" "}
              <strong className="text-foreground">
                {isExternal ? "التوصيل الخارجي" : "محرك تفطير الداخلي"}
              </strong>
            </span>
          )}
          <button
            type="button"
            aria-label="تحديث حسم المنفذ"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/60"
            onClick={() => resolve.refetch()}
          >
            <RefreshCw
              className={`h-3 w-3 ${resolve.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* أزرار التشغيل */}
        <div className="flex flex-wrap items-center gap-2">
          {canDispatch && (
            <Button
              type="button"
              size="sm"
              disabled={dispatch.isPending}
              onClick={() =>
                dispatch.mutate(orderId, {
                  onSuccess: () => toast({ title: "أُرسل الطلب للتوصيل الخارجي" }),
                  onError: (e) =>
                    toast({ title: integrationErrorText(e), variant: "destructive" }),
                })
              }
            >
              <Truck className="ml-1 h-4 w-4" aria-hidden="true" />
              إرسال للتوصيل الخارجي
            </Button>
          )}
          {deliverectEnabled && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={push.isPending}
              onClick={() =>
                push.mutate(orderId, {
                  onSuccess: () => toast({ title: "دُفع الطلب إلى دليفيرِكت" }),
                  onError: (e) =>
                    toast({ title: integrationErrorText(e), variant: "destructive" }),
                })
              }
            >
              دفع إلى دليفيرِكت
            </Button>
          )}
          {!resolve.isLoading && !resolve.isError && !isExternal && !liveRecord && (
            <p className="text-xs text-muted-foreground">
              المنفذ الداخلي يتكفل بهذا الطلب — لا إجراء خارجي مطلوب.
            </p>
          )}
        </div>

        {/* السجل الحي */}
        {deliveries.isLoading ? (
          <p className="text-xs text-muted-foreground">جارٍ جلب حالة التوصيل الخارجي…</p>
        ) : deliveries.isError && !layerDown ? (
          <p className="text-xs text-destructive">{integrationErrorText(deliveries.error)}</p>
        ) : liveRecord ? (
          <LiveDeliveryBlock
            record={liveRecord}
            onCancelClick={() => setCancelTarget(liveRecord)}
            cancelling={cancel.isPending}
          />
        ) : null}

        {/* السجلات المغلقة — مرآة بلا أزرار */}
        {closedRecords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">سجلات مغلقة لهذا الطلب:</p>
            {closedRecords.map((d, i) => {
              const st = externalDeliveryStatus(d.local_status);
              return (
                <div
                  key={d.id ?? d.delivery_id ?? i}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs"
                >
                  <span aria-hidden="true">{st.icon}</span>
                  <Badge variant="outline" className={st.className}>
                    {st.label}
                  </Badge>
                  {d.provider && (
                    <span className="text-muted-foreground">عبر: {d.provider}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* مرآة الأحداث المصغرة — بلا أزرار */}
        {events.data && events.data.length > 0 && (
          <div className="border-t border-border/60 pt-2">
            <MiniEventMirror events={events.data} />
          </div>
        )}
      </CardContent>

      {/* تأكيد الإلغاء */}
      <AlertDialog
        open={cancelTarget != null}
        onOpenChange={(v) => {
          if (!v) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء التوصيل الخارجي؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُطلب الإلغاء من المزود — المحرك الداخلي لا يتحرك تلقائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const id = cancelTarget?.id ?? cancelTarget?.delivery_id;
                if (id != null) {
                  cancel.mutate(id, {
                    onSuccess: () => toast({ title: "أُرسل طلب الإلغاء للمزود" }),
                    onError: (e) =>
                      toast({ title: integrationErrorText(e), variant: "destructive" }),
                  });
                }
                setCancelTarget(null);
              }}
            >
              طلب الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function LiveDeliveryBlock({
  record,
  onCancelClick,
  cancelling,
}: {
  record: ExternalDeliveryOut;
  onCancelClick: () => void;
  cancelling: boolean;
}) {
  const st = externalDeliveryStatus(record.local_status);
  const trackingUrl = record.tracking_url ?? null;
  const deliveryId = record.id ?? record.delivery_id;

  return (
    <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {st.icon}
        </span>
        <Badge variant="outline" className={st.className}>
          {st.label}
        </Badge>
        {record.provider && (
          <span className="text-xs text-muted-foreground">المزود: {record.provider}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {trackingUrl && (
          <Button type="button" size="sm" asChild>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="ml-1 h-4 w-4" aria-hidden="true" />
              تتبع حي
            </a>
          </Button>
        )}
        {deliveryId != null && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancelClick}
            disabled={cancelling}
          >
            <XCircle className="ml-1 h-4 w-4" aria-hidden="true" />
            إلغاء التوصيل الخارجي
          </Button>
        )}
      </div>
    </div>
  );
}
