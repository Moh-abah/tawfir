"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TawfirLogo } from "@/components/shared/TawfirLogo";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useOwnerAuth, useOwnerLogin } from "@/hooks/useOwnerAuth";
import { useToast } from "@/hooks/use-toast";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const schema = z.object({
  identifier: z.string().min(1, "اسم المستخدم أو البريد الإلكتروني مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});
type FormValues = z.infer<typeof schema>;

function OwnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, hydrated } = useOwnerAuth();
  const login = useOwnerLogin();
  const { toast } = useToast();
  const rawNext = searchParams.get("next") || "";
  const nextUrl = (() => {
    if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")) {
      if (rawNext === "/" || rawNext.startsWith("/owner/")) return rawNext;
    }
    return "/owner";
  })();
  const prefersReduced = usePrefersReducedMotion();
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace(nextUrl);
    }
  }, [hydrated, accessToken, router, nextUrl]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;

  function onSubmit(values: FormValues) {
    login.mutate({ ...values, remember: rememberMe });
  }

  function handleForgotPassword() {
    toast({ title: "ستتوصل برابط إعادة التعيين قريبًا" });
  }

  const cardAnimation = prefersReduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } };

  const floatVariants = prefersReduced
    ? { initial: { opacity: 0.15 }, animate: { opacity: 0.15 } }
    : {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 0.15, scale: 1 },
    };

  return (
    <div
      className={cn(
        "login-ocean-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4",
        !prefersReduced && "animate-hero-gradient"
      )}
    >
      {/* Hero pattern overlay */}
      <div className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

      {/* Floating decorative shapes */}
      <motion.div
        className="login-blob-cyan pointer-events-none absolute -top-20 right-1/4 h-72 w-72 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.2 }}
        aria-hidden="true"
      />
      <motion.div
        className="login-blob-deep pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.5 }}
        aria-hidden="true"
      />
      <motion.div
        className="login-blob-gold pointer-events-none absolute top-1/3 left-[10%] h-48 w-48 rounded-full"
        variants={floatVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 2, delay: 0.8 }}
        aria-hidden="true"
      />

      <div className="absolute left-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* زر تثبيت تطبيق المالك — فوق نموذج الدخول */}
        <PWAInstallButton portal="owner" variant="full" />

        {/* Logo with glow — floating on desktop */}
        <div className={cn(
          "flex flex-col items-center gap-3 text-center",
          !prefersReduced && "hidden md:flex",
          prefersReduced && "flex"
        )}>
          <div className={cn(
            "flex flex-col items-center gap-3 text-center",
            !prefersReduced && "animate-float"
          )}>
            <div className="login-logo-glow">
              <TawfirLogo className="h-24 w-auto" />
            </div>

          </div>
        </div>

        {/* Mobile logo without float */}
        <div className={cn(
          "flex flex-col items-center gap-3 text-center",
          prefersReduced && "hidden",
          !prefersReduced && "flex md:hidden"
        )}>
          <div className="login-logo-glow">
            <TawfirLogo variant="mark" className="h-24 w-auto" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-foreground">توفير</span>
            <span className="text-sm text-muted-foreground">لوحة تحكم أصحاب المنشآت</span>
          </div>
        </div>

        {/* Login Card */}
        <motion.div
          {...cardAnimation}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          {/* ✅ تعديل الكارد: border و bg إلى توكنات دلالية */}
          <Card className="border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl login-card-shimmer">
            <CardHeader className="text-center">
              <CardTitle>بوابة المالك</CardTitle>
              <CardDescription>تسجيل دخول صاحب المنشأة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">البريد الإلكتروني أو اسم المستخدم</Label>
                  <Input
                    id="identifier"
                    autoComplete="email"
                    autoFocus
                    dir="ltr"
                    {...register("identifier")}
                  />
                  {formState.errors.identifier && (
                    <p className="text-xs text-destructive" role="alert">
                      {formState.errors.identifier.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    dir="ltr"
                    {...register("password")}
                  />
                  {formState.errors.password && (
                    <p className="text-xs text-destructive" role="alert">
                      {formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    aria-label="تذكرني"
                  />
                  <Label htmlFor="remember-me" className="text-sm cursor-pointer select-none">
                    تذكرني
                  </Label>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:underline min-h-[44px] flex items-center"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[44px] rounded-full"
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          {/* ✅ روابط الأسفل: استبدال text-white/70 و hover:text-white */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للرئيسية
          </Link>
          {/* تسجيل منشأة جديدة — لمن لديه منشأة وغير مسجل */}
          <Link
            href="/owner/register"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            لديك منشأة وليس لديك حساب؟ سجّل منشأتك
          </Link>
          {/* ✅ النص السفلي: استبدال text-white/50 */}
          <span className="text-xs text-muted-foreground/70">
            بوابة أصحاب المنشآت — توفير
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense>
      <OwnerLoginForm />
    </Suspense>
  );
}
// "use client";

// import Link from "next/link";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, Suspense, useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { motion } from "framer-motion";
// import { ArrowRight, Loader2 } from "lucide-react";
// import { cn } from "@/lib/utils";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import { ThemeToggle } from "@/components/theme/ThemeToggle";
// import { TawfirLogo } from "@/components/shared/TawfirLogo";
// import { useOwnerAuth, useOwnerLogin } from "@/hooks/useOwnerAuth";
// import { useToast } from "@/hooks/use-toast";
// import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// const schema = z.object({
//   identifier: z.string().min(1, "اسم المستخدم أو البريد الإلكتروني مطلوب"),
//   password: z.string().min(1, "كلمة المرور مطلوبة"),
// });
// type FormValues = z.infer<typeof schema>;

// function OwnerLoginForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { accessToken, hydrated } = useOwnerAuth();
//   const login = useOwnerLogin();
//   const { toast } = useToast();
//   const rawNext = searchParams.get("next") || "";
//   const nextUrl = (() => {
//     if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")) {
//       if (rawNext === "/" || rawNext.startsWith("/owner/")) return rawNext;
//     }
//     return "/owner";
//   })();
//   const prefersReduced = usePrefersReducedMotion();
//   const [rememberMe, setRememberMe] = useState(false);

//   useEffect(() => {
//     if (hydrated && accessToken) {
//       router.replace(nextUrl);
//     }
//   }, [hydrated, accessToken, router, nextUrl]);

//   const form = useForm<FormValues>({
//     resolver: zodResolver(schema),
//     defaultValues: { identifier: "", password: "" },
//   });
//   const { register, handleSubmit, formState } = form;

//   function onSubmit(values: FormValues) {
//     login.mutate(values);
//   }

//   function handleForgotPassword() {
//     toast({ title: "ستتوصل برابط إعادة التعيين قريبًا" });
//   }

//   const cardAnimation = prefersReduced
//     ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
//     : { initial: { opacity: 0, y: 24, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } };

//   const floatVariants = prefersReduced
//     ? { initial: { opacity: 0.15 }, animate: { opacity: 0.15 } }
//     : {
//       initial: { opacity: 0, scale: 0.8 },
//       animate: { opacity: 0.15, scale: 1 },
//     };

//   return (
//     <div
//       className={cn(
//         "login-ocean-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4",
//         !prefersReduced && "animate-hero-gradient"
//       )}
//     >
//       {/* Hero pattern overlay */}
//       <div className="hero-pattern-overlay pointer-events-none absolute inset-0 z-0" aria-hidden="true" />

//       {/* Floating decorative shapes */}
//       <motion.div
//         className="login-blob-cyan pointer-events-none absolute -top-20 right-1/4 h-72 w-72 rounded-full"
//         variants={floatVariants}
//         initial="initial"
//         animate="animate"
//         transition={{ duration: 2, delay: 0.2 }}
//         aria-hidden="true"
//       />
//       <motion.div
//         className="login-blob-deep pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full"
//         variants={floatVariants}
//         initial="initial"
//         animate="animate"
//         transition={{ duration: 2, delay: 0.5 }}
//         aria-hidden="true"
//       />
//       <motion.div
//         className="login-blob-gold pointer-events-none absolute top-1/3 left-[10%] h-48 w-48 rounded-full"
//         variants={floatVariants}
//         initial="initial"
//         animate="animate"
//         transition={{ duration: 2, delay: 0.8 }}
//         aria-hidden="true"
//       />

//       <div className="absolute left-4 top-4 z-10">
//         <ThemeToggle />
//       </div>

//       <div className="relative z-10 w-full max-w-sm space-y-6">
//         {/* Logo with glow — floating on desktop */}
//         <div className={cn(
//           "flex flex-col items-center gap-3 text-center",
//           !prefersReduced && "hidden md:flex",
//           prefersReduced && "flex"
//         )}>
//           <div className={cn(
//             "flex flex-col items-center gap-3 text-center",
//             !prefersReduced && "animate-float"
//           )}>
//             <div className="login-logo-glow">
//               <TawfirLogo className="h-24 w-auto" />
//             </div>
//             <div className="flex flex-col items-center gap-1">
//               <span className="text-2xl font-bold text-white">توفير</span>
//               <span className="text-sm text-white/70">لوحة تحكم أصحاب المنشآت</span>
//             </div>
//           </div>
//         </div>

//         {/* Mobile logo without float */}
//         <div className={cn(
//           "flex flex-col items-center gap-3 text-center",
//           prefersReduced && "hidden",
//           !prefersReduced && "flex md:hidden"
//         )}>
//           <div className="login-logo-glow">
//             <TawfirLogo variant="mark" className="h-24 w-auto" />
//           </div>
//           <div className="flex flex-col items-center gap-1">
//             <span className="text-2xl font-bold text-white">توفير</span>
//             <span className="text-sm text-white/70">لوحة تحكم أصحاب المنشآت</span>
//           </div>
//         </div>

//         {/* Login Card */}
//         <motion.div
//           {...cardAnimation}
//           transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
//         >
//           <Card className="border-white/15 bg-card/60 shadow-2xl backdrop-blur-xl login-card-shimmer">
//             <CardHeader className="text-center">
//               <CardTitle>بوابة المالك</CardTitle>
//               <CardDescription>تسجيل دخول صاحب المنشأة</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="identifier">البريد الإلكتروني أو اسم المستخدم</Label>
//                   <Input
//                     id="identifier"
//                     autoComplete="email"
//                     autoFocus
//                     dir="ltr"
//                     {...register("identifier")}
//                   />
//                   {formState.errors.identifier && (
//                     <p className="text-xs text-destructive" role="alert">
//                       {formState.errors.identifier.message}
//                     </p>
//                   )}
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="password">كلمة المرور</Label>
//                   <Input
//                     id="password"
//                     type="password"
//                     autoComplete="current-password"
//                     dir="ltr"
//                     {...register("password")}
//                   />
//                   {formState.errors.password && (
//                     <p className="text-xs text-destructive" role="alert">
//                       {formState.errors.password.message}
//                     </p>
//                   )}
//                 </div>

//                 {/* Remember Me Checkbox */}
//                 <div className="flex items-center gap-2">
//                   <Checkbox
//                     id="remember-me"
//                     checked={rememberMe}
//                     onCheckedChange={(checked) => setRememberMe(checked === true)}
//                     aria-label="تذكرني"
//                   />
//                   <Label htmlFor="remember-me" className="text-sm cursor-pointer select-none">
//                     تذكرني
//                   </Label>
//                 </div>

//                 {/* Forgot Password Link */}
//                 <div className="flex justify-start">
//                   <button
//                     type="button"
//                     onClick={handleForgotPassword}
//                     className="text-sm text-primary hover:underline min-h-[44px] flex items-center"
//                   >
//                     نسيت كلمة المرور؟
//                   </button>
//                 </div>

//                 <Button
//                   type="submit"
//                   className="w-full min-h-[44px] rounded-full"
//                   disabled={login.isPending}
//                 >
//                   {login.isPending ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : null}
//                   {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
//                 </Button>
//               </form>
//             </CardContent>
//           </Card>
//         </motion.div>

//         <div className="flex flex-col items-center gap-2">
//           <Link
//             href="/"
//             className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white min-h-[44px]"
//           >
//             <ArrowRight className="h-4 w-4" />
//             العودة للرئيسية
//           </Link>
//           <span className="text-xs text-white/50">
//             بوابة أصحاب المنشآت — توفير
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function OwnerLoginPage() {
//   return (
//     <Suspense>
//       <OwnerLoginForm />
//     </Suspense>
//   );
// }
