"use client";

/**
 * /courier/register — التسجيل الميداني (شاشة 2/11).
 * ═════════════════════════════════════════════════════════
 * أربع خطوات: الهوية → الحساب → المركبة والمنطقة → المستندات.
 *
 * تحديثات 2-c (فلسفة البطاقة + إصلاح الرجوع من الخطوة 4):
 *   • «رقم الرخصة» → «رقم البطاقة الشخصية» — إلزامي رقمي (نفس الحقل
 *     البرمجي license_number — فلسفة جديدة بلا تغيير API).
 *   • لوحة المركبة → YemenPlateField (محافظة + رقم + حرف) — إلزامية.
 *   • الجوال → PhoneInput (يقبل المسافات/+967/الصفر المحلي/الأرقام
 *     الهندية ويُرسل مطبَّعاً دائماً 9 خانات تبدأ بـ 7).
 *   • إصلاح «الرجوع من الخطوة 4 ثم المتابعة = 409» ثلاثي المستويات:
 *       a) زر «متابعة إلى المستندات» الذكي: دخول بالبيانات الحالية +
 *          PATCH /courier/me للحقول المعدلة ثم المستندات مباشرة.
 *       b) كشف 409 الذكي: بطاقة عربية بخيارين بدل توست «تعذّر إنشاء».
 *       c) جلسة sessionStorage "tawfir_courier_reg_session"
 *          ({email, password, courierId, snapshot}) — استئناف من الخطوة
 *          4 بعد التحديث/العودة — لن يُعاد إنشاء الحساب أبداً.
 *   • تحسينات نيتف موبايل: قشرة max-w-md، شبكة نوع المركبة مضغوطة،
 *     أزرار سفلية ملتفّة تعمل على 360px بلا أي تمدد أفقي.
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
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
import { PhoneInput } from "@/components/shared/PhoneInput";
import { YemenPlateField } from "@/components/shared/YemenPlateField";
import { WaitMode } from "@/components/courier/WaitMode";
import {
  useCourierRegister,
  useCourierDocUpload,
  useCourierRecheck,
} from "@/hooks/useCourier";
import { useCourierAuthStore } from "@/store/courierAuth.store";
import { courierAuthService } from "@/services/courier.service";
import {
  CourierApiError,
  courierApiClient,
  type CourierMe,
} from "@/services/courier-api-client";
import {
  normalizeYemeniPhone,
  toEnglishDigits,
  validateYemeniPhone,
} from "@/lib/yemen";
import { haptic } from "@/lib/haptic";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── العقد (zod مطابق لسكيما CourierRegister — بفلسفة 2-c) ── */

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
    /* الجوال اليمني: يقبل المسافات/+967/0967/الأرقام الهندية —
       الرسالة العربية الديناميكية من validateYemeniPhone */
    phone: z.string().superRefine((value, ctx) => {
      const errorMessage = validateYemeniPhone(value);
      if (errorMessage) {
        ctx.addIssue({ code: "custom", message: errorMessage });
      }
    }),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(128),
    password_confirm: z.string().min(6, "أعد كتابة كلمة المرور"),
    vehicle_type: z.enum(["motorcycle", "electric_bike", "other"]),
    /* لوحة يمنية كاملة "1-222156-أ" — يبثها YemenPlateField عند
       اكتمال الأجزاء الثلاثة فقط (دائماً ≥ 8 أحرف — 4 حد أدنى آمن) */
    vehicle_plate: z
      .string()
      .min(4, "بيانات اللوحة كاملة إلزامية — المحافظة والرقم والحرف")
      .max(40),
    /* فلسفة جديدة: رقم البطاقة الشخصية اليمنية إلزامي (نفس حقل
       license_number في الـAPI — بلا أي تغيير في العقد) */
    license_number: z
      .string()
      .min(5, "رقم البطاقة الشخصية مطلوب")
      .max(20, "رقم البطاقة 20 رقماً كحد أقصى")
      .regex(/^\d+$/, "أرقام فقط"),
    region_id: z.number().int().positive(),
    preferred_shifts: z.string().max(60).optional(),
  })
  .refine((v) => v.password === v.password_confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["password_confirm"],
  });

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
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
};

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

/* ─── جلسة تسجيل المندوب (استئناف — لن يُعاد إنشاء الحساب) ─── */

const REG_SESSION_KEY = "tawfir_courier_reg_session";

interface CourierRegSession {
  email: string;
  password: string;
  courierId: number;
  /** القيم كما سُجّلت — للتفريق بين المعدَّل والأصلي + استئناف النموذج */
  snapshot: FormValues;
}

