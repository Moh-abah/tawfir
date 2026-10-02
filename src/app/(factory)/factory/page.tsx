"use client";

import dynamic from "next/dynamic";
import { Shell } from "@/components/factory/Shell";
import { HomeHub } from "@/components/factory/HomeHub";
import { useNav } from "@/store/session";

/**
 * مركز المصنع على /factory — نفس واجهات الجولة 7 مدمجة داخل tawfir-front.
 * الكونسول وحده مستثنى من هذا الراوتر: صفحته المستقلة على /console
 * (مجموعة (factory-console) بعزل بصري وتوكني كامل).
 */

const OwnerBrandPanel = dynamic(
  () => import("@/components/factory/owner/BrandPanel").then((m) => m.OwnerBrandPanel),
  { loading: () => <PanelSkeleton /> }
);
const OwnerMySitePanel = dynamic(
  () => import("@/components/factory/owner/MySitePanel").then((m) => m.OwnerMySitePanel),
  { loading: () => <PanelSkeleton /> }
);
const OwnerCouriersPanel = dynamic(
  () => import("@/components/factory/owner/CouriersPanel").then((m) => m.OwnerCouriersPanel),
  { loading: () => <PanelSkeleton /> }
);
const AdminTenantSitesPanel = dynamic(
  () => import("@/components/factory/admin/TenantSitesPanel").then((m) => m.AdminTenantSitesPanel),
  { loading: () => <PanelSkeleton /> }
);
const GeneratedSite = dynamic(
  () => import("@/components/factory/site/GeneratedSite").then((m) => m.GeneratedSite),
  { loading: () => <PanelSkeleton /> }
);
const FactoryDevPanel = dynamic(
  () => import("@/components/factory/dev/FactoryDevPanel").then((m) => m.FactoryDevPanel),
  { loading: () => <PanelSkeleton /> }
);

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-1/3 animate-pulse rounded-lg bg-stone-200" />
      <div className="h-40 animate-pulse rounded-xl bg-stone-200" />
      <div className="h-40 animate-pulse rounded-xl bg-stone-200" />
    </div>
  );
}

function SectionRouter() {
  const section = useNav((s) => s.section);
  switch (section) {
    case "owner-brand":
      return <OwnerBrandPanel />;
    case "owner-site":
      return <OwnerMySitePanel />;
    case "owner-couriers":
      return <OwnerCouriersPanel />;
    case "admin-sites":
      return <AdminTenantSitesPanel />;
    case "generated-site":
      return <GeneratedSite />;
    case "factory-dev":
      return <FactoryDevPanel />;
    case "home":
    default:
      return <HomeHub />;
  }
}

export default function FactoryPage() {
  return (
    <Shell>
      <SectionRouter />
    </Shell>
  );
}
