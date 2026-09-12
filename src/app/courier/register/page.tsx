"use client";

/**
 * /courier/register — التسجيل الميداني (شاشة 2/11).
 * ═════════════════════════════════════════════════════════
 * أربع خطوات: الهوية → الحساب → المركبة والمنطقة → المستندات.
 * 
 * تدفق المستندات (مجَرَّب حياً على العقد):
 *   1) POST /courier/auth/register (البيانات النصية) → courier_id
 *   2) دخول تلقائي ببيانات الحساب (نفس الجلسة)
 *   3) رفع كل مستند: POST /courier/documents (multipart + doc_type)
 *      — الكاميرا input capture="environment" (موبايل-أولاً)
 *   4) POST /courier/me/documents-recheck إبلاغ الإدارة بالاكتمال
 *   ثم التوجيه إلى /courier/waiting.
 */

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Camera,
  CheckCircle2,
  FileImage,
  IdCard,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AuthShell } from "@/components/shared/AuthShell";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCourierRegister,
  useCourierDocUpload,
  useCourierRecheck,
} from "@/hooks/useCourier";
import { useCourierAuthStore } from "@/store/courierAuth.store";
import { courierAuthService } from "@/services/courier.service";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── العقد (zod مطابق لسكيما CourierRegister) ──────────── */

const schema = z
  .object({
    document_full_name: z
      .string()
      .min(3, "الاسم الثلاثي كما في الوثيقة الرسمية (٣ أحرف على الأقل)")
      .max(160),
    public_name: z
      .string()
      .min(2, "الاسم العلني الذي يظهر للمتاجر (حرفان على الأقل)")
      .max(120),
    email: z.string().email("بريد إلكتروني غير صالح").max(190),
    phone: z
      .string()
      .min(9, "رقم جوال غير صالح")
      .max(40)
      .regex(/^[0-9+\s-]+$/, "أرقام فقط"),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(128),
    password_confirm: z.string().min(6, "أعد كتابة كلمة المرور"),
    vehicle_type: z.enum(["motorcycle", "electric_bike", "other"]),
    vehicle_plate: z.string().max(40).optional(),
    license_number: z.string().max(80).optional(),
    region_id: z.number().int().positive(),
    preferred_shifts: z.string().max(60).optional(),
  })
  .refine((v) => v.password === v.password_confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["password_confirm"],
  });

type FormValues = z.infer<typeof schema>;

/* ─── عقود المستندات الأربعة ─────────────────────────────── */

const DOC_TYPES = [
  {
    key: "photo",
    label: "صورتك الشخصية",
    hint: "وجه واضح بخلفية محايدة",
    icon: UserRound,
  },
  {
    key: "id_document",
    label: "الهوية / البطاقة الشخصية",
    hint: "الوثيقة الرسمية كاملة الوضوح",
    icon: IdCard,
  },
  {
    key: "license",
    label: "رخصة القيادة",
    hint: "الرخصة سارية المفعول",
    icon: FileImage,
  },
  {
    key: "vehicle_photo",
    label: "صورة المركبة",
    hint: "المركبة التي ستعمل بها",
    icon: Bike,
  },
] as const;

type DocKey = (typeof DOC_TYPES)[number]["key"];

/* ─── الصفحة ─────────────────────────────────────────────── */

const STEPS_META = [
  { title: "هويتك", desc: "الاسم كما في الوثيقة الرسمية" },
  { title: "حسابك", desc: "البريد والجوال وكلمة المرور" },
  { title: "مركبتك ومنطقتك", desc: "نوع المركبة ومنطقة العمل" },
  { title: "مستنداتك", desc: "ارفعها بكاميرا جوالك" },
];

