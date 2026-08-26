"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { customerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useToast } from "@/hooks/use-toast";

/** حالة جلسة العميل: ترطيب التوكن من الكوكي عند أول تركيب */
export function useCustomerAuth() {
  const hydrate = useCustomerAuthStore((s) => s.hydrate);
  const accessToken = useCustomerAuthStore((s) => s.accessToken);
  const hydrated = useCustomerAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return { accessToken, hydrated };
}

/** دخول العميل: يحفظ التوكن ويرحّل المستدعي إلى المسار المطلوب */
export function useCustomerLogin() {
  const setAuth = useCustomerAuthStore((s) => s.setAuth);
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { identifier: string; password: string }) =>
      customerAuthService.login(data),
    onSuccess: (data) => {
      setAuth(data.access_token);
      toast({ title: "تم تسجيل الدخول", description: "مرحبًا بك في توفير" });
    },
    onError: (e: Error) =>
      toast({
        title: "فشل تسجيل الدخول",
        description: e.message,
        variant: "destructive",
      }),
  });
}

/** خروج العميل */
export function useCustomerLogout() {
  const router = useRouter();
  const clearAuth = useCustomerAuthStore((s) => s.clearAuth);
  const { toast } = useToast();

  return () => {
    clearAuth();
    toast({ title: "تم تسجيل الخروج" });
    router.push("/login");
  };
}
