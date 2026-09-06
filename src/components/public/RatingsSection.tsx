"use client";

import { useState } from "react";
import { Star, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Stars } from "@/components/shared/Stars";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRatings } from "@/hooks/useRatings";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { customerApiClient } from "@/services/customer-api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast, useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { RatingItem } from "@/services/rating.service";

/**
 * قسم التقييمات — الجولة 21 (webDevReview #7).
 *
 * يعرض:
 *  - متوسط التقييم + النجوم الكبيرة + العدد
 *  - قائمة التقييمات (تعليقات + نجوم + اسم المستخدم + التاريخ)
 *  - نموذج إضافة تقييم (نجوم قابلة للنقر + تعليق + زر إرسال)
 *
 * متطلب: تسجيل دخول لإضافة تقييم (القراءة public).
 */
interface RatingsSectionProps {
  type: "product" | "facility";
  id: number;
  name: string;
}

export function RatingsSection({ type, id, name }: RatingsSectionProps) {
  const { data, isLoading } = useRatings(type, id);
  const { accessToken, hydrated } = useCustomerAuth();
  const [showForm, setShowForm] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  const items = data?.items ?? [];
  const average = data?.average ?? 0;
  const total = data?.total ?? 0;

  return (
    <section className="mt-8" aria-label={`تقييمات ${name}`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Star className="h-5 w-5 text-accent" aria-hidden="true" />
          التقييمات
          {total > 0 && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-ink">
              {total}
            </span>
          )}
        </h2>
      </div>

      {/* ملخص المتوسط */}
      {total > 0 && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border/40 bg-card p-4">
          <div className="text-center">
            <p className="text-3xl font-black text-foreground">{average.toFixed(1)}</p>
            <Stars average={average} size="md" showNumber={false} className="mt-1" />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {total} تقييم
            </p>
          </div>
          <div className="h-16 w-px bg-border/40" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {average >= 4.5
                ? "تقييم ممتاز! 🌟"
                : average >= 3.5
                  ? "تقييم جيد جداً"
                  : average >= 2.5
                    ? "تقييم جيد"
                    : "تقييم متوسط"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              شارك تجربتك وساعد الآخرين في الاختيار
            </p>
          </div>
        </div>
      )}

      {/* زر إضافة تقييم */}
      {hydrated && accessToken && (
        <Button
          variant="outline"
          className="mb-5 w-full min-h-[44px] rounded-2xl"
          onClick={() => setShowForm((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {showForm ? "إلغاء" : "أضف تقييمك"}
        </Button>
      )}

      {/* نموذج إضافة تقييم */}
      {showForm && accessToken && (
        <RatingForm
          type={type}
          id={id}
          onSubmitted={() => setShowForm(false)}
        />
      )}

      {/* قائمة التقييمات */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-branded h-24 w-full rounded-2xl"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Star}
          title="لا توجد تقييمات بعد"
          description="كن أول من يقيّم هذا المنتج ومساعدة الآخرين في الاختيار"
        />
      ) : (
        <div className="space-y-3">
          {items.map((r, i) => (
            <RatingCard key={r.id} rating={r} delay={i * 0.05} prefersReduced={prefersReduced} />
          ))}
        </div>
      )}
    </section>
  );
}

function RatingCard({
  rating,
  delay,
  prefersReduced,
}: {
  rating: RatingItem;
  delay: number;
  prefersReduced: boolean;
}) {
  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="tawfir-card-enter rounded-2xl border border-border/40 bg-card p-4"
      data-stagger={Math.min(Math.round(delay * 20), 8)}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {rating.user_name.charAt(0)}
          </span>
          <div>
            <p className="text-xs font-bold text-foreground">
              {rating.user_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {rating.created_at
                ? new Date(rating.created_at).toLocaleDateString("ar-YE")
                : ""}
            </p>
          </div>
        </div>
        <Stars average={rating.stars} size="sm" showNumber={false} />
      </div>
      {rating.comment && (
        <p className="text-sm leading-relaxed text-foreground/80">
          {rating.comment}
        </p>
      )}
    </motion.div>
  );
}

function RatingForm({
  type,
  id,
  onSubmitted,
}: {
  type: "product" | "facility";
  id: number;
  onSubmitted: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (stars === 0) {
      toast({ title: "اختر عدد النجوم", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await customerApiClient.post("/ratings", {
        stars,
        comment: comment.trim() || null,
        [type === "product" ? "product_id" : "facility_id"]: id,
      });
      toast({ title: "شكراً لتقييمك! ⭐" });
      qc.invalidateQueries({ queryKey: ["ratings", type, id] });
      qc.invalidateQueries({ queryKey: ["rating-aggregate", type, id] });
      onSubmitted();
    } catch {
      toast({ title: "تعذّر إرسال التقييم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-border/40 bg-card p-4">
      <p className="mb-2 text-sm font-bold text-foreground">تقييمك</p>
      {/* نجوم قابلة للنقر */}
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStars(s)}
            aria-label={`${s} نجوم`}
            className="native-tap p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors",
                s <= stars
                  ? "fill-accent text-accent"
                  : "text-muted-foreground/30",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="اكتب تعليقك (اختياري)..."
        maxLength={500}
        className="mb-3 min-h-[80px] resize-none"
      />
      <Button
        onClick={handleSubmit}
        disabled={submitting || stars === 0}
        className="w-full min-h-[44px] rounded-2xl"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          "إرسال التقييم"
        )}
      </Button>
    </div>
  );
}