export default function CourierRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const setAuth = useCourierAuthStore((s) => s.setAuth);
  const registerMutation = useCourierRegister();
  const docUpload = useCourierDocUpload();
  const recheck = useCourierRecheck();

  /* المناطق — GET /regions (عام بلا توكن) */
  const regionsQuery = useQuery({
    queryKey: ["courier:regions"],
    queryFn: async () => {
      const res = await fetch("/api/regions", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("تعذّر تحميل المناطق");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      document_full_name: "",
      public_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirm: "",
      vehicle_type: "motorcycle",
      vehicle_plate: "",
      license_number: "",
      region_id: 1,
      preferred_shifts: "",
    },
  });

  /* حقول كل خطوة — التحقق التدريجي قبل الانتقال */
  const STEP_FIELDS: (keyof FormValues)[][] = useMemo(
    () => [
      ["document_full_name", "public_name"],
      ["email", "phone", "password", "password_confirm"],
      ["vehicle_type", "region_id", "vehicle_plate", "license_number"],
    ],
    [],
  );

  const goToStep = async (target: number) => {
    if (target > step) {
      const fields = STEP_FIELDS[step];
      if (fields?.length) {
        const ok = await form.trigger(fields as never);
        if (!ok) return;
      }
    }
    haptic("tick");
    setStep(target);
  };

  const { register, handleSubmit, formState, setValue, watch } = form;
  const vehicleType = watch("vehicle_type");
  const regionId = watch("region_id");

  /* ─── المستندات (بعد إنشاء الحساب) ──────────────────── */
  const [accountId, setAccountId] = useState<{
    email: string;
    password: string;
    courierId: number;
  } | null>(null);
  const [uploaded, setUploaded] = useState<Partial<Record<DocKey, string>>>({});
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraFor, setCameraFor] = useState<DocKey | null>(null);

  /* إنشاء الحساب عند انتهاء الخطوة 3 */
  const submitBasic = handleSubmit((values) => {
    registerMutation.mutate(
      {
        document_full_name: values.document_full_name,
        public_name: values.public_name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        password_confirm: values.password_confirm,
        vehicle_type: values.vehicle_type,
        vehicle_plate: values.vehicle_plate || null,
        license_number: values.license_number || null,
        region_id: values.region_id,
        preferred_shifts: values.preferred_shifts || null,
      },
      {
        onSuccess: async (out) => {
          haptic("success");
          /* دخول تلقائي — جلسة رفع المستندات */
          try {
            const pair = await courierAuthService.login({
              identifier: values.email,
              password: values.password,
            });
            setAuth(pair.access_token, pair.refresh_token);
            setAccountId({
              email: values.email,
              password: values.password,
              courierId: out.courier_id,
            });
            setStep(3);
          } catch {
            /* الحساب أُنشئ لكن الدخول التلقائي فشل — للـlogin يدوياً */
            toast({
              title: "أُنشئ حسابك ✅",
              description:
                "تعذّر الدخول التلقائي — سجّل دخولك ثم ارفع مستنداتك من ملفك",
            });
            router.replace("/courier/login");
          }
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر إنشاء الحساب",
            description: err instanceof Error ? err.message : "خطأ غير متوقع",
            variant: "destructive",
          });
        },
      },
    );
  });

  /* التقاط ملف مستند (كاميرا أو معرض) */
  const pickDoc = (docKey: DocKey) => {
    setCameraFor(docKey);
    fileInputRef.current?.click();
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docKey = cameraFor;
    e.target.value = "";
    if (!file || !docKey) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "الصورة أكبر من 5MB",
        description: "التقط صورة أوضح بحجم أصغر",
        variant: "destructive",
      });
      return;
    }
    setUploadingKey(docKey);
    docUpload.mutate(
      { file, docType: docKey },
      {
        onSuccess: (res) => {
          setUploaded((prev) => ({ ...prev, [docKey]: res.url }));
          haptic("success");
          toast({ title: "تم رفع المستند ✅", description: res.doc_type });
        },
        onError: (err: unknown) => {
          toast({
            title: "تعذّر رفع المستند",
            description: err instanceof Error ? err.message : "أعد المحاولة",
            variant: "destructive",
          });
        },
        onSettled: () => setUploadingKey(null),
      },
    );
  };

  const docsDone = DOC_TYPES.every((d) => uploaded[d.key]);
  const docsCount = DOC_TYPES.filter((d) => uploaded[d.key]).length;

  /* إنهاء التسجيل — إبلاغ إعادة الفحص ثم الانتظار */
  const finishRegistration = () => {
    recheck.mutate(undefined, {
      onSuccess: () => {
        haptic("success");
        toast({
          title: "اكتمل تسجيلك 🎉",
          description: "طلبك قيد التدقيق — عادةً خلال 24–48 ساعة",
        });
        router.replace("/courier/waiting");
      },
      onError: () => {
        /* حتى عند فشل الإبلاغ — المستندات محفوظة؛ ننتقل للانتظار */
        router.replace("/courier/waiting");
      },
    });
  };

  const progress = ((step + 1) / STEPS_META.length) * 100;

  return (
    <AuthShell backHref="/courier" wide>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        className="hidden"
        onChange={onFileChosen}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="w-full rounded-3xl border border-border/60 bg-card/90 p-5 shadow-soft backdrop-blur sm:p-7">
        {/* رأس الخطوات */}
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h1 className="text-lg font-extrabold text-foreground">
              التسجيل الميداني
            </h1>
            <span className="text-xs font-bold text-muted-foreground">
              الخطوة {step + 1} من {STEPS_META.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" aria-hidden="true" />
          <p className="mt-2 text-xs text-muted-foreground">
            {STEPS_META[step].title} — {STEPS_META[step].desc}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.22 }}
          >
            {/* ── الخطوة 1: الهوية ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-fullname">
                    الاسم الكامل كما في الوثيقة الرسمية
                  </Label>
                  <Input
                    id="reg-fullname"
                    placeholder="أحمد صالح محمد المندوب"
                    className="h-12 rounded-xl"
                    aria-invalid={Boolean(formState.errors.document_full_name)}
                    {...register("document_full_name")}
                  />
                  {formState.errors.document_full_name && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.document_full_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-publicname">
                    الاسم العلني (يظهر للمتاجر)
                  </Label>
                  <Input
                    id="reg-publicname"
                    placeholder="أحمد ص."
                    className="h-12 rounded-xl"
                    aria-invalid={Boolean(formState.errors.public_name)}
                    {...register("public_name")}
                  />
                  {formState.errors.public_name && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.public_name.message}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    اسمك القصير الذي سيراه أصحاب المتاجر عند تسليم طلباتهم
                  </p>
                </div>
              </div>
            )}

            {/* ── الخطوة 2: الحساب ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-12 rounded-xl"
                    aria-invalid={Boolean(formState.errors.email)}
                    {...register("email")}
                  />
                  {formState.errors.email && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">رقم الجوال</Label>
                  <Input
                    id="reg-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="7XXXXXXXX"
                    className="h-12 rounded-xl text-right"
                    aria-invalid={Boolean(formState.errors.phone)}
                    {...register("phone")}
                  />
                  {formState.errors.phone && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">كلمة المرور</Label>
                  <PasswordInput
                    id="reg-password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="h-12 rounded-xl"
                    aria-invalid={Boolean(formState.errors.password)}
                    {...register("password")}
                  />
                  {formState.errors.password && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password2">تأكيد كلمة المرور</Label>
                  <PasswordInput
                    id="reg-password2"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="h-12 rounded-xl"
                    aria-invalid={Boolean(formState.errors.password_confirm)}
                    {...register("password_confirm")}
                  />
                  {formState.errors.password_confirm && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.password_confirm.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── الخطوة 3: المركبة والمنطقة ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>نوع المركبة</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { v: "motorcycle", l: "دراجة نارية" },
                        { v: "electric_bike", l: "دراجة كهربائية" },
                        { v: "other", l: "أخرى" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setValue("vehicle_type", opt.v, { shouldValidate: true });
                          haptic("tick");
                        }}
                        aria-pressed={vehicleType === opt.v}
                        className={cn(
                          "flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-bold native-tap",
                          vehicleType === opt.v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 bg-background text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" {...register("vehicle_type")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-plate">رقم اللوحة</Label>
                  <Input
                    id="reg-plate"
                    placeholder="1-23456"
                    className="h-12 rounded-xl"
                    {...register("vehicle_plate")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-license">رقم الرخصة</Label>
                  <Input
                    id="reg-license"
                    placeholder="LIC-2027"
                    className="h-12 rounded-xl"
                    {...register("license_number")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>منطقة العمل الأساسية</Label>
                  {regionsQuery.isLoading ? (
                    <div className="flex h-12 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                      جارٍ تحميل المناطق…
                    </div>
                  ) : regionsQuery.isError ? (
                    <WaitMode
                      compact
                      reason="تعذّر تحميل المناطق — تحقق من اتصالك"
                      onRetry={() => void regionsQuery.refetch()}
                    />
                  ) : (
                    <Select
                      value={String(regionId)}
                      onValueChange={(v) =>
                        setValue("region_id", Number(v), { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl" dir="rtl">
                        <SelectValue placeholder="اختر منطقتك" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-72">
                        {(regionsQuery.data as { id: number; name: string }[]).map(
                          (r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {r.name}
                              </span>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-shifts">أوقات تفضيلك (اختياري)</Label>
                  <Input
                    id="reg-shifts"
                    placeholder="صباحي / مسائي / مرن"
                    className="h-12 rounded-xl"
                    {...register("preferred_shifts")}
                  />
                </div>
              </div>
            )}

            {/* ── الخطوة 4: المستندات ── */}
            {step === 3 && (
              <div className="space-y-4">
                {!accountId ? (
                  <WaitMode reason="جارٍ تهيئة حسابك…" compact />
                ) : (
                  <>
                    <div className="rounded-2xl bg-muted/60 p-4 text-center">
                      <p className="text-sm font-bold text-foreground">
                        أُنشئ حسابك #{accountId.courierId} ✅
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        ارفع مستنداتك الأربعة الآن بكاميرا جوالك — لن تُراجع
                        إدارة توثيقك قبل اكتمالها
                      </p>
                      <p className="mt-2 text-xs font-bold text-primary">
                        رُفع {docsCount} من 4
                      </p>
                    </div>
                    <ul className="space-y-2.5">
                      {DOC_TYPES.map((doc) => {
                        const done = Boolean(uploaded[doc.key]);
                        const busy = uploadingKey === doc.key;
                        return (
                          <li key={doc.key}>
                            <button
                              type="button"
                              onClick={() => pickDoc(doc.key)}
                              disabled={busy}
                              aria-label={`رفع ${doc.label}`}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start native-tap",
                                done
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-dashed border-border bg-background hover:border-primary/40",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                                  done
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {busy ? (
                                  <Loader2
                                    className="h-5 w-5 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : done ? (
                                  <CheckCircle2
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <doc.icon className="h-5 w-5" aria-hidden="true" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-extrabold text-foreground">
                                  {doc.label}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {done ? "تم الرفع ✅ — يمكنك إعادة الرفع" : doc.hint}
                                </span>
                              </span>
                              {!done && !busy && (
                                <Camera
                                  className="h-5 w-5 shrink-0 text-primary"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* أزرار التنقل */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void goToStep(step - 1)}
              disabled={registerMutation.isPending}
              className="h-12 gap-1 rounded-2xl native-tap"
              aria-label="الخطوة السابقة"
            >
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              السابق
            </Button>
          )}

          {step < 2 && (
            <Button
              type="button"
              size="lg"
              onClick={() => void goToStep(step + 1)}
              className="h-12 flex-1 gap-1 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              التالي
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </Button>
          )}

          {step === 2 && (
            <Button
              type="button"
              size="lg"
              onClick={submitBasic}
              disabled={registerMutation.isPending}
              className="h-12 flex-1 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  جارٍ إنشاء حسابك…
                </>
              ) : (
                <>
                  إنشاء الحساب ومتابعة المستندات
                  <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
                </>
              )}
            </Button>
          )}

          {step === 3 && (
            <Button
              type="button"
              size="lg"
              onClick={finishRegistration}
              disabled={!docsDone || recheck.isPending}
              className="h-12 flex-1 gap-2 rounded-2xl bg-primary font-black text-primary-foreground native-tap"
            >
              {recheck.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
              {docsDone ? "إرسال طلب التوثيق" : `متبقٍ ${4 - docsCount} مستندات`}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        بياناتك ومستنداتك محفوظة بسرّية تامة — معاينتها للإدارة حصراً
      </p>
    </AuthShell>
  );
}
