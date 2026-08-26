"use client";

import { useFacilities } from "@/hooks/useFacilities";
import type { FacilityType } from "@/types/api.generated";
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
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
  public_facility: "مرفق عام",
};

const FACILITY_TYPE_BADGE_CLASS: Record<FacilityType, string> = {
  restaurant: "bg-cat-restaurant/15 text-cat-restaurant border-cat-restaurant/25 hover:bg-cat-restaurant/15",
  cafe: "bg-cat-cafe/15 text-cat-cafe border-cat-cafe/25 hover:bg-cat-cafe/15",
  public_facility:
    "bg-cat-facility/15 text-cat-facility border-cat-facility/25 hover:bg-cat-facility/15",
};

export function FacilitiesList() {
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
            تعذّر تحميل المنشآت
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            حدث خطأ أثناء جلب المطاعم والمقاهي والمرافق. حاول مرة أخرى.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            إعادة المحاولة
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
            لا توجد منشآت في هذه المنطقة
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            ترقّب المزيد من المطاعم والمقاهي والمرافق قريبًا.
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
            "transition-all duration-200",
            "hover:shadow-md hover:ring-1 hover:ring-primary/20"
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
                {FACILITY_TYPE_LABEL[f.type]}
              </Badge>
            </div>
          </CardHeader>
          {f.description ? (
            <CardContent>
              <CardDescription className="line-clamp-2">
                {f.description}
              </CardDescription>
            </CardContent>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
