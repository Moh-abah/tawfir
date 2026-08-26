"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useToast } from "@/hooks/use-toast";
import type { ApiError } from "@/services/api-client";

function extractErrorMessage(error: Error): string {
  const apiErr = error as ApiError;
  const body = apiErr.body;
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as Record<string, unknown>).detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "object" && first !== null && "msg" in first) {
        return String((first as Record<string, string>).msg);
      }
      return String(detail[0]);
    }
    if (typeof detail === "string") {
      return detail;
    }
  }
  return apiErr.message || "حدث خطأ أثناء التسجيل";
}

export function useRegister() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      full_name: string;
      email: string;
      phone: string;
      password: string;
      password_confirm: string;
      region_id: number;
    }) => authService.register(data),
    onError: (error: Error) => {
      toast({
        title: "فشل التسجيل",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
