"use client";

/**
 * integrations-ui.tsx — عناصر مشتركة لطبقة التكاملات v4.1
 * ══════════════════════════════════════════════════════════
 * - قواميس الحالة العربية (اتصال/توصيل خارجي/أحداث) — بلا نصوص
 *   مخترعة: كل خطأ من الخادم يُعرض كما ورد.
 * - useIntegrationsOAuthReturn: يعالج عودة فوديكس (?foodics=…) على
 *   أي شاشة تستقبل المرجع (الأدمن افتراضياً / المالك بنفس المكان).
 * - IntegrationsLayerBanner: بانر هادئ حين تكون الطبقة غير منشورة.
 */
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  ExternalDeliveryOut,
  IntegrationEventOut,
  IntegrationsConnection,
} from "@/services/integrations.service";

/* ─── قواميس ─────────────────────────────────────────────── */

export const PROVIDER_LABELS: Record<string, string> = {
  foodics: "فودكس",
  supermile: "سوبرمايل",
  deliverect: "دليفيرِكت",
};

/** ألوان المزودين ضمن لوحة المشروع (هادئة) */
export const PROVIDER_BADGE_CLASS: Record<string, string> = {
  foodics: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-900",
  supermile: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-900",
  deliverect: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-900",
};

export function providerLabel(p: string | null | undefined): string {
  if (!p) return "غير محدد";
  return PROVIDER_LABELS[p] ?? p;
}

export interface ConnectionVisual {
  label: string;
  className: string;
  pulsing?: boolean;
}

