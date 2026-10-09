"use client";

/**
 * IntegrationsContent.tsx — غرفة التحكم (أدمن)
 * التبويبات: الاتصالات (3 بطاقات) · منيو فودكس · سجل الأحداث.
 * شارة «جسر الحالة» بجانب العنوان (قراءة فقط من /health — الإيقاف من الخادم).
 */
import { Suspense, useEffect } from "react";
import { Blocks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useIntegrationsConnections,
  useIntegrationsHealth,
  useLayerAvailability,
} from "@/hooks/useIntegrations";
import { ConnectionCard } from "@/components/integrations/ConnectionCard";
import { FoodicsMenuPanel } from "@/components/integrations/FoodicsMenuPanel";
import { IntegrationEventsPanel } from "@/components/integrations/IntegrationEventsPanel";
import {
  IntegrationsLayerBanner,
  useIntegrationsOAuthReturn,
} from "@/components/integrations/integrations-ui";

function BridgeBadge() {
  const health = useIntegrationsHealth();
  if (health.isLoading) return <Skeleton className="h-6 w-28" />;
  if (health.isError || health.data == null) return null;
  const enabled = Boolean(health.data.bridge_enabled);
  return (
    <Badge
      variant="outline"
      className={
        enabled
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-muted text-muted-foreground border-border"
      }
    >
      جسر الحالة: {enabled ? "مفعّل" : "موقوف"}
    </Badge>
  );
}

function IntegrationsInner() {
  const layer = useLayerAvailability();
  const connections = useIntegrationsConnections();
  useIntegrationsOAuthReturn();

  /* عودة فوديكس للمرجع: تحديث فوري للاتصالات (بالإضافة لاستعلامات الصفحة) */
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("foodics=")) {
      connections.refetch();
    }
  }, []);

  const byProvider = (p: string) =>
    (connections.data ?? []).find((c) => String(c.provider).toLowerCase() === p) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Blocks className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="text-xl font-bold">التكاملات</h1>
          <BridgeBadge />
        </div>
      </header>

      {layer.unavailable && (
        <IntegrationsLayerBanner onRetry={() => layer.refetch()} />
      )}

      <Tabs defaultValue="connections" dir="rtl">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="connections">الاتصالات</TabsTrigger>
          <TabsTrigger value="menu">منيو فوديكس</TabsTrigger>
          <TabsTrigger value="events">سجل الأحداث</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <ConnectionCard provider="foodics" connection={byProvider("foodics")} />
            <ConnectionCard provider="supermile" connection={byProvider("supermile")} />
            <ConnectionCard provider="deliverect" connection={byProvider("deliverect")} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            المفاتيح تُعوّض في ملف الخادم
            <span dir="ltr" className="mx-1 font-mono">
              /etc/tawfir/secrets/integrations.env
            </span>
            — دليل KEYS_GUIDE_v4_1.md. المفاتيح المقنّعة تظهر مع البطاقات للقراءة فقط.
          </p>
        </TabsContent>

        <TabsContent value="menu" className="mt-4">
          <FoodicsMenuPanel />
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <IntegrationEventsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function IntegrationsContent() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <IntegrationsInner />
    </Suspense>
  );
}
