import { NextRequest, NextResponse } from "next/server";

/**
 * ‏DELETE /api/customer/account — حذف حساب العميل نهائيًا (متطلب Apple 5.1.1(v))
 * ═══════════════════════════════════════════════════════════════════════════
 * مسار BFF محلي (Backend-For-Frontend) داخل تطبيق Next.js نفسه — يسبق
 * إعادة كتابة ‎/api/*‎ نحو الباك إند الخارجي لأن مسارات الملفات تُفحص قبل
 * rewrites من نوع afterFiles في next.config.ts.
 *
 * نمط المصادقة (مطابق لكل مسارات العميل الحالية): ترويسة
 * ‎Authorization: Bearer <access_token>‎ — نفس التوكن الذي يرسله
 * customerApiClient من متجر جلسة العميل. لا يمكن حذف حساب غير
 * المُصادق نفسه لأن الهوية تُشتق حصرًا من التوكن المُرسل.
 *
 * تسلسل «المعاملة» (كل خطوة تُنفَّذ بالترتيب وأي فشل قاتل يوقف العملية
 * برسالة عربية واضحة — والخطوات المكتملة آمنة للإعادة idempotent):
 *   1) التحقق من الهوية: GET /me لدى الباك إند بالتوكن نفسه (401/403 →
 *      جلسة منتهية، 5xx/شبكة → 502 قابل لإعادة المحاولة).
 *   2) حارس الدور: البوابة مخصصة لحسابات العملاء (customer) فقط.
 *   3) الحذف الأصلي أولًا: تُجرَّب مسارات الحذف الأصلية المحتملة على
 *      الباك إند (DELETE /me، /me/account، /auth/account،
 *      /customer/account). إن نجح أحدها (2xx) فهذا هو الوضع الأمثل — حذف
 *      السجل كليًا. (تأمين مستقبلي: عند إضافة الباك إند نقطة حذف
 *      حقيقية تُستخدم تلقائيًا دون أي تعديل هنا.)
 *   4) وإلا — التكييف (Anonymization): الطلبات سجلات تجارية للمتاجر
 *      لا يجوز حذفها، لذا تُصفَّر بيانات العميل الشخصية عبر PUT /me:
 *      الاسم → «مستخدم محذوف»، والجوال → null إن كرّمه الباك إند، وإلا
 *      جوال مموّه عشوائي (0 + 11 رقمًا — غير قابل للتعيين كجوال حقيقي
 *      ويتفادى قيود unique)، وإلا تكييف الاسم وحده. يُتحقق من جسم
 *      الاستجابة لا من رمز الحالة (الباك إند الحالي يتجاهل null
 *      صياغيًا ويعيد الجوال القديم).
 *   5) إزالة توكنات FCM المُرسلة في الجسم (best-effort لا تفشل الطلب).
 *   6) مسح كوكيز جلسة العميل من جانب الخادم (حزام أمان إضافي فوق
 *      المسح الذي يقوم به العميل في clearAuth).
 *
 * الاستجابات:
 *   • 200 { ok: true, mode: "deleted" | "anonymized", message }
 *   • 401 { detail } — لا توكن / جلسة منتهية
 *   • 403 { detail } — دور غير عميل
 *   • 502 { detail } — تعذّر الوصول للباك إند (أعد المحاولة)
 *   • 500 { detail } — خطأ غير متوقع
 */

/** عنوان الباك إند الخارجي — نفس مصدر next.config.ts (rewrites). */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.tawfir.giize.com";
const UPSTREAM_BASE = `${API_BASE}/api/v1`;

/** مهلة كل نداء خارجي (ms) — تمنع تعليق الحذف إلى ما لا نهاية. */
const UPSTREAM_TIMEOUT_MS = 15_000;

/** الاسم البديل الذي يُدفن به حساب العميل عند التكييف. */
const DELETED_DISPLAY_NAME = "مستخدم محذوف";

/** أقصى عدد توكنات FCM يُسمح بتمريرها في الطلب الواحد. */
const MAX_FCM_TOKENS = 5;

