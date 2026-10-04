"use client";

import { v4 as uuidv4 } from "uuid";

/**
 * idempotency.ts — القاعدة البرونزية 4
 * ═══════════════════════════════════════════════════════════════
 * كل عملية مالية حساسة (دفع / تحقق دفعة / صرف payout) يجب أن تحمل
 * ترويسة «X-Idempotency-Key» بقيمة UUID v4 **فريدة لكل محاولة POST**
 * (وليست لكل إعادة عرض للشاشة).
 *
 * الاستعمال الصحيح:
 *   - عند الضغط على زر «ادفع» → ولّد مفتاحاً جديداً ثم أرسل الطلب.
 *   - عند «إعادة المحاولة» لنفس نية الدفع (مثل تحقق «غير مدفوعة بعد»)
 *     أعد استخدام **نفس المفتاح** كي يكون التكرار idempotent بلا
 *     دفعات مزدوجة.
 */

/** مفتاح فريد لمحاولة POST جديدة. */
export function newIdempotencyKey(): string {
  return uuidv4();
}

/** نفس المفتاح لإعادة محاولة نفس النية (idempotent retry). */
export function reuseIdempotencyKey(key: string | null): string {
  return key ?? newIdempotencyKey();
}

/** ترويسة جاهزة للحقن في نداء apiClient options.headers. */
export function idempotencyHeader(key: string): Record<string, string> {
  return { "X-Idempotency-Key": key };
}
