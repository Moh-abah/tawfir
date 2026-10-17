"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Upload,
  Loader2,
  Wallet,
  User,
  Hash,
  Info,
  X,
  CheckCircle2,
  Send,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { MemberCard } from "@/components/public/MemberCard";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useMe } from "@/hooks/useMe";
import { useMembershipInfo } from "@/hooks/useMembershipInfo";
import { useSubscribeMembership } from "@/hooks/useSubscribeMembership";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { clearPendingMembershipRequest } from "@/lib/membership-local";
import { formatCurrency } from "@/lib/format";
import { MEMBERSHIP_AMOUNT } from "@/lib/site-config";
import { FreeMembershipCard } from "@/components/public/FreeMembershipCard";
import type { CustomerApiError } from "@/services/customer-api-client";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/* ─── حدّ حجم الصورة ───────────────────────────────── */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

/* ─── بطاقة معلومات التحويل ────────────────────────── */
function CopyField({
  icon: Icon,
  label,
  value,
  copyValue,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  copyValue?: string;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = copyValue ?? value;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: t("profile.sub.copyDone"), description: text });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("profile.sub.copyFail"),
        description: t("profile.sub.copyFailDesc"),
        variant: "destructive",
      });
    }
  }, [copyValue, value, toast, t]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-secondary" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {/* الجولة 9 (المهمة 9.2): القيمة قابلة للنسخ يدوياً (بالإضافة لزر النسخ)
            — استثناء من قاعدة منع التحديد العامة (انظر globals.css). */}
        <p
          dir="ltr"
          className="truncate text-left text-sm font-bold text-foreground"
          data-selectable="true"
          title={value}
        >
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="min-h-[40px] shrink-0 gap-1.5 rounded-full"
        aria-label={t("profile.sub.copyA11y", { label })}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? t("profile.sub.copied") : t("profile.sub.copy")}
      </Button>
    </div>
  );
}