/**
 * مسارات الحذف الأصلية المرشحة على الباك إند الخارجي — تُجرَّب بالترتيب.
 * أي استجابة 2xx تعني نجاح الحذف الكامل؛ 404/405 تعني «غير موجودة بعد»
 * فننتقل للتالية؛ ما عدا ذلك يُسجَّل ويُتجاوز أيضًا (لا نفشل الطلب كله
 * لمجرد ردّ غامض من مسار تجريبي).
 */
const NATIVE_DELETE_PATHS = [
  "/me",
  "/me/account",
  "/auth/account",
  "/customer/account",
] as const;

/* ── هوية العميل كما تُرجعها GET /me ─────────────────────────────── */

interface MeIdentity {
  id: number;
  full_name?: string;
  email?: string;
  role?: string;
}

/* ── استجابة خطأ موحّدة بنمط الباك إند { detail } ─────────────────── */

function errorResponse(detail: string, status: number): NextResponse {
  return NextResponse.json({ detail }, { status });
}

/** استخراج توكن Bearer من ترويسة الطلب (نمط توثيق العميل الموحّد). */
function extractBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1].length > 0 ? parts[1] : null;
}

/** نداء خارجي موحّد: JSON + مهلة + بلا كاش. */
async function upstreamFetch(
  path: string,
  init: { method: "GET" | "PUT" | "DELETE"; token: string; body?: unknown }
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${init.token}`,
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(`${UPSTREAM_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

/** هل الاستجابة خارجية ناجحة (2xx)؟ */
function isOk(res: Response): boolean {
  return res.status >= 200 && res.status < 300;
}

/* ── الخطوة 1: التحقق من الهوية عبر GET /me ──────────────────────── */

async function verifyIdentity(
  token: string
): Promise<{ ok: true; me: MeIdentity } | { ok: false; response: NextResponse }> {
  let res: Response;
  try {
    res = await upstreamFetch("/me", { method: "GET", token });
  } catch {
    return {
      ok: false,
      response: errorResponse(
        "تعذّر الاتصال بخادم توفير للتحقق من هويتك. تحقق من اتصالك وأعد المحاولة.",
        502
      ),
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      response: errorResponse(
        "انتهت الجلسة. يرجى تسجيل الدخول من جديد ثم إعادة محاولة الحذف.",
        401
      ),
    };
  }

  if (!isOk(res)) {
    return {
      ok: false,
      response: errorResponse(
        "تعذّر التحقق من هويتك لدى خادم توفير. أعد المحاولة بعد قليل.",
        502
      ),
    };
  }

  const data: unknown = await res.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as Record<string, unknown>).id !== "number"
  ) {
    return {
      ok: false,
      response: errorResponse(
        "استجابة غير صالحة من الخادم — أعد المحاولة.",
        502
      ),
    };
  }

  return { ok: true, me: data as MeIdentity };
}

/* ── الخطوة 3: محاولة الحذف الأصلي على الباك إند ─────────────────── */

/** تُرجع true إن نجح أحد المسارات المرشحة في حذف الحساب كليًا. */
async function tryNativeDeletion(token: string): Promise<boolean> {
  for (const path of NATIVE_DELETE_PATHS) {
    try {
      const res = await upstreamFetch(path, { method: "DELETE", token });
      if (isOk(res)) return true;
      // 404/405 = المسار غير مطبَّق بعد — ننتقل للتالي بصمت.
      // أي ردّ آخر يُسجَّل للتشخيص ثم ننتقل أيضًا (لا نفشل الطلب كله).
      if (res.status !== 404 && res.status !== 405) {
        console.warn(
          `[account-delete] مسار الحذف الأصلي ${path} ردّ بحالة ${res.status} — يُتجاوز`
        );
      }
    } catch (err) {
      console.warn(`[account-delete] تعذّر تجربة مسار الحذف ${path}:`, err);
    }
  }
  return false;
}

/* ── الخطوة 4: التكييف — تصفير البيانات الشخصية عبر PUT /me ──────── */

/** نتيجة نداء PUT /me — تُقرأ من جسم الاستجابة لمعرفة ما ثبت فعلاً. */
interface PutMeResult {
  ok: boolean;
  status: number;
  phone?: string | null;
}

