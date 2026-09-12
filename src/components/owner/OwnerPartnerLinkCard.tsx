"use client";

/**
 * OwnerPartnerLinkCard — ربط نظام خارجي (شريك خدمات) بالمتجر.
 * ═══════════════════════════════════════════════════════════════════
 * POST /partner/facilities/{fid}/link-request {system_name, contact_email,
 * link_mode} → ينتظر موافقة الإدارة (المفتاح يظهر مرة واحدة عند
 * الموافقة من بوابة الإدارة).
 * GET /partner/facilities/{fid}/link-status → الحالة + صحة الشريك.
 */

import { useState } from "react";
import {
  Cable,
  CheckCircle2,
  Clock,
  Loader2,
  Plug,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  usePartnerLinkStatus,
  usePartnerLinkRequest,
} from "@/hooks/useOwnerDelivery";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export function OwnerPartnerLinkCard({ facilityId }: { facilityId: number }) {
  const status = usePartnerLinkStatus(facilityId);
  const request = usePartnerLinkRequest(facilityId);

  const [systemName, setSystemName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [linkMode, setLinkMode] = useState<"internal_system" | "mobile_backend">(
    "internal_system",
  );

  const data = status.data;
  const nameValid = systemName.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());

  const submit = () => {
    if (!nameValid || !emailValid) return;
    haptic("light");
    request.mutate({
      system_name: systemName.trim(),
      contact_email: contactEmail.trim(),
      link_mode: linkMode,
    });
  };

  return (
    <section
      aria-label="ربط نظام شريك"
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Plug className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-extrabold text-foreground">
          ربط نظام خارجي (شريك)
        </h2>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        اربط نظام إدارة طلباتك (POS / تطبيق داخلي) بمتجرك على توفير —
        تُزامَن منتجاتك وعروضك آلياً عبر واجهة الشريك بعد موافقة الإدارة.
      </p>

      {status.isLoading && !data ? (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          جارٍ جلب حالة الربط…
        </div>
      ) : data ? (
        data.linked ? (
          /* مربوط فعّال */
          <div
            role="status"
            className="mt-4 space-y-2 rounded-xl border border-success/30 bg-success/[0.05] p-4"
          >
            <p className="flex items-center gap-2 text-sm font-black text-success">
              <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
              الربط فعّال — {data.system_name}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              بادئة المفتاح: <span dir="ltr">{data.key_prefix}…</span>
              {data.health && (
                <>
                  {" "}
                  · {data.health.success_count_7d} استدعاء ناجح خلال ٧ أيام ·{" "}
                  {data.health.synced_products_count} منتج مُزامن
                </>
              )}
            </p>
          </div>
        ) : data.request_status === "pending" ? (
          /* بانتظار موافقة الإدارة */
          <div
            role="status"
            className="mt-4 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4"
          >
            <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                طلب ربط «{data.system_name}» بانتظار موافقة الإدارة
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                سيظهر مفتاح الربط لمرة واحدة عند الموافقة — احتفظ به في
                نظامك فور ظهوره.
              </p>
            </div>
          </div>
        ) : (
          /* لا طلب — النموذج */
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner-name" className="text-xs font-bold">
                اسم النظام/المزوّد
              </Label>
              <Input
                id="partner-name"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value.slice(0, 160))}
                placeholder="مثال: نظام مطاعم الأصيل POS"
                className="h-11 rounded-xl"
                aria-required="true"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partner-email" className="text-xs font-bold">
                بريد التواصل
              </Label>
              <Input
                id="partner-email"
                type="email"
                dir="ltr"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value.slice(0, 190))}
                placeholder="admin@pos-example.com"
                className="h-11 rounded-xl text-left"
                aria-required="true"
                aria-invalid={contactEmail !== "" && !emailValid}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">وضع الربط</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "internal_system", l: "نظام داخلي (POS)" },
                  { v: "mobile_backend", l: "خلفية تطبيق جوال" },
                ].map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    role="radio"
                    aria-checked={linkMode === m.v}
                    onClick={() => {
                      haptic("tick");
                      setLinkMode(m.v as "internal_system" | "mobile_backend");
                    }}
                    className={cn(
                      "native-tap min-h-[44px] rounded-xl border-2 px-3 text-xs font-bold transition-colors",
                      linkMode === m.v
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={submit}
              disabled={!nameValid || !emailValid || request.isPending}
              className="h-12 w-full gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
              aria-label="إرسال طلب ربط الشريك"
            >
              {request.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Cable className="h-5 w-5" aria-hidden="true" />
              )}
              إرسال طلب الربط
            </Button>
          </div>
        )
      ) : null}

      {status.isError && (
        <p
          role="note"
          className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground"
        >
          <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          تعذّر جلب حالة الربط — أعد تحميل الصفحة لاحقاً
        </p>
      )}
    </section>
  );
}
