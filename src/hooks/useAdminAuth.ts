"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/hooks/use-toast";

export function useAdminAuth() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Hydrate token from cookie on first client mount
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return { accessToken, hydrated };
}

export function useAdminLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { identifier: string; password: string; remember?: boolean }) =>
      authService.adminLogin(data),
    onSuccess: (data, variables) => {
      // remember=true (افتراضي) → كوكي 7 أيام | false → كوكي جلسة فقط
      setAuth(data.access_token, variables.remember ?? true);
      toast({ title: "تم تسجيل الدخول", description: "مرحبًا بك في لوحة التحكم" });
      router.push("/admin");
    },
    onError: (e: Error) =>
      toast({
        title: "فشل تسجيل الدخول",
        description: e.message,
        variant: "destructive",
      }),
  });
}

export function useAdminLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { toast } = useToast();

  return () => {
    clearAuth();
    toast({ title: "تم تسجيل الخروج" });
    router.push("/admin/login");
  };
}
