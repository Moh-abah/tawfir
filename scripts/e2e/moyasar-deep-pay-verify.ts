/**
 * moyasar-deep-pay-verify.ts — إتمام الدفع الفعلي للطلب الناتج عن تدفق «الدفع أولاً»
 * يُشغَّل: bun scripts/e2e/moyasar-deep-pay-verify.ts <orderId>
 *
 * السبب: ساندبوكس التطوير تحجب CDN مويسر (S3 AccessDenied على cdn.moyasar.com)
 * فلا يُحمَّل iframe النموذج داخل المتصفح هنا — لكن api.moyasar.com متاح.
 * هذا السكربت ينفّذ **نفس نداءات iframe حرفياً** على مستوى الـAPI:
 *   1) payments/config → المفتاح العلني (من الخادم — لا مفاتيح ميتة).
 *   2) POST api.moyasar.com/v1/payments ببطاقة مدى الساندبوكس + metadata order_id.
 *   3) POST /finance/orders/{id}/pay/verify (التحقق الحتمي الخادمي).
 *   4) إثبات الحالة النهائية: الطلب مدفوع → شاشة /pay تعرض «مدفوع سابقًا».
 */

const API = "https://api.tawfir.giize.com/api/v1";
const MOYASAR = "https://api.moyasar.com/v1";
const MADA = { name: "Ahmed Ali", number: "4201320111111010", cvc: "123", month: "12", year: "30" };
const TAG = Math.random().toString(36).slice(2, 6);

async function req<T = any>(method: string, url: string, opts: {
  token?: string; body?: unknown; market?: string; base?: string; idem?: string;
} = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.market) headers["X-Market"] = opts.market;
  if (opts.idem) headers["Idempotency-Key"] = opts.idem;
  const res = await fetch((opts.base ?? API) + url, {
    method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data: data as T };
}

/* تحليل نموذج HTML (صفحات 3DS/OTP بين مويسر والبنك) */
function parseForm(html: string): { action: string | null; fields: Record<string, string> } {
  const mAction = html.match(/<form[^>]*action="([^"]+)"/i);
  const action = mAction ? mAction[1].replace(/&amp;/g, "&") : null;
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) fields[m[1]] = m[2];
  return { action, fields };
}

