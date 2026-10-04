"use client";

/**
 * api-error-msg.ts — مستخرج موحّد لرسائل أخطاء الخادم العربية
 * ═══════════════════════════════════════════════════════════════
 * الخادم يعيد `detail` بأشكال متعددة حسب نوع الخطأ:
 *   - نص مباشر: "الدفعة غير مدفوعة بعد…"
 *   - مصفوفة FastAPI: [{msg: "..."}, ...]
 *   - كائن تحقق مركّب: {message: "Validation error", errors: [{msg: "..."}]}
 *   - كائن بسيط: {msg: "..."} أو {message: "..."}
 * هذا المساعد يوحّد الاستخراج إلى نص عربي جاهز للعرض (برونزية: عرض
 * detail كما هو — لا [object Object] في الواجهة أبدًا).
 */
export function extractArabicDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .filter(
        (d): d is Record<string, unknown> =>
          typeof d === "object" && d !== null && "msg" in d,
      )
      .map((d) => String(d.msg))
      .filter(Boolean);
    if (msgs.length) return msgs.join("، ");
    const strings = detail.filter(
      (d): d is string => typeof d === "string" && d.trim().length > 0,
    );
    if (strings.length) return strings.join("، ");
    return fallback;
  }
  if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    if (Array.isArray(d.errors)) {
      const msgs = d.errors
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null && "msg" in e)
        .map((e) => String(e.msg))
        .filter(Boolean);
      if (msgs.length) return msgs.join("، ");
    }
    if (typeof d.message === "string" && d.message.trim()) return d.message;
    if (typeof d.msg === "string" && d.msg.trim()) return d.msg;
  }
  return fallback;
}
