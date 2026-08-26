"use client";

import { useMutation } from "@tanstack/react-query";
import { ownerService } from "@/services/owner.service";
import type {
  OwnerRegisterInput,
  OwnerRegisterResult,
} from "@/services/owner.service";
import { OwnerApiError } from "@/services/owner-api-client";

/**
 * نتيجة تحليل خطأ الخادم: أخطاء مربوطة بحقول + رسالة عامة إن لزم
 */
export interface ParsedRegisterError {
  fields: Record<string, string>;
  general: string | null;
}

interface ValidationErrorItem {
  type?: string;
  loc?: Array<string | number>;
  msg?: string;
}

/** يزيل بادئة pydantic الإنجليزية من الرسالة العربية */
function cleanMessage(msg: string): string {
  return msg.replace(/^Value error,\s*/u, "").trim();
}

/**
 * يحلّل أخطاء POST /owner/register كما ترد فعلياً من الخادم:
 *  • 422 تحقق: detail كائن {errors: [{loc: ["body", "email"], msg}]}
 *    → تُربط كل رسالة بحقلها من loc
 *  • 409/404/غيره مع detail نصي عربي (بريد/جوال مكرر، منطقة غير موجودة…)
 *    → تُربط بالحقل المناسب عبر كلمات مفتاحية
 *  • فشل شبكة (أوفلاين): رسالة الاتصال كما هي من عميل الـ API
 */
export function parseRegisterError(error: unknown): ParsedRegisterError {
  if (error instanceof OwnerApiError) {
    const body = error.body as
      | { detail?: unknown; status_code?: number }
      | null;

    /* 1) أخطاء التحقق المنظمة (422) */
    const detail = body?.detail;
    if (
      detail &&
      typeof detail === "object" &&
      Array.isArray((detail as { errors?: unknown }).errors)
    ) {
      const items = (detail as { errors: ValidationErrorItem[] }).errors;
      const fields: Record<string, string> = {};
      const unfielded: string[] = [];
      for (const item of items) {
        const fieldName =
          Array.isArray(item.loc) && item.loc.length > 1
            ? String(item.loc[1])
            : null;
        const message = cleanMessage(String(item.msg ?? "بيانات غير صالحة"));
        if (fieldName) {
          fields[fieldName] = message;
        } else {
          /* خطأ بمستوى الجسم كله (مثل عدم تطابق كلمتي المرور) */
          unfielded.push(message);
        }
      }
      /* الرسائل بلا حقل: تُربط بالكلمات المفتاحية وإلا تُعرض عامة */
      for (const msg of unfielded) {
        Object.assign(fields, mapDetailToField(msg));
      }
      if (Object.keys(fields).length > 0) {
        return { fields, general: null };
      }
      if (unfielded.length > 0) {
        return { fields: {}, general: unfielded.join("، ") };
      }
    }

    /* 2) detail نصي عربي — ربط بالحقل عبر الكلمات المفتاحية */
    if (typeof detail === "string" && detail.trim().length > 0) {
      const mapped = mapDetailToField(detail);
      if (Object.keys(mapped).length > 0) {
        return { fields: mapped, general: null };
      }
      /* غير قابلة للربط بحقل → تُعرض كرسالة عامة */
      return { fields: {}, general: detail };
    }

    /* 3) 404 بلا body (عميل الـ API يفصله) — المنطقة الوحيدة الممكنة هنا */
    if (error.status === 404) {
      return {
        fields: { region_id: "المنطقة غير موجودة" },
        general: null,
      };
    }

    /* 4) فشل شبكة / رسالة العميل العامة */
    return { fields: {}, general: error.message || "تعذّر إنشاء الحساب" };
  }

  return {
    fields: {},
    general:
      error instanceof Error ? error.message : "تعذّر إنشاء الحساب",
  };
}

/** يربط رسالة الخادم النصية بالحقل المناسب حسب كلماتها */
function mapDetailToField(detail: string): Record<string, string> {
  if (detail.includes("البريد")) return { email: detail };
  if (detail.includes("الجوال")) return { phone: detail };
  if (detail.includes("المنطقة")) return { region_id: detail };
  if (detail.includes("كلمة المرور") || detail.includes("متطابق"))
    return { password_confirm: detail };
  if (detail.includes("اسم المنشأة")) return { facility_name: detail };
  return {};
}

export function useOwnerRegister() {
  return useMutation<OwnerRegisterResult, Error, OwnerRegisterInput>({
    mutationFn: (values) => ownerService.ownerRegister(values),
  });
}