function isRegSession(value: unknown): value is CourierRegSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.email === "string" &&
    typeof v.password === "string" &&
    typeof v.courierId === "number" &&
    (v.snapshot === undefined || typeof v.snapshot === "object")
  );
}

function persistRegSession(data: CourierRegSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REG_SESSION_KEY, JSON.stringify(data));
  } catch {
    /* تخزين ممتلئ/معطّل — الاستئناف يتعطل لكن التسجيل يعمل */
  }
}

function readRegSession(): CourierRegSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REG_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRegSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearRegSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(REG_SESSION_KEY);
  } catch {
    /* لا شيء */
  }
}

/* ─── كشف تكرار الجوال (409 من الخادم برسالة عربية) ────────── */

function isPhoneTakenError(err: unknown): boolean {
  if (err instanceof CourierApiError && err.status === 409) return true;
  const message = err instanceof Error ? err.message : "";
  return (
    message.includes("مسجّل مسبقاً") ||
    message.includes("مسجل مسبقا") ||
    message.includes("409")
  );
}

/* ─── الحقول المعدلة منذ التسجيل → PATCH /courier/me ──────── */

interface ProfilePatch {
  public_name?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  license_number?: string;
  region_id?: number;
}

function diffProfilePatch(
  values: FormValues,
  snapshot: Partial<FormValues> | undefined,
): ProfilePatch {
  const patch: ProfilePatch = {};
  if (snapshot?.public_name !== values.public_name)
    patch.public_name = values.public_name;
  if (snapshot?.vehicle_type !== values.vehicle_type)
    patch.vehicle_type = values.vehicle_type;
  if (snapshot?.vehicle_plate !== values.vehicle_plate)
    patch.vehicle_plate = values.vehicle_plate;
  if (snapshot?.license_number !== values.license_number)
    patch.license_number = values.license_number;
  if (snapshot?.region_id !== values.region_id)
    patch.region_id = values.region_id;
  return patch;
}

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
    defaultValues: DEFAULT_VALUES,
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
    setLoginRejected(false);
    setDupPhone(false);
    setStep(target);
  };

  const { register, handleSubmit, formState, setValue, watch, control, reset } =
    form;
  const vehicleType = watch("vehicle_type");
  const regionId = watch("region_id");

  /* ─── حساب هذه الجلسة (أُنشئ؟) + الاستئناف ──────────── */
  const [accountId, setAccountId] = useState<CourierRegSession | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [loginRejected, setLoginRejected] = useState(false);
  const [dupPhone, setDupPhone] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const resumedOnceRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  /* استئناف الجلسة بعد التحديث/العودة في نفس الجلسة — من الخطوة 4
     مباشرة (بلا إعادة إنشاء الحساب أبداً). التحديث خارج المسار
     المتزامن للأثر (نمط React الرسمي — بلا setState متزامن داخل
     useEffect) — وبعد الالتزام فلا انزياح Hydration */
  useEffect(() => {
    if (resumedOnceRef.current) return;
    resumedOnceRef.current = true;
    const saved = readRegSession();
    if (!saved) return;
    void Promise.resolve().then(() => {
      setAccountId(saved);
      reset({
        ...DEFAULT_VALUES,
        ...(saved.snapshot ?? {}),
        password: saved.password,
        password_confirm: saved.password,
      });
      setStep(3);
      toast({
        title: "استأنفنا تسجيلك من حيث توقفت",
        description: "حسابك موجود — أكمل رفع مستنداتك الأربعة",
      });
    });
  }, [reset]);

  /* ─── المستندات (بعد إنشاء الحساب) ──────────────────── */
  const [uploaded, setUploaded] = useState<Partial<Record<DocKey, string>>>({});
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraFor, setCameraFor] = useState<DocKey | null>(null);

  /* إنشاء الحساب عند انتهاء الخطوة 3 (المسار الأول فقط — بعدها
     يتحول زر الإرسال إلى «متابعة إلى المستندات») */
  const submitBasic = handleSubmit((values) => {
    setDupPhone(false);
    setLoginRejected(false);
    registerMutation.mutate(
      {
        document_full_name: values.document_full_name,
        public_name: values.public_name,
        email: values.email,
        phone: normalizeYemeniPhone(values.phone),
        password: values.password,
        password_confirm: values.password_confirm,
        vehicle_type: values.vehicle_type,
        vehicle_plate: values.vehicle_plate,
        license_number: values.license_number,
        region_id: values.region_id,
        preferred_shifts: values.preferred_shifts || null,
      },
      {
        onSuccess: async (out) => {
          haptic("success");
          /* حفظ الجلسة أولاً — حتى لو فشل الدخول التلقائي يستطيع
             المستخدم العودة للاستئناف من الخطوة 4 */
          const session: CourierRegSession = {
            email: values.email,
            password: values.password,
            courierId: out.courier_id,
            snapshot: values,
          };
          persistRegSession(session);
          /* دخول تلقائي — جلسة رفع المستندات */
          try {
            const pair = await courierAuthService.login({
              identifier: values.email,
              password: values.password,
            });
            setAuth(pair.access_token, pair.refresh_token);
            setAccountId(session);
            setStep(3);
          } catch {
            /* الحساب أُنشئ لكن الدخول التلقائي فشل — للـlogin يدوياً */
            toast({
              title: "أُنشئ حسابك ✅",
              description:
                "تعذّر الدخول التلقائي — سجّل دخولك ثم ارفع مستنداتك من ملفك",
            });
            router.replace("/login?mode=courier");
          }
        },
        onError: (err: unknown) => {
          haptic("light");
          if (isPhoneTakenError(err)) {
            /* 409: الجوال موجود مسبقاً — بطاقة ذكية بدل توست الفشل */
            setDupPhone(true);
            setShakeKey((k) => k + 1);
            return;
          }
          toast({
            title: "تعذّر إنشاء الحساب",
            description: err instanceof Error ? err.message : "خطأ غير متوقع",
            variant: "destructive",
          });
        },
      },
    );
  });

  /* ── الزر الذكي: الحساب موجود في هذه الجلسة ──
     دخول بالبيانات الحالية → تحديث الحقول المعدلة عبر
     PATCH /courier/me → المستندات مباشرة (بلا register ثانٍ) */
  const continueToDocs = handleSubmit((values) => {
    const session = accountId;
    if (!session) return;
    setLoginRejected(false);
    setContinuing(true);
    void (async () => {
      try {
        const pair = await courierAuthService.login({
          identifier: values.email,
          password: values.password,
        });
        setAuth(pair.access_token, pair.refresh_token);

        /* التعديلات منذ التسجيل → PATCH /courier/me (نجح: توست،
           فشل: تحذير والمتابعة للمستندات على أي حال) */
        const patch = diffProfilePatch(values, session.snapshot);
        if (Object.keys(patch).length > 0) {
          try {
            await courierApiClient.patch<CourierMe>("/courier/me", patch);
            const updatedSession: CourierRegSession = {
              ...session,
              snapshot: values,
            };
            persistRegSession(updatedSession);
            setAccountId(updatedSession);
            toast({
              title: "تم تحديث بياناتك ✅",
              description: "حُفظت التعديلات الأخيرة في ملفك",
            });
          } catch {
            toast({
              title: "تعذّر تحديث بياناتك المعدلة",
              description: "تابع رفع المستندات — يمكنك تعديلها لاحقاً من ملفك",
              variant: "destructive",
            });
          }
        }

        haptic("success");
        setStep(3);
      } catch (err: unknown) {
        /* بيانات الدخول لا تطابق الحساب الموجود (كلمة المرور غُيّرت) */
        haptic("light");
        const badCredentials =
          err instanceof CourierApiError &&
          (err.status === 401 || err.status === 400);
        if (badCredentials) {
          setLoginRejected(true);
          setShakeKey((k) => k + 1);
        } else {
          toast({
            title: "تعذّر تسجيل الدخول",
            description: err instanceof Error ? err.message : "أعد المحاولة",
            variant: "destructive",
          });
        }
      } finally {
        setContinuing(false);
      }
    })();
  });

  /* «استخدام بريد آخر» — عودة لخطوة الحساب والتركيز على حقل البريد */
  const focusEmailField = () => {
    haptic("tick");
    setDupPhone(false);
    setLoginRejected(false);
    setStep(1);
    /* التركيز بعد اكتمال انتقال الخطوة (خروج/دخول AnimatePresence) */
    window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 320);
  };

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

  /* إنهاء التسجيل — إبلاغ إعادة الفحص ثم الانتظار (+ تنظيف الجلسة) */
  const finishRegistration = () => {
    recheck.mutate(undefined, {
      onSuccess: () => {
        clearRegSession();
        haptic("success");
        toast({
          title: "اكتمل تسجيلك 🎉",
          description: "طلبك قيد التدقيق — عادةً خلال 24–48 ساعة",
        });
        router.replace("/courier/waiting");
      },
      onError: () => {
        /* حتى عند فشل الإبلاغ — المستندات محفوظة؛ ننتقل للانتظار */
        clearRegSession();
        router.replace("/courier/waiting");
      },
    });
  };

  const progress = ((step + 1) / STEPS_META.length) * 100;

  /* ربط مرجع RHF مع مرجع التركيز لحقل البريد */
  const { ref: emailRegisterRef, ...emailRegisterProps } = register("email");

  return (
    <AuthShell backHref="/courier">
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

      <div className="w-full max-w-md overflow-x-hidden rounded-3xl border border-border/60 bg-card/90 p-5 shadow-soft backdrop-blur sm:p-7">
        {/* رأس الخطوات */}
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h1 className="min-w-0 break-words text-lg font-extrabold text-foreground">
              التسجيل الميداني
            </h1>
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              الخطوة {step + 1} من {STEPS_META.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" aria-hidden="true" />
          <p className="mt-3 break-words text-xs text-muted-foreground">
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
            className="min-w-0"
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
                    autoComplete="name"
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
                    autoComplete="nickname"
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
                    ref={(el: HTMLInputElement | null) => {
                      emailRegisterRef(el);
                      emailInputRef.current = el;
                    }}
                    {...emailRegisterProps}
                  />
                  {formState.errors.email && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">رقم الجوال</Label>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneInput
                        id="reg-phone"
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        className="h-12"
                        aria-invalid={Boolean(formState.errors.phone)}
                      />
                    )}
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
                          setValue("vehicle_type", opt.v, {
                            shouldValidate: true,
                          });
                          haptic("tick");
                        }}
                        aria-pressed={vehicleType === opt.v}
                        className={cn(
                          "flex min-h-[44px] min-w-0 items-center justify-center overflow-hidden rounded-xl border px-2 py-2.5 text-[13px] font-bold native-tap",
                          vehicleType === opt.v
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 bg-background text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <span className="truncate">{opt.l}</span>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" {...register("vehicle_type")} />
                </div>

                {/* لوحة المركبة اليمنية — الأجزاء الثلاثة إلزامية */}
                <div className="space-y-2">
                  <Label
                    htmlFor="reg-plate-digits"
                    className="leading-relaxed break-words"
                  >
                    لوحة المركبة (البيانات الكاملة إلزامية)
                  </Label>
                  <Controller
                    control={control}
                    name="vehicle_plate"
                    render={({ field }) => (
                      <YemenPlateField
                        value={field.value}
                        onChange={(plate) => field.onChange(plate)}
                        idPrefix="reg-plate"
                      />
                    )}
                  />
                  {formState.errors.vehicle_plate && (
                    <p role="alert" className="break-words text-xs text-destructive">
                      {formState.errors.vehicle_plate.message}
                    </p>
                  )}
                </div>

                {/* فلسفة جديدة: رقم البطاقة الشخصية (نفس license_number) */}
                <div className="space-y-2">
                  <Label htmlFor="reg-idcard">رقم البطاقة الشخصية</Label>
                  <Input
                    id="reg-idcard"
                    placeholder="مثال: 01234567"
                    inputMode="numeric"
                    dir="ltr"
                    autoComplete="off"
                    className="h-12 rounded-xl tabular-nums"
                    aria-invalid={Boolean(formState.errors.license_number)}
                    aria-describedby="reg-idcard-hint"
                    {...register("license_number", {
                      /* أرقام فقط (مع تحويل الهندية) — إدخال نظيف */
                      onChange: (
                        e: React.ChangeEvent<HTMLInputElement>,
                      ) => {
                        const raw = e.target.value;
                        const clean = toEnglishDigits(raw)
                          .replace(/\D/g, "")
                          .slice(0, 20);
                        if (clean !== raw) {
                          e.target.value = clean;
                          setValue("license_number", clean, {
                            shouldValidate: false,
                          });
                        }
                      },
                    })}
                  />
                  {formState.errors.license_number && (
                    <p role="alert" className="text-xs text-destructive">
                      {formState.errors.license_number.message}
                    </p>
                  )}
                  <p
                    id="reg-idcard-hint"
                    className="break-words text-[11px] leading-relaxed text-muted-foreground"
                  >
                    رقم البطاقة الشخصية اليمنية كما هي — سيتطابق مع صورة
                    الهوية المرفوعة
                  </p>
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
                        setValue("region_id", Number(v), {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger
                        className="h-12 rounded-xl native-tap"
                        dir="rtl"
                      >
                        <SelectValue placeholder="اختر منطقتك" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-72">
                        {(regionsQuery.data as { id: number; name: string }[]).map(
                          (r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              <span className="flex items-center gap-1.5">
                                <MapPin
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
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
                    autoComplete="off"
                    className="h-12 rounded-xl"
                    {...register("preferred_shifts")}
                  />
                </div>

                {/* 409 — هذا الجوال مسجل مسبقاً: بطاقة ذكية بخيارين */}
                {dupPhone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    role="alert"
                    className="overflow-hidden rounded-2xl border border-destructive/40 bg-destructive/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                        <AlertTriangle
                          className="h-5 w-5"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words text-sm font-extrabold text-destructive">
                          هذا الجوال مسجل لدينا سابقاً
                        </p>
                        <p className="break-words text-xs leading-relaxed text-muted-foreground">
                          سجّل دخولك به ثم أكمل مستنداتك من ملفك الشخصي
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => router.push("/courier/login")}
                        className="h-12 min-w-0 truncate px-2 text-[13px] font-black native-tap"
                      >
                        تسجيل الدخول
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={focusEmailField}
                        className="h-12 min-w-0 truncate px-2 text-[13px] font-black native-tap"
                      >
                        استخدام بريد آخر
                      </Button>
                    </div>
                  </motion.div>
                )}
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
                      <p className="break-words text-sm font-bold text-foreground">
                        أُنشئ حسابك #{accountId.courierId} ✅
                      </p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
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
                                  <doc.icon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm font-extrabold text-foreground">
                                  {doc.label}
                                </span>
                                <span className="block break-words text-[11px] text-muted-foreground">
                                  {done
                                    ? "تم الرفع ✅ — يمكنك إعادة الرفع"
                                    : doc.hint}
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

        {/* أزرار التنقل — «السابق» ثابت العرض + الأساسي flex-1 ملتفّ */}
        <div className="mt-6 flex items-stretch gap-2">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void goToStep(step - 1)}
              disabled={registerMutation.isPending || continuing}
              className="h-12 flex-shrink-0 gap-1 rounded-2xl native-tap"
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
              className="h-auto min-h-12 min-w-0 flex-1 gap-1 whitespace-normal rounded-2xl bg-primary px-4 py-2.5 leading-snug font-black text-primary-foreground native-tap"
            >
              التالي
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
            </Button>
          )}

          {step === 2 && (
            <motion.div
              key={`reg-submit-${shakeKey}`}
              initial={false}
              animate={
                shakeKey > 0 ? { x: [0, -10, 10, -6, 6, -3, 0] } : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              className="min-w-0 flex-1"
            >
              <Button
                type="button"
                size="lg"
                onClick={accountId ? continueToDocs : submitBasic}
                disabled={registerMutation.isPending || continuing}
                className="h-auto min-h-12 w-full min-w-0 gap-2 whitespace-normal rounded-2xl bg-primary px-4 py-2.5 leading-snug font-black text-primary-foreground native-tap"
              >
                {accountId ? (
                  continuing ? (
                    <>
                      <Loader2
                        className="h-5 w-5 animate-spin"
                        aria-hidden="true"
                      />
                      جارٍ التحقق…
                    </>
                  ) : (
                    <>
                      متابعة إلى المستندات
                      <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
                    </>
                  )
                ) : registerMutation.isPending ? (
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
            </motion.div>
          )}

          {step === 3 && (
            <Button
              type="button"
              size="lg"
              onClick={finishRegistration}
              disabled={!docsDone || recheck.isPending}
              className="h-auto min-h-12 min-w-0 flex-1 gap-2 whitespace-normal rounded-2xl bg-primary px-4 py-2.5 leading-snug font-black text-primary-foreground native-tap"
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

        {/* فشل الدخول في الزر الذكي — كلمة المرور لا تطابق الحساب الموجود */}
        {step === 2 && loginRejected && (
          <p
            role="alert"
            className="mt-2 break-words text-xs leading-relaxed text-destructive"
          >
            كلمة المرور الجديدة غير صحيحة للحساب الموجود — أعد إدخال كلمة
            مرورك الأصلية
          </p>
        )}
      </div>

      <p className="mt-4 max-w-md break-words text-center text-[11px] text-muted-foreground">
        بياناتك ومستنداتك محفوظة بسرّية تامة — معاينتها للإدارة حصراً
      </p>
    </AuthShell>
  );
}
