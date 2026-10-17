"use client";

import { useFacilities } from "@/hooks/useFacilities";
import type { FacilityType } from "@/types/api.generated";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

const FACILITY_TYPE_BADGE_CLASS: Record<FacilityType, string> = {
  restaurant: "bg-cat-restaurant/15 text-cat-restaurant border-cat-restaurant/25 hover:bg-cat-restaurant/15",
  cafe: "bg-cat-cafe/15 text-cat-cafe border-cat-cafe/25 hover:bg-cat-cafe/15",
  cafeteria: "bg-cat-facility/15 text-cat-facility border-cat-facility/25 hover:bg-cat-facility/15",
};

export function FacilitiesList() {
  const { t } = useLang();
  const { data, isLoading, error, refetch } = useFacilities();

  if (isLoading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-base font-medium text-foreground">
            {t("catalog.storesList.errorTitle")}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("catalog.storesList.errorDesc")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const facilities = [...(data ?? [])].sort(
    (a, b) => a.display_order - b.display_order || a.id - b.id
  );

  if (facilities.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-base font-medium text-foreground">
            {t("catalog.storesList.emptyTitle")}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("catalog.storesList.emptyDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={GRID}>
      {facilities.map((f) => (
        <Card
          key={f.id}
          className={cn(
            "native-tap-card group transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/25"
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-base">{f.name}</CardTitle>
              <Badge
                className={cn(
                  "shrink-0 border",
                  FACILITY_TYPE_BADGE_CLASS[f.type]
                )}
              >
                {t(`catalog.type.${f.type}`)}
              </Badge>
            </div>
          </CardHeader>
          {(f.description || f.discount_hint) ? (
            <CardContent className="space-y-2">
              {f.description ? (
                <CardDescription className="line-clamp-2">
                  {f.description}
                </CardDescription>
              ) : null}
              {/* v3.2.2 — تلميح الخصم من التاجر يُعرض للعملاء (بصمة §4-ب) */}
              {f.discount_hint ? (
                <span
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold leading-none text-accent-foreground shadow-sm"
                  title={f.discount_hint}
                >
                  <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{f.discount_hint}</span>
                </span>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
