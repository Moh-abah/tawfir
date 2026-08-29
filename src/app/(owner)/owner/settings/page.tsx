"use client";

import {
  Info,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Store,
  User,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarDays,
  ChevronLeft,
  Bell,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/theme-provider";
import { useOwnerAuth, useOwnerLogout } from "@/hooks/useOwnerAuth";
import { useAccountMe } from "@/hooks/useAccountMe";
import { PasswordChangeCard } from "@/components/shared/PasswordChangeCard";
import { SoundSettingsCard } from "@/components/shared/SoundSettingsCard";
import { useMyFacilities } from "@/hooks/useMyFacilities";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { APP_VERSION } from "@/lib/pwa/version";
import { formatDate } from "@/lib/format";
import { SITE_NAME, DELIVERY_FEE } from "@/lib/site-config";
import type { Facility } from "@/types/api.generated";
import { cn } from "@/lib/utils";

/* ─── معلومات التواصل الحقيقية — مواصفة توفير اليمنية ─── */
const CONTACT_PHONE = "780090882";
const CONTACT_PHONE_DISPLAY = "780 090 882";
const CONTACT_WHATSAPP = "https://wa.me/967780090882";
const CONTACT_EMAIL = "moohabhb68@gmail.com";

/** حالة المتجر الحقيقية من الباك إند (is_approved/rejection_reason). */
function facilityStatus(f: Facility): {
  label: string;
  tone: "success" | "warning" | "destructive";
  icon: typeof CheckCircle2;
} {
  if (f.is_approved === undefined || f.is_approved === true) {
    return { label: "موافق عليها", tone: "success", icon: CheckCircle2 };
  }
  if (f.rejection_reason) {
    return { label: "مرفوضة", tone: "destructive", icon: XCircle };
  }
  return { label: "بانتظار موافقة المشرف", tone: "warning", icon: Clock };
}

const TONE_CLASS: Record<"success" | "warning" | "destructive", string> = {
  success: "bg-success/15 text-success",
  warning: "bg-accent/15 text-accent",
  destructive: "bg-destructive/15 text-destructive",
};

// ═══════════════════════════════════════════════════════════════
// أنماط قائمة iOS — الجولة 9 (المهمة 8)
// كل صف: أيقونة + عنوان + chevron (أو تحكم على اليمين)
// ═══════════════════════════════════════════════════════════════

/** عنوان قسم صغير (نمط iOS Settings). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
      {children}
    </p>
  );
}

/** حاوية قائمة iOS (مجموعة صفوف في بطاقة واحدة بزوايا مدوّرة). */
function ListGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y overflow-hidden rounded-2xl border border-border/60 bg-card">
      {children}
    </div>
  );
}