/** إكمال تحدي 3DS للبطاقة (نفس مسار v3.2.1 المجرّب) */
async function moyasarCompleteCard(pk: string, pay: any): Promise<any> {
  const first = pay?.source?.transaction_url;
  if (!first) return pay;
  let html = await fetch(first, { redirect: "follow" }).then((r) => r.text());
  for (let i = 0; i < 8; i++) {
    const { action, fields } = parseForm(html);
    if (!action) break;
    const body = new URLSearchParams(fields);
    if (action.includes("authenticate")) {
      body.set("color_depth", "24"); body.set("js_enabled", "true");
      body.set("language", "ar-SA"); body.set("screen_height", "900");
      body.set("screen_width", "1440"); body.set("time_zone", "-180");
    }
    if (action.includes("set_auth_result")) body.set("auth_result", "AUTHENTICATED");
    const target = action.startsWith("http") ? action : `https://api.moyasar.com${action}`;
    const res = await fetch(target, { method: "POST", body, redirect: "follow" });
    html = await res.text();
  }
  return fetch(`${MOYASAR}/payments/${pay.id}`, {
    headers: { Authorization: `Basic ${btoa(pk + ":")}` },
  }).then((r) => r.json()).catch(() => null);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const orderId = Number(process.argv[2] ?? 0);
  if (!orderId) { console.error("استعمل: bun scripts/e2e/moyasar-deep-pay-verify.ts <orderId>"); process.exit(1); }

  /* 1) دخول العميل السعودي */
  const lg = await req<any>("POST", "/auth/login", { body: { identifier: "customer.sa@tawfir.test", password: "Test@12345" }, market: "966" });
  const token = lg.data?.access_token;
  console.log(`${token ? "✅" : "❌"} دخول العميل السعودي`);
  if (!token) process.exit(1);

  /* 2) إعدادات البوابة — المفتاح العلني من الخادم */
  const cfg = await req<any>("GET", "/finance/payments/config", { token, market: "966" });
  const pk = cfg.data?.publishable_key;
  const currency = cfg.data?.currency ?? "SAR";
  console.log(`${pk ? "✅" : "❌"} payments/config — enabled=${cfg.data?.enabled} · currency=${currency} · methods=${(cfg.data?.methods ?? []).join(",")}`);
  if (!pk) process.exit(1);

  /* 3) تفاصيل الطلب — المبلغ الحي */
  const od = await req<any>("GET", `/orders/${orderId}`, { token, market: "966" });
  const total = Number(od.data?.total);
  console.log(`${od.ok ? "✅" : "❌"} الطلب #${orderId} — total=${total} ${od.data?.currency ?? ""} · payment_method=${od.data?.payment_method} · payment_status=${od.data?.payment_status ?? od.data?.status}`);
  if (!total) process.exit(1);

  /* 4) إنشاء الدفعة على مويسر — نفس نداء iframe (pk + بطاقة + metadata) */
  const pay = await req<any>("POST", "/payments", {
    base: MOYASAR,
    body: {
      publishable_api_key: pk,
      amount: Math.round(total * 100),
      currency,
      description: `توفير — طلب رقم ${orderId}`,
      callback_url: `https://tawfir.giize.com/payment/return?order=${orderId}`,
      metadata: { order_id: String(orderId) },
      source: { type: "creditcard", ...MADA, manual: false },
    },
  });
  const payId = pay.data?.id;
  console.log(`${pay.ok ? "✅" : "❌"} دفعة مويسر: id=${payId} · status=${pay.data?.status} · amount=${pay.data?.amount} هللة${pay.ok ? "" : " · " + JSON.stringify(pay.data).slice(0, 200)}`);
  if (!payId) process.exit(1);

  /* 4-ب) إكمال تحدي 3DS ثم انتظار حسم الحالة */
  let final: any = pay.data?.source?.transaction_url ? await moyasarCompleteCard(pk, pay.data) : pay.data;
  for (let i = 0; i < 7 && final?.status === "initiated"; i++) {
    await sleep(1500);
    final = await fetch(`${MOYASAR}/payments/${payId}`, {
      headers: { Authorization: `Basic ${btoa(pk + ":")}` },
    }).then((r) => r.json());
  }
  console.log(`${final?.status === "paid" ? "✅" : "❌"} حالة البوابة بعد الإكمال: ${final?.status}`);
  if (final?.status !== "paid") process.exit(1);

  /* 5) التحقق الحتمي الخادمي — POST /finance/orders/{id}/pay/verify */
  const idem = `basma-payfirst-${TAG}-${orderId}`;
  const vf = await req<any>("POST", `/finance/orders/${orderId}/pay/verify`, {
    token, market: "966", idem,
    body: { moyasar_payment_id: payId, idempotency_key: idem },
  });
  console.log(`${vf.ok && vf.data?.status === "paid" ? "✅" : "❌"} verify خادمي: status=${vf.data?.status} · amount=${vf.data?.amount} · ${vf.ok ? "" : JSON.stringify(vf.data).slice(0, 200)}`);

  /* 6) الحالة النهائية للطلب */
  const od2 = await req<any>("GET", `/orders/${orderId}`, { token, market: "966" });
  const paid = od2.data?.payment_status === "paid" || od2.data?.status === "paid" || (typeof od2.data?.is_paid === "boolean" ? od2.data.is_paid : false);
  console.log(`${paid ? "✅" : "❌"} الطلب بعد الدفع: status=${od2.data?.status} · payment_status=${od2.data?.payment_status} · is_paid=${od2.data?.is_paid}`);
  console.log(`\nالحصيلة: طلب #${orderId} — إن الطلب مدفوع فشاشة /orders/${orderId}/pay في الواجهة تعرض «مدفوع سابقًا» وشاشة الرجوع تعرض «تم الدفع بنجاح».`);
}

main().catch((e) => { console.error("فشل:", e); process.exit(1); });