/* ─── منطقة رفع صورة التحويل ──────────────────────── */
function ReceiptDropzone({
  file,
  onPick,
  onClear,
  error,
}: {
  file: File | null;
  onPick: (f: File) => void;
  onClear: () => void;
  error: string | null;
}) {
  const { toast } = useToast();
  const { t } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  /* URL المُعاينة مُشتق من الملف عبر useMemo — يُنظَّف يدوياً عند التبديل */
  const preview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const validateAndPick = useCallback(
    (f: File) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast({
          title: t("profile.sub.errType"),
          description: t("profile.sub.errTypeDesc"),
          variant: "destructive",
        });
        return;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast({
          title: t("profile.sub.errSize"),
          description: t("profile.sub.errSizeDesc"),
          variant: "destructive",
        });
        return;
      }
      onPick(f);
    },
    [onPick, toast, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) validateAndPick(f);
    },
    [validateAndPick]
  );

  return (
    <div className="space-y-2">
      <Label
        htmlFor="receipt-dropzone-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={(e) => {
          e.preventDefault();
          inputRef.current?.click();
        }}
        className={cn(
          "flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card/50 p-6 text-center transition-colors",
          dragging
            ? "border-secondary bg-secondary/10"
            : "border-border hover:border-secondary/60 hover:bg-muted/40",
          error && "border-destructive/60 bg-destructive/5"
        )}
      >
        <input
          ref={inputRef}
          id="receipt-dropzone-input"
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndPick(f);
            /* إعادة ضبط لتسهيل إعادة اختيار نفس الملف */
            e.target.value = "";
          }}
        />

        {preview ? (
          <div className="relative h-32 w-32 overflow-hidden rounded-xl border bg-muted">
            {/* معاينة ملف محلي قبل الإرسال — لا حاجة لـ next/image */}
            <img
              src={preview}
              alt={t("profile.sub.previewA11y")}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </span>
        )}

        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {file ? file.name : t("profile.sub.dropTitle")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("profile.sub.dropHint")}
          </p>
        </div>
      </Label>

      {/* زر مسح الصورة */}
      {file && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {t("profile.sub.removeImage")}
        </button>
      )}

      {/* خطأ التحقق المحلي */}
      {error && (
        <p
          className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── شاشة النجاح ──────────────────────────────────── */
function SuccessScreen({
  detail,
  onAccount,
  onBrowse,
}: {
  detail: string;
  onAccount: () => void;
  onBrowse: () => void;
}) {
  const prefersReduced = usePrefersReducedMotion();
  const { t } = useLang();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-md text-center"
    >
      <div className="mb-6 flex justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-12 w-12 text-success" aria-hidden="true" />
        </span>
      </div>
      <h2 className="mb-2 text-2xl font-extrabold text-foreground">
        {t("profile.sub.successTitle")}
      </h2>
      <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
        {detail ||
          t("profile.sub.successDesc")}
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onAccount} className="min-h-[44px] w-full gap-2 rounded-full">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {t("auth.success.accountCta")}
        </Button>
        <Button
          onClick={onBrowse}
          variant="outline"
          className="min-h-[44px] w-full gap-2 rounded-full"
        >
          {t("auth.success.browseCta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── بطاقة عضوية نشطة (الحالة 1) ─────────────────── */
function AlreadyMember() {
  const prefersReduced = usePrefersReducedMotion();
  const { t } = useLang();
  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-9 w-9 text-success" aria-hidden="true" />
        </span>
        <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
          {t("profile.sub.memberTitle")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("profile.sub.memberDesc")}
        </p>
      </div>

      <MemberCard />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="min-h-[44px] gap-2 rounded-full">
          <Link href="/account">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t("auth.success.accountCta")}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] gap-2 rounded-full"
        >
          <Link href="/">
            {t("auth.success.browseCta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── هيكل التحميل ──────────────────────────────────── */
function SubscribeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="mx-auto h-8 w-52" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/* ─── نموذج الاشتراك ──────────────────────────────── */
function SubscribeForm({
  amount,
  transferAccountName,
  transferAccountNumber,
  walletName,
  instructions,
}: {
  amount: number;
  transferAccountName: string;
  transferAccountNumber: string;
  walletName: string;
  instructions: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLang();
  const prefersReduced = usePrefersReducedMotion();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [successDetail, setSuccessDetail] = useState<string | null>(null);

  const subscribeMutation = useSubscribeMembership();

  const handlePick = useCallback((f: File) => {
    setFile(f);
    setFileError(null);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setFileError(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError(t("profile.sub.errFile"));
      return;
    }
    subscribeMutation.mutate(
      {
        receiptImage: file,
        amount,
        transferAccountName,
        transferAccountNumber,
      },
      {
        onSuccess: (data) => {
          setSuccessDetail(data.detail || t("profile.sub.receivedFallback"));
          toast({
            title: t("profile.sub.toastSent"),
            description: data.detail,
          });
        },
        onError: (err: CustomerApiError) => {
          /* خطأ شبكة: 0 أو fetch failed */
          if (err.status === 0 || /اتصال|إنترنت|network/i.test(err.message)) {
            toast({
              title: t("profile.free.toastNetwork"),
              description: t("common.retryLater"),
              variant: "destructive",
            });
            return;
          }
          /* 422: رسالة الخادم العربية تُعرض كما هي */
          toast({
            title: err.status === 422 ? t("profile.sub.toastInvalid") : t("profile.sub.toastError"),
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  if (successDetail) {
    return (
      <SuccessScreen
        detail={successDetail}
        onAccount={() => router.push("/account")}
        onBrowse={() => router.push("/")}
      />
    );
  }

  const anim = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...anim}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6"
    >
      {/* رأس الصفحة */}
      <header className="text-center">
        <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
          {t("profile.sub.header")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("profile.sub.headerDesc", { amount: formatCurrency(amount) })}
        </p>
      </header>

      {/* بطاقة الشعار + المزايا */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-b from-muted/40 to-card p-5 text-center">
        <TawfirLogo className="h-12 w-auto" />
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: "var(--logo-gold)",
              color: "var(--logo-white)",
            }}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t("profile.free.badge")}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
            {t("profile.sub.badgeManual")}
          </span>
        </div>
      </div>

      {/* الخطوة 1: معلومات التحويل */}
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
              1
            </span>
            {t("profile.sub.step1Title")}
          </CardTitle>
          <CardDescription>
            {t("profile.sub.step1Desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyField
            icon={Wallet}
            label={t("profile.sub.fieldAmount")}
            value={formatCurrency(amount)}
          />
          <CopyField
            icon={User}
            label={t("profile.sub.fieldAccountName")}
            value={transferAccountName}
          />
          <CopyField icon={Wallet} label={t("profile.sub.fieldWallet")} value={walletName} />
          <CopyField
            icon={Hash}
            label={t("profile.sub.fieldAccountNumber")}
            value={transferAccountNumber}
          />

          {instructions && (
            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {instructions}
              </p>
            </div>
          )}

          {/* حقول مخفية مرئية (readonly) — مرجع المستخدم للبيانات المُرسلة */}
          <div className="hidden">
            <Input
              type="text"
              value={transferAccountName}
              readOnly
              aria-hidden="true"
              tabIndex={-1}
              name="transfer_account_name"
            />
            <Input
              type="text"
              value={transferAccountNumber}
              readOnly
              aria-hidden="true"
              tabIndex={-1}
              name="transfer_account_number"
            />
            <Input
              type="number"
              value={amount}
              readOnly
              aria-hidden="true"
              tabIndex={-1}
              name="amount"
            />
          </div>
        </CardContent>
      </Card>

      {/* الخطوة 2: رفع صورة التحويل */}
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
              2
            </span>
            {t("profile.sub.step2Title")}
          </CardTitle>
          <CardDescription>
            {t("profile.sub.step2Desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceiptDropzone
            file={file}
            onPick={handlePick}
            onClear={handleClear}
            error={fileError}
          />
        </CardContent>
      </Card>

      {/* زر الإرسال */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={subscribeMutation.isPending || !file}
        className="min-h-[44px] w-full gap-2 rounded-full"
      >
        {subscribeMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("profile.sub.sending")}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            {t("profile.sub.sendCta")}
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t("profile.sub.footerNote")}
      </p>
    </motion.div>
  );
}

/* ─── شاشة تسجيل الدخول المطلوب ────────────────────── */
function LoginRequired() {
  const { t } = useLang();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-extrabold text-foreground">
        {t("profile.sub.loginRequired")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("profile.sub.loginRequiredDesc")}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild className="min-h-[44px] rounded-full">
          <Link href="/login?next=/membership/subscribe">{t("auth.login.cta")}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] rounded-full"
        >
          <Link href="/register">{t("profile.registerCta")}</Link>
        </Button>
      </div>
    </div>
  );
}

/* ─── المحتوى الرئيسي ────────────────────────────── */
export default function SubscribeContent() {
  const { accessToken, hydrated } = useCustomerAuth();
  const me = useMe();
  const info = useMembershipInfo();
  const { t } = useLang();

  /* عند ظهور بطاقة العضوية في /me: نحذف أي طلب معلّق محلي */
  useEffect(() => {
    if (me.data?.membership) {
      clearPendingMembershipRequest();
    }
  }, [me.data?.membership]);

  /* قبل الترطيب: هيكل ثابت */
  if (!hydrated) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  /* غير مسجّل → شاشة طلب تسجيل الدخول */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <LoginRequired />
      </>
    );
  }

  /* بانتظار بيانات العميل */
  if (me.isLoading) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  if (me.isError || !me.data) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title={t("profile.sub.errMe")}
            message={
              me.error instanceof Error
                ? me.error.message
                : t("profile.sub.errMeDesc")
            }
            onRetry={() => me.refetch()}
          />
        </div>
      </>
    );
  }

  /* العميل عضو نشط → شاشة «عضو بالفعل» */
  const membership = me.data.membership;
  if (membership && membership.is_active) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <AlreadyMember />
      </>
    );
  }

  /* بانتظار بيانات التحويل الثابتة */
  if (info.isLoading) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  if (info.isError || !info.data) {
    return (
      <>
        <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title={t("profile.sub.errInfo")}
            message={
              info.error instanceof Error
                ? info.error.message
                : t("profile.sub.errInfoDesc")
            }
            onRetry={() => info.refetch()}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title={t("profile.subscribeScreenTitle")} fallbackHref="/account" />
      {/* v3.2.1 — الفصل السوقي للعضوية يُقرأ من رد الخادم نفسه (info.market):
          السوق السعودي (966 + مبلغ 0) → عضوية مجانية بتفعيل فوري، ومسار الإيصال
          مخفي هناك إطلاقاً. السوق اليمني (967) → مساره القائم كما هو:
          تحويل + رفع إيصال + موافقة المشرف. */}
      {info.data.market === "966" && info.data.amount === 0 ? (
        <FreeMembershipCard
          discountLabel={info.data.discount_label ?? undefined}
          instructions={info.data.instructions ?? undefined}
        />
      ) : (
        <SubscribeForm
          amount={info.data.amount || MEMBERSHIP_AMOUNT}
          transferAccountName={info.data.transfer_account_name ?? ""}
          transferAccountNumber={info.data.transfer_account_number ?? ""}
          walletName={info.data.wallet_name ?? ""}
          instructions={info.data.instructions ?? ""}
        />
      )}
    </>
  );
}
