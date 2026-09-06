"use client";

import Link from "next/link";
import { Bell, BellOff, Heart, Store } from "lucide-react";
import { motion } from "framer-motion";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFavorites,
  useSetNotifyOffers,
} from "@/hooks/useFavorites";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * قسم المتاجر المفضلة — الجولة 21 (webDevReview #6).
 *
 * يعرض المتاجر التي فضّلها المستخدم (من الباك إند، لا المحلية) مع:
 *  - إدارة إشعارات العروض لكل متجر (toggle bell)
 *  - رابط لصفحة المتجر
 *  - رسالة توضيحية: المفضلة تُفعّل الإشعارات الذكية للعروض الجديدة
 *
 * متجاوب: grid 1×ن على الموبايل، 2×ن على sm+.
 */
export function FavoriteFacilitiesSection() {
  const { accessToken, hydrated } = useCustomerAuth();
  const { data, isLoading } = useFavorites();
  const setNotify = useSetNotifyOffers();
  const prefersReduced = usePrefersReducedMotion();

  // غير مسجّل → لا نعرض القسم
  if (!hydrated || !accessToken) return null;

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <section className="mb-8" aria-label="المتاجر المفضلة">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          متجري المفضل
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mb-8" aria-label="المتاجر المفضلة">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          متجري المفضل
        </h2>
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-center">
          <Heart className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="mb-1 text-sm font-bold text-foreground">
            لا توجد متاجر مفضلة بعد
          </p>
          <p className="text-xs text-muted-foreground">
            اضغط زر القلب على أي متجر لتتلقى إشعارات فورية عند نشر عروضه الجديدة ⚡
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8" aria-label="المتاجر المفضلة">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Store className="h-5 w-5 text-primary" aria-hidden="true" />
          متجري المفضل
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {items.length}
          </span>
        </h2>
        <p className="text-[10px] text-muted-foreground">
          إشعارات العروض الجديدة ⚡
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((fav, i) => (
          <motion.div
            key={fav.facility_id}
            initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="tawfir-card-enter group flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-soft transition-all hover:shadow-md"
            data-stagger={Math.min(i, 8)}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Store className="h-6 w-6 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/facilities/${fav.facility_id}`}
                className="block truncate text-sm font-bold text-foreground transition-colors hover:text-primary"
              >
                {fav.facility_name}
              </Link>
              <p className="text-[10px] text-muted-foreground">
                {fav.facility_type === "restaurant" ? "مطعم" : fav.facility_type === "cafe" ? "كافيه" : "متجر"}
                {" · "}
                {fav.notify_offers ? "إشعارات مفعّلة" : "إشعارات معطّلة"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setNotify.mutate({
                  facilityId: fav.facility_id,
                  notifyOffers: !fav.notify_offers,
                })
              }
              disabled={setNotify.isPending}
              aria-label={
                fav.notify_offers
                  ? "إيقاف إشعارات العروض"
                  : "تفعيل إشعارات العروض"
              }
              aria-pressed={fav.notify_offers}
              className={cn(
                "native-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                fav.notify_offers
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {fav.notify_offers ? (
                <Bell className="h-4 w-4" aria-hidden="true" />
              ) : (
                <BellOff className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
