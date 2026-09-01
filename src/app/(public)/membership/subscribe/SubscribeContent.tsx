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
import type { CustomerApiError } from "@/services/customer-api-client";
import { cn } from "@/lib/utils";

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
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = copyValue ?? value;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "تم النسخ", description: text });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "تعذّر النسخ",
        description: "انسخ القيمة يدوياً من الحقل",
        variant: "destructive",
      });
    }
  }, [copyValue, value, toast]);

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
        aria-label={`نسخ ${label}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? "نُسخ" : "نسخ"}
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
          title: "صيغة غير مدعومة",
          description: "ارفع صورة بصيغة PNG أو JPG فقط",
          variant: "destructive",
        });
        return;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast({
          title: "حجم كبير جداً",
          description: "الحد الأقصى 2 ميجابايت",
          variant: "destructive",
        });
        return;
      }
      onPick(f);
    },
    [onPick, toast]
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
              alt="معاينة صورة التحويل"
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
            {file ? file.name : "اسحب صورة التحويل هنا أو اضغط للرفع"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            PNG أو JPG · الحد الأقصى 2 ميجابايت
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
          إزالة الصورة
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
        تم استلام طلبك!
      </h2>
      <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
        {detail ||
          "سيراجع فريقنا صورة التحويل خلال 24-48 ساعة، وستُفعَّل عضويتك فور الموافقة."}
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onAccount} className="min-h-[44px] w-full gap-2 rounded-full">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          حسابي
        </Button>
        <Button
          onClick={onBrowse}
          variant="outline"
          className="min-h-[44px] w-full gap-2 rounded-full"
        >
          تصفّح الوجبات
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── بطاقة عضوية نشطة (الحالة 1) ─────────────────── */
function AlreadyMember() {
  const prefersReduced = usePrefersReducedMotion();
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
          أنت عضو بالفعل!
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          عضويتك في توفير مفعّلة. استمتع بخصم حتى 30% على كل طلباتك القادمة.
        </p>
      </div>

      <MemberCard />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="min-h-[44px] gap-2 rounded-full">
          <Link href="/account">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            حسابي
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] gap-2 rounded-full"
        >
          <Link href="/">
            تصفّح الوجبات
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
      setFileError("يجب رفع صورة التحويل لإتمام الطلب");
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
          setSuccessDetail(data.detail || "تم استلام طلب العضوية بنجاح");
          toast({
            title: "تم إرسال الطلب",
            description: data.detail,
          });
        },
        onError: (err: CustomerApiError) => {
          /* خطأ شبكة: 0 أو fetch failed */
          if (err.status === 0 || /اتصال|إنترنت|network/i.test(err.message)) {
            toast({
              title: "يتطلب هذا الإجراء اتصالاً بالإنترنت",
              description: "تحقق من اتصالك ثم أعد المحاولة",
              variant: "destructive",
            });
            return;
          }
          /* 422: رسالة الخادم العربية تُعرض كما هي */
          toast({
            title: err.status === 422 ? "بيانات غير صالحة" : "تعذّر إرسال الطلب",
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
          اشترك في عضوية توفير
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          مبلغ سنوي ثابت {formatCurrency(amount)} · خصم حتى 30% على كل الوجبات
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
            خصم حتى 30%
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
            موافقة يدوية خلال 24-48 ساعة
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
            حوّل مبلغ الاشتراك
          </CardTitle>
          <CardDescription>
            حوّل المبلغ إلى المحفظة التالية ثم ارفع صورة التحويل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyField
            icon={Wallet}
            label="المبلغ المطلوب"
            value={formatCurrency(amount)}
          />
          <CopyField
            icon={User}
            label="اسم صاحب الحساب"
            value={transferAccountName}
          />
          <CopyField icon={Wallet} label="المحفظة" value={walletName} />
          <CopyField
            icon={Hash}
            label="رقم الحساب"
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
            ارفع صورة التحويل
          </CardTitle>
          <CardDescription>
            لقطة شاشة أو صورة واضحة لإيصال التحويل
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
            جارٍ إرسال الطلب...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            أرسل طلب الاشتراك
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        ستُراجع صورتك خلال 24-48 ساعة. عند الموافقة ستظهر بطاقة عضويتك في حسابك.
      </p>
    </motion.div>
  );
}

/* ─── شاشة تسجيل الدخول المطلوب ────────────────────── */
function LoginRequired() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-extrabold text-foreground">
        سجّل الدخول أولاً
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        يجب تسجيل الدخول للاشتراك في عضوية توفير.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button asChild className="min-h-[44px] rounded-full">
          <Link href="/login?next=/membership/subscribe">تسجيل الدخول</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] rounded-full"
        >
          <Link href="/register">إنشاء حساب</Link>
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
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  /* غير مسجّل → شاشة طلب تسجيل الدخول */
  if (!accessToken) {
    return (
      <>
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <LoginRequired />
      </>
    );
  }

  /* بانتظار بيانات العميل */
  if (me.isLoading) {
    return (
      <>
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  if (me.isError || !me.data) {
    return (
      <>
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title="تعذّر تحميل بياناتك"
            message={
              me.error instanceof Error
                ? me.error.message
                : "تعذّر التحقق من حالة عضويتك. تحقق من اتصالك بالإنترنت."
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
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <AlreadyMember />
      </>
    );
  }

  /* بانتظار بيانات التحويل الثابتة */
  if (info.isLoading) {
    return (
      <>
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <SubscribeSkeleton />
      </>
    );
  }

  if (info.isError || !info.data) {
    return (
      <>
        <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
          <ErrorState
            title="تعذّر تحميل بيانات التحويل"
            message={
              info.error instanceof Error
                ? info.error.message
                : "تعذّر جلب معلومات الاشتراك. تحقق من اتصالك بالإنترنت."
            }
            onRetry={() => info.refetch()}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="اشترك في العضوية" fallbackHref="/account" />
      <SubscribeForm
        amount={info.data.amount || MEMBERSHIP_AMOUNT}
        transferAccountName={info.data.transfer_account_name}
        transferAccountNumber={info.data.transfer_account_number}
        walletName={info.data.wallet_name}
        instructions={info.data.instructions}
      />
    </>
  );
}
