"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { customerAuthService } from "@/services/customer-auth.service";
import { useCustomerAuthStore } from "@/store/customerAuth.store";
import { useFavoritesStore } from "@/store/favorites.store";
import { useCartStore } from "@/store/cart.store";
import { clearPendingMembershipRequest } from "@/lib/membership-local";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";
import type { AccountDeleteIn } from "@/types/api-extra";

/** مفتاح تخزين توكن FCM في sessionStorage — نفس مفتاح FcmRegistrar. */
const FCM_TOKEN_KEY = "tawfir_fcm_token";

/**
 * جمع توكنات FCM المسجّلة على هذا الجهاز لتمريرها مع طلب الحذف —
 * يزيلها الخادم من الباك إند أثناء الجلسة ما زالت صالحة (بعد الخروج
 * يصبح إلغاؤها مستحيلًا لغياب ترويسة التوثيق).
 */
function collectFcmTokens(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const token = window.sessionStorage.getItem(FCM_TOKEN_KEY);
    return token ? [token] : [];
  } catch {
    return [];
  }
}

/** إزالة توكن FCM من الجلسة — يمنع FcmRegistrar من محاولة إلغائه
 *  لاحقًا (بعد مسح الجلسة) بلا ترويسة توثيق فيفشل بـ401 عبثًا. */
function clearFcmSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    /* تجاهل — وضع التصفح الخاص مثلاً */
  }
}

/**
 * حذف حساب العميل نهائيًا — DELETE /customer/account (متطلب Apple 5.1.1(v)).
 *
 * مسار الطلب:
 *  1. تمرير توكنات FCM لهذا الجهاز (يزيلها الخادم أثناء الحذف).
 *  2. عند النجاح — تنظيف شامل لبيانات المستخدم المحلية:
 *     المفضلة + السلة + طلب العضوية المعلّق + توكن FCM، ثم خروج كامل
 *     (مسح التوكنين محليًا وكوكيزهما) ومسح كاش الاستعلامات كليًا
 *     (me/الطلبات/التوفير/الإشعارات...) ثم توجيه للصفحة الرئيسية.
 *  3. عند الفشل — توست خطأ عربي وبقاء المستخدم في مكانه (يمكنه
 *     إعادة المحاولة؛ الخطوات المنجزة آمنة للإعادة idempotent).
 */
export function useDeleteAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clearAuth = useCustomerAuthStore((s) => s.clearAuth);
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);
  const clearCart = useCartStore((s) => s.clearCart);

  return useMutation({
    mutationFn: (data?: AccountDeleteIn) =>
      customerAuthService.deleteAccount({
        fcm_tokens: collectFcmTokens(),
        ...data,
      }),
    onSuccess: (out) => {
      haptic("success");

      /* 1) بيانات المستخدم المحلية — لا تبقى أثرًا بعد الحذف */
      clearFavorites();
      clearCart();
      clearPendingMembershipRequest();
      clearFcmSessionToken();

      /* 2) خروج كامل (متجر الجلسة + الكوكيز) ثم مسح كاش الاستعلامات */
      clearAuth();
      queryClient.clear();

      /* 3) تأكيد عربي + توجيه للصفحة الرئيسية */
      toast({
        title: "تم حذف حسابك نهائيًا",
        description:
          out?.message ??
          "أُزيلت بياناتك الشخصية ولن تستطيع استعادة هذا الحساب.",
      });
      router.push("/");
    },
    onError: (e: Error) => {
      haptic("light");
      toast({
        title: "تعذّر حذف الحساب",
        description:
          e.message ||
          "حدث خطأ غير متوقع أثناء حذف الحساب — أعد المحاولة بعد قليل.",
        variant: "destructive",
      });
    },
  });
}