/** صف iOS — أيقونة + عنوان + (قيمة أو تحكم) + chevron اختياري. */
interface RowProps {
  icon: typeof User;
  iconClass: string;
  title: string;
  value?: string;
  href?: string;
  onClick?: () => void;
  trailing?: "chevron" | "switch" | "none";
  switchChecked?: boolean;
  onSwitchChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function IosRow({
  icon: Icon,
  iconClass,
  title,
  value,
  href,
  onClick,
  trailing = "chevron",
  switchChecked,
  onSwitchChange,
  disabled,
  ariaLabel,
}: RowProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          iconClass,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {value && (
          <p dir="ltr" className="mt-0.5 truncate text-xs text-muted-foreground">
            {value}
          </p>
        )}
      </div>
      {trailing === "switch" && (
        <Switch
          checked={switchChecked}
          onCheckedChange={onSwitchChange}
          aria-label={ariaLabel ?? title}
        />
      )}
      {trailing === "chevron" && !disabled && (
        <ChevronLeft
          className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        className="native-tap flex h-14 min-h-[44px] items-center gap-3 px-4 transition-colors hover:bg-muted/40"
      >
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="native-tap flex h-14 min-h-[44px] w-full items-center gap-3 px-4 text-right transition-colors hover:bg-muted/40 disabled:opacity-50"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="flex h-14 min-h-[44px] items-center gap-3 px-4">
      {content}
    </div>
  );
}

/** زر الخروج في صف iOS — أحمر، بدون chevron. */
function LogoutRow() {
  const logout = useOwnerLogout();
  return (
    <button
      type="button"
      onClick={() => logout()}
      className="native-tap flex h-14 min-h-[44px] w-full items-center justify-center gap-2 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
    >
      <Lock className="h-4 w-4" aria-hidden="true" />
      تسجيل الخروج
    </button>
  );
}

/**
 * إعدادات المالك — الجولة 9 (المهمة 8): إعادة تصميم بنمط iOS.
 *
 * بنية iOS Settings:
 *  - أقسام صغيرة بعنوان رمادي صغير
 *  - كل قسم: مجموعة صفوف في بطاقة واحدة بزوايا مدوّرة
 *  - كل صف: أيقونة + عنوان + chevron (أو switch للأزرار التبديلية)
 *  - معلومات حقيقية فقط: GET /me + GET /owner/facility
 */
export default function OwnerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { accessToken, hydrated } = useOwnerAuth();

  const me = useAccountMe("owner", hydrated && !!accessToken);
  const facilities = useMyFacilities();

  const account = me.data;
  const myFacilities = facilities.data ?? [];
  const isLoadingMe = me.isLoading && hydrated;

  return (
    <div className="mx-auto max-w-2xl space-y-1 pb-24">
      <header className="px-4 pt-2 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إعدادات تطبيق بوابة المتاجر.
        </p>
      </header>

      {/* ════════════ معلومات الحساب ════════════ */}
      <SectionLabel>الحساب</SectionLabel>
      <ListGroup>
        {isLoadingMe ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </div>
        ) : account ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground">
                {account.full_name?.trim().charAt(0) || "م"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{account.full_name}</p>
                <p dir="ltr" className="truncate text-sm text-muted-foreground">
                  {account.email}
                </p>
              </div>
            </div>
            <IosRow
              icon={Phone}
              iconClass="bg-secondary/15 text-secondary"
              title="الجوال"
              value={account.phone}
              trailing="none"
            />
            <IosRow
              icon={User}
              iconClass="bg-primary/10 text-primary"
              title="الدور"
              value="مالك متجر"
              trailing="none"
            />
            <IosRow
              icon={CalendarDays}
              iconClass="bg-accent/15 text-accent"
              title="تاريخ الإنشاء"
              value={formatDate(account.created_at)}
              trailing="none"
            />
          </>
        ) : (
          <IosRow
            icon={RefreshCw}
            iconClass="bg-muted text-muted-foreground"
            title="تعذّر تحميل بيانات الحساب"
            value="اضغط لإعادة المحاولة"
            onClick={() => me.refetch()}
            disabled={me.isFetching}
            trailing="none"
          />
        )}
      </ListGroup>

      {/* ════════════ متجري ════════════ */}
      <SectionLabel>متجري</SectionLabel>
      <ListGroup>
        {facilities.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : facilities.isError ? (
          <IosRow
            icon={RefreshCw}
            iconClass="bg-muted text-muted-foreground"
            title="تعذّر تحميل متجرك"
            onClick={() => facilities.refetch()}
            disabled={facilities.isFetching}
            trailing="none"
          />
        ) : myFacilities.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            لا توجد متاجر مرتبطة بحسابك.
          </div>
        ) : (
          myFacilities.map((f) => {
            const status = facilityStatus(f);
            return (
              <IosRow
                key={f.id}
                icon={Store}
                iconClass={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  TONE_CLASS[status.tone],
                )}
                title={f.name}
                value={
                  f.rejection_reason
                    ? `سبب الرفض: ${f.rejection_reason}`
                    : status.label
                }
                href={`/owner/facilities/${f.id}`}
                ariaLabel={`إدارة ${f.name}`}
              />
            );
          })
        )}
      </ListGroup>

      {/* ════════════ المظهر + التطبيق ════════════ */}
      <SectionLabel>المظهر والتطبيق</SectionLabel>
      <ListGroup>
        <IosRow
          icon={Store}
          iconClass="bg-primary/10 text-primary"
          title="الوضع الداكن"
          trailing="switch"
          switchChecked={theme === "dark"}
          onSwitchChange={(checked) => setTheme(checked ? "dark" : "light")}
          ariaLabel="تبديل المظهر"
        />
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            ثبّت بوابة المتاجر على شاشتك الرئيسية للوصول بنقرة واحدة.
          </p>
          <PWAInstallButton portal="owner" variant="full" />
        </div>
      </ListGroup>

      {/* ════════════ الدعم والتواصل ════════════ */}
      <SectionLabel>الدعم والتواصل</SectionLabel>
      <ListGroup>
        <IosRow
          icon={Phone}
          iconClass="bg-secondary/15 text-secondary"
          title="الهاتف"
          value={CONTACT_PHONE_DISPLAY}
          href={`tel:${CONTACT_PHONE}`}
        />
        <IosRow
          icon={MessageCircle}
          iconClass="bg-success/15 text-success"
          title="واتساب"
          value={`محادثة مباشرة مع فريق ${SITE_NAME}`}
          href={CONTACT_WHATSAPP}
        />
        <IosRow
          icon={Mail}
          iconClass="bg-primary/10 text-primary"
          title="البريد الإلكتروني"
          value={CONTACT_EMAIL}
          href={`mailto:${CONTACT_EMAIL}`}
        />
        <IosRow
          icon={MapPin}
          iconClass="bg-accent/15 text-accent"
          title="الموقع"
          value="الجمهورية اليمنية — صنعاء"
          trailing="none"
        />
      </ListGroup>

      {/* ════════════ عن التطبيق ════════════ */}
      <SectionLabel>عن التطبيق</SectionLabel>
      <ListGroup>
        <IosRow
          icon={Info}
          iconClass="bg-muted text-muted-foreground"
          title="الإصدار"
          value={APP_VERSION}
          trailing="none"
        />
        <IosRow
          icon={Bell}
          iconClass="bg-primary/10 text-primary"
          title="رسوم التوصيل"
          value={`${DELIVERY_FEE} ر.ي ثابتة`}
          trailing="none"
        />
        <div className="px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {SITE_NAME} — بوابة أصحاب المتاجر. يعمل التطبيق أوفلاين بعرض آخر
            بيانات ظهرت سابقاً، وتتطلب جميع العمليات اتصالاً بالإنترنت.
          </p>
        </div>
      </ListGroup>

      {/* ════════════ الحساب — تسجيل الخروج ════════════ */}
      <SectionLabel>الحساب</SectionLabel>
      <ListGroup>
        <LogoutRow />
      </ListGroup>

      {/* ════════════ بطاقات منفصلة (لها منطقها الخاص) ════════════ */}
      <div className="pt-4" />
      <PasswordChangeCard role="owner" />
      <SoundSettingsCard />
    </div>
  );
}
