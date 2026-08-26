"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ownerService } from "@/services/owner.service";
import { useOwnerAuthStore } from "@/store/ownerAuth.store";
import { useToast } from "@/hooks/use-toast";

export function useOwnerAuth() {
  const hydrate = useOwnerAuthStore((s) => s.hydrate);
  const accessToken = useOwnerAuthStore((s) => s.accessToken);
  const hydrated = useOwnerAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return { accessToken, hydrated };
}

export function useOwnerLogin() {
  const router = useRouter();
  const setAuth = useOwnerAuthStore((s) => s.setAuth);
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      identifier: string;
      password: string;
      remember?: boolean;
    }) => ownerService.ownerLogin(data),
    onSuccess: (data, variables) => {
      // remember=true (افتراضي) → كوكي 7 أيام | false → كوكي جلسة فقط
      setAuth(data.access_token, variables.remember ?? true);
      toast({ title: "تم تسجيل الدخول", description: "مرحبًا بك في بوابة المالك" });
      router.push("/owner");
    },
    onError: (e: Error) =>
      toast({
        title: "فشل تسجيل الدخول",
        description: e.message,
        variant: "destructive",
      }),
  });
}

export function useOwnerLogout() {
  const router = useRouter();
  const clearAuth = useOwnerAuthStore((s) => s.clearAuth);
  const { toast } = useToast();

  return () => {
    clearAuth();
    toast({ title: "تم تسجيل الخروج" });
    router.push("/owner/login");
  };
}
