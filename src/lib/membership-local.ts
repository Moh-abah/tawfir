/**
 * إدارة حالة طلب العضوية محلياً (localStorage).
 *
 * القاعدة الذهبية: OpenAPI يفوز. الباك إند لا يوفّر نقطة نهاية للعميل
 * يستعلم بها حالة طلب عضويته (pending/approved/rejected) — GET /me يُرجع
 * membership فقط عند الموافقة (MyMembershipCard) أو null خلاف ذلك.
 *
 * لذلك نتبع هذا التدفق:
 *  1) بعد POST /membership/subscribe (201 → {id, status:"pending"}) نُخزّن
 *     الطلب محلياً كـ «قيد المراجعة».
 *  2) في /account: إن كان /me.membership ≠ null → بطاقة عضوية كاملة (مُوافق).
 *     وإلا إن وُجد طلب محلي معلّق → شارة «قيد المراجعة».
 *     وإلا → «ليس لديك عضوية» + زر اشتراك.
 *  3) عند ظهور بطاقة العضوية في /me نحذف الطلب المحلي (مُوافق).
 *
 * قيد معروف: لا يمكن إظهار سبب الرفض للعميل لأن الباك إند لا يكشفه.
 */

const KEY = "tawfir_membership_pending";

export interface PendingMembership {
  id: number;
  amount: number;
  created_at: string;
}

export function getPendingMembershipRequest(): PendingMembership | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingMembership;
    if (typeof parsed?.id === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function savePendingMembershipRequest(req: PendingMembership): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(req));
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

export function clearPendingMembershipRequest(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* تجاهل */
  }
}