/** شارة حالة الاتصال من status + enabled (عقد v4.1) */
export function connectionVisual(c: IntegrationsConnection | null | undefined): ConnectionVisual {
  if (!c) {
    return { label: "غير مفعّل", className: "bg-muted text-muted-foreground border-border" };
  }
  const status = String(c.status ?? "").toLowerCase();
  if (status === "connecting") {
    return {
      label: "جارٍ الاتصال…",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-900",
      pulsing: true,
    };
  }
  if (status === "error") {
    return { label: "خطأ في الاتصال", className: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (status === "connected" && c.enabled) {
    return { label: "متصل", className: "bg-success/10 text-success border-success/30" };
  }
  if (status === "connected" && !c.enabled) {
    return { label: "متصل — موقوف", className: "bg-muted text-muted-foreground border-border" };
  }
  return { label: "غير مفعّل", className: "bg-muted text-muted-foreground border-border" };
}

export const ENVIRONMENT_BADGE: Record<string, { label: string; className: string }> = {
  sandbox: {
    label: "ساندبوكس",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-900",
  },
  live: { label: "لايف", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export const EXTERNAL_DELIVERY_STATUS: Record<
  string,
  { label: string; icon: string; className: string }
> = {
  requested: { label: "مطلوب", icon: "⏳", className: "bg-muted text-muted-foreground border-border" },
  accepted: {
    label: "قُبل المندوب",
    icon: "👤",
    className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-900",
  },
  picked_up: {
    label: "استُلم",
    icon: "📦",
    className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-900",
  },
  on_route: { label: "في الطريق", icon: "🛵", className: "bg-primary/10 text-primary border-primary/30" },
  delivered: { label: "سُلّم", icon: "✅", className: "bg-success/10 text-success border-success/30" },
  cancelled: { label: "أُلغي", icon: "✖", className: "bg-muted text-muted-foreground border-border" },
  failed: { label: "فشل", icon: "⚠️", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function externalDeliveryStatus(s: string | null | undefined) {
  const key = String(s ?? "").toLowerCase();
  return (
    EXTERNAL_DELIVERY_STATUS[key] ?? {
      label: s ?? "—",
      icon: "•",
      className: "bg-muted text-muted-foreground border-border",
    }
  );
}

export function isLiveExternalDelivery(d: ExternalDeliveryOut): boolean {
  const s = String(d.local_status ?? "").toLowerCase();
  return !(s === "delivered" || s === "cancelled" || s === "failed");
}

export const EVENT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  received: { label: "وارد", className: "bg-muted text-muted-foreground border-border" },
  processed: { label: "عولج", className: "bg-success/10 text-success border-success/30" },
  failed: { label: "فشل", className: "bg-destructive/10 text-destructive border-destructive/30" },
  ignored: { label: "تجاهل", className: "bg-muted/60 text-muted-foreground border-border/60" },
  "bridge.applied": { label: "جسر الحالة", className: "bg-primary/10 text-primary border-primary/30" },
};

export function eventStatusBadge(s: string | null | undefined) {
  const key = String(s ?? "").toLowerCase();
  return EVENT_STATUS_BADGE[key] ?? { label: s ?? "—", className: "bg-muted text-muted-foreground border-border" };
}

export function EventDirectionIcon({ direction }: { direction: string | null | undefined }) {
  if (String(direction).toLowerCase() === "out") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="صادر">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        صادر
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="وارد">
      <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
      وارد
    </span>
  );
}

/** شارة مزود ملونة موحدة */
export function ProviderBadge({
  provider,
  className,
}: {
  provider: string | null | undefined;
  className?: string;
}) {
  const key = String(provider ?? "").toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        PROVIDER_BADGE_CLASS[key] ?? "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {providerLabel(provider)}
    </Badge>
  );
}

/* ─── بانر الطبقة غير المنشورة (أدمن فقط) ────────────────── */

export function IntegrationsLayerBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <PlugZap className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">طبقة التكاملات (v4.1) غير منشورة على الخادم الحي بعد.</p>
        <p className="text-xs leading-relaxed opacity-90">
          كل شاشات التكامل تعمل الآن بحالتها الهادئة الآمنة — بلا أي أخطاء — وتضيء تلقائياً
          لحظة نشر الطبقة على الخادم دون أي تعديل. بدون اتصال مفعّل يعمل النظام بمحركه
          الداخلي 100%.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex h-8 items-center rounded-md border border-amber-300 px-3 text-xs font-medium hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
          >
            إعادة الفحص
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── عودة فوديكس OAuth (?foodics=…) ─────────────────────── */

export type FoodicsReturnCode =
  | "connected"
  | "failed"
  | "denied"
  | "invalid_state"
  | "exchange_failed";

const FOODICS_RETURN_MESSAGES: Record<FoodicsReturnCode, { title: string; kind: "success" | "error" }> = {
  connected: { title: "تم ربط كاشيرك بنجاح", kind: "success" },
  failed: { title: "تعذّر ربط كاشيرك — أعد المحاولة", kind: "error" },
  denied: { title: "لم تتم الموافقة على الربط من فودكس", kind: "error" },
  invalid_state: { title: "جلسة الربط غير صالحة — أعد المحاولة", kind: "error" },
  exchange_failed: { title: "تعذّر تبديل التفويض مع فودكس — أعد المحاولة", kind: "error" },
};

/**
 * يعالج بارامترات العودة بعد OAuth ويعرض النتيجة ثم ينظف الرابط.
 * يُستخدم في شاشتي الأدمن والمالك (نفس المكان للمرجع).
 */
export function useIntegrationsOAuthReturn() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const code = searchParams.get("foodics") as FoodicsReturnCode | null;
    if (!code) return;
    handled.current = true;
    const msg = FOODICS_RETURN_MESSAGES[code] ?? {
      title: "انتهت عملية الربط بنتيجة غير معروفة",
      kind: "error" as const,
    };
    toast({
      title: msg.title,
      variant: msg.kind === "error" ? "destructive" : "default",
    });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("foodics");
    next.delete("connection_id");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams]);
}

/* ─── سطر حدث مصغّر (مرآة مغلقة في سجل الطلب) ─────────────── */

export function MiniEventMirror({ events }: { events: IntegrationEventOut[] }) {
  if (!events.length) return null;
  return (
    <ul className="space-y-1" aria-label="سجل أحداث التكاملات لهذا الطلب">
      {events.slice(0, 5).map((e, i) => (
        <li key={e.id ?? i} className="flex items-center gap-2 text-xs text-muted-foreground">
          <ProviderBadge provider={e.provider ?? undefined} className="px-1.5 py-0 text-[10px]" />
          <span dir="ltr" className="font-mono">
            {e.event_type ?? "—"}
          </span>
          <span>·</span>
          <span>{eventStatusBadge(e.status).label}</span>
        </li>
      ))}
    </ul>
  );
}

export function AlertLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
