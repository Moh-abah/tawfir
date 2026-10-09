"use client";

/**
 * MerchantIntegrations.tsx — شاشة «التكاملات» للتابع (صاحب المتجر)
 * ══════════════════════════════════════════════════════════════
 * العقد المركزي: التاجر لا يرى مفتاحاً ولا webhook ولا حقولاً تقنية — أبداً.
 *  - «اربط كاشيرك»: نقرة → صفحة موافقة فودكس → عودة (نفس الشاشة تستقبل
 *    المرجع أيضاً لأدمن ربط عام).
 *  - «التوصيل الخارجي»: يُدار من تفطير — تعذّر التفعيل (لا اتصال من
 *    الإدارة) → بطاقة رمادية هادئة «الخدمة غير متاحة بعد».
 *  - «قنوات الطلب»: بطاقة حالة فقط — «جاهز قريباً للتوسع».
 * بلا اتصال = بطاقات هادئة + أزرار — لا أخطاء ولا انهيار أبداً.
 */
import { useState } from "react";
import { Link2, Loader2, Receipt, Truck } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import {
  useIntegrationsConnections,
  useDispatchResolve,
  useLayerAvailability,
} from "@/hooks/useIntegrations";
import {
  integrationErrorText,
  isLayerUnavailable,
  integrationsService,
  resolvedProviderName,
} from "@/services/integrations.service";
import { connectionVisual } from "./integrations-ui";

export function MerchantIntegrations() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MerchantFoodicsCard />
      <MerchantExternalDeliveryCard />
      <MerchantDeliverectCard />
    </div>
  );
}

/* ─── ١) اربط كاشيرك ─────────────────────────────────────── */

function MerchantFoodicsCard() {
  const { toast } = useToast();
  const facilities = useMyFacilities();
  const layer = useLayerAvailability();
  const connections = useIntegrationsConnections();
  const [redirecting, setRedirecting] = useState(false);

  /* حالة الاتصال تُقرأ فقط إذا سمحت الجلسة (أدمن زائر) — وإلا تظل الحالة
     الهادئة بزر الربط، والعودة بعد الموافقة تُحدّث كل شيء تلقائياً. */
  const foodics =
    (connections.data ?? []).find((c) => String(c.provider).toLowerCase() === "foodics") ??
    null;
  const visual = connectionVisual(foodics);
  const isConnected = foodics != null && foodics.enabled && String(foodics.status).toLowerCase() === "connected";
  const isConnecting = foodics != null && String(foodics.status).toLowerCase() === "connecting";

  const facilityId = facilities.data?.[0]?.id ?? null;

  async function connect() {
    setRedirecting(true);
    try {
      const res = await integrationsService.foodicsConnectUrl(facilityId, true);
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
        return;
      }
      toast({ title: "لم يصل رابط الربط من الخادم — أعد المحاولة", variant: "destructive" });
    } catch (e) {
      toast({ title: integrationErrorText(e), variant: "destructive" });
    } finally {
      setRedirecting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          اربط كاشيرك
          {isConnecting ? (
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-900"
            >
              جارٍ الاتصال بفودكس…
            </Badge>
          ) : isConnected ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              متصل
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
              غير مربوط
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          اربط نقطة البيع (كاشير) بمتجرك ليصل المنيو والطلبات تلقائياً — توافق مرة واحدة
          ويعود كل شيء ليعمل.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground">
        {isConnected && foodics?.last_sync_at && (
          <p className="text-xs">آخر مزامنة مسجلة على النظام — تظهر تفاصيلها في لوحة الإدارة.</p>
        )}
      </CardContent>
      <CardFooter>
        {isConnected ? (
          <Button type="button" variant="outline" size="sm" disabled>
            تم الربط — للفصل تواصل معنا
          </Button>
        ) : isConnecting ? (
          <Button type="button" size="sm" disabled>
            <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden="true" />
            جارٍ الاتصال…
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={connect} disabled={redirecting}>
            {redirecting ? (
              <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Link2 className="ml-1 h-4 w-4" aria-hidden="true" />
            )}
            اربط كاشيرك
          </Button>
        )}
        {layer.unavailable && (
          <span className="mr-auto text-[11px] text-muted-foreground">الخدمة قيد التجهيز</span>
        )}
      </CardFooter>
    </Card>
  );
}

/* ─── ٢) التوصيل الخارجي ─────────────────────────────────── */

function MerchantExternalDeliveryCard() {
  const facilities = useMyFacilities();
  const layer = useLayerAvailability();
  const resolve = useDispatchResolve(facilities.data?.[0]?.id ?? null);

  const readable = !resolve.isError && resolve.data != null;
  const provider = readable ? resolvedProviderName(resolve.data) : null;
  const isExternal = provider != null && provider !== "manual";
  /* 403/404: لا اتصال مفعّل من الإدارة — البطاقة الرمادية المتعاقد عليها */
  const unavailable =
    layer.unavailable ||
    (resolve.isError && (resolve.error as { status?: number })?.status === 403) ||
    (resolve.isError && isLayerUnavailable(resolve.error));

  return (
    <Card className={unavailable ? "flex flex-col opacity-80" : "flex flex-col"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
            التوصيل الخارجي
          </span>
          <Switch
            checked={isExternal}
            disabled
            aria-label="حالة التوصيل الخارجي"
            aria-readonly="true"
          />
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          يُدار من تفطير — يتكفل بمندوب التوصيل تلقائياً عند التفعيل.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 text-xs text-muted-foreground">
        {unavailable ? (
          <p>الخدمة غير متاحة بعد — تواصل معنا لتفعيلها.</p>
        ) : isExternal ? (
          <p className="text-success">مفعّل — مندوب التوصيل يُسنَد تلقائياً لطلبات متجرك.</p>
        ) : (
          <p>التفعيل يتم بالتنسيق مع إدارة توفير.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── ٣) قنوات الطلب (الحد الأدنى) ───────────────────────── */

function MerchantDeliverectCard() {
  const connections = useIntegrationsConnections();
  const deliverect =
    (connections.data ?? []).find(
      (c) => String(c.provider).toLowerCase() === "deliverect"
    ) ?? null;
  const visual = connectionVisual(deliverect);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
            قنوات الطلب
          </span>
          <Badge variant="outline" className={visual.className}>
            {visual.label}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          استقبال الطلبات من قنوات الوساطة مباشرة إلى لوحتك.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          جاهز قريباً للتوسع
        </Badge>
      </CardFooter>
    </Card>
  );
}