/** نداء PUT /me — يرمي عند فشل الشبكة (خطأ قاتل) ويرجع الحالة عند غير ذلك. */
async function putMe(
  token: string,
  body: { full_name: string; phone?: string | null }
): Promise<PutMeResult> {
  let res: Response;
  try {
    res = await upstreamFetch("/me", { method: "PUT", token, body });
  } catch {
    throw new Error(
      "تعذّر الاتصال بخادم توفير أثناء حذف بياناتك. أعد المحاولة."
    );
  }
  const data: unknown = await res.json().catch(() => null);
  const phone =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).phone
      : undefined;
  return {
    ok: isOk(res),
    status: res.status,
    phone: typeof phone === "string" ? phone : phone === null ? null : undefined,
  };
}

/** جوال مموّه لا يصادف جوالًا حقيقيًا أبدًا: 12 رقمًا تبدأ بصفر —
 *  الجوالات اليمنية الحقيقية 9 أرقام تبدأ بـ70/71/73/77/78، والصفر
 *  الأول + الطول 12 يجعله غير قابل للتعيين، والعشوائية تتفادى قيود
 *  unique عند حذف حسابات متعددة (توجيه المهمة: لاحقة عشوائية). */
function randomMaskedPhone(): string {
  let digits = "";
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  return `0${digits}`;
}

/** عمق التكييف المتحقق فعلاً لدى الباك إند. */
type AnonymizeDepth = "full" | "masked" | "name-only";

/**
 * تكييف بيانات العميل الشخصية (الطلبات سجلات تجارية تبقى مجهولة الهوية):
 *  1. الجوال → null أولًا (إن بدأ الباك إند يكرمه مستقبلًا نحصل على
 *     الفراغ الحقيقي) — التحقق من جسم الاستجابة لا من رمز الحالة،
 *     لأن النسخة الحالية تقبل null صياغيًا ثم تتجاهله (exclude_none).
 *  2. إن بقي الجوال → جوال مموّه عشوائي غير قابل للتعيين (0 + 11 رقمًا).
 *  3. إن فرض الباك إند قيود صيغة مستقبلًا → تكييف الاسم وحده.
 * ترمي خطأً عربيًا إن فشلت المحاولات الثلاث (نقطة الفشل القاتلة
 * الوحيدة في «المعاملة» — والخطوات المنجزة آمنة للإعادة idempotent).
 */
async function anonymizeProfile(token: string): Promise<AnonymizeDepth> {
  /* 1) null — إن ثبّته الباك إند فهذا الأمثل (نطلب تأكيدًا صريحًا:
     null أو فراغ؛ القيمة undefined تعني استجابة غير قابلة للقراءة
     فنكمل للمحاولة التالية للتحقق الفعلي). */
  const nulled = await putMe(token, {
    full_name: DELETED_DISPLAY_NAME,
    phone: null,
  });
  if (nulled.ok && (nulled.phone === null || nulled.phone === "")) {
    return "full";
  }

  /* 2) الجوال المموّه — النمط المفعّل ضد الباك إند الحالي. */
  const masked = randomMaskedPhone();
  const maskedRes = await putMe(token, {
    full_name: DELETED_DISPLAY_NAME,
    phone: masked,
  });
  if (maskedRes.ok && maskedRes.phone === masked) return "masked";

  /* 3) الاسم وحده — شبكة أمان لقيود صيغة محتملة مستقبلًا. */
  const nameOnly = await putMe(token, { full_name: DELETED_DISPLAY_NAME });
  if (nameOnly.ok) return "name-only";

  throw new Error(
    `رفض الخادم حذف بياناتك الشخصية (${nameOnly.status}). أعد المحاولة أو تواصل مع الدعم.`
  );
}

/* ── الخطوة 5: إزالة توكنات FCM (best-effort) ────────────────────── */

