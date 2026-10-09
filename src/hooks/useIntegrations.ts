/**
 * useIntegrations.ts — hooks طبقة التكاملات v4.1 (React Query)
 * ═══════════════════════════════════════════════════════════
 * - كل الاستعلامات تُعطَّل تلقائياً عندما تكون الطبقة غير منشورة
 *   (ping 404) فلا ضجيج شبكة ولا انهيارات — الحالة الهادئة.
 * - بطاقة التوصيل الخارجي تُحدَّث كل 15 ثانية (tracking_url قصير
 *   الأجل يُقرأ من آخر رد دائماً).
 * - كل mutation يُبطل: connections + health + events (لأن كل عملية
 *   من الشاشات تسجل حدثاً في التدقيق فوراً).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  integrationsService,
  isLayerUnavailable,
  type ConnectionUpsertIn,
  type IntegrationsEventsQuery,
} from "@/services/integrations.service";

const LAYER_KEY = "integrations:layer";
const BASE_KEYS = ["integrations"];

/** فحص حي لوجود الطبقة — retry:false فلا تكرار على 404 */
export function useIntegrationsLayer() {
  return useQuery({
    queryKey: [LAYER_KEY],
    queryFn: () => integrationsService.ping(),
    retry: false,
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
    meta: { silent: true },
  });
}

export function useIntegrationsHealth() {
  const layer = useLayerAvailability();
  return useQuery({
    queryKey: [...BASE_KEYS, "health"],
    queryFn: () => integrationsService.health(),
    enabled: layer.available,
    retry: false,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useIntegrationsConnections() {
  const layer = useLayerAvailability();
  return useQuery({
    queryKey: [...BASE_KEYS, "connections"],
    queryFn: () => integrationsService.connections(),
    enabled: layer.available,
    retry: false,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function useInvalidateIntegrations() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: BASE_KEYS });
    qc.invalidateQueries({ queryKey: [LAYER_KEY] });
  };
}

export function useToggleConnection() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: ({ connectionId, enabled }: { connectionId: number; enabled: boolean }) =>
      integrationsService.toggle(connectionId, enabled),
    onSuccess: invalidate,
  });
}

export function useRefreshConnectionToken() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: (connectionId: number) => integrationsService.refreshToken(connectionId),
    onSuccess: invalidate,
  });
}

export function useSaveConnection() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: (body: ConnectionUpsertIn) => integrationsService.saveConnection(body),
    onSuccess: invalidate,
  });
}

export function useFoodicsSyncMenu() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: ({ facilityId }: { facilityId: number | null }) =>
      integrationsService.syncMenu(facilityId),
    onSuccess: invalidate,
  });
}

export function useFoodicsMenu(facilityId: number | null) {
  const layer = useIntegrationsLayer();
  return useQuery({
    queryKey: [...BASE_KEYS, "foodics-menu", facilityId],
    queryFn: () => integrationsService.foodicsMenu(facilityId),
    enabled: layer.data != null && !layer.isError,
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useDispatchResolve(facilityId: number | null | undefined) {
  const layer = useIntegrationsLayer();
  return useQuery({
    queryKey: [...BASE_KEYS, "resolve", facilityId],
    queryFn: () => integrationsService.dispatchResolve(facilityId as number),
    enabled: facilityId != null && facilityId > 0 && layer.data != null && !layer.isError,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useExternalDeliveries(orderId: number | null | undefined) {
  const layer = useIntegrationsLayer();
  return useQuery({
    queryKey: [...BASE_KEYS, "external-deliveries", orderId],
    queryFn: () => integrationsService.externalDeliveries(orderId as number),
    enabled: orderId != null && orderId > 0 && layer.data != null && !layer.isError,
    retry: false,
    refetchInterval: 15 * 1000,
  });
}

export function useExternalDispatch() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: (orderId: number) => integrationsService.externalDispatch(orderId),
    onSuccess: invalidate,
  });
}

export function useCancelExternalDelivery() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: (deliveryId: number) => integrationsService.cancelExternalDelivery(deliveryId),
    onSuccess: invalidate,
  });
}

export function useDeliverectPush() {
  const invalidate = useInvalidateIntegrations();
  return useMutation({
    mutationFn: (orderId: number) => integrationsService.deliverectPush(orderId),
    onSuccess: invalidate,
  });
}

export function useIntegrationEvents(q: IntegrationsEventsQuery) {
  const layer = useIntegrationsLayer();
  return useQuery({
    queryKey: [...BASE_KEYS, "events", q.provider ?? null, q.order_id ?? null, q.limit ?? 100],
    queryFn: () => integrationsService.events(q),
    enabled: layer.data != null && !layer.isError,
    retry: false,
    refetchInterval: 30 * 1000,
  });
}

/** فحص متاحية الطبقة بصيغة مريحة للشاشات */
export function useLayerAvailability() {
  const layer = useIntegrationsLayer();
  const unavailable =
    layer.isError && isLayerUnavailable(layer.error) ? true : false;
  return {
    isLoading: layer.isLoading,
    available: !unavailable && layer.data != null,
    unavailable,
    refetch: layer.refetch,
  };
}
