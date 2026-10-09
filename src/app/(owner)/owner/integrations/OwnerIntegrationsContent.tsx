"use client";

/**
 * OwnerIntegrationsContent.tsx — شاشة «التكاملات» للتاجر
 * 3 بطاقات هادئة (اربط كاشيرك / التوصيل الخارجي / قنوات الطلب).
 * هذه الشاشة قد تستقبل مرجع فوديكس أيضاً (نفس معالج العودة).
 */
import { Suspense } from "react";
import { Blocks } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MerchantIntegrations } from "@/components/integrations/MerchantIntegrations";
import { useIntegrationsOAuthReturn } from "@/components/integrations/integrations-ui";

function OwnerIntegrationsInner() {
  useIntegrationsOAuthReturn();
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Blocks className="h-6 w-6 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-bold">التكاملات</h1>
      </header>

      <MerchantIntegrations />
    </div>
  );
}

export default function OwnerIntegrationsContent() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <OwnerIntegrationsInner />
    </Suspense>
  );
}