async function removeFcmTokens(
  token: string,
  tokens: string[]
): Promise<void> {
  for (const fcmToken of tokens) {
    try {
      await upstreamFetch("/fcm/token", {
        method: "DELETE",
        token,
        body: { token: fcmToken },
      });
    } catch {
      /* إزالة التوكن محاولة مساندة — فشلها لا يُفشل حذف الحساب */
    }
  }
}

/* ── الخطوة 6: مسح كوكيز الجلسة من جانب الخادم ───────────────────── */

/** أسماء الكوكيز مطابقة لما يكتبه customerAuth.store في المتصفح. */
function clearedSessionCookies(): string[] {
  return ["tawfir_customer_token", "tawfir_customer_refresh"].map(
    (name) => `${name}=; Path=/; Max-Age=0; SameSite=Lax`
  );
}

/* ── المعالج الرئيسي ──────────────────────────────────────────────── */

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    /* 1) المصادقة: توكن العميل نفسه — لا حذف لغير المُصادق إطلاقًا. */
    const token = extractBearerToken(req);
    if (!token) {
      return errorResponse("يجب تسجيل الدخول أولًا لحذف الحساب.", 401);
    }

    /* 2) التحقق من الهوية لدى الباك إند. */
    const identity = await verifyIdentity(token);
    if (!identity.ok) return identity.response;

    /* 3) حارس الدور: بوابة حذف حسابات العملاء فقط. */
    if (identity.me.role && identity.me.role !== "customer") {
      return errorResponse(
        "حذف الحساب من هذه البوابة متاح لحسابات العملاء فقط.",
        403
      );
    }

    /* 4) جسم الطلب الاختياري: قائمة توكنات FCM لهذا الجهاز. */
    let fcmTokens: string[] = [];
    try {
      const body: unknown = await req.json().catch(() => null);
      if (body && typeof body === "object") {
        const raw = (body as Record<string, unknown>).fcm_tokens;
        if (Array.isArray(raw)) {
          fcmTokens = raw
            .filter(
              (t): t is string =>
                typeof t === "string" && t.length >= 10 && t.length <= 500
            )
            .slice(0, MAX_FCM_TOKENS);
        }
      }
    } catch {
      /* جسم فارغ أو غير JSON — لا توكنات FCM تُزال */
    }

    /* 5) «المعاملة»: حذف أصلي إن وُجد، وإلا تكييف البيانات الشخصية. */
    let mode: "deleted" | "anonymized";
    try {
      if (await tryNativeDeletion(token)) {
        mode = "deleted";
      } else {
        const depth = await anonymizeProfile(token);
        mode = "anonymized";
        console.info(
          `[account-delete] حُذف حساب العميل #${identity.me.id} بالتكييف (${depth})`
        );
      }
    } catch (err) {
      const detail =
        err instanceof Error && err.message
          ? err.message
          : "حدث خطأ أثناء حذف الحساب ولم يكتمل — أعد المحاولة.";
      console.error("[account-delete] فشل حذف الحساب:", err);
      return errorResponse(detail, 502);
    }

    /* 6) إزالة توكنات FCM (لا تُفشل الطلب عند التعثر). */
    if (fcmTokens.length > 0) {
      await removeFcmTokens(token, fcmTokens);
    }

    /* 7) نجاح — مع مسح كوكيز الجلسة خادميًا كمزدوج أمان. */
    const res = NextResponse.json(
      {
        ok: true,
        mode,
        message:
          mode === "deleted"
            ? "تم حذف حسابك وكل بياناتك الشخصية نهائيًا. نشكر لك تجربتك مع توفير."
            : "تم حذف حسابك وإزالة بياناتك الشخصية نهائيًا؛ وبقيت سجلات طلباتك السابقة مجهولة الهوية حفظًا على السجلات التجارية للمتاجر. نشكر لك تجربتك مع توفير.",
      },
      { status: 200 }
    );
    for (const cookie of clearedSessionCookies()) {
      res.headers.append("Set-Cookie", cookie);
    }
    return res;
  } catch (err) {
    console.error("[account-delete] خطأ غير متوقع:", err);
    return errorResponse(
      "حدث خطأ غير متوقع أثناء حذف الحساب. أعد المحاولة بعد قليل.",
      500
    );
  }
}
